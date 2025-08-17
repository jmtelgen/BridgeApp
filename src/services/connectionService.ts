import { api } from './api'
import { useUserStore } from '../stores/userStore'

export interface ConnectionCount {
  activeUserCount: number
  activeRoomCount: number
  totalConnections?: number // Keep for backward compatibility
  roomConnections?: Record<string, number>
}

export const connectionService = {
  /**
   * Get the total number of active connections
   */
  getConnectionCount: async () => {
    console.log('Fetching connection count from /api/connections...')
    
    // Get the access token from the user store
    const accessToken = useUserStore.getState().accessToken
    
    if (!accessToken) {
      console.log('No access token found, redirecting to login...')
      window.location.href = '/login'
      return {
        data: null,
        error: 'No access token available',
        success: false
      }
    }
    
    const response = await api.get<ConnectionCount>('/connections', {
      errorMessage: 'Failed to get connection count',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (!response.success) {
      console.error('Connection count fetch failed:', response.error)
      
      // Check if this is an authentication error
      if (response.error && response.error.includes('Authentication required')) {
        console.log('Authentication required for connection count, user will be redirected to login')
        // The API utility already handled the redirect, just return the response
        return response
      }
    } else {
      console.log('Connection count fetch successful:', response.data)
    }
    
    return response
  },

  /**
   * Get the number of active connections for a specific room
   */
  getRoomConnectionCount: async (roomId: string): Promise<number> => {
    // Get the access token from the user store
    const accessToken = useUserStore.getState().accessToken
    
    if (!accessToken) {
      console.log('No access token found for room connection count, redirecting to login...')
      window.location.href = '/login'
      return 0
    }
    
    const response = await api.get<ConnectionCount>('/connections', {
      errorMessage: 'Failed to get room connection count',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (response.success && response.data?.roomConnections) {
      return response.data.roomConnections[roomId] || 0
    }
    
    return 0
  }
} 