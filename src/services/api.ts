

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  showError?: boolean
  showSuccess?: boolean
  successMessage?: string
  errorMessage?: string
}

/**
 * API utility that automatically prefixes endpoints with /api
 * 
 * Examples:
 * - api.post("/room", data) -> calls /api/room
 * - api.get("/users/123") -> calls /api/users/123
 * - api.post("/api/room", data) -> calls /api/room (no double prefix)
 */
export async function apiCall<T>(
  url: string, 
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    showError = true,
    showSuccess = false,
    successMessage = 'Operation completed successfully',
    errorMessage = 'An error occurred'
  } = options

  // Check if token is expired before making request
  try {
    const { tokenManager } = await import('./tokenManager')
    if (tokenManager.isTokenExpired()) {
      console.warn('Token expired, redirecting to login...')
      window.location.href = '/login'
      return {
        data: null,
        error: 'Token expired',
        success: false
      }
    }
  } catch (error) {
    // If token manager fails to load, continue with request
    console.warn('Could not check token status:', error)
  }

  // Prefix with /api if not already present
  const apiUrl = url.startsWith('/api') ? url : `/api${url}`

  try {
    console.log('Making API request to:', apiUrl)
    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'follow', // Follow redirects automatically
    })
    
    console.log('Response received:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    })

    if (!response.ok) {
      // Handle 401 Unauthorized responses specifically
      if (response.status === 401) {
        console.log('Authentication required (401), redirecting to login...')
        // Redirect the user to the login page
        window.location.href = '/login'
        
        return {
          data: null,
          error: 'Authentication required',
          success: false
        }
      }
      
      let errorData: any = null
      try {
        errorData = await response.json()
      } catch {
        // If response is not JSON, use status text
        errorData = { message: response.statusText }
      }
      
      const errorMsg = errorData?.message || errorMessage
      
      if (showError) {
        const { useErrorStore } = await import('../stores/errorStore')
        useErrorStore.getState().showError(errorMsg)
      }
      
      return {
        data: null,
        error: errorMsg,
        success: false
      }
    }

    let rawData: any = null
    try {
      rawData = await response.json()
    } catch {
      // If response is not JSON, that's okay for some endpoints
      rawData = null
    }
    
    // Handle AWS Lambda/API Gateway response format
    let data: T | null = null
    if (rawData && typeof rawData === 'object') {
      if (rawData.body) {
        try {
          data = typeof rawData.body === 'string' ? JSON.parse(rawData.body) : rawData.body
        } catch (e) {
          console.error('Failed to parse response body:', e)
          data = null
        }
      } else {
        data = rawData
      }
    }

    if (showSuccess) {
      const { useErrorStore } = await import('../stores/errorStore')
      useErrorStore.getState().showSuccess(successMessage)
    }

    return {
      data,
      error: null,
      success: true
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : errorMessage
    
    if (showError) {
      const { useErrorStore } = await import('../stores/errorStore')
      useErrorStore.getState().handleApiError(error, errorMessage)
    }
    
    return {
      data: null,
      error: errorMsg,
      success: false
    }
  }
}

// Convenience functions for common HTTP methods
export const api = {
  get: <T>(url: string, options?: Omit<ApiOptions, 'method'>) => 
    apiCall<T>(url, { ...options, method: 'GET' }),
    
  post: <T>(url: string, body?: any, options?: Omit<ApiOptions, 'method' | 'body'>) => 
    apiCall<T>(url, { ...options, method: 'POST', body }),
    
  put: <T>(url: string, body?: any, options?: Omit<ApiOptions, 'method' | 'body'>) => 
    apiCall<T>(url, { ...options, method: 'PUT', body }),
    
  delete: <T>(url: string, options?: Omit<ApiOptions, 'method'>) => 
    apiCall<T>(url, { ...options, method: 'DELETE' }),
    
  patch: <T>(url: string, body?: any, options?: Omit<ApiOptions, 'method' | 'body'>) => 
    apiCall<T>(url, { ...options, method: 'PATCH', body })
} 