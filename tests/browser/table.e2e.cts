import { expect, test, Page } from '@playwright/test'
import { snapshot } from '../frontend/fixtures'

async function assertNoHorizontalOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    viewport: window.innerWidth, page: document.documentElement.scrollWidth,
    overflowing: [...document.querySelectorAll('body *')].map(element => ({
      tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right,
    })).filter(element => element.right > window.innerWidth + 1).slice(0, 12),
  }))
  expect(layout.page, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport)
}
async function mockTable(page: Page, options: { sideDummy?: boolean; bidding?: boolean; selection?: boolean } = {}) {
  const sent: any[] = []
  let publish = (_action = 'gameState') => {}
  const state: any = snapshot()
  state.publicState.currentTrick = []
  state.publicState.previousTrick = null
  state.publicState.tricks = []
  state.publicState.handCounts = { North: 13, East: 13, South: 13, West: 13 }
  state.publicState.dummyHand = ['TH', '9H', '8H', '7H', '6H', 'AC', 'KC', 'QC', 'JC', 'TC', '9C', '8C', '7C']
  state.privateState.hand = ['AH', 'KH', 'QH', 'JH', 'AS', 'KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S']
  if (options.selection) state.privateState.legalCards = ['TC']
  if (options.sideDummy) {
    state.publicState.dummy = 'West'
    state.publicState.declarer = 'East'
    state.privateState.isMyTurn = false
    state.privateState.isDeclarer = false
    state.privateState.playSeat = null
    state.privateState.legalCards = []
  }
  if (options.bidding) {
    state.publicState.currentPhase = 'bidding'
    state.publicState.turn = 'North'
    state.publicState.dummy = null
    state.publicState.dummyHand = null
    state.publicState.contract = null
    state.privateState.validBids = ['pass', '1H', '1S', '1NT']
  }
  await page.addInitScript(() => {
    localStorage.setItem('bridge-user-storage', JSON.stringify({ state: { userId: 'me', playerName: 'Browser player', wasAuthenticated: false }, version: 0 }))
  })
  await page.route('**/api/auth/guest', route => route.fulfill({
    json: { userId: 'me', username: 'Guest', accessToken: 'browser-test-credential', expiresIn: 86400, isGuest: true, tokenType: 'Bearer' },
  }))
  await page.routeWebSocket(/.*/, socket => {
    publish = (action = 'gameState') => socket.send(JSON.stringify({ ...state, action }))
    socket.onMessage(raw => {
      const message = JSON.parse(String(raw))
      sent.push(message)
      if (message.action === 'getGameState') socket.send(JSON.stringify({ ...state, action: 'gameState' }))
      if (message.action === 'playCard') {
        state.publicState.dummyHand = state.publicState.dummyHand.filter((card: string) => card !== message.data.card)
        state.publicState.currentTrick = [{ seat: 'South', card: message.data.card }]
        state.publicState.handCounts.South = 12
        state.publicState.turn = 'West'
        state.publicState.revision += 1
        state.privateState.isMyTurn = false
        state.privateState.playSeat = null
        state.privateState.legalCards = []
        socket.send(JSON.stringify({ ...state, action: 'cardPlayed' }))
      }
    })
  })
  await page.goto('/room/table-1')
  await expect(page.getByRole('heading', { name: 'Club table' })).toBeVisible()
  return { sent, state, publish: (action?: string) => publish(action) }
}

for (const width of [360, 1440]) {
  test(`declarer plays dummy with keyboard at ${width}px without horizontal overflow`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 360 ? 800 : 1000 })
    const { sent } = await mockTable(page)
    const dummy = page.getByRole('region', { name: 'South hand, dummy' })
    await expect(dummy).toHaveClass(/seat-north/)
    await expect(page.getByRole('region', { name: 'North hand' })).toHaveClass(/seat-south/)
    const legal = dummy.getByRole('button', { name: 'Play 10 of hearts' })
    await expect(legal).toBeEnabled()
    await expect(page.getByRole('button', { name: 'A of hearts', exact: true })).toBeDisabled()
    const image = await page.screenshot({ path: testInfo.outputPath(`table-${width}.png`), fullPage: true, animations: 'disabled' })
    await testInfo.attach(`table-${width}`, { body: image, contentType: 'image/png' })
    await assertNoHorizontalOverflow(page)
    await legal.focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => sent.filter(message => message.action === 'playCard')).toHaveLength(1)
    expect(sent.find(message => message.action === 'playCard').data.card).toBe('TH')
    await expect(dummy.getByRole('button', { name: '10 of hearts', exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Current trick').getByRole('button', { name: '10 of hearts', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('region', { name: 'North hand' })).toBeVisible()
    await expect.poll(() => sent.filter(message => message.action === 'getGameState')).toHaveLength(2)
  })
}

test('mobile defender sees a complete side dummy without controlling it; reduced motion is respected', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const { sent } = await mockTable(page, { sideDummy: true })
  const dummy = page.getByRole('region', { name: 'West hand, dummy' })
  await expect(dummy).toHaveClass(/seat-east/)
  await expect(dummy.getByRole('button')).toHaveCount(13)
  for (const button of await dummy.getByRole('button').all()) await expect(button).toBeDisabled()
  const bottomOfDummy = await dummy.getByRole('button').evaluateAll(cards => Math.max(...cards.map(card => card.getBoundingClientRect().bottom)))
  const ownHand = await page.getByRole('region', { name: 'North hand' }).locator('.hand-fan').boundingBox()
  expect(bottomOfDummy).toBeLessThan(ownHand!.y)
  expect(await page.locator('.table-card').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none')
  const image = await page.screenshot({ path: testInfo.outputPath('mobile-side-dummy.png'), fullPage: true })
  await testInfo.attach('mobile-side-dummy', { body: image, contentType: 'image/png' })
  await assertNoHorizontalOverflow(page)
  expect(sent.some(message => message.action === 'playCard')).toBe(false)
})

test('mobile auction exposes only server-valid bids', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await mockTable(page, { bidding: true })
  await expect(page.getByRole('button', { name: 'Double', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Bid 1C' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Bid 1H' })).toBeEnabled()
  const bid = page.getByRole('button', { name: 'Bid 1H' })
  await bid.scrollIntoViewIfNeeded()
  await expect(bid).toBeInViewport()
  const image = await page.screenshot({ path: testInfo.outputPath('mobile-auction.png'), fullPage: true, animations: 'disabled' })
  await testInfo.attach('mobile-auction', { body: image, contentType: 'image/png' })
  await assertNoHorizontalOverflow(page)
})

for (const width of [360, 1440]) {
  test(`card focus and pointer lift preserve fan position and stacking at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    const { sent } = await mockTable(page, { selection: true })
    const hand = page.getByRole('region', { name: 'South hand, dummy' }).locator('.hand-fan')
    const legal = hand.getByRole('button', { name: 'Play 10 of clubs' })
    await expect(legal).toBeEnabled()
    // Wait for the staggered deal to finish before checking the independent lift.
    await page.waitForTimeout(800)
    const before = await hand.getByRole('button').evaluateAll(cards => cards.map(card => ({
      name: card.getAttribute('aria-label'), x: card.getBoundingClientRect().x,
      z: getComputedStyle(card).zIndex,
    })))
    const box = await legal.boundingBox()
    await legal.focus()
    await expect.poll(() => legal.evaluate(card => getComputedStyle(card).transform)).toBe('matrix(1, 0, 0, 1, 0, -6)')
    await page.mouse.move(box!.x + 4, box!.y + 4)
    const after = await hand.getByRole('button').evaluateAll(cards => cards.map(card => ({
      name: card.getAttribute('aria-label'), x: card.getBoundingClientRect().x,
      z: getComputedStyle(card).zIndex,
    })))
    expect(after).toEqual(before)
    expect(await legal.evaluate(card => card.getBoundingClientRect().y)).toBeCloseTo(box!.y - 6, 0)
    await page.mouse.click(box!.x + 4, box!.y + 4)
    await expect.poll(() => sent.filter(message => message.action === 'playCard')).toHaveLength(1)
    expect(sent.find(message => message.action === 'playCard').data.card).toBe('TC')
  })
}

test('authoritative trick clearing gates next lead and final result, including reduced motion', async ({ page }) => {
  const { state, publish, sent } = await mockTable(page)
  state.publicState.completedTrick = snapshot().publicState.previousTrick
  state.publicState.pendingAction = { kind: 'clearTrick', dueAt: 2200 }
  state.publicState.serverTimeMs = 1000
  state.publicState.revision += 1
  publish('cardPlayed')
  const trick = page.getByLabel('Current trick')
  await expect(trick.getByRole('button')).toHaveCount(4)
  await expect(page.getByRole('status')).toContainText('Collecting trick')
  const hand = page.getByRole('region', { name: 'South hand, dummy' })
  for (const card of await hand.getByRole('button').all()) await expect(card).toBeDisabled()
  await page.waitForTimeout(1250)
  expect(await trick.locator('.collect-trick').first().evaluate(card => getComputedStyle(card).opacity)).toBe('0')
  expect(sent.some(message => message.action === 'playCard')).toBe(false)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  state.publicState.currentPhase = 'completed'
  state.publicState.revision += 1
  publish()
  await expect(page.getByRole('region', { name: 'Board result' })).toHaveCount(0)
  state.publicState.completedTrick = null
  state.publicState.pendingAction = null
  state.publicState.revision += 1
  publish('trickCleared')
  await expect(trick.getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Board result' })).toBeVisible()
})
