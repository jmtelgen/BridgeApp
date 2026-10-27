import { useUserStore, getAuthGeneration } from '../stores/userStore'
import { tokenManager } from './tokenManager'

export interface GameSession {
  userId: string
  accessToken: string
  expiresAt: number
  isGuest: boolean
}
const storageKey = 'bridge-guest-session'
let bootstrap: Promise<GameSession> | null = null

/** Guest credentials survive reload in this tab, but are never invented client-side. */
export function ensureGameSession(): Promise<GameSession> {
  if (bootstrap) return bootstrap
  bootstrap = resolveSession().finally(() => {
    bootstrap = null
  })
  return bootstrap
}

async function resolveSession(): Promise<GameSession> {
  const generation = getAuthGeneration()
  let user = useUserStore.getState()
  if (user.isAuthenticated || user.wasAuthenticated) {
    if (!user.accessToken && !(await user.attemptTokenRefresh()))
      throw new Error(
        'Your account session expired. Sign in before reconnecting.'
      )
    if (!(await tokenManager.ensureValidToken()))
      throw new Error(
        'Your account session expired. Sign in before reconnecting.'
      )
    if (generation !== getAuthGeneration())
      throw new Error('Your identity changed. Reconnect using your current account.')
    user = useUserStore.getState()
    if (!user.accessToken || !user.user?.userId)
      throw new Error(
        'The server did not provide your signed account identity. Sign in again.'
      )
    useUserStore.setState({ userId: user.user.userId })
    const seconds = tokenManager.getTimeUntilExpiry()
    if (seconds == null || seconds <= 0)
      throw new Error(
        'Your account access token is invalid or expired. Sign in again.'
      )
    return {
      userId: user.user.userId,
      accessToken: user.accessToken,
      expiresAt: Date.now() + seconds * 1000,
      isGuest: false,
    }
  }
  let existing: GameSession | null = null
  try {
    const stored = sessionStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (
        typeof parsed.userId === 'string' &&
        typeof parsed.accessToken === 'string' &&
        typeof parsed.expiresAt === 'number'
      )
        existing = parsed
    }
  } catch {
    throw new Error(
      'Guest session storage is unavailable. Enable session storage or sign in to play.'
    )
  }
  if (existing && existing.expiresAt > Date.now() + 120000) {
    useUserStore.setState({ userId: existing.userId })
    return existing
  }
  const response = await fetch('/api/auth/guest', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(existing ? { Authorization: `Bearer ${existing.accessToken}` } : {}),
    },
    body: JSON.stringify({ username: user.playerName || 'Guest' }),
  })
  if (!response.ok) {
    if (response.status === 401)
      throw new Error(
        'Your guest session expired or was revoked. Sign in to continue; a new identity cannot recover this seat.'
      )
    throw new Error(
      'Signed guest sessions are unavailable. Configure POST /api/auth/guest on the server, or sign in to play.'
    )
  }
  const envelope = await response.json()
  if (generation !== getAuthGeneration())
    throw new Error('Your identity changed. Reconnect using your current account.')
  const data = envelope.body
    ? typeof envelope.body === 'string'
      ? JSON.parse(envelope.body)
      : envelope.body
    : envelope
  if (
    typeof data.userId !== 'string' ||
    !data.userId ||
    typeof data.accessToken !== 'string' ||
    !data.accessToken ||
    !Number.isFinite(data.expiresIn) ||
    data.expiresIn <= 0 ||
    data.isGuest !== true
  )
    throw new Error('The server returned an invalid signed guest session.')
  if (existing && data.userId !== existing.userId)
    throw new Error(
      'Guest renewal changed your identity. Your existing seat has not been recovered.'
    )
  const session: GameSession = {
    userId: data.userId,
    accessToken: data.accessToken,
    expiresAt: Date.now() + data.expiresIn * 1000,
    isGuest: true,
  }
  sessionStorage.setItem(storageKey, JSON.stringify(session))
  useUserStore.setState({ userId: session.userId })
  return session
}
