import { create } from 'zustand'
import { GameState, PlayingCard, BidType, Suit, Position } from '../components/bridge/types'
import { 
  createDeck, 
  shuffleDeck, 
  dealCards, 
  sortHand, 
  isValidBid, 
  canPlayCard, 
} from '../components/bridge/utils/game-utils'
import { aiPlay } from '../components/bridge/utils/ai-utils'
import { getNextAIBid } from '../components/bridge/dds/ai-bidding-integration'
import { gameWebSocketService } from '../services/websocketService'
import { useRoomDataStore } from './roomDataStore'
import { useUserStore } from './userStore'

// Initialize new game
const initializeGame = (): GameState => {
  const deck = shuffleDeck(createDeck())
  const hands = dealCards(deck)
  
  // Sort all hands
  for (const position of ["North", "East", "South", "West"] as Position[]) {
    hands[position] = sortHand(hands[position])
  }
  
  const dealer: Position = "North" // Start with North as dealer
  const firstBidder: Position = "East" // First bid is always East (left of dealer)
  
  const gameState: GameState = {
    phase: "bidding",
    currentPlayer: "North", // Will be overridden by server data
    dealer,
    bids: [],
    hands,
    currentTrick: {
      cards: { North: null, East: null, South: null, West: null },
      winner: null,
      ledSuit: null,
      trickLeader: null
    },
    tricks: [],
    previousTrick: null,
    contract: null,
    dummy: null,
    firstCardPlayed: false,
    gameNumber: 1,
    vulnerability: { NS: false, EW: false }
  }
  
  console.log('GameStore - initializeGame - created gameState:', gameState)
  console.log('GameStore - initializeGame - currentTrick:', gameState.currentTrick)
  console.log('GameStore - initializeGame - tricks:', gameState.tricks)
  console.log('GameStore - initializeGame - tricks.length:', gameState.tricks.length)
  
  return gameState
}

interface GameStore {
  // State
  gameState: GameState
  selectedCard: PlayingCard | null
  aiThinking: boolean
  
  // Actions
  setSelectedCard: (card: PlayingCard | null) => void
  updateGameState: (newGameState: GameState) => void
  startNewGame: () => void
  makeBid: (type: BidType, level?: number, suit?: Suit | "NT") => void
  playCard: (card: PlayingCard) => void
  setAiThinking: (thinking: boolean) => void
  
  // AI Actions
  handleAITurn: () => Promise<void>
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  gameState: initializeGame(),
  selectedCard: null,
  aiThinking: false,
  


  // Basic actions
  setSelectedCard: (card) => set({ selectedCard: card }),
  
  setAiThinking: (thinking) => set({ aiThinking: thinking }),
  
  // Add a method to update game state with logging
  updateGameState: (newGameState: GameState) => {
    console.log('GameStore - updateGameState called with:', newGameState)
    console.log('GameStore - newGameState.currentPlayer:', newGameState.currentPlayer)
    console.log('GameStore - newGameState.currentTrick:', newGameState.currentTrick)
    console.log('GameStore - newGameState.tricks:', newGameState.tricks)
    console.log('GameStore - newGameState.tricks?.length:', newGameState.tricks?.length)
    set({ gameState: newGameState })
  },

  startNewGame: () => {
    set({
      gameState: initializeGame(),
      selectedCard: null,
      aiThinking: false
    })
  },

  makeBid: async (type, level, suit) => {
    const { gameState } = get()
    if (gameState.phase !== "bidding") return
    
    const newBid = {
      level: type === "Bid" ? level! : type,
      suit: type === "Bid" ? suit : undefined,
      player: gameState.currentPlayer,
      type
    }
    
    if (!isValidBid(newBid, gameState.bids)) {
      return // Invalid bid
    }

    try {
      // Get current room and user info
      const { currentRoom } = useRoomDataStore.getState()
      const userId = useUserStore.getState().userId
      
      if (!currentRoom?.roomId || !userId) {
        console.error('Missing room ID or user ID for bidding')
        return
      }

      // Send bid via WebSocket
      await gameWebSocketService.makeBid(currentRoom.roomId, userId, {
        type: type,
        level: type === "Bid" ? level : undefined,
        suit: type === "Bid" ? suit : undefined
      })

      // Clear selected card
      set({ selectedCard: null })
    } catch (error) {
      console.error('Failed to make bid:', error)
      // Show error to user
      const { handleApiError } = await import('./errorStore').then(m => m.useErrorStore.getState())
      handleApiError(error, "Failed to make bid")
    }
  },

  playCard: async (card) => {
    const { gameState } = get()
    if (gameState.phase !== "playing") return
    
    const currentHand = gameState.hands[gameState.currentPlayer]
    if (!canPlayCard(card, currentHand, gameState.currentTrick?.ledSuit || null)) {
      return // Invalid play
    }

    try {
      // Get current room and user info
      const { currentRoom } = useRoomDataStore.getState()
      const userId = useUserStore.getState().userId
      
      if (!currentRoom?.roomId || !userId) {
        console.error('Missing room ID or user ID for playing card')
        return
      }

      // Send card play via WebSocket
      await gameWebSocketService.playCard(currentRoom.roomId, userId, {
        suit: card.suit,
        rank: card.rank
      })

      // Clear selected card
      set({ selectedCard: null })
    } catch (error) {
      console.error('Failed to play card:', error)
      // Show error to user
      const { handleApiError } = await import('./errorStore').then(m => m.useErrorStore.getState())
      handleApiError(error, "Failed to play card")
    }
  },

  handleAITurn: async () => {
    const { gameState, aiThinking } = get()
    
    if (aiThinking) return // Already processing AI turn
    
    // Get current player name to check if it's a robot
    const { getPlayerName, isRobot } = useRoomDataStore.getState()
    const currentPlayerName = getPlayerName(gameState.currentPlayer)
    
    console.log('GameStore - handleAITurn called for player:', gameState.currentPlayer)
    console.log('GameStore - handleAITurn - currentPlayerName:', currentPlayerName)
    console.log('GameStore - handleAITurn - isRobot:', currentPlayerName ? isRobot(currentPlayerName) : false)
    
    // Only handle AI turns for robot players
    if (!currentPlayerName) {
      console.log('GameStore - handleAITurn - no player name found, returning')
      return
    }
    
    if (!isRobot(currentPlayerName)) {
      console.log('GameStore - handleAITurn - not a robot player, returning')
      return
    }
    
    console.log('GameStore - handleAITurn - proceeding with AI turn')
    console.log('GameStore - handleAITurn - gameState.currentTrick:', gameState.currentTrick)
    console.log('GameStore - handleAITurn - gameState.tricks:', gameState.tricks)
    console.log('GameStore - handleAITurn - gameState.tricks?.length:', gameState.tricks?.length)
    console.log('GameStore - handleAITurn - gameState.hands:', gameState.hands)
    console.log('GameStore - handleAITurn - current player hand:', gameState.hands[gameState.currentPlayer as keyof typeof gameState.hands])
    
    if (gameState.phase === "bidding") {
      set({ aiThinking: true })
      
      try {
        const aiHand = gameState.hands[gameState.currentPlayer]
        console.log('GameStore - AI bidding - aiHand:', aiHand)
        console.log('GameStore - AI bidding - aiHand length:', aiHand?.length)
        console.log('GameStore - AI bidding - currentPlayer:', gameState.currentPlayer)
        console.log('GameStore - AI bidding - bids:', gameState.bids)
        console.log('GameStore - AI bidding - vulnerability:', gameState.vulnerability)
        
        const vulnerability = gameState.vulnerability.NS && gameState.vulnerability.EW ? 'both' :
                            gameState.vulnerability.NS ? 'ns' :
                            gameState.vulnerability.EW ? 'ew' : 'none'
        
        console.log('GameStore - AI bidding - calculated vulnerability:', vulnerability)
        
        const aiBidResult = getNextAIBid(aiHand, gameState.currentPlayer, gameState.bids, vulnerability)
        console.log('GameStore - AI bidding - aiBidResult:', aiBidResult)
        
        get().makeBid(aiBidResult.type, aiBidResult.level as number, aiBidResult.suit)
      } catch (error) {
        console.error("AI bidding failed:", error)
        // Show error to user
        const { handleApiError } = await import('../stores/errorStore').then(m => m.useErrorStore.getState())
        handleApiError(error, "AI bidding failed")
        // Fallback to pass
        get().makeBid("Pass")
      } finally {
        set({ aiThinking: false })
      }
    } else if (gameState.phase === "playing") {
      // Check if current player should be controlled by AI (only for robots)
      const shouldAIPlay = !(gameState.contract && gameState.contract.declarer === gameState.currentPlayer && gameState.dummy === gameState.currentPlayer)
      
      if (shouldAIPlay) {
        // Check if AI has valid cards to play
        const hand = gameState.hands[gameState.currentPlayer]
        console.log('GameStore - AI playing - hand:', hand)
        console.log('GameStore - AI playing - hand.length:', hand?.length)
        const validCards = hand.filter(card => 
          canPlayCard(card, hand, gameState.currentTrick?.ledSuit || null)
        )
        console.log('GameStore - AI playing - validCards:', validCards)
        console.log('GameStore - AI playing - validCards.length:', validCards?.length)
        
        if (validCards.length === 0) {
          console.error(`AI has no valid cards to play for ${gameState.currentPlayer}`)
          const { showError } = await import('../stores/errorStore').then(m => m.useErrorStore.getState())
          showError(`AI has no valid cards to play for ${gameState.currentPlayer}`)
          return
        }
        
        set({ aiThinking: true })
        
        try {
          console.log(`AI playing for ${gameState.currentPlayer}`)
          const aiCard = await aiPlay(gameState)
          console.log(`AI chose card: ${aiCard.suit}${aiCard.rank}`)
          get().playCard(aiCard)
        } catch (error) {
          console.error("AI playing failed:", error)
          // Show error to user
          const { handleApiError } = await import('../stores/errorStore').then(m => m.useErrorStore.getState())
          handleApiError(error, "AI playing failed")
          // Fallback to first valid card
          const hand = gameState.hands[gameState.currentPlayer]
          console.log('GameStore - AI fallback - hand:', hand)
          console.log('GameStore - AI fallback - hand.length:', hand?.length)
          const validCards = hand.filter(card => 
            canPlayCard(card, hand, gameState.currentTrick?.ledSuit || null)
          )
          console.log('GameStore - AI fallback - validCards:', validCards)
          console.log('GameStore - AI fallback - validCards.length:', validCards?.length)
          if (validCards.length > 0) {
            get().playCard(validCards[0])
          }
        } finally {
          set({ aiThinking: false })
        }
      }
    }
  }
})) 