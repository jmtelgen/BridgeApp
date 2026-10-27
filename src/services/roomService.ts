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
  invitationToken?: string
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
    try {
      // Establish WebSocket connection before creating room
      await websocketService.connect()
      const userId = useUserStore.getState().userId!
      
      // Try WebSocket first
      const wsResponse = await roomWebSocketService.createRoom({
        roomName: request.roomName,
        isPrivate: request.isPrivate,
        maxPlayers: request.maxPlayers,
        playerName: request.playerName,
        ownerId: userId
      })

      if (wsResponse.success !== false && wsResponse.room?.ownerId === userId) {
        let room = wsResponse.room
        // Legacy create replies replace account IDs with display names. Only
        // the authorized personalized snapshot can establish seat membership.
        if (!Object.values(room.seats || {}).includes(userId)) {
          const snapshot = await roomWebSocketService.getGameState(room.roomId, userId)
          if (snapshot.error || snapshot.success === false ||
              snapshot.room?.roomId !== room.roomId ||
              snapshot.room?.ownerId !== userId ||
              !Object.values(snapshot.room?.seats || {}).includes(userId))
            throw new Error('The server did not confirm your signed room membership. Reconnect before trying again.')
          room = snapshot.room
        }
        // The WebSocket response contains the room data directly
        return {
          data: { room },
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
        error: wsError instanceof Error ? wsError.message : 'Failed to create room via WebSocket',
        success: false
      }
    }
  },

  /**
   * Join an existing room
   */
  joinRoom: async (request: JoinRoomRequest) => {
    try {
      // Establish WebSocket connection before joining room
      await websocketService.connect()
      const userId = useUserStore.getState().userId!
      
      // Try WebSocket first
      const wsResponse = await roomWebSocketService.joinRoom({
        roomId: request.roomId,
        userId: userId,
        playerName: request.playerName,
        ...(request.invitationToken ? { invitationToken: request.invitationToken } : {})
      })

      if (wsResponse.success !== false && wsResponse.room?.roomId === request.roomId &&
          Object.values(wsResponse.room.seats || {}).includes(userId)) {
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
        error: wsError instanceof Error ? wsError.message : 'Failed to join room via WebSocket',
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
  leaveRoom: async (roomId: string, _userId: string) => {
    try {
      const data = await roomWebSocketService.leaveRoom(roomId)
      return { success: true, data, error: null }
    } catch (error) {
      return { success: false, data: null, error: error instanceof Error ? error.message : 'Failed to leave room' }
    }
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
      const result = await roomService.leaveRoom(roomId, userId)
      
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