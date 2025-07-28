export type Suit = "♠" | "♥" | "♦" | "♣"
export type Rank = "A" | "K" | "Q" | "J" | "10" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2"
export type Position = "North" | "South" | "East" | "West"

export interface PlayingCard {
  suit: Suit
  rank: Rank
  value: number
} 