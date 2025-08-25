import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlayerHand } from '../../../src/components/bridge/components/PlayerHand'
import { createTestHand, resetMocks } from '../../mocks'
import type { PlayingCard, Position } from '../../../src/components/bridge/types'

describe('PlayerHand', () => {
  const mockOnCardClick = vi.fn()
  const defaultProps = {
    position: 'South' as Position,
    cards: createTestHand(['AS', 'KH', 'QD', 'JC', '10S']),
    isCurrentPlayer: true,
    isPlayerTurn: true,
    showCards: true,
    isDummy: false,
    selectedCard: null,
    currentTrickCard: null,
    onCardClick: mockOnCardClick,
    displayAsDummy: false
  }

  beforeEach(() => {
    resetMocks()
    mockOnCardClick.mockClear()
  })

  it('renders the correct number of cards', () => {
    render(<PlayerHand {...defaultProps} />)
    
    const cardElements = screen.getAllByTestId('playing-card')
    expect(cardElements).toHaveLength(5)
  })

  it('shows card faces when showCards is true', () => {
    render(<PlayerHand {...defaultProps} />)
    
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('K')).toBeInTheDocument()
    expect(screen.getByText('Q')).toBeInTheDocument()
    expect(screen.getByText('J')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('shows card backs when showCards is false', () => {
    render(<PlayerHand {...defaultProps} showCards={false} />)
    
    const cardBacks = screen.getAllByTestId('card-back')
    expect(cardBacks).toHaveLength(5)
  })

  it('calls onCardClick when a card is clicked and it is the player\'s turn', () => {
    render(<PlayerHand {...defaultProps} />)
    
    const firstCard = screen.getByText('A')
    fireEvent.click(firstCard)
    
    expect(mockOnCardClick).toHaveBeenCalledWith(expect.objectContaining({
      suit: '♠',
      rank: 'A',
      value: 14
    }))
  })

  it('does not call onCardClick when it is not the player\'s turn', () => {
    render(<PlayerHand {...defaultProps} isPlayerTurn={false} />)
    
    const firstCard = screen.getByText('A')
    fireEvent.click(firstCard)
    
    expect(mockOnCardClick).not.toHaveBeenCalled()
  })

  it('highlights selected card', () => {
    const selectedCard: PlayingCard = {
      suit: '♠',
      rank: 'A',
      value: 14
    }
    
    render(<PlayerHand {...defaultProps} selectedCard={selectedCard} />)
    
    const selectedCardElement = screen.getByText('A').closest('[data-testid="playing-card"]')
    expect(selectedCardElement).toHaveClass('ring-2', 'ring-blue-500')
  })

  it('shows current trick card when provided', () => {
    const currentTrickCard: PlayingCard = {
      suit: '♥',
      rank: 'K',
      value: 13
    }
    
    render(<PlayerHand {...defaultProps} currentTrickCard={currentTrickCard} />)
    
    expect(screen.getByText('K')).toBeInTheDocument()
    expect(screen.getByText('♥')).toBeInTheDocument()
  })

  it('applies dummy styling when isDummy is true', () => {
    render(<PlayerHand {...defaultProps} isDummy={true} />)
    
    const handContainer = screen.getByTestId('player-hand')
    expect(handContainer).toHaveClass('opacity-75')
  })

  it('applies column layout for East/West dummy hands', () => {
    render(<PlayerHand {...defaultProps} position="East" displayAsDummy={true} />)
    
    const handContainer = screen.getByTestId('player-hand')
    expect(handContainer).toHaveClass('flex-col')
  })

  it('applies row layout for North/South dummy hands', () => {
    render(<PlayerHand {...defaultProps} position="North" displayAsDummy={true} />)
    
    const handContainer = screen.getByTestId('player-hand')
    expect(handContainer).toHaveClass('flex-row')
  })

  it('shows correct suit symbols', () => {
    render(<PlayerHand {...defaultProps} />)
    
    expect(screen.getByText('♠')).toBeInTheDocument() // Spades
    expect(screen.getByText('♥')).toBeInTheDocument() // Hearts
    expect(screen.getByText('♦')).toBeInTheDocument() // Diamonds
    expect(screen.getByText('♣')).toBeInTheDocument() // Clubs
  })

  it('handles empty hand gracefully', () => {
    render(<PlayerHand {...defaultProps} cards={[]} />)
    
    const handContainer = screen.getByTestId('player-hand')
    expect(handContainer).toBeInTheDocument()
    expect(screen.queryByTestId('playing-card')).not.toBeInTheDocument()
  })

  it('applies correct positioning classes based on position', () => {
    const { rerender } = render(<PlayerHand {...defaultProps} position="North" />)
    
    let handContainer = screen.getByTestId('player-hand')
    expect(handContainer).toHaveClass('absolute', 'top-4', 'left-1/2')
    
    rerender(<PlayerHand {...defaultProps} position="South" />)
    handContainer = screen.getByTestId('player-hand')
    expect(handContainer).toHaveClass('absolute', 'bottom-4', 'left-1/2')
    
    rerender(<PlayerHand {...defaultProps} position="East" />)
    handContainer = screen.getByTestId('player-hand')
    expect(handContainer).toHaveClass('absolute', 'right-4', 'top-1/2')
    
    rerender(<PlayerHand {...defaultProps} position="West" />)
    handContainer = screen.getByTestId('player-hand')
    expect(handContainer).toHaveClass('absolute', 'left-4', 'top-1/2')
  })

  it('shows correct card values for face cards', () => {
    const faceCards = createTestHand(['AS', 'KH', 'QD', 'JC'])
    render(<PlayerHand {...defaultProps} cards={faceCards} />)
    
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('K')).toBeInTheDocument()
    expect(screen.getByText('Q')).toBeInTheDocument()
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('shows correct card values for number cards', () => {
    const numberCards = createTestHand(['10S', '9H', '8D', '7C', '6S'])
    render(<PlayerHand {...defaultProps} cards={numberCards} />)
    
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('applies disabled state when not player\'s turn', () => {
    render(<PlayerHand {...defaultProps} isPlayerTurn={false} />)
    
    const firstCard = screen.getByText('A').closest('[data-testid="playing-card"]')
    expect(firstCard).toHaveClass('opacity-50', 'cursor-not-allowed')
  })

  it('applies enabled state when it is player\'s turn', () => {
    render(<PlayerHand {...defaultProps} isPlayerTurn={true} />)
    
    const firstCard = screen.getByText('A').closest('[data-testid="playing-card"]')
    expect(firstCard).toHaveClass('cursor-pointer', 'hover:scale-105')
  })
})
