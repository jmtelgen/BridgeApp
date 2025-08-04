import { PlayingCard, Suit } from '../types'

interface CardProps {
  card: PlayingCard
  isClickable?: boolean
  isSelected?: boolean
  isPlayed?: boolean
  onClick?: () => void
}

export const Card = ({ card, isClickable = false, isSelected = false, isPlayed = false, onClick }: CardProps) => {
  const getSuitColor = (suit: Suit) => {
    return suit === "♥" || suit === "♦" ? "text-red-600" : "text-black"
  }

  return (
    <div
      className={`
        bg-white border border-gray-300 rounded-lg p-2 min-w-[40px] h-[60px] flex flex-col items-center justify-center text-sm font-semibold shadow-sm
        ${isClickable ? "cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all" : ""}
        ${isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""}
        ${isPlayed ? "ring-2 ring-green-500 bg-green-50" : ""}
      `}
      onClick={onClick}
    >
      <span className={getSuitColor(card.suit)}>{card.rank}</span>
      <span className={`${getSuitColor(card.suit)} text-lg`}>{card.suit}</span>
    </div>
  )
} 