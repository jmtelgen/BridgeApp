import { PlayingCard, Position, Suit, Rank, Bid, BidType } from '../types'

// Card values for HCP calculation
const cardValues: Record<Rank, number> = {
  "A": 4, "K": 3, "Q": 2, "J": 1, "10": 0, "9": 0, "8": 0, "7": 0, "6": 0, "5": 0, "4": 0, "3": 0, "2": 0
}

// Suit order for bidding
const suitOrder: Record<Suit | "NT", number> = {
  "♣": 1, "♦": 2, "♥": 3, "♠": 4, "NT": 5
}

// Interface for hand evaluation
interface HandEvaluation {
  hcp: number
  distribution: {
    [suit in Suit]: number
  }
  isBalanced: boolean
  longestSuit: Suit
  longestSuitLength: number
  hasStopper: (suit: Suit) => boolean
  supportPoints: (trumpSuit: Suit) => number
}

// Interface for bidding context
export interface BiddingContext {
  hand: PlayingCard[]
  position: Position
  previousBids: Bid[]
  vulnerability: 'none' | 'ns' | 'ew' | 'both'
}

// Evaluate a hand
function evaluateHand(hand: PlayingCard[]): HandEvaluation {
  let hcp = 0
  const distribution: Record<Suit, number> = { "♣": 0, "♦": 0, "♥": 0, "♠": 0 }
  
  for (const card of hand) {
    hcp += cardValues[card.rank]
    distribution[card.suit]++
  }
  
  // Check if hand is balanced (no singleton/void, at most one doubleton)
  const suitLengths = Object.values(distribution).sort((a, b) => b - a)
  const isBalanced = suitLengths[0] >= 3 && suitLengths[1] >= 3 && suitLengths[2] >= 2
  
  // Find longest suit
  let longestSuit: Suit = "♣"
  let longestSuitLength = 0
  for (const [suit, length] of Object.entries(distribution)) {
    if (length > longestSuitLength) {
      longestSuit = suit as Suit
      longestSuitLength = length
    }
  }
  
  // Check for stoppers (A, Kx, Qxx, or 4+ cards)
  const hasStopper = (suit: Suit): boolean => {
    const cards = hand.filter(c => c.suit === suit)
    if (cards.length >= 4) return true
    if (cards.some(c => c.rank === "A")) return true
    if (cards.some(c => c.rank === "K") && cards.length >= 2) return true
    if (cards.some(c => c.rank === "Q") && cards.length >= 3) return true
    return false
  }
  
  // Calculate support points for a trump suit
  const supportPoints = (trumpSuit: Suit): number => {
    const trumpCards = hand.filter(c => c.suit === trumpSuit)
    let points = hcp
    
    // Add distribution points
    for (const [suit, length] of Object.entries(distribution)) {
      if (suit === trumpSuit) {
        if (length <= 2) points -= 2
        else if (length === 3) points -= 1
        else if (length >= 5) points += length - 4
      } else {
        if (length === 0) points += 3
        else if (length === 1) points += 2
        else if (length === 2) points += 1
      }
    }
    
    return points
  }
  
  return {
    hcp,
    distribution,
    isBalanced,
    longestSuit,
    longestSuitLength,
    hasStopper,
    supportPoints
  }
}

// Get the last bid that wasn't a pass
function getLastNonPassBid(bids: Bid[]): Bid | null {
  for (let i = bids.length - 1; i >= 0; i--) {
    if (bids[i].type !== "Pass") {
      return bids[i]
    }
  }
  return null
}

// Check if a bid is higher than another
function isHigherBid(newBid: Bid, previousBid: Bid): boolean {
  if (newBid.type !== "Bid" || previousBid.type !== "Bid") return false
  
  if (newBid.level! > previousBid.level!) return true
  if (newBid.level! < previousBid.level!) return false
  
  return suitOrder[newBid.suit!] > suitOrder[previousBid.suit!]
}

// Determine opening bid
function getOpeningBid(evaluation: HandEvaluation, position: Position): Bid | null {
  const { hcp, isBalanced, longestSuit, longestSuitLength, hasStopper } = evaluation
  
  // 2♣ opening (22+ HCP or 9+ tricks)
  if (hcp >= 22) {
    return { type: "Bid", level: 2, suit: "♣", player: position }
  }
  
  // 2NT opening (20-21 HCP, balanced)
  if (hcp >= 20 && hcp <= 21 && isBalanced) {
    return { type: "Bid", level: 2, suit: "NT", player: position }
  }
  
  // 1NT opening (15-17 HCP, balanced)
  if (hcp >= 15 && hcp <= 17 && isBalanced) {
    return { type: "Bid", level: 1, suit: "NT", player: position }
  }
  
  // Preemptive openings (3-level)
  if (hcp <= 10 && longestSuitLength >= 7) {
    return { type: "Bid", level: 3, suit: longestSuit, player: position }
  }
  
  // Weak 2 openings
  if (hcp >= 5 && hcp <= 11 && longestSuitLength >= 6) {
    if (longestSuit === "♥" || longestSuit === "♠") {
      return { type: "Bid", level: 2, suit: longestSuit, player: position }
    }
    if (longestSuit === "♦") {
      return { type: "Bid", level: 2, suit: "♦", player: position }
    }
  }
  
  // 1-level openings (12+ HCP)
  if (hcp >= 12) {
    // Prefer majors with 5+ cards
    if (evaluation.distribution["♥"] >= 5) {
      return { type: "Bid", level: 1, suit: "♥", player: position }
    }
    if (evaluation.distribution["♠"] >= 5) {
      return { type: "Bid", level: 1, suit: "♠", player: position }
    }
    
    // Then diamonds with 4+ cards
    if (evaluation.distribution["♦"] >= 4) {
      return { type: "Bid", level: 1, suit: "♦", player: position }
    }
    
    // Finally clubs (artificial)
    return { type: "Bid", level: 1, suit: "♣", player: position }
  }
  
  return null
}

// Determine response to 1NT opening
function get1NTResponse(evaluation: HandEvaluation, previousBids: Bid[], position: Position): Bid | null {
  const { hcp, distribution } = evaluation
  
  // Stayman (2♣) - 8+ HCP, 4+ cards in a major
  if (hcp >= 8 && (distribution["♥"] >= 4 || distribution["♠"] >= 4)) {
    return { type: "Bid", level: 2, suit: "♣", player: position }
  }
  
  // Transfers
  if (hcp >= 8) {
    if (distribution["♥"] >= 5) {
      return { type: "Bid", level: 2, suit: "♦", player: position } // Transfer to hearts
    }
    if (distribution["♠"] >= 5) {
      return { type: "Bid", level: 2, suit: "♥", player: position } // Transfer to spades
    }
  }
  
  // Invitational 2NT (8-9 HCP)
  if (hcp >= 8 && hcp <= 9) {
    return { type: "Bid", level: 2, suit: "NT", player: position }
  }
  
  // Game 3NT (10+ HCP)
  if (hcp >= 10) {
    return { type: "Bid", level: 3, suit: "NT", player: position }
  }
  
  // Game forcing with 5+ cards in a suit
  if (hcp >= 8) {
    for (const [suit, length] of Object.entries(distribution)) {
      if (length >= 5) {
        return { type: "Bid", level: 3, suit: suit as Suit, player: position }
      }
    }
  }
  
  return null
}

// Determine response to 1♣ opening
function get1CResponse(evaluation: HandEvaluation, previousBids: Bid[], position: Position): Bid | null {
  const { hcp, distribution } = evaluation
  
  // Negative response (0-7 HCP)
  if (hcp <= 7) {
    return { type: "Bid", level: 1, suit: "♦", player: position }
  }
  
  // Positive responses (8+ HCP)
  if (hcp >= 8) {
    // Prefer majors with 4+ cards
    if (distribution["♥"] >= 4) {
      return { type: "Bid", level: 1, suit: "♥", player: position }
    }
    if (distribution["♠"] >= 4) {
      return { type: "Bid", level: 1, suit: "♠", player: position }
    }
    
    // Then 1NT if balanced
    if (evaluation.isBalanced) {
      return { type: "Bid", level: 1, suit: "NT", player: position }
    }
    
    // Then 2♣ with 5+ clubs
    if (distribution["♣"] >= 5) {
      return { type: "Bid", level: 2, suit: "♣", player: position }
    }
    
    // Finally 2♦ with 5+ diamonds
    if (distribution["♦"] >= 5) {
      return { type: "Bid", level: 2, suit: "♦", player: position }
    }
  }
  
  return null
}

// Determine response to 1♦ opening
function get1DResponse(evaluation: HandEvaluation, previousBids: Bid[], position: Position): Bid | null {
  const { hcp, distribution } = evaluation
  
  if (hcp >= 6) {
    // Prefer majors with 4+ cards
    if (distribution["♥"] >= 4) {
      return { type: "Bid", level: 1, suit: "♥", player: position }
    }
    if (distribution["♠"] >= 4) {
      return { type: "Bid", level: 1, suit: "♠", player: position }
    }
    
    // Then 1NT if balanced
    if (evaluation.isBalanced) {
      return { type: "Bid", level: 1, suit: "NT", player: position }
    }
    
    // Then 2♣ with 4+ clubs
    if (distribution["♣"] >= 4) {
      return { type: "Bid", level: 2, suit: "♣", player: position }
    }
    
    // Then 2♦ with 4+ diamonds
    if (distribution["♦"] >= 4) {
      return { type: "Bid", level: 2, suit: "♦", player: position }
    }
    
    // Finally 2♥/2♠ with 5+ cards
    if (distribution["♥"] >= 5) {
      return { type: "Bid", level: 2, suit: "♥", player: position }
    }
    if (distribution["♠"] >= 5) {
      return { type: "Bid", level: 2, suit: "♠", player: position }
    }
  }
  
  return null
}

// Determine response to 1♥ opening
function get1HResponse(evaluation: HandEvaluation, previousBids: Bid[], position: Position): Bid | null {
  const { hcp, distribution } = evaluation
  
  if (hcp >= 6) {
    // 1♠ with 4+ spades
    if (distribution["♠"] >= 4) {
      return { type: "Bid", level: 1, suit: "♠", player: position }
    }
    
    // 1NT if balanced and no 4+ spades
    if (evaluation.isBalanced && distribution["♠"] < 4) {
      return { type: "Bid", level: 1, suit: "NT", player: position }
    }
    
    // 2♣/2♦ with 4+ cards
    if (distribution["♣"] >= 4) {
      return { type: "Bid", level: 2, suit: "♣", player: position }
    }
    if (distribution["♦"] >= 4) {
      return { type: "Bid", level: 2, suit: "♦", player: position }
    }
    
    // 2♥ with 3+ hearts
    if (distribution["♥"] >= 3) {
      return { type: "Bid", level: 2, suit: "♥", player: position }
    }
    
    // 2♠ with 5+ spades
    if (distribution["♠"] >= 5) {
      return { type: "Bid", level: 2, suit: "♠", player: position }
    }
    
    // 3♥ with 11+ HCP and 4+ hearts
    if (hcp >= 11 && distribution["♥"] >= 4) {
      return { type: "Bid", level: 3, suit: "♥", player: position }
    }
  }
  
  return null
}

// Determine response to 1♠ opening
function get1SResponse(evaluation: HandEvaluation, previousBids: Bid[], position: Position): Bid | null {
  const { hcp, distribution } = evaluation
  
  if (hcp >= 6) {
    // 1NT if balanced
    if (evaluation.isBalanced) {
      return { type: "Bid", level: 1, suit: "NT", player: position }
    }
    
    // 2♣/2♦/2♥ with 4+ cards
    if (distribution["♣"] >= 4) {
      return { type: "Bid", level: 2, suit: "♣", player: position }
    }
    if (distribution["♦"] >= 4) {
      return { type: "Bid", level: 2, suit: "♦", player: position }
    }
    if (distribution["♥"] >= 4) {
      return { type: "Bid", level: 2, suit: "♥", player: position }
    }
    
    // 2♠ with 3+ spades
    if (distribution["♠"] >= 3) {
      return { type: "Bid", level: 2, suit: "♠", player: position }
    }
    
    // 3♠ with 11+ HCP and 4+ spades
    if (hcp >= 11 && distribution["♠"] >= 4) {
      return { type: "Bid", level: 3, suit: "♠", player: position }
    }
  }
  
  return null
}

// Determine response to 2♣ opening
function get2CResponse(evaluation: HandEvaluation, previousBids: Bid[], position: Position): Bid | null {
  const { hcp } = evaluation
  
  // Negative response (0-7 HCP)
  if (hcp <= 7) {
    return { type: "Bid", level: 2, suit: "♦", player: position }
  }
  
  // Positive responses (8+ HCP)
  if (hcp >= 8) {
    // Prefer majors with 5+ cards
    if (evaluation.distribution["♥"] >= 5) {
      return { type: "Bid", level: 2, suit: "♥", player: position }
    }
    if (evaluation.distribution["♠"] >= 5) {
      return { type: "Bid", level: 2, suit: "♠", player: position }
    }
    
    // Then 2NT if balanced
    if (evaluation.isBalanced) {
      return { type: "Bid", level: 2, suit: "NT", player: position }
    }
    
    // Then 3♣/3♦ with 5+ cards
    if (evaluation.distribution["♣"] >= 5) {
      return { type: "Bid", level: 3, suit: "♣", player: position }
    }
    if (evaluation.distribution["♦"] >= 5) {
      return { type: "Bid", level: 3, suit: "♦", player: position }
    }
  }
  
  return null
}

// Determine response to weak 2 openings
function getWeak2Response(evaluation: HandEvaluation, previousBids: Bid[], position: Position): Bid | null {
  const { hcp } = evaluation
  const lastBid = getLastNonPassBid(previousBids)
  
  if (!lastBid || lastBid.type !== "Bid") return null
  
  // Asking bid (2NT) with 8+ HCP
  if (hcp >= 8) {
    return { type: "Bid", level: 2, suit: "NT", player: position }
  }
  
  // Preemptive raise with 3+ support
  if (lastBid.suit && lastBid.suit !== "NT" && evaluation.distribution[lastBid.suit] >= 3) {
    return { type: "Bid", level: 3, suit: lastBid.suit, player: position }
  }
  
  return null
}

// Determine opener's rebid
function getOpenerRebid(evaluation: HandEvaluation, previousBids: Bid[], position: Position): Bid | null {
  const { hcp, distribution, isBalanced } = evaluation
  
  // Find the opening bid and response
  if (previousBids.length < 2) return null
  
  const openingBid = previousBids[0]
  const response = previousBids[1]
  
  if (openingBid.type !== "Bid" || response.type !== "Bid") return null
  
  // After 1♣ - 1♦
  if (openingBid.level === 1 && openingBid.suit === "♣" && 
      response.level === 1 && response.suit === "♦") {
    
    if (hcp >= 15 && hcp <= 17 && isBalanced) {
      return { type: "Bid", level: 1, suit: "NT", player: position }
    }
    
    // Show 4+ card suits
    if (distribution["♥"] >= 4) {
      return { type: "Bid", level: 1, suit: "♥", player: position }
    }
    if (distribution["♠"] >= 4) {
      return { type: "Bid", level: 1, suit: "♠", player: position }
    }
    if (distribution["♣"] >= 6) {
      return { type: "Bid", level: 2, suit: "♣", player: position }
    }
    if (distribution["♦"] >= 4) {
      return { type: "Bid", level: 2, suit: "♦", player: position }
    }
  }
  
  // After 1♥ - 1♠
  if (openingBid.level === 1 && openingBid.suit === "♥" && 
      response.level === 1 && response.suit === "♠") {
    
    if (hcp >= 12 && hcp <= 14 && isBalanced) {
      return { type: "Bid", level: 1, suit: "NT", player: position }
    }
    
    if (distribution["♣"] >= 4) {
      return { type: "Bid", level: 2, suit: "♣", player: position }
    }
    if (distribution["♦"] >= 4) {
      return { type: "Bid", level: 2, suit: "♦", player: position }
    }
    if (distribution["♥"] >= 6) {
      return { type: "Bid", level: 2, suit: "♥", player: position }
    }
    if (distribution["♠"] >= 4) {
      return { type: "Bid", level: 2, suit: "♠", player: position }
    }
  }
  
  return null
}

// Main function to get AI's next bid
export function getAIBid(context: BiddingContext): Bid {
  const { hand, position, previousBids } = context
  const evaluation = evaluateHand(hand)
  
  // If no previous bids, this is an opening bid
  if (previousBids.length === 0) {
    const openingBid = getOpeningBid(evaluation, position)
    if (openingBid) {
      return openingBid
    }
  }
  
  // If only one bid, this is a response
  if (previousBids.length === 1) {
    const lastBid = previousBids[0]
    
    if (lastBid.type === "Bid") {
      // Response to 1NT
      if (lastBid.level === 1 && lastBid.suit === "NT") {
        const response = get1NTResponse(evaluation, previousBids, position)
        if (response) return response
      }
      
      // Response to 1♣
      if (lastBid.level === 1 && lastBid.suit === "♣") {
        const response = get1CResponse(evaluation, previousBids, position)
        if (response) return response
      }
      
      // Response to 1♦
      if (lastBid.level === 1 && lastBid.suit === "♦") {
        const response = get1DResponse(evaluation, previousBids, position)
        if (response) return response
      }
      
      // Response to 1♥
      if (lastBid.level === 1 && lastBid.suit === "♥") {
        const response = get1HResponse(evaluation, previousBids, position)
        if (response) return response
      }
      
      // Response to 1♠
      if (lastBid.level === 1 && lastBid.suit === "♠") {
        const response = get1SResponse(evaluation, previousBids, position)
        if (response) return response
      }
      
      // Response to 2♣
      if (lastBid.level === 2 && lastBid.suit === "♣") {
        const response = get2CResponse(evaluation, previousBids, position)
        if (response) return response
      }
      
      // Response to weak 2
      if (lastBid.level === 2 && (lastBid.suit === "♦" || lastBid.suit === "♥" || lastBid.suit === "♠")) {
        const response = getWeak2Response(evaluation, previousBids, position)
        if (response) return response
      }
    }
  }
  
  // If more than one bid, this might be a rebid
  if (previousBids.length >= 2) {
    const rebid = getOpenerRebid(evaluation, previousBids, position)
    if (rebid) return rebid
  }
  
  // Default to pass if no other bid is appropriate
  return { type: "Pass", level: "Pass", player: position }
} 