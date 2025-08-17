import { useState, useEffect } from 'react'
import { tokenManager } from '../services/tokenManager'

export interface TokenStatus {
  isExpired: boolean
  needsRefreshSoon: boolean
  timeUntilExpiry: number | null
  formattedTimeUntilExpiry: string | null
}

export function useTokenStatus(): TokenStatus {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>({
    isExpired: false,
    needsRefreshSoon: false,
    timeUntilExpiry: null,
    formattedTimeUntilExpiry: null
  })

  useEffect(() => {
    // Update token status immediately
    const updateStatus = () => {
      const isExpired = tokenManager.isTokenExpired()
      const needsRefreshSoon = tokenManager.needsRefreshSoon()
      const timeUntilExpiry = tokenManager.getTimeUntilExpiry()
      
      // Format time until expiry for display
      let formattedTimeUntilExpiry: string | null = null
      if (timeUntilExpiry !== null) {
        if (timeUntilExpiry < 60) {
          formattedTimeUntilExpiry = `${timeUntilExpiry}s`
        } else if (timeUntilExpiry < 3600) {
          const minutes = Math.floor(timeUntilExpiry / 60)
          const seconds = timeUntilExpiry % 60
          formattedTimeUntilExpiry = `${minutes}m ${seconds}s`
        } else {
          const hours = Math.floor(timeUntilExpiry / 3600)
          const minutes = Math.floor((timeUntilExpiry % 3600) / 60)
          formattedTimeUntilExpiry = `${hours}h ${minutes}m`
        }
      }

      setTokenStatus({
        isExpired,
        needsRefreshSoon,
        timeUntilExpiry,
        formattedTimeUntilExpiry
      })
    }

    // Update status immediately
    updateStatus()

    // Update status every 10 seconds for real-time display
    const interval = setInterval(updateStatus, 10000)

    return () => clearInterval(interval)
  }, [])

  return tokenStatus
}
