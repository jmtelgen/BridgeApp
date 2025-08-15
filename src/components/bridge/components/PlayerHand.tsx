import { PlayingCard, Position, Suit } from '../types'
import { Card } from './Card'
import { sortHand, sortHandForDummy } from '../utils/game-utils'

interface PlayerHandProps {
  position: Position
  cards: PlayingCard[]
  isCurrentPlayer: boolean
  isPlayerTurn: boolean
  showCards: boolean
  isDummy: boolean
  selectedCard: PlayingCard | null
  currentTrickCard: PlayingCard | null
  onCardClick?: (card: PlayingCard) => void
  displayAsDummy?: boolean // New prop to control dummy display style
}

export const PlayerHand = ({ 
  position, 
  cards, 
  isCurrentPlayer, 
  isPlayerTurn, 
  showCards, 
  isDummy, 
  selectedCard, 
  currentTrickCard,
  onCardClick,
  displayAsDummy = false
}: PlayerHandProps) => {
  console.log('PlayerHand - position:', position, 'cards:', cards, 'cards?.length:', cards?.length)
  // Don't show cards if they shouldn't be visible
  if (!showCards && cards && cards.length > 0) {
    return (
      <div className="flex gap-1">
        {Array.from({ length: cards?.length || 0 }).map((_, i) => (
          <div key={i} className="bg-blue-900 border border-blue-800 rounded-lg w-[40px] h-[60px] shadow-sm" />
        ))}
      </div>
    )
  }

  // For dummy display in columns (used for East/West dummy hands)
  if (isDummy && displayAsDummy) {
    const sortedCards = cards ? sortHandForDummy(cards) : []
    const cardsBySuit: Record<Suit, PlayingCard[]> = {
      "♠": [],
      "♥": [],
      "♦": [],
      "♣": []
    }
    
    sortedCards.forEach(card => {
      cardsBySuit[card.suit].push(card)
    })

    return (
      <div className="flex gap-2">
        {(["♠", "♥", "♦", "♣"] as Suit[]).map(suit => (
          <div key={suit} className="flex flex-col gap-1">
            {cardsBySuit[suit].map((card, index) => (
              <Card
                key={`${card.suit}-${card.rank}-${index}`}
                card={card}
                isClickable={isPlayerTurn}
                isSelected={false}
                isPlayed={
                  currentTrickCard?.suit === card.suit && 
                  currentTrickCard?.rank === card.rank
                }
                onClick={onCardClick ? () => onCardClick(card) : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  // For regular hands and North dummy (display in a row, sorted high to low)
  const sortedCards = cards ? sortHand(cards) : []
  return (
    <div className="flex gap-1 flex-wrap">
      {sortedCards.map((card, index) => (
        <Card
          key={`${card.suit}-${card.rank}-${index}`}
          card={card}
          isClickable={isPlayerTurn}
          isSelected={
            selectedCard?.suit === card.suit && 
            selectedCard?.rank === card.rank
          }
          isPlayed={
            currentTrickCard?.suit === card.suit && 
            currentTrickCard?.rank === card.rank
          }
          onClick={onCardClick ? () => onCardClick(card) : undefined}
        />
      ))}
    </div>
  )
} 