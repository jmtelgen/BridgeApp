import { api } from './api'
import { roomWebSocketService, WebSocketResponse, websocketService } from './websocketService'
import { useUserStore } from '../stores/userStore'

// Types
interface CreateRoomRequest {
  roomName: string
  isPrivate: boolean
  maxPlayers: number
  playerName: string
  ownerId: string
}

interface JoinRoomRequest {
  playerName: string  // The player's display name
  roomId: string
  seat: string
}

interface RoomResponse {
  roomId: string
  ownerId: string
  seats: Record<string, string>
  state: string
  gameData: {
    currentPhase: string
    turn: string
    bids: any[]
    hands: Record<string, any[]>
    tricks: any[]
  }
}

interface CreateRoomResponse {
  room: RoomResponse
}

interface JoinRoomResponse {
  room: RoomResponse
}

// Room Service
export const roomService = {
  /**
   * Create a new room
   */
  createRoom: async (request: Omit<CreateRoomRequest, 'ownerId'>) => {
    const userId = useUserStore.getState().userId
    if (!userId) {
      return {
        data: null,
        error: 'User ID not found. Please refresh the page.',
        success: false
      }
    }

    try {
      // Establish WebSocket connection before creating room
      console.log('Establishing WebSocket connection for room creation...')
      await websocketService.connect()
      
      // Try WebSocket first
      const wsResponse = await roomWebSocketService.createRoom({
        roomName: request.roomName,
        isPrivate: request.isPrivate,
        maxPlayers: request.maxPlayers,
        playerName: request.playerName,
        ownerId: userId
      })

      if (wsResponse.success) {
        console.log('Room created successfully via WebSocket')
        
        // The WebSocket response contains the room data directly
        return {
          data: { room: wsResponse.room },
          error: null,
          success: true
        }
      } else {
        return {
          data: null,
          error: wsResponse.error || 'Failed to create room via WebSocket',
          success: false
        }
      }
    } catch (wsError) {
      console.error('WebSocket create room failed:', wsError)
      return {
        data: null,
        error: 'Failed to create room via WebSocket',
        success: false
      }
    }
  },

  /**
   * Join an existing room
   */
  joinRoom: async (request: JoinRoomRequest) => {
    const userId = useUserStore.getState().userId
    if (!userId) {
      return {
        data: null,
        error: 'User ID not found. Please refresh the page.',
        success: false
      }
    }



    try {
      // Establish WebSocket connection before joining room
      console.log('Establishing WebSocket connection for room joining...')
      await websocketService.connect()
      
      // Try WebSocket first
      const wsResponse = await roomWebSocketService.joinRoom({
        roomId: request.roomId,
        userId: userId,
        playerName: request.playerName,
        seat: request.seat
      })

      if (wsResponse.success) {
        console.log('Joined room successfully via WebSocket')
        
        // The WebSocket response contains the room data directly
        return {
          data: { room: wsResponse.room },
          error: null,
          success: true
        }
      } else {
        return {
          data: null,
          error: wsResponse.error || 'Failed to join room via WebSocket',
          success: false
        }
      }
    } catch (wsError) {
      console.error('WebSocket join room failed:', wsError)
      return {
        data: null,
        error: 'Failed to join room via WebSocket',
        success: false
      }
    }
  },

  /**
   * Get room information
   */
  getRoom: async (roomId: string) => {
    return api.get<RoomResponse>(`/room/${roomId}`, {
      errorMessage: 'Failed to get room information'
    })
  },

  /**
   * Get all available rooms
   */
  getRooms: async () => {
    return api.get<RoomResponse[]>('/rooms', {
      errorMessage: 'Failed to get rooms list'
    })
  },

  /**
   * Leave a room
   */
  leaveRoom: async (roomId: string, userId: string) => {
    return api.post(`/room/${roomId}/leave`, { userId }, {
      errorMessage: 'Failed to leave room',
      showSuccess: true,
      successMessage: 'Left room successfully'
    })
  },

  /**
   * Delete a room (room owner only)
   */
  deleteRoom: async (roomId: string) => {
    return api.delete(`/room/${roomId}`, {
      errorMessage: 'Failed to delete room',
      showSuccess: true,
      successMessage: 'Room deleted successfully'
    })
  },

  /**
   * Leave room and cleanup WebSocket subscriptions
   */
  leaveRoomAndCleanup: async (roomId: string) => {
    const userId = useUserStore.getState().userId
    if (!userId) {
      return {
        success: false,
        data: null,
        error: 'User ID not found. Please refresh the page.'
      }
    }

    try {
      // Since leaveRoom is not available in WebSocket API, use REST API directly
      const result = await api.post(`/room/${roomId}/leave`, { userId }, {
        errorMessage: 'Failed to leave room',
        showSuccess: true,
        successMessage: 'Left room successfully'
      })
      
      if (result.success) {
        // Cleanup WebSocket handlers
        websocketService.cleanupRoom(roomId)
      }
      
      return result
    } catch (error) {
      console.error('Failed to leave room:', error)
      return {
        success: false,
        data: null,
        error: 'Failed to leave room'
      }
    }
  }
} 