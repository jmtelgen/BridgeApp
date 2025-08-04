export type Suit = "♠" | "♥" | "♦" | "♣"
export type Rank = "A" | "K" | "Q" | "J" | "10" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2"
export type Position = "North" | "South" | "East" | "West"
export type GamePhase = "setup" | "bidding" | "playing" | "completed"
export type BidType = "Pass" | "Double" | "Redouble" | "Bid"

export interface PlayingCard {
  suit: Suit
  rank: Rank
  value: number // For sorting and comparison
}

export interface Bid {
  level: number | "Pass" | "Double" | "Redouble"
  suit?: Suit | "NT"
  player: Position
  type: BidType
}

export interface Trick {
  cards: Record<Position, PlayingCard | null>
  winner: Position | null
  ledSuit: Suit | null
  trickLeader: Position | null
}

export interface GameState {
  phase: GamePhase
  currentPlayer: Position
  dealer: Position
  bids: Bid[]
  hands: Record<Position, PlayingCard[]>
  currentTrick: Trick
  tricks: Trick[]
  previousTrick: Trick | null // Track the previous trick to display until next card is played
  contract: {
    level: number
    suit: Suit | "NT"
    declarer: Position
    doubled: boolean
    redoubled: boolean
  } | null
  dummy: Position | null
  firstCardPlayed: boolean // Track if first card has been played to show dummy hand
  gameNumber: number
  vulnerability: {
    NS: boolean
    EW: boolean
  }
} 