import { useEffect, useState } from 'react'
import { useUserStore } from '../stores/userStore'
import { tokenManager } from '../services/tokenManager'

export function useAutoTokenRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false)
  const { wasAuthenticated, isAuthenticated, attemptTokenRefresh } = useUserStore()

  // Get the global token refresh status from token manager
  const [globalRefreshStatus, setGlobalRefreshStatus] = useState(false)

  useEffect(() => {
    const performTokenRefresh = async () => {
      // Only attempt refresh if:
      // 1. User was previously authenticated (stored in localStorage)
      // 2. User is not currently authenticated (token expired/cleared)
      // 3. We haven't already attempted refresh
      if (wasAuthenticated && !isAuthenticated && !hasAttemptedRefresh) {
        setIsRefreshing(true)
        
        try {
          const success = await attemptTokenRefresh()
          if (success) {
            // Token refresh successful
          } else {
            // Token refresh failed, user needs to login
          }
        } catch (error) {
          console.error('Error during token refresh on page load:', error)
        } finally {
          setIsRefreshing(false)
          setHasAttemptedRefresh(true)
        }
      } else if (hasAttemptedRefresh) {
        // If we've already attempted refresh, don't show loading state
        setIsRefreshing(false)
      }
    }

    // Perform token refresh on mount
    performTokenRefresh()
  }, [wasAuthenticated, isAuthenticated, hasAttemptedRefresh, attemptTokenRefresh])

  // Monitor global token refresh status
  useEffect(() => {
    const checkGlobalRefreshStatus = async () => {
      try {
        const isRefreshing = tokenManager.isTokenRefreshInProgress()
        setGlobalRefreshStatus(isRefreshing)
      } catch (error) {
        console.warn('Could not check global refresh status:', error)
      }
    }

    // Check immediately
    checkGlobalRefreshStatus()

    // Set up interval to monitor global refresh status
    const interval = setInterval(checkGlobalRefreshStatus, 1000)

    return () => clearInterval(interval)
  }, [])

  return {
    isRefreshing: isRefreshing || globalRefreshStatus,
    hasAttemptedRefresh,
    shouldShowLogin: hasAttemptedRefresh && !isAuthenticated,
    globalRefreshInProgress: globalRefreshStatus
  }
}
