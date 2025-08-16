import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useUserStore } from './userStore'
import { Position } from '../components/bridge/types'
import { subtractPositions } from '../utils/positionUtils'

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
  currentPlayerPosition: Position // Track which seat the current player is in
  
  // Actions
  setCurrentRoom: (room: RoomData) => void
  updateCurrentRoom: (updates: Partial<RoomData>) => void
  clearCurrentRoom: () => void
  setCurrentPlayerPosition: (position: Position) => void
  getPlayerName: (seat: string) => string | null
  getPlayerDisplayName: (seat: string) => string
  isRobot: (playerName: string) => boolean
  getCurrentPlayerPosition: () => Position  
  getEastPlayerName: () => String | null
  getWestPlayerName: () => String | null
  getNorthPlayerName: () => String | null
  getDisplayPositionLabel: (displayPosition: Position) => string
}

export const useRoomDataStore = create<RoomDataStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentRoom: null,
      currentPlayerPosition: "South",

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
        set({ currentRoom: null, currentPlayerPosition: "South" })
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

      getEastPlayerName: () => {
        const { currentRoom } = get()
        if (!currentRoom) return null
        return currentRoom.seats[subtractPositions(get().currentPlayerPosition, "East")] || null
      },

      getWestPlayerName: () => {
        const { currentRoom } = get()
        if (!currentRoom) return null
        return currentRoom.seats[subtractPositions(get().currentPlayerPosition, "West")] || null
      },
      
      getNorthPlayerName: () => {
        const { currentRoom } = get()
        if (!currentRoom) return null
        return currentRoom.seats[subtractPositions(get().currentPlayerPosition, "North")] || null
      },

      isRobot: (playerName: string) => {
        // Check if the player name indicates it's a robot
        return playerName.toLowerCase().includes('robot') || 
           playerName.toLowerCase().includes('ai') ||
           playerName.toLowerCase().includes('bot')
      },

      getCurrentPlayerPosition: () => {
        console.log('getCurrentPlayerPosition', get().currentPlayerPosition)
        return get().currentPlayerPosition
      },

      getDisplayPositionLabel: (displayPosition: Position) => {
        const currentPos = get().currentPlayerPosition
        // We want: what does the current player see at 'displayPosition'?
        // This is the opposite of subtractPositions - we need what 'currentPos' looks like from 'displayPosition' perspective
        return subtractPositions(currentPos, displayPosition)
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