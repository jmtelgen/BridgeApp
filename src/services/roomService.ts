import { api } from './api'

// Types
interface CreateRoomRequest {
  roomName: string
  isPrivate: boolean
  maxPlayers: number
  playerName: string
  ownerId: string
}

interface JoinRoomRequest {
  userId: string
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
    // Hardcode ownerId for now
    const createRoomRequest: CreateRoomRequest = {
      ...request,
      ownerId: 'hardcoded-owner-123'
    }
    
    return api.post<CreateRoomResponse>('/room', createRoomRequest, {
      errorMessage: 'Failed to create room',
      showSuccess: true,
      successMessage: 'Room created successfully!'
    })
  },

  /**
   * Join an existing room
   */
  joinRoom: async (request: JoinRoomRequest) => {
    return api.post<JoinRoomResponse>('/room/join', request, {
      errorMessage: 'Failed to join room',
      showSuccess: true,
      successMessage: 'Joined room successfully!'
    })
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
  }
} 