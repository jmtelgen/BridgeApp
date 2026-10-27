import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureGameSession } from '../../src/services/gameSessionService'
import { useUserStore } from '../../src/stores/userStore'
import { tokenManager } from '../../src/services/tokenManager'

vi.mock('../../src/services/tokenManager', () => ({
  tokenManager: { ensureValidToken: vi.fn(async () => true), getTimeUntilExpiry: () => 300, initialize: vi.fn(), stopTokenMonitoring: vi.fn() },
}))
describe('signed game session bootstrap', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useUserStore.setState({ userId: 'untrusted-local-id', playerName: 'Bridge player', isAuthenticated: false, wasAuthenticated: false, accessToken: null, user: null })
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })
  const guest = (userId = 'signed-guest') => ({ userId, username: 'Guest', accessToken: 'server-signed-token', isGuest: true, expiresIn: 86400, tokenType: 'Bearer' })
  it('bootstraps only a server-signed identity and survives refresh in the same tab', async () => {
    const fetch = vi.fn(async () => ({ ok: true, json: async () => guest() }))
    vi.stubGlobal('fetch', fetch)
    const [one, two] = await Promise.all([ensureGameSession(), ensureGameSession()])
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/auth/guest', expect.objectContaining({ method: 'POST', credentials: 'include' }))
    expect(one.userId).toBe('signed-guest')
    expect(two.accessToken).toBe('server-signed-token')
    expect(useUserStore.getState().userId).toBe('signed-guest')
    await ensureGameSession()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('renews near-expiry guests using their bearer without changing identity', async () => {
    sessionStorage.setItem('bridge-guest-session', JSON.stringify({ userId: 'signed-guest', accessToken: 'old-signed-token', expiresAt: Date.now() + 1000, isGuest: true }))
    const fetch = vi.fn(async () => ({ ok: true, json: async () => guest() }))
    vi.stubGlobal('fetch', fetch)
    await ensureGameSession()
    expect(fetch).toHaveBeenCalledWith('/api/auth/guest', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer old-signed-token' }) }))
  })
  it('surfaces expired/invalid credentials instead of silently inventing a new guest', async () => {
    sessionStorage.setItem('bridge-guest-session', JSON.stringify({ userId: 'signed-guest', accessToken: 'expired-token', expiresAt: 0, isGuest: true }))
    const fetch = vi.fn(async () => ({ ok: false, status: 401 }))
    vi.stubGlobal('fetch', fetch)
    await expect(ensureGameSession()).rejects.toThrow('expired or was revoked')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(useUserStore.getState().userId).toBe('untrusted-local-id')
  })
  it('fails clearly when the guest route is missing and sends no unsigned socket', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })))
    await expect(ensureGameSession()).rejects.toThrow('POST /api/auth/guest')
    expect(sessionStorage.getItem('bridge-guest-session')).toBeNull()
  })
  it('prefers refreshed account credentials and synchronizes the authoritative subject', async () => {
    useUserStore.setState({ isAuthenticated: true, accessToken: 'account-token', user: { userId: 'signed-account', username: 'Player', email: 'player@example.test', createdAt: '' } })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const session = await ensureGameSession()
    expect(session).toMatchObject({ userId: 'signed-account', accessToken: 'account-token', isGuest: false })
    expect(tokenManager.ensureValidToken).toHaveBeenCalledTimes(1)
    expect(fetch).not.toHaveBeenCalled()
    expect(useUserStore.getState().userId).toBe('signed-account')
  })
  it('never restores an in-flight guest response after account login', async () => {
    let complete!: (response: any) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { complete = resolve })))
    const pending = ensureGameSession()
    useUserStore.getState().setAuthData('account-token', { userId: 'signed-account', username: 'Player', email: 'player@example.test', createdAt: '' })
    complete({ ok: true, json: async () => guest() })
    await expect(pending).rejects.toThrow('identity changed')
    expect(useUserStore.getState().userId).toBe('signed-account')
    expect(sessionStorage.getItem('bridge-guest-session')).toBeNull()
  })
})
