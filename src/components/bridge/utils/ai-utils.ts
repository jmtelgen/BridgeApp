import { PlayingCard, Position, Suit, Rank, Bid, Trick, GameData } from '../types'
import { solveBoardFromStart, solveBoard, DDSSolution } from '../dds/double-dummy-solver'

// Convert between display suits and solver suits
const displayToSolverSuit: Record<Suit, string> = {
  "♠": "S",
  "♥": "H", 
  "♦": "D",
  "♣": "C"
}

const solverToDisplaySuit: Record<string, Suit> = {
  "S": "♠",
  "H": "♥",
  "D": "♦", 
  "C": "♣"
}

// Convert between display ranks and solver ranks
const displayToSolverRank: Record<Rank, string> = {
  "A": "A", "K": "K", "Q": "Q", "J": "J", "10": "T", "9": "9", "8": "8", "7": "7", "6": "6", "5": "5", "4": "4", "3": "3", "2": "2"
}

const solverToDisplayRank: Record<string, Rank> = {
  "A": "A", "K": "K", "Q": "Q", "J": "J", "T": "10", "9": "9", "8": "8", "7": "7", "6": "6", "5": "5", "4": "4", "3": "3", "2": "2"
}

// Convert position to solver direction
const positionToDirection: Record<Position, string> = {
  "North": "N",
  "East": "E", 
  "South": "S",
  "West": "W"
}

const directionToPosition: Record<string, Position> = {
  "N": "North",
  "E": "East",
  "S": "South", 
  "W": "West"
}

// Convert playing card to solver format
export const cardToSolverFormat = (card: PlayingCard): string => {
  const result = displayToSolverSuit[card.suit] + displayToSolverRank[card.rank]
  
  // Validate the conversion
  if (!result || result.length !== 2) {
    throw new Error(`Invalid card conversion: ${card.suit}${card.rank} -> ${result}`)
  }
  
  return result
}

// Convert solver card to playing card
export const solverToCard = (cardString: string): PlayingCard => {
  if (!cardString || cardString.length !== 2) {
    throw new Error(`Invalid solver card string: ${cardString}`)
  }
  
  const suit = solverToDisplaySuit[cardString[0]]
  const rank = solverToDisplayRank[cardString[1]]
  
  if (!suit || !rank) {
    throw new Error(`Invalid solver card conversion: ${cardString} -> suit=${suit}, rank=${rank}`)
  }
  
  return {
    suit,
    rank,
    value: cardValues[rank]
  }
}

// Convert hands to solver format
export const convertHandsToSolverFormat = (hands: Record<Position, PlayingCard[]>): Record<string, string[]> => {
  const solverHands: Record<string, string[]> = {}
  
  for (const [position, cards] of Object.entries(hands)) {
    const direction = positionToDirection[position as Position]
    if (!direction) {
      throw new Error(`Invalid position: ${position}`)
    }
    
    solverHands[direction] = cards.map(card => {
      try {
        return cardToSolverFormat(card)
      } catch (error) {
        throw new Error(`Failed to convert card ${card.suit}${card.rank} for position ${position}: ${error}`)
      }
    })
  }
  
  return solverHands
}

// Convert current trick to solver format
export const convertCurrentTrickToSolverFormat = (currentTrick: Trick): string[] => {
  const trickCards: string[] = []
  
  // Use the trickLeader field if available, otherwise find it by first card
  let trickLeader: Position | null = currentTrick.trickLeader
  
  if (!trickLeader) {
    // Fallback: find the first card played
    for (const [position, card] of Object.entries(currentTrick.cards)) {
      if (card) {
        trickLeader = position as Position
        break
      }
    }
  }
  
  if (!trickLeader) {
    return trickCards // No cards played yet
  }
  
  // Get playing order starting from the trick leader
  const playingOrder = getPlayingOrderFromLeader(trickLeader)
  
  // Add cards in the order they were played
  for (const position of playingOrder) {
    const card = currentTrick.cards[position]
    if (card) {
      trickCards.push(cardToSolverFormat(card))
    }
  }
  
  return trickCards
}

// Helper function to get playing order starting from a leader
const getPlayingOrderFromLeader = (leader: Position): Position[] => {
  const positions: Position[] = ["North", "East", "South", "West"]
  const leaderIndex = positions.indexOf(leader)
  
  // Return positions in playing order starting from leader
  return [
    positions[leaderIndex],
    positions[(leaderIndex + 1) % 4],
    positions[(leaderIndex + 2) % 4],
    positions[(leaderIndex + 3) % 4]
  ]
}

// Convert trump to solver format
export const convertTrumpToSolverFormat = (trump: Suit | "NT"): string => {
  if (trump === "NT") return "NT"
  return displayToSolverSuit[trump]
}

// Card values for conversion
const cardValues: Record<Rank, number> = {
  "A": 14, "K": 13, "Q": 12, "J": 11, "10": 10, "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2
}

// AI bidding using double dummy solver (DISABLED - now using SAYC bidding)
/*
export const aiBid = async (gameState: GameData): Promise<Bid> => {
  // For now, just pass to avoid WASM loading issues
  console.log('AI bidding: Pass (double dummy solver disabled)');
  
  return {
    level: "Pass",
    player: gameState.currentPlayer,
    type: "Pass"
  }
  
  // TODO: Re-enable double dummy bidding when WASM issues are resolved
  try {
    // Convert hands to solver format
    const solverHands = convertHandsToSolverFormat(gameState.hands)
    
    // Debug: Log the converted hands
    console.log('Converted hands for AI bidding:', solverHands)
    
    // Try different contracts to see which one scores best
    const contracts = [
      { level: 1, suit: "♣" as Suit },
      { level: 1, suit: "♦" as Suit },
      { level: 1, suit: "♥" as Suit },
      { level: 1, suit: "♠" as Suit },
      { level: 1, suit: "NT" as Suit | "NT" },
      { level: 2, suit: "♣" as Suit },
      { level: 2, suit: "♦" as Suit },
      { level: 2, suit: "♥" as Suit },
      { level: 2, suit: "♠" as Suit },
      { level: 2, suit: "NT" as Suit | "NT" },
      { level: 3, suit: "NT" as Suit | "NT" },
      { level: 4, suit: "♥" as Suit },
      { level: 4, suit: "♠" as Suit },
      { level: 5, suit: "♣" as Suit },
      { level: 5, suit: "♦" as Suit },
      { level: 6, suit: "NT" as Suit | "NT" },
      { level: 7, suit: "NT" as Suit | "NT" }
    ]
    
    let bestContract = null
    let bestScore = -1
    
    for (const contract of contracts) {
      try {
        const trump = convertTrumpToSolverFormat(contract.suit)
        const first = positionToDirection[gameState.currentPlayer]
        const dealer = positionToDirection[gameState.dealer]
        
        console.log(`Trying contract ${contract.level}${contract.suit} with trump=${trump}, first=${first}, dealer=${dealer}`)
        
        const solutions = await solveBoardFromStart({
          trump,
          first,
          dealer,
          robot: false,
          hands: solverHands
        })
        
        // Calculate expected tricks for this contract
        const expectedTricks = solutions.reduce((sum: number, solution: DDSSolution) => sum + solution.score, 0) / solutions.length
        
        console.log(`Contract ${contract.level}${contract.suit} expected tricks: ${expectedTricks}`)
        
        if (expectedTricks > bestScore) {
          bestScore = expectedTricks
          bestContract = contract
        }
      } catch (error) {
        console.log(`Failed to solve for contract ${contract.level}${contract.suit}:`, error)
        continue
      }
    }
    
    // If we found a good contract, bid it
    if (bestContract && bestScore >= bestContract.level + 6) {
      console.log(`AI bidding ${bestContract.level}${bestContract.suit} with expected tricks: ${bestScore}`)
      return {
        level: bestContract.level,
        suit: bestContract.suit,
        player: gameState.currentPlayer,
        type: "Bid"
      }
    }
    
    // Otherwise pass
    console.log('AI passing - no good contract found')
    return {
      level: "Pass",
      player: gameState.currentPlayer,
      type: "Pass"
    }
    
  } catch (error) {
    console.error("AI bidding failed:", error)
    // Fallback to pass
    return {
      level: "Pass",
      player: gameState.currentPlayer,
      type: "Pass"
    }
  }
}
*/

// AI playing using double dummy solver
export const aiPlay = async (gameState: GameData): Promise<PlayingCard> => {
  try {
    console.log('AI playing - gameState:', gameState);
    console.log('AI playing - currentPlayer:', gameState.currentPlayer);
    console.log('AI playing - currentTrick:', gameState.currentTrick);
    
    // Convert hands to solver format
    const solverHands = convertHandsToSolverFormat(gameState.hands)
    
    // Convert current trick to solver format
    const currentTrick = gameState.currentTrick ? convertCurrentTrickToSolverFormat(gameState.currentTrick) : []
    
    console.log('AI playing - converted hands:', solverHands)
    console.log('AI playing - current trick:', currentTrick)
    
    // Get valid cards for current player
    const hand = gameState.hands[gameState.currentPlayer]
    const validCards = hand.filter(card => 
      canPlayCard(card, hand, gameState.currentTrick?.ledSuit || null)
    )
    
    console.log('AI playing - hand:', hand.map(c => `${c.suit}${c.rank}`))
    console.log('AI playing - valid cards:', validCards.map(c => `${c.suit}${c.rank}`))
    
    if (validCards.length === 0) {
      throw new Error("No valid cards to play")
    }
    
    // If this is the first card of the trick, use double dummy solver
    if (currentTrick?.length === 0) {
      console.log('AI playing - leading trick')
      const solutions = await solveBoardFromStart({
        trump: convertTrumpToSolverFormat(gameState.contract!.suit),
        first: positionToDirection[gameState.currentPlayer],
        dealer: positionToDirection[gameState.dealer],
        robot: true,
        hands: solverHands
      })
      
      console.log('AI playing - lead solutions:', solutions)
      
      // Find the best card to lead
      let bestCard = validCards[0]
      let bestScore = -1
      
      for (const card of validCards) {
        const cardString = cardToSolverFormat(card)
        const solution = solutions.find((s: DDSSolution) => s.card === cardString)
        if (solution && solution.score > bestScore) {
          bestScore = solution.score
          bestCard = card
        }
      }
      
      console.log(`AI playing optimal lead: ${bestCard.suit}${bestCard.rank} (score: ${bestScore})`)
      return bestCard
    } else {
      console.log('AI playing - following trick')
      // For subsequent cards, use the solver with current trick
      // The 'first' parameter should be the trick leader, not the current player
      const trickLeader = gameState.currentTrick?.trickLeader || gameState.currentPlayer
      const solutions = await solveBoard({
        trump: convertTrumpToSolverFormat(gameState.contract!.suit),
        first: positionToDirection[trickLeader],
        dealer: positionToDirection[gameState.dealer],
        currentTrick,
        robot: false,
        hands: solverHands
      })
      
      console.log('AI playing - follow solutions:', solutions)
      
      // Find the best card to play from valid cards
      let bestCard = validCards[0]
      let bestScore = -1
      
      for (const card of validCards) {
        const cardString = cardToSolverFormat(card)
        const solution = solutions.find((s: DDSSolution) => s.card === cardString)
        if (solution && solution.score > bestScore) {
          bestScore = solution.score
          bestCard = card
        }
      }
      
      console.log(`AI playing optimal card: ${bestCard.suit}${bestCard.rank} (score: ${bestScore})`)
      return bestCard
    }
    
  } catch (error) {
    console.error("AI playing failed:", error)
    // Fallback to first valid card
    const hand = gameState.hands[gameState.currentPlayer]
    const validCards = hand.filter(card => 
      canPlayCard(card, hand, gameState.currentTrick?.ledSuit || null)
    )
    console.log('AI playing fallback: First valid card')
    return validCards[0]
  }
}

// Import canPlayCard from game-utils
import { canPlayCard } from './game-utils' 