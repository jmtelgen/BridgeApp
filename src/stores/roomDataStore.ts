import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  currentPlayerPosition: string | null // Track which seat the current player is in
  
  // Actions
  setCurrentRoom: (room: RoomData) => void
  updateCurrentRoom: (updates: Partial<RoomData>) => void
  clearCurrentRoom: () => void
  setCurrentPlayerPosition: (position: string) => void
  getPlayerName: (seat: string) => string | null
  isRobot: (playerName: string) => boolean
  getCurrentPlayerPosition: () => string | null
}

export const useRoomDataStore = create<RoomDataStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentRoom: null,
      currentPlayerPosition: null,

      // Actions
      setCurrentRoom: (room) => {
        set({ currentRoom: room })
      },

      updateCurrentRoom: (updates) => {
        set((state) => ({
          currentRoom: state.currentRoom ? { ...state.currentRoom, ...updates } : null
        }))
      },

      clearCurrentRoom: () => {
        set({ currentRoom: null, currentPlayerPosition: null })
      },

      setCurrentPlayerPosition: (position) => {
        set({ currentPlayerPosition: position })
      },

      getPlayerName: (seat: string) => {
        const { currentRoom } = get()
        if (!currentRoom) return null
        return currentRoom.seats[seat] || null
      },

      isRobot: (playerName: string) => {
        // Check if the player name indicates it's a robot
        return playerName.toLowerCase().includes('robot') || 
           playerName.toLowerCase().includes('ai') ||
           playerName.toLowerCase().includes('bot')
      },

      getCurrentPlayerPosition: () => {
        return get().currentPlayerPosition
      }
    }),
    {
      name: 'bridge-room-data-storage', // localStorage key
      partialize: (state) => ({ 
        currentRoom: state.currentRoom,
        currentPlayerPosition: state.currentPlayerPosition
      })
    }
  )
) 