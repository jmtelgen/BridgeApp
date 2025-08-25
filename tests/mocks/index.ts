import { vi } from 'vitest'
import type { GameData, Position, PlayingCard, Bid, Suit } from '../../src/components/bridge/types'

// Mock WebSocket service
export const mockWebSocketService = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  onMessage: vi.fn(),
  offMessage: vi.fn(),
  isConnected: vi.fn(() => true)
}

// Mock game store
export const mockGameStore = {
  gameData: {
    phase: 'bidding' as const,
    currentPlayer: 'South' as Position,
    dealer: 'North' as Position,
    bids: [],
    hands: {
      North: [],
      East: [],
      South: [],
      West: []
    },
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
  },
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
}

// Mock room data store
export const mockRoomDataStore = {
  currentRoom: {
    roomId: 'test-room',
    roomName: 'Test Room',
    isPrivate: false,
    seats: {
      North: 'user-north',
      East: 'user-east', 
      South: 'user-south',
      West: 'user-west'
    },
    state: 'playing',
    currentPhase: 'playing',
    turn: 'South'
  },
  currentPlayerPosition: 'South' as Position,
  updateCurrentRoom: vi.fn(),
  setCurrentRoom: vi.fn(),
  clearCurrentRoom: vi.fn(),
  setCurrentPlayerPosition: vi.fn(),
  getPlayerName: vi.fn((seat: string) => `Player ${seat}`),
  getPlayerDisplayName: vi.fn((seat: string) => `Player ${seat}`),
  getCurrentPlayerPosition: vi.fn(() => 'South' as Position),
  isRobot: vi.fn(() => false)
}

// Mock user store
export const mockUserStore = {
  userId: 'user-south',
  playerName: 'Test Player',
  setUserId: vi.fn(),
  setPlayerName: vi.fn()
}

// Mock error store
export const mockErrorStore = {
  showError: vi.fn(),
  handleApiError: vi.fn()
}

// Test data factories
export const createTestGameData = (overrides: Partial<GameData> = {}): GameData => ({
  phase: 'bidding',
  currentPlayer: 'South',
  dealer: 'North',
  bids: [],
  hands: {
    North: [],
    East: [],
    South: [],
    West: []
  },
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
  vulnerability: { NS: false, EW: false },
  ...overrides
})

export const createTestHand = (cards: string[]): PlayingCard[] => {
  return cards.map(card => {
    const rank = card.slice(0, -1)
    const suit = card.slice(-1)
    const suitMap: Record<string, Suit> = { 'S': '♠', 'H': '♥', 'D': '♦', 'C': '♣' }
    const valueMap: Record<string, number> = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 }
    
    return {
      suit: suitMap[suit] || '♠',
      rank: rank as any,
      value: valueMap[rank] || parseInt(rank)
    }
  })
}

export const createTestBid = (level: number | string, suit: Suit | 'NT', player: Position): Bid => ({
  level: level === 'Pass' ? 'Pass' : level === 'Double' ? 'Double' : level === 'Redouble' ? 'Redouble' : level,
  suit: level === 'Pass' || level === 'Double' || level === 'Redouble' ? undefined : suit,
  player,
  type: level === 'Pass' ? 'Pass' : level === 'Double' ? 'Double' : level === 'Redouble' ? 'Redouble' : 'Bid'
})

// Mock React hooks
export const mockUseGameStore = () => mockGameStore
export const mockUseRoomDataStore = () => mockRoomDataStore
export const mockUseUserStore = () => mockUserStore
export const mockUseErrorStore = () => mockErrorStore

// Setup function to reset all mocks
export const resetMocks = () => {
  vi.clearAllMocks()
  Object.values(mockGameStore).forEach(fn => {
    if (typeof fn === 'function') {
      fn.mockClear()
    }
  })
  Object.values(mockRoomDataStore).forEach(fn => {
    if (typeof fn === 'function') {
      fn.mockClear()
    }
  })
}
