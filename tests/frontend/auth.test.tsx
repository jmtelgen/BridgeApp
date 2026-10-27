import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CreateAccountPage from '../../src/components/bridge/components/auth/createAccount'
import LoginPage from '../../src/components/bridge/components/auth/login'
import { userAuthService } from '../../src/services/userAuthService'
import { tokenManager } from '../../src/services/tokenManager'
import { useUserStore } from '../../src/stores/userStore'
import { useRoomDataStore } from '../../src/stores/roomDataStore'
import { useGameStore } from '../../src/stores/gameStore'
import { websocketService } from '../../src/services/websocketService'
import { validatePassword } from '../../src/utils/passwordPolicy'
import { RoomManager } from '../../src/components/bridge/components/Room'

const user = { userId: 'signed-account', username: 'Account player', email: 'auth@example.test', createdAt: '' }
const expiresAt = Math.floor(Date.now() / 1000) + 900
const token = (userId = user.userId) => `header.${btoa(JSON.stringify({ userId, exp: expiresAt }))}.signature`
const reply = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data })
const loginData = () => ({ user, accessToken: token(), expiresIn: 900, tokenType: 'Bearer' })
const renderPage = (page: React.ReactNode) => render(
  <MemoryRouter><Routes><Route path="/" element={page} /><Route path="/login" element={<p>Login destination</p>} /></Routes></MemoryRouter>
)
function fillSignup(password = 'Strong123!', confirmation = password) {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'Account player' } })
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'auth@example.test' } })
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: confirmation } })
}
function submit(name: string) {
  fireEvent.submit(screen.getByRole('button', { name }).closest('form')!)
}
beforeEach(() => {
  useUserStore.getState().clearAuthData()
  sessionStorage.clear()
  localStorage.clear()
})
afterEach(() => {
  useUserStore.getState().clearAuthData()
  websocketService.disconnect()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('signup policy and accessible forms', () => {
  it.each([
    ['', 'at least 8'], ['Ab1!abc', 'at least 8'],
    ['a'.repeat(125) + 'A1!x', 'no more than 128'],
    ['ABCDEFG1!', 'lowercase'], ['abcdefg1!', 'uppercase'],
    ['Abcdefgh!', 'digit'], ['Abcdefg1/', 'special character'],
  ])('rejects invalid password %j', (password, reason) => {
    expect(validatePassword(password)).toContain(reason)
  })
  it.each(['Abcdef1!', 'a'.repeat(125) + 'A1!', 'Abcdef1?'])('accepts valid boundary password', password => {
    expect(validatePassword(password)).toBeNull()
  })
  it.each([
    ['Ab1!abc', 'Ab1!abc', 'at least 8'],
    ['Strong123!', 'Different123!', 'Passwords do not match'],
  ])('blocks weak passwords and mismatched confirmation before sending', (password, confirmation, message) => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    renderPage(<CreateAccountPage />)
    fillSignup(password, confirmation)
    submit('Create Account')
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute('aria-describedby', expect.stringContaining('password-hint'))
    expect(screen.getByLabelText('Confirm Password')).toHaveAttribute('maxlength', '128')
  })
  it('shows confirmed signup success and redirects to login', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({ statusCode: 201, body: JSON.stringify({ message: 'Created', user }) })))
    renderPage(<CreateAccountPage />)
    fillSignup()
    submit('Create Account')
    expect(await screen.findByRole('status')).toHaveTextContent('Account created successfully')
    expect(await screen.findByText('Login destination', {}, { timeout: 2500 })).toBeVisible()
  })
  it.each([true, false])('shows duplicate failure for envelope=%s without false success', async envelope => {
    const data = { message: 'An account with this username already exists', error: 'Username already exists' }
    vi.stubGlobal('fetch', vi.fn(async () => reply(envelope ? { statusCode: 409, body: JSON.stringify(data) } : data, envelope ? 200 : 409)))
    renderPage(<CreateAccountPage />)
    fillSignup()
    submit('Create Account')
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists')
    expect(screen.queryByRole('status')).toBeNull()
  })
  it('does not treat malformed signup success as an account', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({ message: 'OK' })))
    renderPage(<CreateAccountPage />)
    fillSignup()
    submit('Create Account')
    expect(await screen.findByRole('alert')).toHaveTextContent('did not confirm')
  })
})

describe('authentication transport and login', () => {
  it('keeps bad credentials on the login page without logging the response', async () => {
    const log = vi.spyOn(console, 'error')
    vi.stubGlobal('fetch', vi.fn(async () => reply({ statusCode: 401, body: JSON.stringify({ message: 'Invalid username or password' }) })))
    renderPage(<LoginPage />)
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'bad' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } })
    submit('Sign In')
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password')
    expect(useUserStore.getState().isAuthenticated).toBe(false)
    expect(log).not.toHaveBeenCalled()
  })
  it('sends login cookies and stores the signed identity', async () => {
    const fetch = vi.fn(async () => reply(loginData()))
    vi.stubGlobal('fetch', fetch)
    renderPage(<LoginPage />)
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: user.username } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Strong123!' } })
    submit('Sign In')
    await waitFor(() => expect(useUserStore.getState().isAuthenticated).toBe(true))
    expect(fetch).toHaveBeenCalledWith('/api/account/login', expect.objectContaining({ credentials: 'include', method: 'POST' }))
    expect(useUserStore.getState()).toMatchObject({ userId: user.userId, user, accessToken: token() })
  })
  it.each([
    { ...loginData(), accessToken: 'not-a-token' },
    { ...loginData(), accessToken: token('different-subject') },
  ])('rejects malformed or mismatched login identity', async data => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(data)))
    await expect(userAuthService.login({ username: 'user', password: 'Strong123!' })).rejects.toThrow('invalid account')
  })
  it('does not echo or log a non-JSON error response', async () => {
    const log = vi.spyOn(console, 'error')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => { throw new Error('private response') } })))
    await expect(userAuthService.createAccount({ username: 'user', email: user.email, password: 'Strong123!' })).rejects.toThrow('Account creation failed')
    expect(log).not.toHaveBeenCalled()
  })
})

describe('refresh, logout and identity boundaries', () => {
  it('restores a persisted account without retaining the access token on disk', async () => {
    useUserStore.getState().setAuthData(token(), user)
    const persisted = JSON.parse(localStorage.getItem('bridge-user-storage')!).state
    expect(persisted.accessToken).toBeUndefined()
    useUserStore.setState({ ...persisted, isAuthenticated: false, accessToken: null })
    vi.stubGlobal('fetch', vi.fn(async () => reply(loginData())))
    expect(await useUserStore.getState().attemptTokenRefresh()).toBe(true)
    expect(useUserStore.getState()).toMatchObject({ isAuthenticated: true, userId: user.userId })
  })
  it('deduplicates refresh and preserves the current room during reload refresh', async () => {
    useUserStore.setState({ user, userId: user.userId, wasAuthenticated: true, isAuthenticated: false })
    useRoomDataStore.setState({ currentRoom: { roomId: 'same-account-room' } as any })
    const fetch = vi.fn(async () => reply(loginData()))
    vi.stubGlobal('fetch', fetch)
    expect(await Promise.all([useUserStore.getState().attemptTokenRefresh(), useUserStore.getState().attemptTokenRefresh()])).toEqual([true, true])
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(useRoomDataStore.getState().currentRoom?.roomId).toBe('same-account-room')
  })
  it('calls server logout with cookies and clears account, guest, room and monitoring state', async () => {
    useUserStore.getState().setAuthData(token(), user)
    useUserStore.getState().setPosition('N')
    useRoomDataStore.setState({ currentRoom: { roomId: 'old-room' } as any })
    useGameStore.getState().setSelectedCard({ suit: '♠', rank: 'A' } as any)
    sessionStorage.setItem('bridge-guest-session', 'old-credentials')
    const disconnect = vi.spyOn(websocketService, 'disconnect')
    const stop = vi.spyOn(tokenManager, 'stopTokenMonitoring')
    const fetch = vi.fn(async () => reply({ message: 'Refresh cookie cleared' }))
    vi.stubGlobal('fetch', fetch)
    await useUserStore.getState().logout()
    expect(fetch).toHaveBeenCalledWith('/api/logout', expect.objectContaining({ method: 'POST', credentials: 'include' }))
    expect(useUserStore.getState()).toMatchObject({ userId: null, user: null, position: null, wasAuthenticated: false, accessToken: null })
    expect(useRoomDataStore.getState().currentRoom).toBeNull()
    expect(useGameStore.getState().selectedCard).toBeNull()
    expect(sessionStorage.getItem('bridge-guest-session')).toBeNull()
    expect(disconnect).toHaveBeenCalled()
    expect(stop).toHaveBeenCalled()
  })
  it.each([true, false])('ignores late refresh success=%s after logout', async success => {
    useUserStore.getState().setAuthData(token(), user)
    let finish!: (value: any) => void
    vi.stubGlobal('fetch', vi.fn((path: string) => path === '/api/logout'
      ? Promise.resolve(reply({ message: 'Cleared' }))
      : new Promise(resolve => { finish = resolve })))
    const refreshing = tokenManager.forceRefreshToken()
    await useUserStore.getState().logout()
    finish(reply(success ? loginData() : { error: 'Expired' }, success ? 200 : 401))
    expect(await refreshing).toBe(false)
    expect(useUserStore.getState()).toMatchObject({ isAuthenticated: false, accessToken: null, userId: null })
  })
  it('does not let an old account refresh replace a newer login', async () => {
    useUserStore.getState().setAuthData(token(), user)
    let finish!: (value: any) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { finish = resolve })))
    const refreshing = tokenManager.forceRefreshToken()
    const nextUser = { ...user, userId: 'new-account' }
    useUserStore.getState().setAuthData(token(nextUser.userId), nextUser)
    expect(await tokenManager.ensureValidToken()).toBe(true)
    finish(reply(loginData()))
    expect(await refreshing).toBe(false)
    expect(useUserStore.getState()).toMatchObject({ userId: nextUser.userId, accessToken: token(nextUser.userId) })
  })
  it('returns false from forced refresh when renewal fails and clears stale identity', async () => {
    useUserStore.getState().setAuthData(token(), user)
    vi.stubGlobal('fetch', vi.fn(async () => reply({ error: 'Invalid session' }, 401)))
    expect(await tokenManager.forceRefreshToken()).toBe(false)
    expect(useUserStore.getState()).toMatchObject({ userId: null, isAuthenticated: false, accessToken: null })
  })
  it('shows a server logout failure with a retry instead of claiming success', async () => {
    useUserStore.getState().setAuthData(token(), user)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Offline') }))
    renderPage(<RoomManager onRoomJoined={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('refresh cookie may still be active')
    expect(screen.getByRole('button', { name: 'Retry logout' })).toBeEnabled()
    expect(useUserStore.getState().isAuthenticated).toBe(false)
  })
  it('discards a guest room and socket before accepting account identity', () => {
    useUserStore.setState({ userId: 'old-guest' })
    sessionStorage.setItem('bridge-guest-session', 'old-guest-token')
    useRoomDataStore.setState({ currentRoom: { roomId: 'guest-room' } as any })
    const disconnect = vi.spyOn(websocketService, 'disconnect')
    useUserStore.getState().setAuthData(token(), user)
    expect(disconnect).toHaveBeenCalled()
    expect(useRoomDataStore.getState().currentRoom).toBeNull()
    expect(sessionStorage.getItem('bridge-guest-session')).toBeNull()
    expect(useUserStore.getState().userId).toBe(user.userId)
  })
})
