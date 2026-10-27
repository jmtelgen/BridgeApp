import { expect, test, Page } from '@playwright/test'

test('two real signed guests complete a local multiplayer board, refresh and request the next board', async ({ browser }, testInfo) => {
  test.skip(process.env.BRIDGE_LIVE_E2E !== '1', 'Requires the real local Lambda adapter; no AWS endpoints are used.')
  test.setTimeout(180000)
  expect(process.env.VITE_WS_ENDPOINT || 'ws://127.0.0.1:3002').toMatch(/^ws:\/\/(?:127\.0\.0\.1|localhost):\d+\/?$/)
  expect(process.env.VITE_API_BASE_URL).toMatch(/^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/?$/)
  const contexts = [
    await browser.newContext({ baseURL: 'http://127.0.0.1:4201' }),
    await browser.newContext({ baseURL: 'http://127.0.0.1:4201' }),
  ]
  const pages: Page[] = [await contexts[0].newPage(), await contexts[1].newPage()]
  const frames: any[][] = [[], []]
  try {
    for (const [index, page] of pages.entries()) {
      page.on('websocket', socket => socket.on('framereceived', ({ payload }) => {
        try { frames[index].push(JSON.parse(String(payload))) } catch {}
      }))
      page.on('request', request => {
        if (request.isNavigationRequest() && !request.url().startsWith('http://127.0.0.1:4201')) throw new Error('Unexpected non-local navigation')
      })
    }
    await pages[0].goto('/')
    await pages[0].getByRole('textbox', { name: 'Your name for a new room' }).fill('Local host')
    await pages[0].getByRole('textbox', { name: 'Room name', exact: true }).fill(`Local acceptance ${Date.now()}`)
    await pages[0].getByTestId('create-room-button').click()
    await expect(pages[0].getByRole('heading', { name: 'Ready for a hand?' })).toBeVisible()
    const roomCode = (await pages[0].locator('.room-code').innerText()).trim()
    expect(roomCode).toBeTruthy()
    await pages[1].goto(`/room/${encodeURIComponent(roomCode)}`)
    await expect(pages[1].getByRole('button', { name: 'Join this room' })).toBeVisible()
    await pages[1].getByRole('textbox', { name: 'Your name', exact: true }).fill('Local guest')
    await pages[1].getByRole('button', { name: 'Join this room' }).click()
    await expect(pages[1].getByRole('heading', { name: 'Ready for a hand?' })).toBeVisible()
    await expect(pages[0].getByText('2 of 4 seats occupied')).toBeVisible()
    await pages[1].getByRole('button', { name: 'Disconnect and return', exact: true }).click()
    await expect(pages[0].getByText(/Reconnecting · \d+s reserved/)).toBeVisible()
    await pages[1].goto(`/room/${encodeURIComponent(roomCode)}`)
    await expect(pages[1].getByRole('heading', { name: 'Ready for a hand?' })).toBeVisible()
    await expect(pages[0].getByText(/Reconnecting · \d+s reserved/)).not.toBeVisible()
    const identities = await Promise.all(pages.map(page => page.evaluate(() => JSON.parse(sessionStorage.getItem('bridge-guest-session')!).userId)))
    expect(identities[0]).not.toBe(identities[1])
    expect(identities.every(identity => typeof identity === 'string' && identity.length > 10)).toBe(true)
    await pages[0].getByRole('button', { name: 'Start game', exact: true }).click()
    await expect(pages[0].locator('.auction-panel')).toBeVisible()
    await expect(pages[1].locator('.auction-panel')).toBeVisible()
    await pages[1].reload()
    await expect(pages[1].locator('.game-layout')).toBeVisible()
    expect(await pages[1].evaluate(() => JSON.parse(sessionStorage.getItem('bridge-guest-session')!).userId)).toBe(identities[1])
    let bidContract = false
    let complete = false
    // Budget for real 700ms robot turns and thirteen 1200ms trick clearances,
    // plus two-browser interaction overhead; unit timing tests use fake clocks.
    const playDeadline = Date.now() + 120000
    while (Date.now() < playDeadline) {
      if (await pages[0].locator('.result-panel').isVisible()) { complete = true; break }
      let moved = false
      for (const page of pages) {
        const auction = page.locator('.auction-panel fieldset:not([disabled])')
        if (await auction.count()) {
          const noTrump = auction.getByRole('button', { name: 'Bid 1NT', exact: true })
          if (!bidContract && await noTrump.isEnabled()) {
            await noTrump.click()
            bidContract = true
          } else {
            await auction.getByRole('button', { name: 'Pass', exact: true }).click()
          }
          moved = true
          break
        }
        const legal = page.locator('.hand-fan button:not([disabled])')
        if (await legal.count()) {
          // A fanned hand exposes each card's rank corner, not its covered center.
          await legal.first().click({ position: { x: 8, y: 8 } })
          moved = true
          break
        }
      }
      await pages[0].waitForTimeout(moved ? 40 : 100)
    }
    expect(complete, 'A real server-owned board should finish without client robot moves').toBe(true)
    await expect(pages[1].locator('.result-panel')).toBeVisible()
    const completed = frames[0].findLast(frame => frame.publicState?.currentPhase === 'completed')
    expect(completed?.publicState.tricks).toHaveLength(13)
    expect(completed?.publicState.result).toBeTruthy()
    for (const recipientFrames of frames) {
      const gameFrames = recipientFrames.filter(frame => frame.publicState && frame.privateState)
      expect(gameFrames.length).toBeGreaterThan(1)
      for (const frame of gameFrames) {
        expect(frame.room?.gameData).toBeUndefined()
        expect(frame.publicState.hands).toBeUndefined()
        expect(frame.privateState.hand).toBeInstanceOf(Array)
        expect(frame.seat).toBe(frame.privateState.seat)
      }
      const cleared = new Set<number>()
      let robotWaits = 0
      for (let index = 0; index < gameFrames.length; index++) {
        const frame = gameFrames[index]
        const state = frame.publicState
        if (frame.action === 'trickCleared') {
          cleared.add(state.revision)
          expect(state.completedTrick).toBeNull()
        }
        if (!state.pendingAction) continue
        expect(state.pacing).toEqual({ robotCardDelayMs: 700, trickHoldMs: 1200 })
        const nextRevision = gameFrames.slice(index + 1).find(next =>
          next.publicState.revision > state.revision
        )
        if (state.pendingAction.kind === 'clearTrick') {
          expect(state.completedTrick.plays).toHaveLength(4)
          expect(frame.privateState.isMyTurn).toBe(false)
          expect(frame.privateState.legalCards).toEqual([])
          expect(state.currentPhase).not.toBe('completed')
          expect(nextRevision, 'Every held trick must receive an authoritative clearance').toBeTruthy()
          expect(nextRevision.publicState.serverTimeMs).toBeGreaterThanOrEqual(state.pendingAction.dueAt)
          expect(nextRevision.publicState.completedTrick).toBeNull()
        }
        if (state.pendingAction.kind === 'robotCard') {
          robotWaits += 1
          expect(state.completedTrick).toBeNull()
          expect(nextRevision, 'Scheduled robot play must progress without client robot moves').toBeTruthy()
          expect(nextRevision.publicState.serverTimeMs).toBeGreaterThanOrEqual(state.pendingAction.dueAt)
        }
      }
      expect(cleared.size).toBe(13)
      expect(robotWaits).toBeGreaterThan(0)
    }
    const image = await pages[0].screenshot({ path: testInfo.outputPath('real-local-completed-board.png'), fullPage: true, animations: 'disabled' })
    await testInfo.attach('real-local-completed-board', { body: image, contentType: 'image/png' })
    await pages[0].getByRole('button', { name: 'Completed boards', exact: true }).click()
    const replay = pages[0].getByRole('dialog', { name: 'Completed-board replay' })
    const boardOption = replay.getByRole('combobox').locator('option').nth(1)
    await expect(boardOption).toHaveText(/Board 1/)
    await replay.getByRole('combobox').selectOption(await boardOption.getAttribute('value') as string)
    await expect(replay.getByText(/Final score NS/)).toBeVisible()
    await expect(replay.locator('.replay-hands section')).toHaveCount(4)
    const archive = frames[0].findLast(frame => frame.action === 'boardArchive')
    expect(archive?.board.initialHands.North).toHaveLength(13)
    expect(archive?.board.tricks).toHaveLength(13)
    await replay.getByRole('button', { name: 'End', exact: true }).click()
    await expect(replay.getByRole('status')).toContainText('won by')
    await pages[0].keyboard.press('Escape')
    await pages[0].getByRole('button', { name: 'Convention card', exact: true }).click()
    const card = pages[0].getByRole('dialog', { name: 'Partnership convention card' })
    await expect(card.getByRole('heading', { name: 'Supported agreements' })).toBeVisible()
    await expect(card.getByRole('heading', { name: 'Unsupported sections' })).toBeVisible()
    await pages[0].keyboard.press('Escape')
    await pages[0].getByRole('button', { name: 'Deal next board', exact: true }).click()
    await expect(pages[0].locator('.auction-panel')).toBeVisible()
    await expect(pages[1].locator('.auction-panel')).toBeVisible()
    expect(frames[0].some(frame => frame.action === 'boardStarted')).toBe(true)
  } finally {
    await Promise.allSettled(contexts.map(context => context.close()))
  }
})
