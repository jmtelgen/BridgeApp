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
  getServerToFrontendPositionMap, 
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
  const seatMap = getServerToFrontendPositionMap()
  const frontendSeat = seatMap[seat] || 'North'
  
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
  
  const seatMap = getServerToFrontendPositionMap()
  const frontendDeclarer = seatMap[declarer] || 'North'
  
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
      const seatMap = getServerToFrontendPositionMap()
      const frontendSeat = seatMap[firstCard.seat] || 'North'
      convertedTrick.trickLeader = frontendSeat as Position
      
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
          const frontendSeat = seatMap[trickCard.seat] || 'North'
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

// Convert server turn user ID to frontend position
export const convertServerTurnToFrontendPosition = (turnUserId: string, seats: Record<string, string>): Position => {
  console.log('Converting server turn to frontend position:', { turnUserId, seats })
  const seatMap = getServerToFrontendPositionMap()
  console.log('Seat mapping:', seatMap)
  
  for (const [seatKey, playerId] of Object.entries(seats)) {
    console.log('Checking seat:', seatKey, 'playerId:', playerId, 'against turnUserId:', turnUserId)
    if (playerId === turnUserId) {
      const frontendPosition = seatMap[seatKey] || 'North'
      console.log('Found match!', seatKey, '->', frontendPosition)
      return frontendPosition
    }
  }
  
  console.log('No match found for turnUserId:', turnUserId, 'defaulting to North')
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
    const seatMap = getServerToFrontendPositionMap()
    const dummyPosition = seatMap[publicState.dummy] || 'North'
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
  const dummy = publicState.dummy ? getServerToFrontendPositionMap()[publicState.dummy] || null : null
  
  // Convert vulnerability
  const vulnerability = convertServerVulnerabilityToFrontend(publicState.vulnerability)
  
  // Convert dealer
  const dealer = getServerToFrontendPositionMap()[publicState.dealer] || 'North'
  
  // Convert current player - always use the turn string from the server
  let currentPlayer: Position
  if (publicState.turn) {
    currentPlayer = convertServerTurnToFrontendPosition(publicState.turn, seats)
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
