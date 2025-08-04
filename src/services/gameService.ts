import { api } from './api'
import { GameState } from '../components/bridge/types'

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
    return api.post(`/game/${roomId}/action`, action, {
      errorMessage: 'Failed to make game action'
    })
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
  }
} 