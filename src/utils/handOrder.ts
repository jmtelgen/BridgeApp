import { PlayingCard, Rank, Suit } from '../components/bridge/types'

const suits: readonly Suit[] = ['♣', '♦', '♥', '♠']
const ranks: readonly Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export function visibleSuitOrder(trump?: Suit | 'NT' | null): Suit[] {
  return trump && trump !== 'NT'
    ? [...suits.filter(suit => suit !== trump), trump]
    : [...suits]
}

export function sortVisibleHand(
  cards: readonly PlayingCard[],
  trump?: Suit | 'NT' | null
): PlayingCard[] {
  const order = visibleSuitOrder(trump)
  return [...cards].sort((a, b) =>
    order.indexOf(a.suit) - order.indexOf(b.suit) ||
    ranks.indexOf(a.rank) - ranks.indexOf(b.rank)
  )
}
