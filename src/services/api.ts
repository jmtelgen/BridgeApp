import { useErrorStore } from '../stores/errorStore'

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

  // Prefix with /api if not already present
  const apiUrl = url.startsWith('/api') ? url : `/api${url}`

  try {
    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      let errorData: any = null
      try {
        errorData = await response.json()
      } catch {
        // If response is not JSON, use status text
        errorData = { message: response.statusText }
      }
      
      const errorMsg = errorData?.message || errorMessage
      
      if (showError) {
        useErrorStore.getState().showError(errorMsg)
      }
      
      return {
        data: null,
        error: errorMsg,
        success: false
      }
    }

    let data: T | null = null
    try {
      data = await response.json()
    } catch {
      // If response is not JSON, that's okay for some endpoints
      data = null
    }

    if (showSuccess) {
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