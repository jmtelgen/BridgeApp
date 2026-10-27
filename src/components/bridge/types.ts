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

export interface GameData {
  phase: GamePhase
  currentPlayer: Position
  dealer: Position
  bids: Bid[]
  hands: Record<Position, PlayingCard[]>
  currentTrick: Trick
  tricks: Trick[]
  previousTrick: Trick | null // Track the previous trick to display until next card is played
  completedTrick?: Trick | null
  scheduledAction?: { kind: 'robotCard' | 'robotBid' | 'clearTrick'; dueAt: number } | null
  serverTimeMs?: number
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
  validBids?: string[]
  legalCards?: string[]
  playSeat?: Position | null
  isMyTurn?: boolean
  handCounts?: Partial<Record<Position, number>>
  revision?: number
  result?: {
    scoreNS: number
    scoreEW: number
    declarerTricks: number
    target: number
    made: boolean
    passedOut?: boolean
    contract?: string | null
    multiplier?: number
  } | null
  scores?: { NS: number; EW: number }
}

// New types for seat-based response format
export interface PublicGameState {
  currentPhase: string
  turn: string | null
  dealer: string
  vulnerability: string
  bids: any[]
  tricks: any[]
  contract: string | null
  declarer: string | null
  openingLeader: string | null
  currentTrick: any[] | null
  trickWinner: string | null
  dummy: string | null
  dummyHand: string[] | null
  previousTrick: any | null
  completedTrick?: any | null
  pendingAction?: GameData['scheduledAction']
  serverTimeMs?: number
  pacing?: { robotCardDelayMs: number; trickHoldMs: number }
  gameResult: string | null
  handCounts?: Partial<Record<Position, number>>
  revision?: number
  boardNumber?: number
  contractMultiplier?: number
  result?: GameData['result']
  scores?: GameData['scores']
}

export interface PrivateGameState {
  seat: string
  hand: string[]
  validBids: string[] | null
  isMyTurn: boolean
  isDeclarer: boolean
  isDummy: boolean
  partnerSeat: string | null
  legalCards?: string[] | null
  playSeat?: Position | null
}

export interface SeatBasedGameResponse {
  publicState: PublicGameState
  privateState: PrivateGameState
  seat: string
  playerId: string
  lastAction: any | null
  message: string | null
}

export interface BroadcastMessage {
  publicState: PublicGameState
  lastAction: any | null
  message: string | null
} 