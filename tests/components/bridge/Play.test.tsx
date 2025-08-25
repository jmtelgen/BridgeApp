import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Play } from '../../../src/components/bridge/play'
import { createTestGameData, createTestHand, createTestBid, resetMocks } from '../../mocks'
import type { Position, Suit } from '../../../src/components/bridge/types'

// Mock the stores
vi.mock('../../../src/stores/gameStore', () => ({
  useGameStore: () => ({
    gameData: createTestGameData(),
    selectedCard: null,
    aiThinking: false,
    setSelectedCard: vi.fn(),
    updateGameData: vi.fn(),
    startNewGame: vi.fn(),
    makeBid: vi.fn(),
    playCard: vi.fn(),
    setAiThinking: vi.fn(),
    handleAITurn: vi.fn(),
    isMyTurn: vi.fn(() => true),
    canMakeMove: vi.fn(() => true)
  })
}))

vi.mock('../../../src/stores/roomDataStore', () => ({
  useRoomDataStore: () => ({
    getCurrentPlayerPosition: vi.fn(() => 'South'),
    getNorthPlayerName: vi.fn(() => 'Player North'),
    getWestPlayerName: vi.fn(() => 'Player West'),
    getEastPlayerName: vi.fn(() => 'Player East'),
    getPlayerDisplayName: vi.fn((seat: string) => `Player ${seat}`),
    isRobot: vi.fn(() => false)
  })
}))

vi.mock('../../../src/stores/userStore', () => ({
  useUserStore: () => ({
    userId: 'user-south',
    playerName: 'Test Player'
  })
}))

vi.mock('../../../src/hooks/useAITurn', () => ({
  useAITurn: vi.fn()
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ roomId: 'test-room' })
}))

describe('Play Component', () => {
  beforeEach(() => {
    resetMocks()
  })

  describe('Bidding Phase', () => {
    it('shows bidding interface when in bidding phase', () => {
      const gameData = createTestGameData({
        phase: 'bidding',
        currentPlayer: 'South',
        bids: []
      })

      vi.mocked(require('../../../src/stores/gameStore').useGameStore).mockReturnValue({
        gameData,
        selectedCard: null,
        aiThinking: false,
        setSelectedCard: vi.fn(),
        updateGameData: vi.fn(),
        startNewGame: vi.fn(),
        makeBid: vi.fn(),
        playCard: vi.fn(),
        setAiThinking: vi.fn(),
        handleAITurn: vi.fn(),
        isMyTurn: vi.fn(() => true),
        canMakeMove: vi.fn(() => true)
      })

      render(<Play />)
      
      expect(screen.getByText('Bidding')).toBeInTheDocument()
      expect(screen.getByText('Select Level:')).toBeInTheDocument()
      expect(screen.getByText('Select Suit:')).toBeInTheDocument()
    })

    it('shows turn indicator for bidding phase', () => {
      const gameData = createTestGameData({
        phase: 'bidding',
        currentPlayer: 'South'
      })

      vi.mocked(require('../../../src/stores/gameStore').useGameStore).mockReturnValue({
        gameData,
        selectedCard: null,
        aiThinking: false,
        setSelectedCard: vi.fn(),
        updateGameData: vi.fn(),
        startNewGame: vi.fn(),
        makeBid: vi.fn(),
        playCard: vi.fn(),
        setAiThinking: vi.fn(),
        handleAITurn: vi.fn(),
        isMyTurn: vi.fn(() => true),
        canMakeMove: vi.fn(() => true)
      })

      render(<Play />)
      
      expect(screen.getByText("🎯 It's South's turn to bid!")).toBeInTheDocument()
      expect(screen.getByText("It's your turn!")).toBeInTheDocument()
    })

    it('shows bidding history correctly', () => {
      const gameData = createTestGameData({
        phase: 'bidding',
        dealer: 'West',
        bids: [
          createTestBid(1, '♣', 'West'),
          createTestBid('Pass', '♣', 'North'),
          createTestBid(1, '♥', 'East')
        ]
      })

      vi.mocked(require('../../../src/stores/gameStore').useGameStore).mockReturnValue({
        gameData,
        selectedCard: null,
        aiThinking: false,
        setSelectedCard: vi.fn(),
        updateGameData: vi.fn(),
        startNewGame: vi.fn(),
        makeBid: vi.fn(),
        playCard: vi.fn(),
        setAiThinking: vi.fn(),
        handleAITurn: vi.fn(),
        isMyTurn: vi.fn(() => true),
        canMakeMove: vi.fn(() => true)
      })

      render(<Play />)
      
      expect(screen.getByText('West')).toBeInTheDocument()
      expect(screen.getByText('(Dealer)')).toBeInTheDocument()
      expect(screen.getByText('1♣')).toBeInTheDocument()
      expect(screen.getByText('Pass')).toBeInTheDocument()
      expect(screen.getByText('1♥')).toBeInTheDocument()
    })
  })

  describe('Playing Phase', () => {
    it('shows playing interface when in playing phase', () => {
      const gameData = createTestGameData({
        phase: 'playing',
        currentPlayer: 'South',
        hands: {
          North: [],
          East: [],
          South: createTestHand(['AS', 'KH', 'QD', 'JC', '10S']),
          West: []
        }
      })

      vi.mocked(require('../../../src/stores/gameStore').useGameStore).mockReturnValue({
        gameData,
        selectedCard: null,
        aiThinking: false,
        setSelectedCard: vi.fn(),
        updateGameData: vi.fn(),
        startNewGame: vi.fn(),
        makeBid: vi.fn(),
        playCard: vi.fn(),
        setAiThinking: vi.fn(),
        handleAITurn: vi.fn(),
        isMyTurn: vi.fn(() => true),
        canMakeMove: vi.fn(() => true)
      })

      render(<Play />)
      
      expect(screen.getByText("🎯 It's South's turn to play!")).toBeInTheDocument()
      expect(screen.getByText("It's your turn!")).toBeInTheDocument()
    })

    it('shows player hands in correct positions', () => {
      const gameData = createTestGameData({
        phase: 'playing',
        hands: {
          North: createTestHand(['AS', 'KH']),
          East: createTestHand(['QD', 'JC']),
          South: createTestHand(['10S', '9H']),
          West: createTestHand(['8D', '7C'])
        }
      })

      vi.mocked(require('../../../src/stores/gameStore').useGameStore).mockReturnValue({
        gameData,
        selectedCard: null,
        aiThinking: false,
        setSelectedCard: vi.fn(),
        updateGameData: vi.fn(),
        startNewGame: vi.fn(),
        makeBid: vi.fn(),
        playCard: vi.fn(),
        setAiThinking: vi.fn(),
        handleAITurn: vi.fn(),
        isMyTurn: vi.fn(() => true),
        canMakeMove: vi.fn(() => true)
      })

      render(<Play />)
      
      // Check that all hands are rendered
      expect(screen.getByText('A')).toBeInTheDocument() // North
      expect(screen.getByText('K')).toBeInTheDocument() // North
      expect(screen.getByText('Q')).toBeInTheDocument() // East
      expect(screen.getByText('J')).toBeInTheDocument() // East
      expect(screen.getByText('10')).toBeInTheDocument() // South
      expect(screen.getByText('9')).toBeInTheDocument() // South
      expect(screen.getByText('8')).toBeInTheDocument() // West
      expect(screen.getByText('7')).toBeInTheDocument() // West
    })

    it('allows current player to play cards when it is their turn', async () => {
      const mockPlayCard = vi.fn()
      const gameData = createTestGameData({
        phase: 'playing',
        currentPlayer: 'South',
        hands: {
          North: [],
          East: [],
          South: createTestHand(['AS', 'KH', 'QD']),
          West: []
        }
      })

      vi.mocked(require('../../../src/stores/gameStore').useGameStore).mockReturnValue({
        gameData,
        selectedCard: null,
        aiThinking: false,
        setSelectedCard: vi.fn(),
        updateGameData: vi.fn(),
        startNewGame: vi.fn(),
        makeBid: vi.fn(),
        playCard: mockPlayCard,
        setAiThinking: vi.fn(),
        handleAITurn: vi.fn(),
        isMyTurn: vi.fn(() => true),
        canMakeMove: vi.fn(() => true)
      })

      render(<Play />)
      
      // Click on a card
      const aceCard = screen.getByText('A')
      fireEvent.click(aceCard)
      
      await waitFor(() => {
        expect(mockPlayCard).toHaveBeenCalledWith(expect.objectContaining({
          suit: '♠',
          rank: 'A',
          value: 14
        }))
      })
    })

    it('shows current trick when cards have been played', () => {
      const gameData = createTestGameData({
        phase: 'playing',
        currentTrick: {
          cards: {
            North: { suit: '♠', rank: 'A', value: 14 },
            East: { suit: '♠', rank: 'K', value: 13 },
            South: null,
            West: null
          },
          winner: null,
          ledSuit: '♠',
          trickLeader: 'North'
        }
      })

      vi.mocked(require('../../../src/stores/gameStore').useGameStore).mockReturnValue({
        gameData,
        selectedCard: null,
        aiThinking: false,
        setSelectedCard: vi.fn(),
        updateGameData: vi.fn(),
        startNewGame: vi.fn(),
        makeBid: vi.fn(),
        playCard: vi.fn(),
        setAiThinking: vi.fn(),
        handleAITurn: vi.fn(),
        isMyTurn: vi.fn(() => true),
        canMakeMove: vi.fn(() => true)
      })

      render(<Play />)
      
      // Check that current trick cards are visible
      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('K')).toBeInTheDocument()
    })

    it('shows contract information when available', () => {
      const gameData = createTestGameData({
        phase: 'playing',
        contract: {
          level: 4,
          suit: '♥',
          declarer: 'South',
          doubled: false,
          redoubled: false
        },
        declarer: 'South'
      })

      vi.mocked(require('../../../src/stores/gameStore').useGameStore).mockReturnValue({
        gameData,
        selectedCard: null,
        aiThinking: false,
        setSelectedCard: vi.fn(),
        updateGameData: vi.fn(),
        startNewGame: vi.fn(),
        makeBid: vi.fn(),
        playCard: vi.fn(),
        setAiThinking: vi.fn(),
        handleAITurn: vi.fn(),
        isMyTurn: vi.fn(() => true),
        canMakeMove: vi.fn(() => true)
      })

      render(<Play />)
      
      // Contract should be displayed somewhere in the UI
      expect(screen.getByText('4♥')).toBeInTheDocument()
    })
  })

  describe('Game State Management', () => {
    it('updates turn indicator when current player changes', () => {
      const gameData = createTestGameData({
        phase: 'playing',
        currentPlayer: 'East'
      })

      vi.mocked(require('../../../src/stores/gameStore').useGameStore).mockReturnValue({
        gameData,
        selectedCard: null,
        aiThinking: false,
        setSelectedCard: vi.fn(),
        updateGameData: vi.fn(),
        startNewGame: vi.fn(),
        makeBid: vi.fn(),
        playCard: vi.fn(),
        setAiThinking: vi.fn(),
        handleAITurn: vi.fn(),
        isMyTurn: vi.fn(() => false),
        canMakeMove: vi.fn(() => false)
      })

      render(<Play />)
      
      expect(screen.getByText("🎯 It's East's turn to play!")).toBeInTheDocument()
      expect(screen.queryByText("It's your turn!")).not.toBeInTheDocument()
    })

    it('shows AI thinking indicator when AI is processing', () => {
      const gameData = createTestGameData({
        phase: 'playing'
      })

      vi.mocked(require('../../../src/stores/gameStore').useGameStore).mockReturnValue({
        gameData,
        selectedCard: null,
        aiThinking: true,
        setSelectedCard: vi.fn(),
        updateGameData: vi.fn(),
        startNewGame: vi.fn(),
        makeBid: vi.fn(),
        playCard: vi.fn(),
        setAiThinking: vi.fn(),
        handleAITurn: vi.fn(),
        isMyTurn: vi.fn(() => false),
        canMakeMove: vi.fn(() => false)
      })

      render(<Play />)
      
      expect(screen.getByText('AI is thinking using SAYC bidding conventions...')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('shows back to room button', () => {
      render(<Play />)
      
      expect(screen.getByText('Back to Room')).toBeInTheDocument()
    })

    it('shows player names in correct positions', () => {
      render(<Play />)
      
      expect(screen.getByText('Player North')).toBeInTheDocument()
      expect(screen.getByText('Player East')).toBeInTheDocument()
      expect(screen.getByText('Player West')).toBeInTheDocument()
    })
  })
})
