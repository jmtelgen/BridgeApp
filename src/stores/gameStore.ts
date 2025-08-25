import { create } from 'zustand'
import { GameData, PlayingCard, BidType, Suit, Position } from '../components/bridge/types'
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
import { getAllPositions } from '../utils/positionUtils'

// Utility function to convert card to server format
const cardToServerFormat = (card: PlayingCard): { suit: string, rank: string } => {
  // Convert display suit to server suit
  const suitMap: Record<Suit, string> = {
    "♠": "S",
    "♥": "H", 
    "♦": "D",
    "♣": "C"
  }
  
  // Convert display rank to server rank (10 -> T)
  const rankMap: Record<string, string> = {
    "A": "A", "K": "K", "Q": "Q", "J": "J", 
    "10": "T", "9": "9", "8": "8", "7": "7", 
    "6": "6", "5": "5", "4": "4", "3": "3", "2": "2"
  }
  
  return {
    suit: suitMap[card.suit],
    rank: rankMap[card.rank]
  }
}

// Initialize new game
const initializeGame = (): GameData => {
  // Initialize empty hands for all positions
  const hands: Record<Position, PlayingCard[]> = {
    North: [],
    East: [],
    South: [],
    West: []
  }
  
  // Sort hands for better display
  for (const position of getAllPositions()) {
    hands[position] = sortHand(hands[position])
  }
  
  const dealer: Position = "North" // Start with North as dealer
  const firstBidder: Position = "East" // First bid is always East (left of dealer)
  
  const gameState: GameData = {
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
  
  
  return gameState
}

interface GameStore {
  // State
  gameData: GameData
  selectedCard: PlayingCard | null
  aiThinking: boolean
  currentPlayerPosition: Position // Track which seat the current player is in
  
  // Actions
  setSelectedCard: (card: PlayingCard | null) => void
  updateGameData: (newGameData: GameData) => void
  startNewGame: () => void
  makeBid: (type: BidType, level?: number, suit?: Suit | "NT") => void
  playCard: (card: PlayingCard) => void
  setAiThinking: (thinking: boolean) => void
  setCurrentPlayerPosition: (position: Position) => void
  detectAndSetCurrentPlayerPosition: (seats: Record<string, string>, userId: string) => Position | null
  getCurrentPlayerPosition: () => Position
  
  // AI Actions
  handleAITurn: () => Promise<void>
  
  // New methods for seat-based logic
  isMyTurn: () => boolean
  canMakeMove: () => boolean
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  gameData: initializeGame(),
  selectedCard: null,
  aiThinking: false,
  currentPlayerPosition: "North", // Default to North
  


  // Basic actions
  setSelectedCard: (card) => set({ selectedCard: card }),
  
  setAiThinking: (thinking) => set({ aiThinking: thinking }),
  
  // Add a method to update game data
  updateGameData: (newGameData: GameData) => {
    set({ gameData: newGameData })
  },

  startNewGame: () => {
    set({
      gameData: initializeGame(),
      selectedCard: null,
      aiThinking: false,
      currentPlayerPosition: "North" // Reset to North for new game
    })
  },

  makeBid: async (type, level, suit) => {
    const { gameData } = get()
    if (gameData.phase !== "bidding") return
    
    const newBid = {
      level: type === "Bid" ? level! : type,
      suit: type === "Bid" ? suit : undefined,
      player: gameData.currentPlayer,
      type
    }
    
    if (!isValidBid(newBid, gameData.bids)) {
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
    const { gameData } = get()
    if (gameData.phase !== "playing") return
    
    const currentHand = gameData.hands[gameData.currentPlayer]
    if (!canPlayCard(card, currentHand, gameData.currentTrick?.ledSuit || null)) {
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

      // Convert card to server format before sending
      const serverCard = cardToServerFormat(card)
      
      // Send card play via WebSocket
      await gameWebSocketService.playCard(currentRoom.roomId, userId, serverCard)

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
    const { gameData, aiThinking } = get()
    
    if (aiThinking) return // Already processing AI turn
    
    // Get current player name to check if it's a robot
    const { getPlayerName, isRobot } = useRoomDataStore.getState()
    const currentPlayerName = getPlayerName(gameData.currentPlayer)
    
    // Only handle AI turns for robot players
    if (!currentPlayerName) {
      return
    }
    
    if (!isRobot(currentPlayerName)) {
      return
    }
    
    if (gameData.phase === "bidding") {
      set({ aiThinking: true })
      
      try {
        const aiHand = gameData.hands[gameData.currentPlayer]
        
        const vulnerability = gameData.vulnerability.NS && gameData.vulnerability.EW ? 'both' :
                            gameData.vulnerability.NS ? 'ns' :
                            gameData.vulnerability.EW ? 'ew' : 'none'
        
        const aiBidResult = getNextAIBid(aiHand, gameData.currentPlayer, gameData.bids, vulnerability)
        
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
    } else if (gameData.phase === "playing") {
      // Check if current player should be controlled by AI (only for robots)
      const shouldAIPlay = !(gameData.contract && gameData.contract.declarer === gameData.currentPlayer && gameData.dummy === gameData.currentPlayer)
      
      if (shouldAIPlay) {
        // Check if AI has valid cards to play
        const hand = gameData.hands[gameData.currentPlayer]
        const validCards = hand.filter((card: PlayingCard) => 
          canPlayCard(card, hand, gameData.currentTrick?.ledSuit || null)
        )
        
        if (validCards.length === 0) {
          console.error(`AI has no valid cards to play for ${gameData.currentPlayer}`)
          const { showError } = await import('../stores/errorStore').then(m => m.useErrorStore.getState())
          showError(`AI has no valid cards to play for ${gameData.currentPlayer}`)
          return
        }
        
        set({ aiThinking: true })
        
        try {
          const aiCard = await aiPlay(gameData)
          get().playCard(aiCard)
        } catch (error) {
          console.error("AI playing failed:", error)
          // Show error to user
          const { handleApiError } = await import('../stores/errorStore').then(m => m.useErrorStore.getState())
          handleApiError(error, "AI playing failed")
          // Fallback to first valid card
          const hand = gameData.hands[gameData.currentPlayer]
          const validCards = hand.filter((card: PlayingCard) => 
            canPlayCard(card, hand, gameData.currentTrick?.ledSuit || null)
          )
          if (validCards.length > 0) {
            get().playCard(validCards[0])
          }
        } finally {
          set({ aiThinking: false })
        }
      }
    }
  },

  // New methods for seat-based logic
  isMyTurn: () => {
    const { gameData, currentPlayerPosition } = get()
    
    // Check if it's the current player's turn
    const isTurn = gameData.currentPlayer === currentPlayerPosition
    
    console.log('isMyTurn check:', {
      currentPlayerPosition,
      gameDataCurrentPlayer: gameData.currentPlayer,
      isTurn
    })
    
    return isTurn
  },

  canMakeMove: () => {
    const { gameData, currentPlayerPosition } = get()
    
    console.log('canMakeMove: checking move', {
      currentPlayerPosition,
      gameDataCurrentPlayer: gameData.currentPlayer,
      gameDataPhase: gameData.phase,
      currentHand: gameData.hands[currentPlayerPosition],
      currentTrick: gameData.currentTrick
    })
    
    // Check if it's the current player's turn
    if (gameData.currentPlayer !== currentPlayerPosition) {
      console.log('canMakeMove: not current player turn', {
        currentPlayerPosition,
        gameDataCurrentPlayer: gameData.currentPlayer
      })
      return false
    }
    
    // Check if we have a hand to play
    const currentHand = gameData.hands[currentPlayerPosition]
    if (!currentHand || currentHand.length === 0) {
      console.log('canMakeMove: no hand available', {
        currentPlayerPosition,
        currentHand
      })
      return false
    }
    
    // For bidding phase, always allow moves
    if (gameData.phase === "bidding") {
      return true
    }
    
    // For playing phase, check if we can play a card
    if (gameData.phase === "playing") {
      // Check if we have valid cards to play
      const validCards = currentHand.filter(card => 
        canPlayCard(card, currentHand, gameData.currentTrick?.ledSuit || null)
      )
      
      console.log('canMakeMove: playing phase check', {
        currentPlayerPosition,
        validCardsCount: validCards.length,
        validCards
      })
      
      return validCards.length > 0
    }
    
    return false
  },

  setCurrentPlayerPosition: (position: Position) => {
    set({ currentPlayerPosition: position })
  },

  detectAndSetCurrentPlayerPosition: (seats: Record<string, string>, userId: string) => {
    // Find which seat this user is assigned to
    let playerPosition: Position | null = null
    
    for (const [seatKey, playerId] of Object.entries(seats)) {
      if (playerId === userId) {
        // Server now returns full position names, so we can use the seat directly
        if (seatKey === 'North' || seatKey === 'South' || seatKey === 'East' || seatKey === 'West') {
          playerPosition = seatKey as Position
        }
        break
      }
    }
    
    if (playerPosition) {
      // Set the current player position
      set({ currentPlayerPosition: playerPosition })
    }
    
    return playerPosition
  },

  getCurrentPlayerPosition: () => {
    return get().currentPlayerPosition
  }
})) 