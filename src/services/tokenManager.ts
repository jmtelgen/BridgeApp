import { useUserStore } from '../stores/userStore'

class TokenManager {
  private refreshTimer: NodeJS.Timeout | null = null
  private readonly REFRESH_THRESHOLD = 2 * 60 * 1000 // 2 minutes before expiration
  private readonly CHECK_INTERVAL = 30 * 1000 // Check every 30 seconds
  
  // Global lock to prevent API calls during token refresh
  private isRefreshing = false
  private refreshPromise: Promise<boolean> | null = null

  /**
   * Initialize token monitoring
   */
  initialize(): void {
    this.startTokenMonitoring()
  }

  /**
   * Start monitoring token expiration
   */
  private startTokenMonitoring(): void {
    // Clear any existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }

    // Check token status every 30 seconds
    this.refreshTimer = setInterval(() => {
      this.checkTokenStatus()
    }, this.CHECK_INTERVAL)
  }

  /**
   * Check if token needs refresh
   */
  private async checkTokenStatus(): Promise<void> {
    const { accessToken, isAuthenticated } = useUserStore.getState()
    
    if (!isAuthenticated || !accessToken) {
      this.stopTokenMonitoring()
      return
    }

    try {
      // Decode JWT to check expiration
      const tokenInfo = this.decodeToken(accessToken)
      if (!tokenInfo) {
        useUserStore.getState().clearAuthData()
        this.stopTokenMonitoring()
        return
      }

      const now = Date.now()
      const timeUntilExpiry = tokenInfo.exp * 1000 - now

      // If token expires within threshold or is already expired, refresh it
      if (timeUntilExpiry <= this.REFRESH_THRESHOLD || timeUntilExpiry <= 0) {
        const refreshSuccess = await this.refreshToken()
        if (!refreshSuccess) {
          this.stopTokenMonitoring()
        }
      }
    } catch (error) {
      console.error('Error checking token status')
    }
  }

  /**
   * Refresh the access token
   */
  private async refreshToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      return await this.waitForTokenRefresh()
    }

    // Set global refresh lock
    this.isRefreshing = true
    const promise = this.performTokenRefresh()
    this.refreshPromise = promise
    
    try {
      const result = await promise
      return result
    } finally {
      // Clear refresh lock
      if (this.refreshPromise === promise) {
        this.isRefreshing = false
        this.refreshPromise = null
      }
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<boolean> {
    return useUserStore.getState().attemptTokenRefresh()
  }

  /**
   * Decode JWT token to get expiration info
   */
  private decodeToken(token: string): { exp: number } | null {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      
      return JSON.parse(jsonPayload)
    } catch (error) {
      return null
    }
  }

  /**
   * Stop token monitoring
   */
  stopTokenMonitoring(): void {
    // Superseded refreshes may finish, but must not block a newer identity.
    this.isRefreshing = false
    this.refreshPromise = null
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * Get time until token expires (in seconds)
   */
  getTimeUntilExpiry(): number | null {
    const { accessToken } = useUserStore.getState()
    if (!accessToken) return null

    const tokenInfo = this.decodeToken(accessToken)
    if (!tokenInfo) return null

    const now = Date.now()
    return Math.max(0, Math.round((tokenInfo.exp * 1000 - now) / 1000))
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry()
    return timeUntilExpiry === null || timeUntilExpiry <= 0
  }

  /**
   * Check if token needs refresh soon
   */
  needsRefreshSoon(): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry()
    return timeUntilExpiry !== null && timeUntilExpiry <= this.REFRESH_THRESHOLD / 1000
  }

  /**
   * Force refresh token immediately (used when API calls fail due to expired token)
   */
  async forceRefreshToken(): Promise<boolean> {
    try {
      return await this.refreshToken()
    } catch (error) {
      return false
    }
  }

  /**
   * Check if token refresh is currently in progress
   */
  isTokenRefreshInProgress(): boolean {
    return this.isRefreshing
  }

  /**
   * Wait for current token refresh to complete (if any)
   * Returns true if refresh was successful, false if failed
   */
  async waitForTokenRefresh(): Promise<boolean> {
    if (!this.isRefreshing || !this.refreshPromise) {
      return true // No refresh in progress
    }
    
    try {
      const result = await this.refreshPromise
      return result
    } catch (error) {
      return false
    }
  }

  /**
   * Ensure token is valid before proceeding
   * This method will refresh the token if needed and wait for completion
   */
  async ensureValidToken(): Promise<boolean> {
    // If refresh is already in progress, wait for it
    if (this.isRefreshing && this.refreshPromise) {
      return await this.waitForTokenRefresh()
    }

    // Check if token needs refresh
    if (this.needsRefreshSoon() || this.isTokenExpired()) {
      return await this.forceRefreshToken()
    }

    return true // Token is valid
  }
}

// Export singleton instance
export const tokenManager = new TokenManager()
