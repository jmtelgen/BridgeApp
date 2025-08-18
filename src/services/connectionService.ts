import { api } from './api'

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
    // Let the API utility handle token refresh and validation
    // Don't check for access token here - let the API utility do it
    const response = await api.get<ConnectionCount>('/connections', {
      errorMessage: 'Failed to get connection count'
    })
    
    if (!response.success) {
      console.error('Connection count fetch failed:', response.error)
    }
    
    return response
  },

  /**
   * Get the number of active connections for a specific room
   */
  getRoomConnectionCount: async (roomId: string): Promise<number> => {
    // Let the API utility handle token refresh and validation
    const response = await api.get<ConnectionCount>('/connections', {
      errorMessage: 'Failed to get room connection count'
    })
    
    if (response.success && response.data?.roomConnections) {
      return response.data.roomConnections[roomId] || 0
    }
    
    return 0
  }
} 