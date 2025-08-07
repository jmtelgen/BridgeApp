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
    return api.get<ConnectionCount>('/connections', {
      errorMessage: 'Failed to get connection count'
    })
  },

  /**
   * Get the number of active connections for a specific room
   */
  getRoomConnectionCount: async (roomId: string): Promise<number> => {
    const response = await api.get<ConnectionCount>('/connections', {
      errorMessage: 'Failed to get room connection count'
    })
    
    if (response.success && response.data?.roomConnections) {
      return response.data.roomConnections[roomId] || 0
    }
    
    return 0
  }
} 