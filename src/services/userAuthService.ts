// Types for authentication API requests/responses
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  message: string
  accessToken: string
  refreshToken: string
  user: {
    userId: string
    username: string
    email: string
    createdAt: string
  }
  expiresIn: number
  tokenType: string
}

export interface CreateAccountRequest {
  username: string
  email: string
  password: string
}

export interface CreateAccountResponse {
  message: string
  user: {
    userId: string
    username: string
    email: string
    createdAt: string
  }
}

export interface RefreshTokenResponse {
  accessToken: string
  expiresIn: number
  tokenType: string
}

// User Authentication Service
export const userAuthService = {
  /**
   * User login
   */
  login: async (request: LoginRequest): Promise<LoginResponse> => {
    console.log('Logging in with username:', request.username)
    
    const response = await fetch('/api/account/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      credentials: 'include' // Important for cookies
    })

    console.log('Login response status:', response.status)
    console.log('Login response headers:', response.headers)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Login error response:', errorText)
      
      let errorMessage = 'Login failed'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch (e) {
        errorMessage = errorText || errorMessage
      }
      
      throw new Error(errorMessage)
    }

    const responseData = await response.json()
    console.log('Raw response data:', responseData)
    
    // Handle AWS Lambda/API Gateway response format
    let parsedData
    if (responseData.body) {
      try {
        parsedData = typeof responseData.body === 'string' ? JSON.parse(responseData.body) : responseData.body
        console.log('Parsed body data:', parsedData)
      } catch (e) {
        console.error('Failed to parse response body:', e)
        throw new Error('Invalid response format from server')
      }
    } else {
      parsedData = responseData
    }
    
    console.log('Final parsed data:', parsedData)
    console.log('Parsed data keys:', Object.keys(parsedData))
    if (parsedData.user) {
      console.log('User object keys:', Object.keys(parsedData.user))
    } else {
      console.log('No user object found in parsed data')
    }
    
    return parsedData
  },

  /**
   * User account creation
   */
  createAccount: async (request: CreateAccountRequest): Promise<CreateAccountResponse> => {
    console.log('Creating account with data:', { ...request, password: '[REDACTED]' })
    
    const response = await fetch('/api/account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    })

    console.log('Create account response status:', response.status)
    console.log('Create account response headers:', response.headers)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Create account error response:', errorText)
      
      let errorMessage = 'Account creation failed'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch (e) {
        // If response isn't JSON, use the text directly
        if (errorText.includes('Missing Authentication Token')) {
          errorMessage = 'Server configuration error: Create account endpoint requires authentication. Please contact support.'
        } else {
          errorMessage = errorText || errorMessage
        }
      }
      
      throw new Error(errorMessage)
    }

    const responseData = await response.json()
    console.log('Raw create account response data:', responseData)
    
    // Handle AWS Lambda/API Gateway response format
    let parsedData
    if (responseData.body) {
      try {
        parsedData = typeof responseData.body === 'string' ? JSON.parse(responseData.body) : responseData.body
        console.log('Parsed create account body data:', parsedData)
      } catch (e) {
        console.error('Failed to parse create account response body:', e)
        throw new Error('Invalid response format from server')
      }
    } else {
      parsedData = responseData
    }
    
    console.log('Final parsed create account data:', parsedData)
    return parsedData
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (): Promise<RefreshTokenResponse> => {
    const response = await fetch('/api/auth/refresh-token', {
      method: 'POST',
      credentials: 'include' // This will automatically include the refresh token cookie
    })

    if (!response.ok) {
      throw new Error('Token refresh failed')
    }

    return response.json()
  },

  /**
   * User logout
   */
  logout: async (): Promise<void> => {
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('Logout failed')
    }
  }
}
