import { 
  PrivateGameState, 
  SeatBasedGameResponse, 
  GameData, 
  Position, 
  PlayingCard,
  Bid,
  Trick,
  Suit,
  Rank
} from '../components/bridge/types'
import { 
  getFrontendToServerPositionMap,
  getEmptyPositionObject
} from './positionUtils'

// Convert server card string (e.g., "AH") to frontend PlayingCard object
export const convertServerCardToFrontend = (cardString: string): PlayingCard => {
  let rank: string
  let suitChar: string
  
  if (cardString.startsWith('T')) {
    rank = '10'
    suitChar = cardString.slice(1) // Take everything after "T"
  } else {
    rank = cardString.slice(0, -1)
    suitChar = cardString.slice(-1)
  }
  
  const suitMap: Record<string, string> = { D: '♦', C: '♣', H: '♥', S: '♠' }
  const suit = suitMap[suitChar] || suitChar
  const valueMap: Record<string, number> = { 
    'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, 
    '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 
  }
  const value = valueMap[rank] || parseInt(rank)
  
  return { suit: suit as Suit, rank: rank as Rank, value }
}

// Convert frontend PlayingCard object to server card string
export const convertFrontendCardToServer = (card: PlayingCard): string => {
  const suitMap: Record<string, string> = { '♦': 'D', '♣': 'C', '♥': 'H', '♠': 'S' }
  const rankMap: Record<string, string> = { 
    'A': 'A', 'K': 'K', 'Q': 'Q', 'J': 'J', 
    '10': 'T', '9': '9', '8': '8', '7': '7', 
    '6': '6', '5': '5', '4': '4', '3': '3', '2': '2' 
  }
  
  const suit = suitMap[card.suit] || card.suit
  const rank = rankMap[card.rank] || card.rank
  
  return rank + suit
}

// Convert server bid string to frontend Bid object
export const convertServerBidToFrontend = (bidString: string, seat: string): Bid => {
  // Server now returns full position names, so we can use the seat directly
  const frontendSeat = (seat === 'North' || seat === 'South' || seat === 'East' || seat === 'West') 
    ? seat as Position 
    : 'North'
  
  let bidType: 'Pass' | 'Double' | 'Redouble' | 'Bid' = 'Pass'
  let level: number | undefined
  let suit: string | undefined
  
  if (bidString === 'pass') {
    bidType = 'Pass'
  } else if (bidString === 'double') {
    bidType = 'Double'
  } else if (bidString === 'redouble') {
    bidType = 'Redouble'
  } else {
    // Parse bid like "4H" -> level: 4, suit: "♥"
    const match = bidString.match(/^(\d+)([CDHSNT]+)$/)
    if (match) {
      level = parseInt(match[1])
      const suitChar = match[2]
      const suitMap: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' }
      suit = suitMap[suitChar] || suitChar
      bidType = 'Bid'
    }
  }
  
  return {
    type: bidType,
    level: bidType === 'Bid' ? level! : bidType,
    suit: bidType === 'Bid' ? (suit as Suit | "NT") : undefined,
    player: frontendSeat
  }
}

// Convert server contract string to frontend contract object
export const convertServerContractToFrontend = (contractString: string, declarer: string): {
  level: number
  suit: Suit | "NT"
  declarer: Position
  doubled: boolean
  redoubled: boolean
} | null => {
  if (!contractString) return null
  
  const match = contractString.match(/^(\d+)([CDHSNT]+)$/)
  if (!match) return null
  
  const level = parseInt(match[1])
  const suitChar = match[2]
  const suitMap: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' }
  const suit = suitMap[suitChar] || suitChar
  
  // Server now returns full position names, so we can use the declarer directly
  const frontendDeclarer = (declarer === 'North' || declarer === 'South' || declarer === 'East' || declarer === 'West') 
    ? declarer as Position 
    : 'North'
  
  return {
    level,
    suit: suit as Suit | "NT",
    declarer: frontendDeclarer as Position,
    doubled: false,
    redoubled: false
  }
}

// Convert server currentTrick array to frontend Trick object
export const convertServerTrickToFrontend = (trickArray: any[]): Trick => {
  const convertedTrick: Trick = {
    cards: getEmptyPositionObject(null),
    winner: null,
    ledSuit: null,
    trickLeader: null
  }
  
  if (trickArray.length > 0) {
    // Find the first card played to determine ledSuit and trickLeader
    const firstCard = trickArray[0]
    if (firstCard && firstCard.seat && firstCard.card) {
      // Server now returns full position names, so we can use the seat directly
      const frontendSeat = (firstCard.seat === 'North' || firstCard.seat === 'South' || firstCard.seat === 'East' || firstCard.seat === 'West') 
        ? firstCard.seat as Position 
        : 'North'
      convertedTrick.trickLeader = frontendSeat
      
      // Extract suit from card (e.g., "AH" -> "♥")
      const cardString = firstCard.card
      let suit: string
      if (cardString.endsWith('H')) suit = '♥'
      else if (cardString.endsWith('S')) suit = '♠'
      else if (cardString.endsWith('D')) suit = '♦'
      else if (cardString.endsWith('C')) suit = '♣'
      else suit = 'NT'
      
      convertedTrick.ledSuit = suit as Suit
      
      // Convert all cards in the trick
      trickArray.forEach((trickCard: any) => {
        if (trickCard.seat && trickCard.card) {
          // Server now returns full position names, so we can use the seat directly
          const frontendSeat = (trickCard.seat === 'North' || trickCard.seat === 'South' || trickCard.seat === 'East' || trickCard.seat === 'West') 
            ? trickCard.seat as Position 
            : 'North'
          const card = convertServerCardToFrontend(trickCard.card)
          convertedTrick.cards[frontendSeat as keyof typeof convertedTrick.cards] = card
        }
      })
    }
  }
  
  return convertedTrick
}

// Convert server vulnerability string to frontend format
export const convertServerVulnerabilityToFrontend = (vulnerability: string): { NS: boolean, EW: boolean } => {
  switch (vulnerability) {
    case 'NS':
      return { NS: true, EW: false }
    case 'EW':
      return { NS: false, EW: true }
    case 'Both':
      return { NS: true, EW: true }
    default:
      return { NS: false, EW: false }
  }
}

// Convert server phase string to frontend GamePhase
export const convertServerPhaseToFrontend = (phase: string): 'bidding' | 'playing' | 'completed' => {
  const phaseMap: Record<string, 'bidding' | 'playing' | 'completed'> = {
    'waiting': 'bidding',
    'bidding': 'bidding',
    'playing': 'playing',
    'completed': 'completed'
  }
  return phaseMap[phase] || 'bidding'
}

// Convert server turn position to frontend position
export const convertServerTurnToFrontendPosition = (turnPosition: string, seats: Record<string, string>): Position => {
  console.log('Converting server turn position to frontend position:', { turnPosition, seats })
  
  // The server now sends positions directly (e.g., "North", "South", "East", "West")
  // Since the server and frontend use the same format, we can use it directly
  if (turnPosition === 'North' || turnPosition === 'South' || turnPosition === 'East' || turnPosition === 'West') {
    console.log('Using server position directly:', turnPosition)
    return turnPosition as Position
  }
  
  // If we couldn't find a valid position, default to North
  console.log('No valid position found for turn position:', turnPosition, 'defaulting to North')
  return 'North'
}

// Main conversion function: SeatBasedGameResponse -> GameData
export const convertSeatBasedResponseToGameData = (
  response: SeatBasedGameResponse,
  seats: Record<string, string>,
  currentPlayerPosition: Position
): GameData => {
  const { publicState, privateState, lastAction } = response
  
  // Convert hands - only include the current player's hand and dummy hand if applicable
  const hands: Record<Position, PlayingCard[]> = {
    North: [],
    East: [],
    South: [],
    West: []
  }
  
  // Add current player's hand
  const currentPlayerHand = privateState.hand.map(convertServerCardToFrontend)
  hands[currentPlayerPosition] = currentPlayerHand
  
  // Add dummy hand if in playing phase and dummy exists
  if (publicState.currentPhase === 'playing' && publicState.dummy && publicState.dummyHand) {
    // Server now returns full position names, so we can use the dummy position directly
    const dummyPosition = (publicState.dummy === 'North' || publicState.dummy === 'South' || publicState.dummy === 'East' || publicState.dummy === 'West') 
      ? publicState.dummy as Position 
      : 'North'
    const dummyHand = publicState.dummyHand.map(convertServerCardToFrontend)
    hands[dummyPosition] = dummyHand
  }
  
  // Convert bids
  const bids: Bid[] = publicState.bids.map((bid: any) => 
    convertServerBidToFrontend(bid.bid, bid.seat)
  )
  
  // Convert current trick
  const currentTrick = publicState.currentTrick 
    ? convertServerTrickToFrontend(publicState.currentTrick)
    : {
        cards: getEmptyPositionObject(null),
        winner: null,
        ledSuit: null,
        trickLeader: null
      }
  
  // Convert contract
  const contract = publicState.contract && publicState.declarer
    ? convertServerContractToFrontend(publicState.contract, publicState.declarer)
    : null
  
  // Convert dummy position
  const dummy = publicState.dummy ? 
    ((publicState.dummy === 'North' || publicState.dummy === 'South' || publicState.dummy === 'East' || publicState.dummy === 'West') 
      ? publicState.dummy as Position 
      : null) 
    : null
  
  // Convert vulnerability
  const vulnerability = convertServerVulnerabilityToFrontend(publicState.vulnerability)
  
  // Convert dealer
  const dealer = (publicState.dealer === 'North' || publicState.dealer === 'South' || publicState.dealer === 'East' || publicState.dealer === 'West') 
    ? publicState.dealer as Position 
    : 'North'
  
  // Convert current player - always use the turn string from the server
  let currentPlayer: Position
  if (publicState.turn) {
    currentPlayer = publicState.turn as Position
    console.log('Using turn from publicState:', publicState.turn, '->', currentPlayer)
  } else {
    // Default fallback if no turn information is available
    currentPlayer = 'North'
    console.log('No turn information found, defaulting to North')
  }
  
  return {
    phase: convertServerPhaseToFrontend(publicState.currentPhase),
    currentPlayer: currentPlayer as Position,
    dealer: dealer as Position,
    bids,
    hands,
    currentTrick,
    tricks: publicState.tricks || [],
    previousTrick: publicState.previousTrick ? convertServerTrickToFrontend(publicState.previousTrick) : null,
    contract,
    dummy: dummy as Position | null,
    firstCardPlayed: !!(publicState.currentTrick && publicState.currentTrick.length > 0),
    gameNumber: 1, // This might need to come from somewhere else
    vulnerability
  }
}

// Helper function to check if it's the current player's turn
export const isCurrentPlayerTurn = (privateState: PrivateGameState): boolean => {
  return privateState.isMyTurn
}
