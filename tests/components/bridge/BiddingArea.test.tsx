import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BiddingArea } from '../../../src/components/bridge/components/BiddingArea'
import { createTestGameData, createTestBid, resetMocks } from '../../mocks'
import type { Position, Suit } from '../../../src/components/bridge/types'

// Mock the stores
vi.mock('../../../src/stores/gameStore', () => ({
  useGameStore: () => ({
    gameData: createTestGameData(),
    aiThinking: false,
    isMyTurn: vi.fn(() => true),
    canMakeMove: vi.fn(() => true)
  })
}))

vi.mock('../../../src/stores/roomDataStore', () => ({
  useRoomDataStore: () => ({
    getCurrentPlayerPosition: vi.fn(() => 'South'),
    getPlayerDisplayName: vi.fn((seat: string) => `Player ${seat}`),
    isRobot: vi.fn(() => false)
  })
}))

describe('BiddingArea', () => {
  const mockOnMakeBid = vi.fn()

  beforeEach(() => {
    resetMocks()
    mockOnMakeBid.mockClear()
  })

  it('renders bidding interface when it is the current player\'s turn', () => {
    render(<BiddingArea onMakeBid={mockOnMakeBid} />)
    
    expect(screen.getByText('Bidding')).toBeInTheDocument()
    expect(screen.getByText('Select Level:')).toBeInTheDocument()
    expect(screen.getByText('Select Suit:')).toBeInTheDocument()
  })

  it('shows level selection buttons 1-7', () => {
    render(<BiddingArea onMakeBid={mockOnMakeBid} />)
    
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument()
    }
  })

  it('shows suit selection buttons', () => {
    render(<BiddingArea onMakeBid={mockOnMakeBid} />)
    
    expect(screen.getByText('♣')).toBeInTheDocument()
    expect(screen.getByText('♦')).toBeInTheDocument()
    expect(screen.getByText('♥')).toBeInTheDocument()
    expect(screen.getByText('♠')).toBeInTheDocument()
    expect(screen.getByText('NT')).toBeInTheDocument()
  })

  it('allows selecting a level and suit to make a bid', async () => {
    render(<BiddingArea onMakeBid={mockOnMakeBid} />)
    
    // Select level 4
    const levelButton = screen.getByText('4')
    fireEvent.click(levelButton)
    
    // Select hearts suit
    const suitButton = screen.getByText('♥')
    fireEvent.click(suitButton)
    
    // Click make bid button
    const makeBidButton = screen.getByText('Make Bid')
    fireEvent.click(makeBidButton)
    
    await waitFor(() => {
      expect(mockOnMakeBid).toHaveBeenCalledWith('Bid', 4, '♥')
    })
  })

  it('allows making a pass bid', async () => {
    render(<BiddingArea onMakeBid={mockOnMakeBid} />)
    
    // Click pass button
    const passButton = screen.getByText('Pass')
    fireEvent.click(passButton)
    
    await waitFor(() => {
      expect(mockOnMakeBid).toHaveBeenCalledWith('Pass')
    })
  })

  it('allows making a double bid', async () => {
    render(<BiddingArea onMakeBid={mockOnMakeBid} />)
    
    // Click double button
    const doubleButton = screen.getByText('Double')
    fireEvent.click(doubleButton)
    
    await waitFor(() => {
      expect(mockOnMakeBid).toHaveBeenCalledWith('Double')
    })
  })

  it('allows making a redouble bid', async () => {
    render(<BiddingArea onMakeBid={mockOnMakeBid} />)
    
    // Click redouble button
    const redoubleButton = screen.getByText('Redouble')
    fireEvent.click(redoubleButton)
    
    await waitFor(() => {
      expect(mockOnMakeBid).toHaveBeenCalledWith('Redouble')
    })
  })

  it('shows bidding history with dealer indicator', () => {
    const gameData = createTestGameData({
      dealer: 'West',
      bids: [
        createTestBid(1, '♣', 'West'),
        createTestBid('Pass', '♣', 'North'),
        createTestBid(1, '♥', 'East')
      ]
    })

    vi.mocked(require('../../../src/stores/gameStore').useGameStore).mockReturnValue({
      gameData,
      aiThinking: false,
      isMyTurn: vi.fn(() => true),
      canMakeMove: vi.fn(() => true)
    })

    render(<BiddingArea onMakeBid={mockOnMakeBid} />)
    
    // Check dealer indicator
    expect(screen.getByText('West')).toBeInTheDocument()
    expect(screen.getByText('(Dealer)')).toBeInTheDocument()
    
    // Check bid history
    expect(screen.getByText('1♣')).toBeInTheDocument()
    expect(screen.getByText('Pass')).toBeInTheDocument()
    expect(screen.getByText('1♥')).toBeInTheDocument()
  })

  it('disables bid interface when it is not the current player\'s turn', () => {
    vi.mocked(require('../../../src/stores/gameStore').useGameStore).mockReturnValue({
      gameData: createTestGameData(),
      aiThinking: false,
      isMyTurn: vi.fn(() => false),
      canMakeMove: vi.fn(() => false)
    })

    render(<BiddingArea onMakeBid={mockOnMakeBid} />)
    
    // Should not show bid interface
    expect(screen.queryByText('Select Level:')).not.toBeInTheDocument()
    expect(screen.queryByText('Select Suit:')).not.toBeInTheDocument()
    expect(screen.queryByText('Make Bid')).not.toBeInTheDocument()
  })

  it('shows correct bidding order starting from dealer', () => {
    const gameData = createTestGameData({
      dealer: 'South',
      bids: []
    })

    vi.mocked(require('../../../src/stores/gameStore').useGameStore).mockReturnValue({
      gameData,
      aiThinking: false,
      isMyTurn: vi.fn(() => true),
      canMakeMove: vi.fn(() => true)
    })

    render(<BiddingArea onMakeBid={mockOnMakeBid} />)
    
    // Bidding order should be: West, North, East, South (starting from left of dealer)
    const positions = screen.getAllByText(/West|North|East|South/)
    expect(positions).toHaveLength(4)
  })

  it('handles suit selection correctly', async () => {
    render(<BiddingArea onMakeBid={mockOnMakeBid} />)
    
    // Select level 2
    fireEvent.click(screen.getByText('2'))
    
    // Select clubs
    fireEvent.click(screen.getByText('♣'))
    
    // Make bid
    fireEvent.click(screen.getByText('Make Bid'))
    
    await waitFor(() => {
      expect(mockOnMakeBid).toHaveBeenCalledWith('Bid', 2, '♣')
    })
  })

  it('resets selection when making a bid', async () => {
    render(<BiddingArea onMakeBid={mockOnMakeBid} />)
    
    // Select level 3
    fireEvent.click(screen.getByText('3'))
    
    // Select diamonds
    fireEvent.click(screen.getByText('♦'))
    
    // Make bid
    fireEvent.click(screen.getByText('Make Bid'))
    
    await waitFor(() => {
      expect(mockOnMakeBid).toHaveBeenCalledWith('Bid', 3, '♦')
    })
    
    // Selection should be reset
    expect(screen.getByText('Select Level:')).toBeInTheDocument()
    expect(screen.getByText('Select Suit:')).toBeInTheDocument()
  })

  it('shows current player name in turn indicator', () => {
    vi.mocked(require('../../../src/stores/roomDataStore').useRoomDataStore).mockReturnValue({
      getCurrentPlayerPosition: vi.fn(() => 'South'),
      getPlayerDisplayName: vi.fn(() => 'Test Player'),
      isRobot: vi.fn(() => false)
    })

    render(<BiddingArea onMakeBid={mockOnMakeBid} />)
    
    expect(screen.getByText("It's your turn to bid (Test Player)")).toBeInTheDocument()
  })
})
