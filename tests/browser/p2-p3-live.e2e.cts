import { expect, test, Page, BrowserContext, Browser } from '@playwright/test';

async function createRoom(page: Page, name: string, isPrivate = false) {
  await page.goto('/');
  await page.getByTestId('create-player-name-input').fill(name);
  await page.getByTestId('create-room-name-input').fill(`${name} ${Date.now()}`);
  if (isPrivate) await page.getByTestId('private-room-checkbox').check();
  await page.getByTestId('create-room-button').click();
  await expect(page.getByRole('heading', { name: 'Ready for a hand?' })).toBeVisible();
}
async function contexts(browser: Browser, count: number, width: number) {
  const result: BrowserContext[] = [];
  for (let index = 0; index < count; index++)
    result.push(await browser.newContext({ baseURL: 'http://127.0.0.1:4201', viewport: { width, height: 1000 }, reducedMotion: 'reduce' }));
  return result;
}
async function finishSoloAuctionAndConcede(page: Page, beforeConcede?: () => Promise<void>) {
  // All actions still go through the real UI and authoritative legal choices.
  for (let step = 0; step < 240; step++) {
    if (await page.getByRole('region', { name: 'Board result' }).isVisible()) return;
    const concede = page.getByRole('button', { name: 'Concede all remaining tricks' });
    if (await concede.isVisible() && await concede.isEnabled()) {
      if (beforeConcede) await beforeConcede();
      await concede.click();
      await expect(page.getByRole('region', { name: 'Board result' })).toBeVisible();
      return;
    }
    const pass = page.getByRole('button', { name: 'Pass', exact: true });
    if (await pass.isVisible() && await pass.isEnabled()) {
      const levelSeven = page.getByRole('button', { name: 'Level 7', exact: true });
      if (await levelSeven.isEnabled()) {
        // A fresh strain keeps the learner declarer, not dummy for a robot partner.
        const calls = await page.locator('.auction-history > span').allTextContents();
        const strain = [['NT', 'NT'], ['S', '♠'], ['H', '♥'], ['D', '♦'], ['C', '♣']]
          .find(([, symbol]) => !calls.some((call) => call.includes(symbol)))?.[0];
        await levelSeven.click();
        const bid = page.getByRole('button', { name: `Bid 7${strain}`, exact: true });
        if (strain && await bid.isEnabled()) await bid.click();
        else await pass.click();
      } else await pass.click();
    }
    await page.waitForTimeout(250);
  }
  throw new Error('No legal human concession or passed-out result within bounded wait.');
}
async function refreshEvent(page: Page) {
  const panel = page.locator('.duplicate-tables');
  if (!(await panel.evaluate((node) => (node as HTMLDetailsElement).open)))
    await page.getByText('Duplicate club tables', { exact: true }).click();
  await page.getByRole('button', { name: 'Refresh event scores' }).click();
}

test('real private invitation revocation and expiry fail visibly for a second signed client', async ({ browser }) => {
  const clients = await contexts(browser, 2, 390);
  try {
    const owner = await clients[0].newPage();
    const guest = await clients[1].newPage();
    await createRoom(owner, 'Invitation administrator', true);
    await owner.getByText('Room membership and access', { exact: true }).click();
    await owner.getByLabel('New invitation lifetime').selectOption('60');
    await owner.getByRole('button', { name: 'Create / copy private invitation' }).click();
    await expect(owner.getByText(/Invitation ID:/)).toBeVisible();
    const link = (await owner.locator('.invite-link').innerText()).match(/http:\/\/\S+/)![0];
    await owner.getByRole('button', { name: 'Revoke this invitation' }).click();
    await expect(owner.getByText('Invitation revoked by server.')).toBeVisible();
    await guest.goto(link);
    await guest.getByRole('textbox', { name: 'Your name', exact: true }).fill('Rejected guest');
    await guest.getByRole('button', { name: 'Join this room' }).click();
    await expect(guest.getByRole('status').first()).toContainText(/invitation/i);
    await expect(guest.getByRole('heading', { name: 'Ready for a hand?' })).not.toBeVisible();
    const expiredLink = await owner.evaluate(async () => {
      // Exercise the supported one-second API lifetime without mocking expiry or membership.
      const { featureRequest } = await import('/src/services/boardFeaturesService.ts');
      const roomId = location.pathname.split('/').pop()!;
      const reply = await featureRequest(roomId, 'createInvitation', 'roomInvitation', { expiresInSeconds: 1 });
      return `${location.origin}${location.pathname}#${new URLSearchParams({ roomId, invitationToken: reply.invitationToken })}`;
    });
    await owner.waitForTimeout(1500);
    await guest.goto(expiredLink);
    await guest.getByRole('textbox', { name: 'Your name', exact: true }).fill('Expired guest');
    await guest.getByRole('button', { name: 'Join this room' }).click();
    await expect(guest.getByRole('status').first()).toContainText(/invitation/i);
    await expect(guest.getByRole('heading', { name: 'Ready for a hand?' })).not.toBeVisible();
  } finally { await Promise.all(clients.map((client) => client.close())); }
});

for (const width of [390, 1440]) {
  test(`real guided practice policy, concession and cumulative archive at ${width}px`, async ({ browser }) => {
    const clients = await contexts(browser, 1, width);
    try {
      const page = await clients[0].newPage();
      await createRoom(page, 'Practice learner', true);
      await page.getByRole('button', { name: 'Start game', exact: true }).click();
      await page.getByText('Guided solo practice', { exact: true }).click();
      await expect(page.getByRole('button', { name: 'Explain legal actions' })).toBeEnabled();
      await page.getByRole('button', { name: 'Explain legal actions' }).click();
      await expect(page.getByRole('region', { name: 'Practice explanation' })).toContainText('Legal actions:');
      await page.getByLabel('Computer play policy').selectOption('heuristic');
      await expect(page.getByLabel('Computer play policy')).toHaveValue('heuristic');
      await page.reload();
      await page.getByText('Guided solo practice', { exact: true }).click();
      await expect(page.getByLabel('Computer play policy')).toHaveValue('heuristic');
      let receivedPlayHint = false;
      await finishSoloAuctionAndConcede(page, async () => {
        await page.getByRole('button', { name: 'Ask for a practice hint' }).click();
        await expect(page.getByRole('region', { name: 'Practice explanation' })).toContainText('Suggested card:');
        receivedPlayHint = true;
      });
      expect(receivedPlayHint).toBe(true);
      await page.getByRole('button', { name: 'Completed boards' }).click();
      await expect(page.getByRole('region', { name: 'Match scoreboard' })).toContainText('1 completed boards');
      await page.getByLabel('Completed board', { exact: true }).selectOption({ index: 1 });
      await expect(page.getByLabel('Replay steps')).toBeVisible();
      await page.getByRole('button', { name: 'End', exact: true }).click();
      await expect(page.locator('.replay-content')).toContainText(/Initial|won|allocation|pass/);
      await page.getByRole('button', { name: 'Close Completed-board replay' }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    } finally { await Promise.all(clients.map((client) => client.close())); }
  });

  test(`real four-human claim rejection, cancellation, unanimous settlement and replay at ${width}px`, async ({ browser }, testInfo) => {
    const clients = await contexts(browser, 4, width);
    try {
      const pages = await Promise.all(clients.map((client) => client.newPage()));
      const owner = pages[0];
      await createRoom(owner, 'Claim organizer', true);
      await owner.getByText('Room membership and access', { exact: true }).click();
      await owner.getByRole('button', { name: 'Create / copy private invitation' }).click();
      const text = await owner.locator('.invite-link').innerText();
      const link = text.match(/http:\/\/\S+/)![0];
      for (let index = 1; index < pages.length; index++) {
        await pages[index].goto(link);
        await pages[index].getByRole('textbox', { name: 'Your name', exact: true }).fill(`Human ${index + 1}`);
        await pages[index].getByRole('button', { name: 'Join this room' }).click();
        await expect(pages[index].getByRole('heading', { name: 'Ready for a hand?' })).toBeVisible();
      }

      await owner.getByRole('button', { name: 'Start game', exact: true }).click();
      const bySeat: Record<string, Page> = {};
      for (const page of pages) {
        const table = page.getByRole('region', { name: /Bridge table. You are/ });
        await expect(table).toBeVisible();
        const name = await table.getAttribute('aria-label');
        bySeat[name!.split('You are ')[1]] = page;
      }
      await bySeat.North.getByRole('button', { name: 'Bid 1NT', exact: true }).click();
      for (const seat of ['East', 'South', 'West'])
        await bySeat[seat].getByRole('button', { name: 'Pass', exact: true }).click();
      let proposer = bySeat.East;
      const rejector = bySeat.North;
      await expect(proposer.getByRole('button', { name: 'Propose claim' })).toBeEnabled();
      const handBefore = await proposer.locator('.face-up .table-card').allTextContents();
      await proposer.getByRole('button', { name: 'Propose claim' }).click();
      await expect(rejector.getByRole('button', { name: 'Reject and resume play' })).toBeVisible();
      await expect(proposer.locator('.face-up .table-card:enabled')).toHaveCount(0);
      await rejector.getByRole('button', { name: 'Reject and resume play' }).focus();
      await rejector.keyboard.press('Enter');
      await expect(proposer.getByRole('button', { name: 'Propose claim' })).toBeEnabled();
      expect(await proposer.locator('.face-up .table-card').allTextContents()).toEqual(handBefore);
      await proposer.getByRole('button', { name: 'Propose claim' }).click();
      await proposer.getByRole('button', { name: 'Cancel proposal' }).click();
      await expect(proposer.getByRole('button', { name: 'Propose claim' })).toBeEnabled();
      await proposer.locator('.face-up .table-card:enabled').first().focus();
      await proposer.keyboard.press('Enter');
      proposer = bySeat.North;
      await expect(proposer.getByRole('button', { name: 'Propose claim' })).toBeEnabled();
      await proposer.getByRole('button', { name: 'Propose claim' }).click();
      await expect(proposer.getByRole('button', { name: 'Cancel proposal' })).toBeVisible();
      await proposer.screenshot({ path: testInfo.outputPath('claim-pending.png'), fullPage: true });
      for (const seat of ['East', 'South', 'West']) {
        await bySeat[seat].getByRole('button', { name: 'Accept allocation' }).click();
        if (seat !== 'West')
          for (const page of pages)
            await expect(page.getByText(`${seat}: Accepted`, { exact: true })).toBeVisible();
      }
      for (const page of pages)
        await expect(page.getByRole('region', { name: 'Board result' })).toBeVisible();
      await owner.getByRole('button', { name: 'Completed boards' }).click();
      await owner.getByLabel('Completed board', { exact: true }).selectOption({ index: 1 });
      await expect(owner.getByText(/Settled by consent, not 52 played cards/)).toBeVisible();
      await owner.getByRole('button', { name: 'End', exact: true }).click();
      await expect(owner.locator('.replay-content')).toContainText('Accepted claim allocation');
      await expect(owner.locator('.replay-content')).toContainText('Unfinished trick');
      await owner.getByRole('button', { name: 'Close Completed-board replay' }).click();
      await owner.getByRole('button', { name: 'Deal next board' }).click();
      await expect(owner.locator('.board-meta')).toContainText('Board 2');
      await expect(owner.getByText(/Proposal accepted/)).not.toBeVisible();
      expect(await proposer.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    } finally { await Promise.all(clients.map((client) => client.close())); }
  });

  for (const tableCount of [2, 3]) test(`real ${tableCount}-table duplicate event embargo, comparison release and final-board guard at ${width}px`, async ({ browser }, testInfo) => {
    const clients = await contexts(browser, tableCount, width);
    try {
      const pages = await Promise.all(clients.map((client) => client.newPage()));
      const [owner, other] = pages;
      await createRoom(owner, 'Duplicate first');
      for (let index = 1; index < pages.length; index++)
        await createRoom(pages[index], `Duplicate ${index + 1}`);
      await owner.getByText('Duplicate club tables', { exact: true }).click();
      await owner.getByLabel('Event tables').selectOption(String(tableCount));
      const boardCount = tableCount === 2 && width === 1440 ? 2 : 1;
      await owner.getByLabel('Event boards').selectOption(String(boardCount));
      await owner.getByRole('button', { name: 'Create duplicate event' }).click();
      const share = await owner.locator('.duplicate-tables .invite-link').innerText();
      const eventId = share.match(/event code (\S+) ·/)![1];
      const token = share.match(/invitation token (\S+)\./)![1];
      for (let index = 1; index < pages.length; index++) {
        const page = pages[index];
        await page.getByText('Duplicate club tables', { exact: true }).click();
        await page.getByLabel('Event code', { exact: true }).fill(eventId);
        await page.getByLabel('Event invitation token', { exact: true }).fill(token);
        await page.getByRole('button', { name: 'Join event with this table' }).click();
        await expect(page.getByText(new RegExp(`Your table ${index + 1}`))).toBeVisible();
      }
      await refreshEvent(owner);
      await owner.getByRole('button', { name: 'Start all event tables' }).click();
      for (const page of pages) {
        await expect(page.getByText('Guided solo practice', { exact: true })).not.toBeVisible();
        await expect(page.getByText('Solo practice pace', { exact: true })).not.toBeVisible();
      }
      await finishSoloAuctionAndConcede(owner);
      await refreshEvent(owner);
      await expect(owner.getByText(`Waiting for other tables · 1/${tableCount} finished · replay locked`)).toBeVisible();
      await owner.getByRole('button', { name: 'Completed boards' }).click();
      await expect(owner.getByText('No completed boards are archived yet.')).toBeVisible();
      await owner.getByRole('button', { name: 'Close Completed-board replay' }).click();
      for (const page of pages.slice(1)) await finishSoloAuctionAndConcede(page);
      await refreshEvent(owner);
      await expect(owner.getByText('Released · replay available at your table')).toBeVisible();
      await expect(owner.getByText(`Released-board totals only · ${tableCount === 2 ? 'IMPs' : 'matchpoints'}`)).toBeVisible();
      if (boardCount === 2) {
        await owner.getByRole('button', { name: 'Deal next board' }).click();
        await expect(owner.locator('.board-meta')).toContainText('Board 2');
        await owner.getByRole('button', { name: 'Completed boards' }).click();
        await owner.getByLabel('Completed board', { exact: true }).selectOption({ index: 1 });
        await expect(owner.getByLabel('Replay steps')).toBeVisible();
        await owner.getByRole('button', { name: 'Close Completed-board replay' }).click();
        await other.getByRole('button', { name: 'Deal next board' }).click();
        await expect(other.locator('.board-meta')).toContainText('Board 2');
        for (const page of pages) await finishSoloAuctionAndConcede(page);
        await refreshEvent(owner);
        await expect(owner.getByText('Released · replay available at your table')).toHaveCount(2);
      }
      await expect(owner.getByRole('button', { name: 'Deal next board' })).not.toBeVisible();
      await owner.screenshot({ path: testInfo.outputPath('duplicate-results.png'), fullPage: true });
      await owner.getByRole('button', { name: 'Completed boards' }).click();
      await owner.getByLabel('Completed board', { exact: true }).selectOption({ index: 1 });
      await expect(owner.getByLabel('Replay steps')).toBeVisible();
      await owner.getByRole('button', { name: 'Close Completed-board replay' }).click();
      await other.reload();
      await other.getByText('Duplicate club tables', { exact: true }).click();
      await expect(other.getByText('Released · replay available at your table').first()).toBeVisible();
      expect(await other.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    } finally { await Promise.all(clients.map((client) => client.close())); }
  });
}
