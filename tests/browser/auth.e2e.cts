import { expect, test } from '@playwright/test'

const password = 'BrowserAuth123!'
async function signup(page, username: string) {
  await page.goto('/create-account')
  await page.getByLabel('Username', { exact: true }).fill(username)
  await page.getByLabel('Email Address').fill(`${username}@example.test`)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm Password').fill(password)
  await page.getByRole('button', { name: 'Create Account', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Account created successfully! Redirecting to login...')
  await expect(page).toHaveURL(/\/login$/)
}
async function login(page, username: string, value = password) {
  await page.getByLabel('Username', { exact: true }).fill(username)
  await page.getByLabel('Password', { exact: true }).fill(value)
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
}
async function identity(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('bridge-user-storage')!).state)
}

test('real signup, validation, duplicate, wrong login, account room, reload and cookie logout', async ({ page, context }) => {
  const username = `browser-${Date.now()}`
  await page.goto('/create-account')
  await page.getByLabel('Username', { exact: true }).fill(username)
  await page.getByLabel('Email Address').fill(`${username}@example.test`)
  await page.getByLabel('Password', { exact: true }).fill('weak')
  await page.getByLabel('Confirm Password').fill('weak')
  await page.getByRole('button', { name: 'Create Account', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Password must be at least 8 characters long')
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm Password').fill('Different123!')
  await page.getByRole('button', { name: 'Create Account', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Passwords do not match')
  await signup(page, username)

  await page.goto('/create-account')
  await page.getByLabel('Username', { exact: true }).fill(username)
  await page.getByLabel('Email Address').fill(`${username}@example.test`)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm Password').fill(password)
  await page.getByRole('button', { name: 'Create Account', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('already exists')
  await expect(page.getByRole('status')).toHaveCount(0)
  await page.getByRole('link', { name: 'Sign in here' }).click()
  await login(page, username, 'Wrong123!')
  await expect(page.getByRole('alert')).toContainText('Invalid username')
  await expect(page).toHaveURL(/\/login$/)
  await login(page, username)
  await expect(page).toHaveURL(/4201\/$/)
  await expect(page.getByText(`Signed in as ${username}`)).toBeVisible()
  const account = await identity(page)
  expect(account.userId).toBe(account.user.userId)
  expect(account.accessToken).toBeUndefined()
  expect((await context.cookies()).find(cookie => cookie.name === 'refresh_token')?.httpOnly).toBe(true)

  await page.getByLabel('Room name').fill('Signed account room')
  await page.getByTestId('create-room-button').click()
  await expect(page.getByRole('heading', { name: 'Ready for a hand?' })).toBeVisible()
  const roomUrl = page.url()
  const refreshed = page.waitForResponse(response => response.url().endsWith('/api/auth/refresh'))
  await page.reload()
  expect((await refreshed).status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Ready for a hand?' })).toBeVisible()
  expect(page.url()).toBe(roomUrl)
  expect((await identity(page)).userId).toBe(account.userId)

  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toBeVisible()
  const loggedOut = page.waitForResponse(response => response.url().endsWith('/api/logout'))
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  const result = await loggedOut
  expect(result.status()).toBe(200)
  expect((await result.allHeaders())['set-cookie']).toContain('Max-Age=0')
  await expect(page.getByTestId('login-button')).toBeVisible()
  expect((await context.cookies()).some(cookie => cookie.name === 'refresh_token')).toBe(false)
  expect(await identity(page)).toMatchObject({ userId: null, user: null, wasAuthenticated: false })
  expect(await page.evaluate(() => sessionStorage.getItem('bridge-guest-session'))).toBeNull()
  const refresh = await context.request.post('/api/auth/refresh', { headers: { Origin: 'http://127.0.0.1:4201' } })
  expect(refresh.status()).toBe(400)
  await page.reload()
  await expect(page.getByTestId('login-button')).toBeVisible()
})

test('guest to account switches signed socket identity and cannot recover the guest seat', async ({ page }) => {
  const username = `switch-${Date.now()}`
  await signup(page, username)
  await page.goto('/')
  await page.getByLabel('Your name for a new room').fill('Before account')
  await page.getByLabel('Room name').fill('Guest identity room')
  await page.getByTestId('create-room-button').click()
  await expect(page.getByRole('heading', { name: 'Ready for a hand?' })).toBeVisible()
  const guestRoomUrl = page.url()
  const guestId = (await identity(page)).userId
  expect(guestId).toMatch(/^guest_/)

  // Keep the guest socket alive while switching routes, as client navigation does.
  await page.evaluate(() => {
    history.pushState({}, '', '/login')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible()
  await login(page, username)
  await expect(page.getByText(`Signed in as ${username}`)).toBeVisible()
  const accountId = (await identity(page)).userId
  expect(accountId).not.toBe(guestId)
  expect(await page.evaluate(() => sessionStorage.getItem('bridge-guest-session'))).toBeNull()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bridge-room-data-storage') || '{}').state?.currentRoom ?? null)).toBeNull()
  await page.getByLabel('Room name').fill('Account identity room')
  await page.getByTestId('create-room-button').click()
  await expect(page.getByRole('heading', { name: 'Ready for a hand?' })).toBeVisible()
  expect((await identity(page)).userId).toBe(accountId)
  await page.goto(guestRoomUrl)
  await expect(page.locator('main p[role="status"]')).toContainText('User is not seated in this room')
  await expect(page.getByRole('heading', { name: 'Ready for a hand?' })).toHaveCount(0)
})
