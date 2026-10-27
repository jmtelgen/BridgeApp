import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { apiCall } from '../../src/services/api'
import { useUserStore } from '../../src/stores/userStore'
import { tokenManager } from '../../src/services/tokenManager'

vi.mock('../../src/services/tokenManager', () => ({
  tokenManager: {
    isTokenRefreshInProgress: () => false,
    ensureValidToken: vi.fn(async () => true),
    forceRefreshToken: vi.fn(async () => true),
    initialize: vi.fn(), stopTokenMonitoring: vi.fn(),
  },
}))
describe('public API requests alongside signed gameplay', () => {
  beforeEach(() => {
    useUserStore.setState({ isAuthenticated: false, wasAuthenticated: false, accessToken: null })
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })
  it('does not force account cookie refresh or redirect a guest loading lobby statistics', async () => {
    const fetch = vi.fn(async () => ({ ok: false, status: 401 }))
    vi.stubGlobal('fetch', fetch)
    const response = await apiCall('/connections', { showError: false })
    expect(response.success).toBe(false)
    expect(tokenManager.ensureValidToken).not.toHaveBeenCalled()
    expect(tokenManager.forceRefreshToken).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('allows successful public responses without account tokens', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ activeUserCount: 2, activeRoomCount: 1 }) })))
    const response = await apiCall('/connections', { showError: false })
    expect(response).toMatchObject({ success: true, data: { activeUserCount: 2, activeRoomCount: 1 } })
    expect(tokenManager.ensureValidToken).not.toHaveBeenCalled()
  })
  it('bounds account authentication retries instead of endlessly retrying an unauthorized token', async () => {
    useUserStore.setState({ isAuthenticated: true, accessToken: 'test-account-token' })
    const fetch = vi.fn(async () => ({ ok: false, status: 401 }))
    vi.stubGlobal('fetch', fetch)
    const response = await apiCall('/connections', { showError: false })
    expect(response.success).toBe(false)
    expect(tokenManager.forceRefreshToken).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
