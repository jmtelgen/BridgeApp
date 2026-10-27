import { expect, test } from '@playwright/test';
import { snapshot } from '../frontend/fixtures';

for (const width of [390, 1440]) {
  test(`P1 presence, authorized replay, convention card and preferences at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const state: any = snapshot();
    const agreement = { system: 'SAYC', version: 'sayc-supported-1' };
    state.room.locked = false;
    state.room.presence = {
      North: { status: 'online', connectionCount: 2 },
      East: { status: 'robot', connectionCount: 0 },
      South: {
        status: 'reconnecting',
        connectionCount: 0,
        reservedUntil: Date.now() / 1000 + 120,
      },
      West: { status: 'offline', connectionCount: 0 },
    };
    state.publicState.agreements = { NS: agreement, EW: agreement };
    const archive = {
      schemaVersion: 1,
      roomId: 'table-1',
      boardId: 'finished-1',
      boardNumber: 1,
      completedAt: 1000,
      dealer: 'North',
      vulnerability: 'None',
      initialHands: {
        North: ['2C', 'AS'],
        East: ['2S'],
        South: ['3S'],
        West: ['4S'],
      },
      auction: [
        { seat: 'North', bid: '1NT' },
        { seat: 'East', bid: 'pass' },
      ],
      tricks: [
        {
          leader: 'North',
          plays: [
            { seat: 'North', card: 'AS' },
            { seat: 'East', card: '2S' },
            { seat: 'South', card: '3S' },
            { seat: 'West', card: '4S' },
          ],
          winner: 'North',
        },
      ],
      contract: '1NT',
      contractMultiplier: 1,
      declarer: 'North',
      result: { passedOut: false, scoreNS: 90, scoreEW: -90 },
      agreements: { NS: agreement, EW: agreement },
    };
    const sent: any[] = [];
    await page.route('**/api/auth/guest', (route) =>
      route.fulfill({
        json: {
          userId: 'me',
          username: 'Guest',
          accessToken: 'local-contract-test',
          expiresIn: 86400,
          isGuest: true,
        },
      })
    );
    await page.routeWebSocket(/.*/, (socket) =>
      socket.onMessage((raw) => {
        const message = JSON.parse(String(raw));
        sent.push(message);
        if (message.action === 'getGameState')
          socket.send(JSON.stringify(state));
        if (message.action === 'listBoardArchives')
          socket.send(
            JSON.stringify({
              action: 'boardArchives',
              roomId: 'table-1',
              boards: [archive],
            })
          );
        if (message.action === 'getMatchScoreboard')
          socket.send(JSON.stringify({ action: 'matchScoreboard', roomId: 'table-1', scoreboard: { completedBoards: 1, scoreNS: 90, scoreEW: -90, lastBoardId: 'finished-1' } }));
        if (message.action === 'getBoardArchive')
          socket.send(
            JSON.stringify({
              action: 'boardArchive',
              roomId: 'table-1',
              board: archive,
            })
          );
        if (message.action === 'getAgreementCard')
          socket.send(
            JSON.stringify({
              action: 'agreementCard',
              roomId: 'table-1',
              agreements: archive.agreements,
              card: {
                ...agreement,
                title: 'Supported SAYC',
                supported: [
                  { topic: 'Opening 1NT', description: 'Balanced 15–17 HCP' },
                ],
                unsupported: ['Weak jump shifts'],
                deviations: ['No overrides'],
                source: 'docs/robot-engine-contract.md',
              },
            })
          );
      })
    );
    await page.goto('/room/table-1');
    await expect(
      page.getByLabel('North presence: Online · 2 tabs')
    ).toBeVisible();
    await expect(page.getByLabel(/South presence: Reconnecting/)).toBeVisible();
    await expect(
      page.getByLabel('West presence: Offline · replacement eligible')
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute(
      'data-motion',
      'reduced'
    );
    await page
      .getByRole('button', { name: 'Completed boards', exact: true })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Completed-board replay' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('combobox').selectOption('finished-1');
    await expect(dialog.getByText('2♣ · A♠')).toBeVisible();
    await expect(dialog.getByText(/Final score NS 90/)).toBeVisible();
    const replay = dialog.getByLabel('Replay steps');
    await replay.focus();
    await page.keyboard.press('End');
    await expect(dialog.getByRole('status')).toContainText('won by North');
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('status')).toContainText('North: 1NT');
    const bounds = await dialog.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    await expect(
      dialog.getByRole('button', { name: 'Close Completed-board replay' })
    ).toBeInViewport();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: testInfo.outputPath(`p1-replay-${width}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Completed boards', exact: true })
    ).toBeFocused();
    await page
      .getByRole('button', { name: 'Convention card', exact: true })
      .click();
    const convention = page.getByRole('dialog', {
      name: 'Partnership convention card',
    });
    await expect(convention.getByText('Balanced 15–17 HCP')).toBeVisible();
    await expect(convention.getByText('Weak jump shifts')).toBeVisible();
    expect(await convention.getByRole('combobox').count()).toBe(0);
    await page.keyboard.press('Escape');
    await page.getByText('Player preferences', { exact: true }).click();
    await page.getByLabel('Motion', { exact: true }).selectOption('full');
    await expect(page.locator('html')).toHaveAttribute(
      'data-motion',
      'reduced'
    );
    await page.reload();
    await page.getByText('Player preferences', { exact: true }).click();
    await expect(page.getByLabel('Motion', { exact: true })).toHaveValue(
      'full'
    );
    await expect(
      page.getByRole('button', { name: 'Enable sound', exact: true })
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Enable sound', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Disable sound', exact: true })
    ).toBeVisible();
    await page.reload();
    await page.getByText('Player preferences', { exact: true }).click();
    await expect(
      page.getByRole('button', {
        name: 'Enable sound in this tab',
        exact: true,
      })
    ).toBeVisible();
    expect(
      sent.some(
        (message) =>
          message.action === 'getBoardArchive' &&
          message.data.boardId === 'finished-1'
      )
    ).toBe(true);
    expect(sent.some((message) => message.action === 'replacePlayer')).toBe(
      false
    );
  });
}
