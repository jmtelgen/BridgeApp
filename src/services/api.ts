

import { useUserStore } from '../stores/userStore'
import { tokenManager } from './tokenManager'

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
  
  // Helper function to retry requests after token refresh
  const retryRequest = async (retryUrl: string, retryOptions: ApiOptions): Promise<ApiResponse<T>> => {
    // Get the updated access token for the retry
    let accessToken: string | null = null
    try {
      accessToken = useUserStore.getState().accessToken
    } catch (error) {
      console.warn('Could not get access token for retry:', error)
    }

    // Update headers with new access token
    const updatedOptions = {
      ...retryOptions,
      headers: {
        ...retryOptions.headers,
        ...(accessToken && !retryOptions.headers?.Authorization ? { Authorization: `Bearer ${accessToken}` } : {})
      }
    }
    
    return apiCall<T>(retryUrl, updatedOptions)
  }
  const {
    method = 'GET',
    headers = {},
    body,
    showError = true,
    showSuccess = false,
    successMessage = 'Operation completed successfully',
    errorMessage = 'An error occurred'
  } = options

  // Ensure token is valid before making request
  try {
    // Wait for any ongoing token refresh to complete
    if (tokenManager.isTokenRefreshInProgress()) {
      const refreshSuccess = await tokenManager.waitForTokenRefresh()
      if (!refreshSuccess) {
        console.warn('Token refresh failed, request will likely fail')
      }
    } else {
      // Ensure token is valid (refresh if needed)
      const tokenValid = await tokenManager.ensureValidToken()
      if (!tokenValid) {
        console.warn('Failed to ensure valid token, request will likely fail')
      }
    }
  } catch (error) {
    // If token manager fails to load, continue with request
    console.warn('Could not check token status:', error)
  }

  // Prefix with /api if not already present
  const apiUrl = url.startsWith('/api') ? url : `/api${url}`

  // Get access token for authenticated requests
  let accessToken: string | null = null
  try {
    accessToken = useUserStore.getState().accessToken
  } catch (error) {
    console.warn('Could not get access token:', error)
  }

  // Add Authorization header if we have an access token and it's not already provided
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (accessToken && !headers.Authorization) {
    requestHeaders.Authorization = `Bearer ${accessToken}`
  }

  try {
    const response = await fetch(apiUrl, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'follow', // Follow redirects automatically
    })

    if (!response.ok) {
      // Handle 401 Unauthorized responses specifically
      if (response.status === 401) {
        try {
          // Try to refresh the token
          const refreshSuccess = await tokenManager.ensureValidToken()
          
          if (refreshSuccess) {
            // Retry the original request with new token
            return retryRequest(apiUrl, options)
          } else {
            // If refresh fails, redirect to login
            window.location.href = '/login'
            return {
              data: null,
              error: 'Authentication required',
              success: false
            }
          }
        } catch (error) {
          console.error('Error during token refresh:', error)
          // If refresh fails, redirect to login
          window.location.href = '/login'
          return {
            data: null,
            error: 'Authentication required',
            success: false
          }
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