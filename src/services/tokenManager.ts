import { useUserStore } from '../stores/userStore'
import { userAuthService } from './userAuthService'

interface TokenInfo {
  accessToken: string
  expiresIn: number
  tokenType: string
}

class TokenManager {
  private refreshTimer: NodeJS.Timeout | null = null
  private readonly REFRESH_THRESHOLD = 2 * 60 * 1000 // 2 minutes before expiration
  private readonly CHECK_INTERVAL = 30 * 1000 // Check every 30 seconds

  /**
   * Initialize token monitoring
   */
  initialize(): void {
    console.log('Initializing token manager...')
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

    console.log('Token monitoring started')
  }

  /**
   * Check if token needs refresh
   */
  private async checkTokenStatus(): Promise<void> {
    const { accessToken, isAuthenticated } = useUserStore.getState()
    
    if (!isAuthenticated || !accessToken) {
      console.log('No active token, stopping monitoring')
      this.stopTokenMonitoring()
      return
    }

    try {
      // Decode JWT to check expiration
      const tokenInfo = this.decodeToken(accessToken)
      if (!tokenInfo) {
        console.log('Invalid token format, clearing auth data')
        useUserStore.getState().clearAuthData()
        this.stopTokenMonitoring()
        return
      }

      const now = Date.now()
      const timeUntilExpiry = tokenInfo.exp * 1000 - now

      console.log(`Token expires in ${Math.round(timeUntilExpiry / 1000)} seconds`)

      // If token expires within threshold, refresh it
      if (timeUntilExpiry <= this.REFRESH_THRESHOLD) {
        console.log('Token expiring soon, refreshing...')
        await this.refreshToken()
      }
    } catch (error) {
      console.error('Error checking token status:', error)
    }
  }

  /**
   * Refresh the access token
   */
  private async refreshToken(): Promise<void> {
    try {
      console.log('Refreshing access token...')
      const response = await userAuthService.refreshToken()
      
      if (response.accessToken) {
        // Update the store with new token
        useUserStore.getState().updateAccessToken(response.accessToken)
        console.log('Token refreshed successfully')
      } else {
        throw new Error('No access token in refresh response')
      }
    } catch (error) {
      console.error('Failed to refresh token:', error)
      
      // If refresh fails, redirect to login
      this.handleRefreshFailure()
    }
  }

  /**
   * Handle token refresh failure
   */
  private handleRefreshFailure(): void {
    console.log('Token refresh failed, redirecting to login...')
    
    // Clear auth data
    useUserStore.getState().clearAuthData()
    
    // Stop monitoring
    this.stopTokenMonitoring()
    
    // Redirect to login
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
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
      console.error('Failed to decode token:', error)
      return null
    }
  }

  /**
   * Stop token monitoring
   */
  stopTokenMonitoring(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
      console.log('Token monitoring stopped')
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
}

// Export singleton instance
export const tokenManager = new TokenManager()
