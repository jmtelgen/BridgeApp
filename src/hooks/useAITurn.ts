import { useEffect } from 'react'
import { useGameStore } from '../stores/gameStore'
import { useRoomDataStore } from '../stores/roomDataStore'

export const useAITurn = () => {
  const { gameState, aiThinking, handleAITurn } = useGameStore()
  const { getPlayerName, isRobot } = useRoomDataStore()

  useEffect(() => {
    // Only handle AI turns for robot players
    if (!aiThinking) {
      const currentPlayerName = getPlayerName(gameState.currentPlayer)
      if (currentPlayerName && isRobot(currentPlayerName)) {
        console.log('useAITurn - calling handleAITurn for robot player:', gameState.currentPlayer)
        handleAITurn()
      } else {
        console.log('useAITurn - not calling handleAITurn for human player:', gameState.currentPlayer)
      }
    }
  }, [gameState.currentPlayer, gameState.phase, aiThinking, handleAITurn, getPlayerName, isRobot])

  // Auto-reset aiThinking if it gets stuck for too long
  useEffect(() => {
    if (aiThinking) {
      const timeout = setTimeout(() => {
        console.log('Auto-resetting aiThinking due to timeout')
        useGameStore.getState().setAiThinking(false)
      }, 5000) // 5 second timeout
      
      return () => clearTimeout(timeout)
    }
  }, [aiThinking])
} 