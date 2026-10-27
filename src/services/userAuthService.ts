export interface LoginRequest {
  username: string
  password: string
}

export interface AccountUser {
  userId: string
  username: string
  email: string
  createdAt: string
}

export interface LoginResponse {
  message: string
  accessToken: string
  user: AccountUser
  expiresIn: number
  tokenType: string
}

export interface CreateAccountRequest extends LoginRequest {
  email: string
}

export interface CreateAccountResponse {
  message: string
  user: AccountUser
}

export interface RefreshTokenResponse {
  accessToken: string
  expiresIn: number
  tokenType: string
  userId?: string
}

async function request(path: string, fallback: string, body?: unknown) {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      ...(body === undefined ? {} : {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    })
  } catch {
    throw new Error(`${fallback}. Unable to reach the server. Please try again.`)
  }
  let envelope
  let data
  try {
    envelope = await response.json()
    data = envelope && 'body' in envelope
      ? typeof envelope.body === 'string' ? JSON.parse(envelope.body) : envelope.body
      : envelope
  } catch {
    throw new Error(fallback)
  }
  if (!response.ok || Number(envelope?.statusCode) >= 400 || data?.error) {
    const message = data?.message || data?.error
    throw new Error(typeof message === 'string' ? message : fallback)
  }
  if (!data || typeof data !== 'object') throw new Error('Invalid response from server')
  return data
}

// The backend verifies signatures. Here we reject malformed/expired responses
// before using their identity; decoding alone is not authentication.
function tokenSubject(token: unknown): string {
  try {
    if (typeof token !== 'string' || token.split('.').length !== 3) throw new Error()
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (typeof payload.userId !== 'string' || !payload.userId ||
        !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) throw new Error()
    return payload.userId
  } catch {
    throw new Error('The server returned an invalid account session. Please sign in again.')
  }
}

function validUser(user: AccountUser): boolean {
  return !!user && ['userId', 'username', 'email'].every(
    field => typeof user[field as keyof AccountUser] === 'string' && !!user[field as keyof AccountUser]
  )
}

export const userAuthService = {
  login: async (body: LoginRequest): Promise<LoginResponse> => {
    const data = await request('/api/account/login', 'Login failed', body)
    if (!validUser(data.user) || tokenSubject(data.accessToken) !== data.user.userId)
      throw new Error('The server returned an invalid account identity. Please sign in again.')
    return data
  },
  createAccount: async (body: CreateAccountRequest): Promise<CreateAccountResponse> => {
    const data = await request('/api/account', 'Account creation failed', body)
    if (!validUser(data.user)) throw new Error('The server did not confirm account creation. Please try signing in.')
    return data
  },
  refreshToken: async (): Promise<RefreshTokenResponse> => {
    const data = await request('/api/auth/refresh', 'Token refresh failed')
    return { ...data, userId: tokenSubject(data.accessToken) }
  },
  logout: async (): Promise<void> => {
    await request('/api/logout', 'Server logout failed; the refresh cookie may still be active')
  },
}
