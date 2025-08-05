import { create } from 'zustand'

interface RoomData {
  roomId: string
  ownerId: string
  playerName: string
  roomName: string
  isPrivate: boolean
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

interface RoomDataStore {
  // State
  currentRoom: RoomData | null
  
  // Actions
  setCurrentRoom: (room: RoomData) => void
  clearCurrentRoom: () => void
  getPlayerName: (seat: string) => string | null
}

export const useRoomDataStore = create<RoomDataStore>((set, get) => ({
  // Initial state
  currentRoom: null,

  // Actions
  setCurrentRoom: (room) => {
    set({ currentRoom: room })
  },

  clearCurrentRoom: () => {
    set({ currentRoom: null })
  },

  getPlayerName: (seat: string) => {
    const { currentRoom } = get()
    if (!currentRoom) return null
    return currentRoom.seats[seat] || null
  }
})) 