import { expect, test, Page } from '@playwright/test';

test.beforeEach(() => {
  if (process.env.BRIDGE_LIVE_E2E !== '1') return;
  expect(process.env.VITE_WS_ENDPOINT).toMatch(
    /^ws:\/\/(?:127\.0\.0\.1|localhost):\d+\/?$/
  );
  expect(process.env.VITE_API_BASE_URL).toMatch(
    /^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/?$/
  );
});

async function createPrivateRoom(page: Page) {
  await page.goto('/');
  await page.getByTestId('create-player-name-input').fill('P1 owner');
  await page
    .getByTestId('create-room-name-input')
    .fill(`P1 local ${Date.now()}`);
  await page.getByTestId('private-room-checkbox').check();
  await page.getByTestId('create-room-button').click();
  await expect(
    page.getByRole('heading', { name: 'Ready for a hand?' })
  ).toBeVisible();
}

test('real private invitation lock, ownership transfer and explicit seat release', async ({
  browser,
}) => {
  test.skip(
    process.env.BRIDGE_LIVE_E2E !== '1',
    'Requires an isolated local adapter.'
  );
  const contexts = [
    await browser.newContext({ baseURL: 'http://127.0.0.1:4201' }),
    await browser.newContext({ baseURL: 'http://127.0.0.1:4201' }),
  ];
  try {
    const owner = await contexts[0].newPage();
    const guest = await contexts[1].newPage();
    await createPrivateRoom(owner);
    await owner
      .getByText('Room membership and access', { exact: true })
      .click();
    await owner
      .getByRole('button', { name: 'Create / copy private invitation' })
      .click();
    const invitationText = await owner.locator('.invite-link').innerText();
    const invitationUrl = invitationText.match(/http:\/\/\S+/)?.[0];
    expect(invitationUrl).toBeTruthy();
    expect(new URL(invitationUrl!).hash).toContain('invitationToken=');
    await owner.getByRole('button', { name: 'Lock room', exact: true }).click();
    await expect(
      owner.getByRole('button', { name: 'Unlock room', exact: true })
    ).toBeVisible();
    await guest.goto(invitationUrl!);
    await guest
      .getByRole('textbox', { name: 'Your name', exact: true })
      .fill('Invited P1 guest');
    await guest.getByRole('button', { name: 'Join this room' }).click();
    await expect(guest.getByRole('status').first()).toContainText(/lock/i);
    await owner
      .getByRole('button', { name: 'Unlock room', exact: true })
      .click();
    await expect(
      owner.getByRole('button', { name: 'Lock room', exact: true })
    ).toBeVisible();
    await guest.getByRole('button', { name: 'Join this room' }).click();
    await expect(
      guest.getByRole('heading', { name: 'Ready for a hand?' })
    ).toBeVisible();
    expect(new URL(guest.url()).hash).toBe('');
    await expect(owner.getByText('2 of 4 seats occupied')).toBeVisible();
    await owner.getByRole('button', { name: /Make .* owner/ }).click();
    await guest
      .getByText('Room membership and access', { exact: true })
      .click();
    await expect(
      guest.getByRole('button', { name: 'Start game', exact: true })
    ).toBeVisible();
    await expect(
      owner.getByRole('button', { name: 'Leave room and release seat' })
    ).toBeEnabled();
    await owner
      .getByRole('button', { name: 'Leave room and release seat' })
      .click();
    await expect(owner.getByTestId('app-title')).toBeVisible();
    await expect(guest.getByText('1 of 4 seats occupied')).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test('real solo practice speed is explicitly applied and persisted after server confirmation', async ({
  page,
}) => {
  test.skip(
    process.env.BRIDGE_LIVE_E2E !== '1',
    'Requires an isolated local adapter.'
  );
  await createPrivateRoom(page);
  await expect(
    page.getByText('Solo practice pace', { exact: true })
  ).not.toBeVisible();
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(
    page.getByText('Solo practice pace', { exact: true })
  ).toBeVisible();
  await page.getByText('Solo practice pace', { exact: true }).click();
  await page.getByLabel('Practice speed').selectOption('quick');
  await expect(
    page.getByText('Server practice pace: 300 / 1000 ms')
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('bridge-player-preferences')!).state
          .practiceSpeed
    )
  ).toBe('quick');
  await page.reload();
  await page.getByText('Solo practice pace', { exact: true }).click();
  await expect(page.getByLabel('Practice speed')).toHaveValue('quick');
  await expect(
    page.getByText('Server practice pace: 300 / 1000 ms')
  ).toBeVisible();
});
