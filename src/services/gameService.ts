import { api } from './api'
import { GameState } from '../components/bridge/types'
import { gameWebSocketService, websocketService } from './websocketService'
import { useUserStore } from '../stores/userStore'

// Types
interface GameAction {
  type: 'bid' | 'play' | 'pass'
  data?: any
  playerId: string
}

interface GameUpdate {
  gameState: GameState
  timestamp: number
}

// Game Service
export const gameService = {
  /**
   * Get current game state
   */
  getGameState: async (roomId: string) => {
    return api.get<GameUpdate>(`/game/${roomId}/state`, {
      errorMessage: 'Failed to get game state'
    })
  },

  /**
   * Make a game action (bid, play card, etc.)
   */
  makeAction: async (roomId: string, action: GameAction) => {
    const userId = useUserStore.getState().userId
    if (!userId) {
      return {
        success: false,
        data: null,
        error: 'User ID not found. Please refresh the page.'
      }
    }

    try {
      // Use WebSocket for supported actions
      switch (action.type) {
        case 'bid':
          await gameWebSocketService.makeBid(roomId, userId, action.data)
          return { success: true, data: null, error: null }
        
        case 'play':
          await gameWebSocketService.playCard(roomId, userId, action.data)
          return { success: true, data: null, error: null }
        
        default:
          return { 
            success: false, 
            data: null, 
            error: `Unsupported action type: ${action.type}` 
          }
      }
    } catch (wsError) {
      console.error('WebSocket game action failed:', wsError)
      return { 
        success: false, 
        data: null, 
        error: 'Failed to make game action via WebSocket' 
      }
    }
  },

  /**
   * Get game history
   */
  getGameHistory: async (roomId: string) => {
    return api.get(`/game/${roomId}/history`, {
      errorMessage: 'Failed to get game history'
    })
  },

  /**
   * Start a new game
   */
  startNewGame: async (roomId: string) => {
    return api.post(`/game/${roomId}/start`, {}, {
      errorMessage: 'Failed to start new game',
      showSuccess: true,
      successMessage: 'New game started!'
    })
  },

  /**
   * Get game statistics
   */
  getGameStats: async (roomId: string) => {
    return api.get(`/game/${roomId}/stats`, {
      errorMessage: 'Failed to get game statistics'
    })
  },

  /**
   * Make a bid via WebSocket
   */
  makeBid: async (roomId: string, bid: { suit: string; level: number }) => {
    const userId = useUserStore.getState().userId
    if (!userId) {
      return {
        success: false,
        data: null,
        error: 'User ID not found. Please refresh the page.'
      }
    }

    try {
      await gameWebSocketService.makeBid(roomId, userId, bid)
      return { success: true, data: null, error: null }
    } catch (error) {
      return { success: false, data: null, error: error instanceof Error ? error.message : 'Failed to make bid' }
    }
  },

  /**
   * Play a card via WebSocket
   */
  playCard: async (roomId: string, card: { suit: string; rank: string }) => {
    const userId = useUserStore.getState().userId
    if (!userId) {
      return {
        success: false,
        data: null,
        error: 'User ID not found. Please refresh the page.'
      }
    }

    try {
      await gameWebSocketService.playCard(roomId, userId, card)
      return { success: true, data: null, error: null }
    } catch (error) {
      return { success: false, data: null, error: error instanceof Error ? error.message : 'Failed to play card' }
    }
  },



  /**
   * Cleanup game-specific WebSocket subscriptions
   */
  cleanupGame: (roomId: string) => {
    console.log(`Cleaning up game WebSocket subscriptions for room: ${roomId}`)
    websocketService.cleanupRoom(roomId)
  }
} 