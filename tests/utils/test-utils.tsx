import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'

// Mock all external dependencies that might cause issues in tests
vi.mock('../../../src/services/websocketService', () => ({
  websocketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    onMessage: vi.fn(),
    offMessage: vi.fn(),
    isConnected: vi.fn(() => true)
  }
}))

vi.mock('../../../src/services/apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

// Custom render function that includes providers if needed
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, options)
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Helper function to create mock game state
export const createMockGameState = (overrides = {}) => ({
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

// Helper function to create mock room state
export const createMockRoomState = (overrides = {}) => ({
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
  turn: 'South',
  ...overrides
})

// Helper function to wait for async operations
export const waitForElementToBeRemoved = (element: Element) => {
  return new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (!document.contains(element)) {
        observer.disconnect()
        resolve()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  })
}

// Helper function to simulate user interactions
export const simulateBid = async (level: number, suit: string) => {
  // This would be implemented based on the actual component structure
  // For now, it's a placeholder for future implementation
}

export const simulateCardPlay = async (card: any) => {
  // This would be implemented based on the actual component structure
  // For now, it's a placeholder for future implementation
}
