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
  
  // Actions
  setCurrentRoom: (room: RoomData) => void
  updateCurrentRoom: (updates: Partial<RoomData>) => void
  clearCurrentRoom: () => void
  getPlayerName: (seat: string) => string | null
  getPlayerDisplayName: (seat: string) => string
  isRobot: (playerName: string) => boolean
  getEastPlayerName: (currentPlayerPosition: Position) => String | null
  getWestPlayerName: (currentPlayerPosition: Position) => String | null
  getNorthPlayerName: (currentPlayerPosition: Position) => String | null
  getDisplayPositionLabel: (displayPosition: Position, currentPlayerPosition: Position) => string
}

export const useRoomDataStore = create<RoomDataStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentRoom: null,

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
        set({ currentRoom: null })
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

      getEastPlayerName: (currentPlayerPosition: Position) => {
        const { currentRoom } = get()
        if (!currentRoom) return null
        return currentRoom.seats[subtractPositions(currentPlayerPosition, "East")] || null
      },

      getWestPlayerName: (currentPlayerPosition: Position) => {
        const { currentRoom } = get()
        if (!currentRoom) return null
        return currentRoom.seats[subtractPositions(currentPlayerPosition, "West")] || null
      },
      
      getNorthPlayerName: (currentPlayerPosition: Position) => {
        const { currentRoom } = get()
        if (!currentRoom) return null
        return currentRoom.seats[subtractPositions(currentPlayerPosition, "North")] || null
      },

      isRobot: (playerName: string) => {
        // Check if the player name indicates it's a robot
        return playerName.toLowerCase().includes('robot') || 
           playerName.toLowerCase().includes('ai') ||
           playerName.toLowerCase().includes('bot')
      },

      getDisplayPositionLabel: (displayPosition: Position, currentPlayerPosition: Position) => {
        // We want: what does the current player see at 'displayPosition'?
        // This is the opposite of subtractPositions - we need what 'currentPos' looks like from 'displayPosition' perspective
        return subtractPositions(currentPlayerPosition, displayPosition)
      }
    }),
    {
      name: 'bridge-room-data-storage', // localStorage key
      partialize: (state) => ({ 
        currentRoom: state.currentRoom
      })
    }
  )
) 