import { useEffect } from 'react'
import { useGameStore } from '../stores/gameStore'

export const useAITurn = () => {
  const { gameState, aiThinking, handleAITurn } = useGameStore()

  useEffect(() => {
    // Handle AI turns when game state changes
    if (!aiThinking) {
      handleAITurn()
    }
  }, [gameState.currentPlayer, gameState.phase, aiThinking, handleAITurn])

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