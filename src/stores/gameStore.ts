import { create } from 'zustand'
import { GameState, PlayingCard, BidType, Suit, Position } from '../components/bridge/types'
import { 
  createDeck, 
  shuffleDeck, 
  dealCards, 
  sortHand, 
  getNextPlayer, 
  getOppositePosition,
  isValidBid, 
  determineContract, 
  isBiddingComplete, 
  canPlayCard, 
  determineTrickWinner 
} from '../components/bridge/utils/game-utils'
import { aiPlay } from '../components/bridge/utils/ai-utils'
import { getNextAIBid } from '../components/bridge/dds/ai-bidding-integration'

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
  
  return {
    phase: "bidding",
    currentPlayer: firstBidder,
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
}

interface GameStore {
  // State
  gameState: GameState
  selectedCard: PlayingCard | null
  aiThinking: boolean
  
  // Actions
  setSelectedCard: (card: PlayingCard | null) => void
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

  startNewGame: () => {
    set({
      gameState: initializeGame(),
      selectedCard: null,
      aiThinking: false
    })
  },

  makeBid: (type, level, suit) => {
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
    
    const newBids = [...gameState.bids, newBid]
    const nextPlayer = getNextPlayer(gameState.currentPlayer)
    
    if (isBiddingComplete(newBids)) {
      // Bidding is complete, determine contract
      const contract = determineContract(newBids)
      if (contract) {
        const dummy = getOppositePosition(contract.declarer) // Dummy is across from declarer
        set(state => ({
          ...state,
          gameState: {
            ...state.gameState,
            phase: "playing",
            currentPlayer: getNextPlayer(contract.declarer), // First lead is after declarer
            bids: newBids,
            contract,
            dummy,
            firstCardPlayed: false // Reset for new playing phase
          }
        }))
      } else {
        // All passed, start new game
        get().startNewGame()
      }
    } else {
      set(state => ({
        ...state,
        gameState: {
          ...state.gameState,
          currentPlayer: nextPlayer,
          bids: newBids
        }
      }))
    }
  },

  playCard: (card) => {
    const { gameState } = get()
    if (gameState.phase !== "playing") return
    
    const currentHand = gameState.hands[gameState.currentPlayer]
    if (!canPlayCard(card, currentHand, gameState.currentTrick.ledSuit)) {
      return // Invalid play
    }
    
    // Remove card from hand
    const newHands = { ...gameState.hands }
    newHands[gameState.currentPlayer] = currentHand.filter(c => 
      c.suit !== card.suit || c.rank !== card.rank
    )
    
    // Add card to current trick
    const newCurrentTrick = { ...gameState.currentTrick }
    newCurrentTrick.cards[gameState.currentPlayer] = card
    
    if (!newCurrentTrick.ledSuit) {
      newCurrentTrick.ledSuit = card.suit
      newCurrentTrick.trickLeader = gameState.currentPlayer
    }
    
    // Mark that first card has been played (to show dummy hand)
    const firstCardPlayed = gameState.tricks.length === 0 && !gameState.currentTrick.ledSuit
    
    const nextPlayer = getNextPlayer(gameState.currentPlayer)
    
    if (nextPlayer === gameState.currentPlayer || 
        Object.values(newCurrentTrick.cards).every(c => c !== null)) {
      // Trick is complete
      const winner = determineTrickWinner(newCurrentTrick, gameState.contract!.suit)
      const newTricks = [...gameState.tricks, { ...newCurrentTrick, winner }]
      
      console.log(`Trick completed! Winner: ${winner}, currentPlayer was: ${gameState.currentPlayer}`)
      
      // Check if game is complete
      if (newTricks.length === 13) {
        set(state => ({
          ...state,
          gameState: {
            ...state.gameState,
            phase: "completed",
            currentTrick: newCurrentTrick,
            tricks: newTricks,
            firstCardPlayed: true
          },
          selectedCard: null
        }))
      } else {
        // Start new trick - store the completed trick as previousTrick
        set(state => {
          console.log(`Starting new trick with winner: ${winner}`)
          return {
            ...state,
            gameState: {
              ...state.gameState,
              currentPlayer: winner,
              hands: newHands,
              currentTrick: {
                cards: { North: null, East: null, South: null, West: null },
                winner: null,
                ledSuit: null,
                trickLeader: null
              },
              previousTrick: { ...newCurrentTrick, winner },
              tricks: newTricks,
              firstCardPlayed: true
            },
            selectedCard: null
          }
        })
      }
    } else {
      set(state => ({
        ...state,
        gameState: {
          ...state.gameState,
          currentPlayer: nextPlayer,
          hands: newHands,
          currentTrick: newCurrentTrick,
          firstCardPlayed: firstCardPlayed || state.gameState.firstCardPlayed,
          // Clear previous trick when first card of new trick is played
          previousTrick: !gameState.currentTrick.ledSuit ? null : state.gameState.previousTrick
        },
        selectedCard: null
      }))
    }
  },

  handleAITurn: async () => {
    const { gameState, aiThinking } = get()
    
    if (aiThinking) return // Already processing AI turn
    
    if (gameState.phase === "bidding" && gameState.currentPlayer !== "South") {
      set({ aiThinking: true })
      
      try {
        const aiHand = gameState.hands[gameState.currentPlayer]
        const vulnerability = gameState.vulnerability.NS && gameState.vulnerability.EW ? 'both' :
                            gameState.vulnerability.NS ? 'ns' :
                            gameState.vulnerability.EW ? 'ew' : 'none'
        
        const aiBidResult = getNextAIBid(aiHand, gameState.currentPlayer, gameState.bids, vulnerability)
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
      // Check if current player should be controlled by AI
      const shouldAIPlay = gameState.currentPlayer !== "South" && 
        !(gameState.contract && gameState.contract.declarer === "South" && gameState.dummy === gameState.currentPlayer)
      
      if (shouldAIPlay) {
        // Check if AI has valid cards to play
        const hand = gameState.hands[gameState.currentPlayer]
        const validCards = hand.filter(card => 
          canPlayCard(card, hand, gameState.currentTrick.ledSuit)
        )
        
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
          const validCards = hand.filter(card => 
            canPlayCard(card, hand, gameState.currentTrick.ledSuit)
          )
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