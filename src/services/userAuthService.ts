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
    const response = await fetch('/api/account/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      credentials: 'include' // Important for cookies
    })

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
    
    // Handle AWS Lambda/API Gateway response format
    let parsedData
    if (responseData.body) {
      try {
        parsedData = typeof responseData.body === 'string' ? JSON.parse(responseData.body) : responseData.body
      } catch (e) {
        console.error('Failed to parse response body:', e)
        throw new Error('Invalid response format from server')
      }
    } else {
      parsedData = responseData
    }
    
    return parsedData
  },

  /**
   * User account creation
   */
  createAccount: async (request: CreateAccountRequest): Promise<CreateAccountResponse> => {
    const response = await fetch('/api/account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    })

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
    
    // Handle AWS Lambda/API Gateway response format
    let parsedData
    if (responseData.body) {
      try {
        parsedData = typeof responseData.body === 'string' ? JSON.parse(responseData.body) : responseData.body
      } catch (e) {
        console.error('Failed to parse create account response body:', e)
        throw new Error('Invalid response format from server')
      }
    } else {
      parsedData = responseData
    }
    return parsedData
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (): Promise<RefreshTokenResponse> => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include' // This will automatically include the refresh token cookie
    })

    if (!response.ok) {
      throw new Error('Token refresh failed')
    }

    const responseData = await response.json()
    
    // Handle AWS Lambda/API Gateway response format
    let parsedData
    if (responseData.body) {
      try {
        parsedData = typeof responseData.body === 'string' ? JSON.parse(responseData.body) : responseData.body
      } catch (e) {
        console.error('Failed to parse refresh token response body:', e)
        throw new Error('Invalid response format from server')
      }
    } else {
      parsedData = responseData
    }
    return parsedData
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
