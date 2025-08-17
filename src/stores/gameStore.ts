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

// Initialize new game
const initializeGame = (): GameData => {
  const deck = shuffleDeck(createDeck())
  const hands = dealCards(deck)
  
  // Sort all hands
  for (const position of ["North", "East", "South", "West"] as Position[]) {
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
  
  // Actions
  setSelectedCard: (card: PlayingCard | null) => void
  updateGameData: (newGameData: GameData) => void
  startNewGame: () => void
  makeBid: (type: BidType, level?: number, suit?: Suit | "NT") => void
  playCard: (card: PlayingCard) => void
  setAiThinking: (thinking: boolean) => void
  
  // AI Actions
  handleAITurn: () => Promise<void>
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  gameData: initializeGame(),
  selectedCard: null,
  aiThinking: false,
  


  // Basic actions
  setSelectedCard: (card) => set({ selectedCard: card }),
  
  setAiThinking: (thinking) => set({ aiThinking: thinking }),
  
  // Add a method to update game data with logging
  updateGameData: (newGameData: GameData) => {
    console.log('GameStore - updateGameData called with:', newGameData)
    console.log('GameStore - newGameData.currentPlayer:', newGameData.currentPlayer)
    console.log('GameStore - newGameData.tricks?.length:', newGameData.tricks?.length)
    set({ gameData: newGameData })
  },

  startNewGame: () => {
    set({
      gameData: initializeGame(),
      selectedCard: null,
      aiThinking: false
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
    const { gameData, aiThinking } = get()
    
    if (aiThinking) return // Already processing AI turn
    
    // Get current player name to check if it's a robot
    const { getPlayerName, isRobot } = useRoomDataStore.getState()
    const currentPlayerName = getPlayerName(gameData.currentPlayer)
    
    console.log('GameStore - handleAITurn called for player:', gameData.currentPlayer)
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
    console.log('GameStore - handleAITurn - gameData.currentTrick:', gameData.currentTrick)
    console.log('GameStore - handleAITurn - gameData.tricks:', gameData.tricks)
    console.log('GameStore - handleAITurn - gameData.tricks?.length:', gameData.tricks?.length)
    console.log('GameStore - handleAITurn - gameData.hands:', gameData.hands)
    console.log('GameStore - handleAITurn - current player hand:', gameData.hands[gameData.currentPlayer as keyof typeof gameData.hands])
    
    if (gameData.phase === "bidding") {
      set({ aiThinking: true })
      
      try {
        const aiHand = gameData.hands[gameData.currentPlayer]
        console.log('GameStore - AI bidding - aiHand:', aiHand)
        console.log('GameStore - AI bidding - aiHand length:', aiHand?.length)
        console.log('GameStore - AI bidding - currentPlayer:', gameData.currentPlayer)
        console.log('GameStore - AI bidding - bids:', gameData.bids)
        console.log('GameStore - AI bidding - vulnerability:', gameData.vulnerability)
        
        const vulnerability = gameData.vulnerability.NS && gameData.vulnerability.EW ? 'both' :
                            gameData.vulnerability.NS ? 'ns' :
                            gameData.vulnerability.EW ? 'ew' : 'none'
        
        console.log('GameStore - AI bidding - calculated vulnerability:', vulnerability)
        
        const aiBidResult = getNextAIBid(aiHand, gameData.currentPlayer, gameData.bids, vulnerability)
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
    } else if (gameData.phase === "playing") {
      // Check if current player should be controlled by AI (only for robots)
      const shouldAIPlay = !(gameData.contract && gameData.contract.declarer === gameData.currentPlayer && gameData.dummy === gameData.currentPlayer)
      
      if (shouldAIPlay) {
        // Check if AI has valid cards to play
        const hand = gameData.hands[gameData.currentPlayer]
        console.log('GameStore - AI playing - hand:', hand)
        console.log('GameStore - AI playing - hand.length:', hand?.length)
        const validCards = hand.filter((card: PlayingCard) => 
          canPlayCard(card, hand, gameData.currentTrick?.ledSuit || null)
        )
        console.log('GameStore - AI playing - validCards:', validCards)
        console.log('GameStore - AI playing - validCards.length:', validCards?.length)
        
        if (validCards.length === 0) {
          console.error(`AI has no valid cards to play for ${gameData.currentPlayer}`)
          const { showError } = await import('../stores/errorStore').then(m => m.useErrorStore.getState())
          showError(`AI has no valid cards to play for ${gameData.currentPlayer}`)
          return
        }
        
        set({ aiThinking: true })
        
        try {
          console.log(`AI playing for ${gameData.currentPlayer}`)
          const aiCard = await aiPlay(gameData)
          console.log(`AI chose card: ${aiCard.suit}${aiCard.rank}`)
          get().playCard(aiCard)
        } catch (error) {
          console.error("AI playing failed:", error)
          // Show error to user
          const { handleApiError } = await import('../stores/errorStore').then(m => m.useErrorStore.getState())
          handleApiError(error, "AI playing failed")
          // Fallback to first valid card
          const hand = gameData.hands[gameData.currentPlayer]
          console.log('GameStore - AI fallback - hand:', hand)
          console.log('GameStore - AI fallback - hand.length:', hand?.length)
          const validCards = hand.filter((card: PlayingCard) => 
            canPlayCard(card, hand, gameData.currentTrick?.ledSuit || null)
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