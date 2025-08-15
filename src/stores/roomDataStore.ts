import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useUserStore } from './userStore'

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
  getPlayerDisplayName: (seat: string) => string
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

      getPlayerDisplayName: (seat: string) => {
        const { currentRoom } = get()
        if (!currentRoom) return 'Unknown Player'
        
        const playerId = currentRoom.seats[seat]
        if (!playerId) return 'Empty Seat'
        
        // Get current user's userId and player name from user store
        const { userId, playerName } = useUserStore.getState()
        
        // If this is the current user's seat, show their player name
        if (userId && playerId === userId) {
          return playerName || 'You'
        }
        
        // For other players, create a friendly name from their ID
        // Extract a number from the player ID for display
        const match = playerId.match(/user_.*?(\d+)/)
        if (match) {
          return `Player ${match[1]}`
        }
        
        // Fallback: show first 8 characters of the ID
        return playerId.substring(0, 8) + '...'
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