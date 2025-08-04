import { PlayingCard, Position, Suit, Rank, Bid, Trick } from '../types'

// Card values for sorting and comparison
export const cardValues: Record<Rank, number> = {
  "A": 14, "K": 13, "Q": 12, "J": 11, "10": 10, "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2
}

// Create a full deck
export const createDeck = (): PlayingCard[] => {
  const suits: Suit[] = ["♠", "♥", "♦", "♣"]
  const ranks: Rank[] = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"]
  const deck: PlayingCard[] = []
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: cardValues[rank] })
    }
  }
  
  return deck
}

// Shuffle deck using Fisher-Yates algorithm
export const shuffleDeck = (deck: PlayingCard[]): PlayingCard[] => {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Deal cards to four players
export const dealCards = (deck: PlayingCard[]): Record<Position, PlayingCard[]> => {
  const hands: Record<Position, PlayingCard[]> = {
    North: [],
    East: [],
    South: [],
    West: []
  }
  
  const positions: Position[] = ["North", "East", "South", "West"]
  
  for (let i = 0; i < deck.length; i++) {
    const position = positions[i % 4]
    hands[position].push(deck[i])
  }
  
  return hands
}

// Sort cards by suit and rank
export const sortHand = (hand: PlayingCard[]): PlayingCard[] => {
  const suitOrder: Record<Suit, number> = { "♣": 0, "♦": 1, "♥": 2, "♠": 3 }
  
  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit]
    }
    return b.value - a.value // Higher cards first
  })
}

// Sort cards for dummy display (lowest to highest in each suit)
export const sortHandForDummy = (hand: PlayingCard[]): PlayingCard[] => {
  const suitOrder: Record<Suit, number> = { "♣": 0, "♦": 1, "♥": 2, "♠": 3 }
  
  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit]
    }
    return a.value - b.value // Lower cards first (dummy convention)
  })
}

// Get next player in rotation
export const getNextPlayer = (current: Position): Position => {
  const players: Position[] = ["North", "East", "South", "West"]
  const currentIndex = players.indexOf(current)
  return players[(currentIndex + 1) % 4]
}

// Helper function to determine if two positions are on the same team
export const areSameTeam = (pos1: Position, pos2: Position): boolean => {
  const nsTeam = ["North", "South"]
  const ewTeam = ["East", "West"]
  return (nsTeam.includes(pos1) && nsTeam.includes(pos2)) || 
         (ewTeam.includes(pos1) && ewTeam.includes(pos2))
}

// Helper function to get the opposite position (across the table)
export const getOppositePosition = (position: Position): Position => {
  const opposites: Record<Position, Position> = {
    "North": "South",
    "South": "North", 
    "East": "West",
    "West": "East"
  }
  return opposites[position]
}

// Check if a bid is valid
export const isValidBid = (newBid: Bid, previousBids: Bid[]): boolean => {
  if (newBid.type === "Pass") {
    return true
  }
  
  // Handle Double bid
  if (newBid.type === "Double") {
    if (previousBids.length === 0) return false
    
    const lastBid = previousBids[previousBids.length - 1]
    // Double is only valid if the last bid was a suit bid (not Pass, Double, or Redouble)
    return lastBid.type === "Bid"
  }
  
  // Handle Redouble bid
  if (newBid.type === "Redouble") {
    if (previousBids.length === 0) return false
    
    const lastBid = previousBids[previousBids.length - 1]
    // Redouble is only valid if the last bid was Double and it was made by the other team
    if (lastBid.type !== "Double") return false
    
    return !areSameTeam(newBid.player, lastBid.player)
  }
  
  if (newBid.type !== "Bid" || !newBid.level || !newBid.suit) {
    return false
  }
  
  // Find the highest previous bid
  let highestBid: Bid | null = null
  for (let i = previousBids.length - 1; i >= 0; i--) {
    if (previousBids[i].type === "Bid") {
      highestBid = previousBids[i]
      break
    }
  }
  
  if (!highestBid) {
    return true // First bid
  }
  
  const suitValues = { "♣": 1, "♦": 2, "♥": 3, "♠": 4, "NT": 5 }
  
  if (newBid.level > highestBid.level) {
    return true
  }
  
  if (newBid.level === highestBid.level) {
    return suitValues[newBid.suit!] > suitValues[highestBid.suit!]
  }
  
  return false
}

// Determine contract and declarer
export const determineContract = (bids: Bid[]): { level: number; suit: Suit | "NT"; declarer: Position; doubled: boolean; redoubled: boolean } | null => {
  let highestBid: Bid | null = null
  let declarer: Position | null = null
  let doubled = false
  let redoubled = false
  
  // Check for doubles and redoubles
  for (let i = bids.length - 1; i >= 0; i--) {
    if (bids[i].type === "Redouble") {
      redoubled = true
      break
    } else if (bids[i].type === "Double") {
      doubled = true
      break
    }
  }
  
  for (let i = bids.length - 1; i >= 0; i--) {
    if (bids[i].type === "Bid") {
      highestBid = bids[i]
      declarer = bids[i].player
      break
    }
  }
  
  if (!highestBid || !declarer) {
    return null
  }
  
  return {
    level: highestBid.level as number,
    suit: highestBid.suit!,
    declarer,
    doubled,
    redoubled
  }
}

// Check if bidding is complete
export const isBiddingComplete = (bids: Bid[]): boolean => {
  if (bids.length < 4) return false
  
  // Check if we have 3 consecutive passes after a bid
  let consecutivePasses = 0
  for (let i = bids.length - 1; i >= 0; i--) {
    if (bids[i].type === "Pass") {
      consecutivePasses++
    } else {
      break
    }
  }
  
  return consecutivePasses >= 3
}

// Check if a card can be played
export const canPlayCard = (card: PlayingCard, hand: PlayingCard[], ledSuit: Suit | null): boolean => {
  if (!ledSuit) return true // First card of trick
  
  // If player has cards in led suit, must follow suit
  const hasLedSuit = hand.some(c => c.suit === ledSuit)
  if (hasLedSuit) {
    return card.suit === ledSuit
  }
  
  return true // Can play any card if not following suit
}

// Determine trick winner
export const determineTrickWinner = (trick: Trick, trumpSuit: Suit | "NT"): Position => {
  const cards = Object.entries(trick.cards).filter(([_, card]) => card !== null) as [Position, PlayingCard][]
  if (cards.length === 0) return "North" // Shouldn't happen
  
  let winner = cards[0]
  const ledSuit = trick.ledSuit!
  
  for (const [position, card] of cards) {
    if (trumpSuit !== "NT") {
      // Trump suit wins
      if (card.suit === trumpSuit && winner[1].suit !== trumpSuit) {
        winner = [position, card]
      } else if (card.suit === trumpSuit && winner[1].suit === trumpSuit) {
        if (card.value > winner[1].value) {
          winner = [position, card]
        }
      } else if (card.suit === ledSuit && winner[1].suit !== trumpSuit) {
        if (card.value > winner[1].value) {
          winner = [position, card]
        }
      }
    } else {
      // No trump, follow led suit
      if (card.suit === ledSuit && winner[1].suit !== ledSuit) {
        winner = [position, card]
      } else if (card.suit === ledSuit && winner[1].suit === ledSuit) {
        if (card.value > winner[1].value) {
          winner = [position, card]
        }
      }
    }
  }
  
  return winner[0]
} 