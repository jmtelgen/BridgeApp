import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useUserStore } from './userStore'
import { Position } from '../components/bridge/types'
import { subtractPositions } from '../utils/positionUtils'

export interface SeatPresence {
  status: 'online' | 'reconnecting' | 'offline' | 'robot' | 'empty'
  userId?: string
  reservedUntil?: number
  connectionCount: number
}

useUserStore.subscribe((state, previous) => {
  if ((state.isAuthenticated !== previous.isAuthenticated &&
       (!state.isAuthenticated || !previous.wasAuthenticated)) ||
      (previous.user !== null && state.user === null) ||
      (previous.user && state.user && previous.user.userId !== state.user.userId))
    useRoomDataStore.getState().clearCurrentRoom()
})
export interface RoomData {
  roomId: string
  ownerId: string
  playerName: string
  roomName: string
  isPrivate: boolean
  locked?: boolean
  eventId?: string | null
  computerLevel?: 'heuristic' | 'standard' | 'thoughtful'
  presence?: Record<string, SeatPresence>
  seats: Record<string, string>
  state: string
  gameData: null | {
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
  getRobotDisplayInfo: (seat: string) => { isRobot: boolean; robotName: string | null }
}

export const useRoomDataStore = create<RoomDataStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentRoom: null,

      // Actions
      setCurrentRoom: (room) => {
        set({ currentRoom: { ...room, gameData: null } })
      },

      updateCurrentRoom: (updates) => {
        set((state) => ({
          currentRoom: state.currentRoom ? { ...state.currentRoom, ...updates, gameData: null } : null
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
        
        // Check if this is a robot player
        if (get().isRobot(playerId)) {
          // For robots, display their actual name (e.g., "ROBOT_1", "ROBOT_2")
          return playerId
        }

        // For other human players, create a friendly name from their ID
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
        return playerName.toUpperCase().startsWith('ROBOT_');
      },

      getDisplayPositionLabel: (displayPosition: Position, currentPlayerPosition: Position) => {
        // We want: what does the current player see at 'displayPosition'?
        // This is the opposite of subtractPositions - we need what 'currentPos' looks like from 'displayPosition' perspective
        return subtractPositions(currentPlayerPosition, displayPosition)
      },

      getRobotDisplayInfo: (seat: string) => {
        const { currentRoom } = get();
        if (!currentRoom) return { isRobot: false, robotName: null }

        const playerId = currentRoom.seats[seat]
        if (!playerId) return { isRobot: false, robotName: null }

        const isRobotPlayer = get().isRobot(playerId)
        return {
          isRobot: isRobotPlayer,
          robotName: isRobotPlayer ? playerId : null
        }
      }
    }),
    {
      name: 'bridge-room-data-storage', // localStorage key
      version: 1,
      migrate: (stored: any) => ({
        currentRoom: stored?.currentRoom ? { ...stored.currentRoom, gameData: null } : null
      }),
      partialize: (state) => ({ 
        currentRoom: state.currentRoom
      })
    }
  )
) 