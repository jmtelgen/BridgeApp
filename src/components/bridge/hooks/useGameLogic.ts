// Compatibility layer for useGameLogic - now uses Zustand store
import { useGameStore } from '../../../stores/gameStore'

export const useGameLogic = () => {
  const {
    gameState,
    selectedCard,
    setSelectedCard,
    aiThinking,
    startNewGame,
    makeBid,
    playCard
  } = useGameStore()

  return {
    gameState,
    selectedCard,
    setSelectedCard,
    aiThinking,
    startNewGame,
    makeBid,
    playCard
  }
} 