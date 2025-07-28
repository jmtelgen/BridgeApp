import { DoubleDummySolver, createDoubleDummySolver } from './double-dummy-solver'
import { PlayingCard, Position } from './types'

// Create a very simple hand where declarer should win all tricks
const createSimpleHands = (): Record<Position, PlayingCard[]> => {
  return {
    North: [
      { suit: "♠", rank: "A", value: 14 },
      { suit: "♠", rank: "K", value: 13 },
      { suit: "♠", rank: "Q", value: 12 },
      { suit: "♥", rank: "A", value: 14 },
      { suit: "♥", rank: "K", value: 13 },
      { suit: "♥", rank: "Q", value: 12 },
      { suit: "♦", rank: "A", value: 14 },
      { suit: "♦", rank: "K", value: 13 },
      { suit: "♦", rank: "Q", value: 12 },
      { suit: "♣", rank: "A", value: 14 },
      { suit: "♣", rank: "K", value: 13 },
      { suit: "♣", rank: "Q", value: 12 },
      { suit: "♣", rank: "J", value: 11 }
    ],
    East: [
      { suit: "♠", rank: "J", value: 11 },
      { suit: "♠", rank: "10", value: 10 },
      { suit: "♠", rank: "9", value: 9 },
      { suit: "♥", rank: "J", value: 11 },
      { suit: "♥", rank: "10", value: 10 },
      { suit: "♥", rank: "9", value: 9 },
      { suit: "♦", rank: "J", value: 11 },
      { suit: "♦", rank: "10", value: 10 },
      { suit: "♦", rank: "9", value: 9 },
      { suit: "♣", rank: "10", value: 10 },
      { suit: "♣", rank: "9", value: 9 },
      { suit: "♣", rank: "8", value: 8 },
      { suit: "♣", rank: "7", value: 7 }
    ],
    South: [
      { suit: "♠", rank: "8", value: 8 },
      { suit: "♠", rank: "7", value: 7 },
      { suit: "♠", rank: "6", value: 6 },
      { suit: "♥", rank: "8", value: 8 },
      { suit: "♥", rank: "7", value: 7 },
      { suit: "♥", rank: "6", value: 6 },
      { suit: "♦", rank: "8", value: 8 },
      { suit: "♦", rank: "7", value: 7 },
      { suit: "♦", rank: "6", value: 6 },
      { suit: "♣", rank: "6", value: 6 },
      { suit: "♣", rank: "5", value: 5 },
      { suit: "♣", rank: "4", value: 4 },
      { suit: "♣", rank: "3", value: 3 }
    ],
    West: [
      { suit: "♠", rank: "5", value: 5 },
      { suit: "♠", rank: "4", value: 4 },
      { suit: "♠", rank: "3", value: 3 },
      { suit: "♠", rank: "2", value: 2 },
      { suit: "♥", rank: "5", value: 5 },
      { suit: "♥", rank: "4", value: 4 },
      { suit: "♥", rank: "3", value: 3 },
      { suit: "♥", rank: "2", value: 2 },
      { suit: "♦", rank: "5", value: 5 },
      { suit: "♦", rank: "4", value: 4 },
      { suit: "♦", rank: "3", value: 3 },
      { suit: "♦", rank: "2", value: 2 },
      { suit: "♣", rank: "2", value: 2 }
    ]
  }
}

// Test a single trick manually
function testSingleTrick() {
  console.log("=== TESTING SINGLE TRICK ===")
  
  const hands = createSimpleHands()
  const contract = {
    level: 1,
    suit: "NT" as const,
    declarer: "South" as Position
  }
  
  const solver = createDoubleDummySolver(hands, contract)
  
  // Let's manually simulate what should happen
  console.log("Contract:", contract)
  console.log("Declarer:", contract.declarer)
  console.log("Dummy:", solver['dummy'])
  
  // Test if declarer side detection works
  console.log("Is South declarer side?", solver['isDeclarerSide']("South"))
  console.log("Is North declarer side?", solver['isDeclarerSide']("North"))
  console.log("Is East declarer side?", solver['isDeclarerSide']("East"))
  console.log("Is West declarer side?", solver['isDeclarerSide']("West"))
  
  // Test trick winner determination
  const trick = {
    cards: {
      North: { suit: "♠", rank: "A", value: 14 },
      East: { suit: "♠", rank: "J", value: 11 },
      South: { suit: "♠", rank: "8", value: 8 },
      West: { suit: "♠", rank: "5", value: 5 }
    },
    winner: null,
    ledSuit: "♠" as const
  }
  
  const winner = solver['determineTrickWinner'](trick)
  console.log("Trick winner:", winner)
  console.log("Is winner declarer side?", solver['isDeclarerSide'](winner))
  
  // Test the actual solve
  const maxTricks = solver.solve("West")
  console.log("Max tricks:", maxTricks)
}

// Test the algorithm step by step
function testAlgorithm() {
  console.log("\n=== TESTING ALGORITHM STEP BY STEP ===")
  
  const hands = createSimpleHands()
  const contract = {
    level: 1,
    suit: "NT" as const,
    declarer: "South" as Position
  }
  
  const solver = createDoubleDummySolver(hands, contract)
  
  // Create initial game state
  const initialGameState = {
    hands: JSON.parse(JSON.stringify(hands)),
    currentTrick: {
      cards: { North: null, East: null, South: null, West: null },
      winner: null,
      ledSuit: null
    },
    tricks: [],
    currentPlayer: "West" as Position,
    contract,
    dummy: solver['dummy']
  }
  
  console.log("Initial game state created")
  console.log("Current player:", initialGameState.currentPlayer)
  console.log("Is new trick?", solver['isNewTrick'](initialGameState))
  
  // Test valid moves
  const validMoves = solver['getValidMoves'](initialGameState)
  console.log("Valid moves for West:", validMoves.length)
  console.log("First valid move:", validMoves[0])
  
  // Test making a move
  if (validMoves.length > 0) {
    const newGameState = solver['makeMove'](initialGameState, validMoves[0])
    console.log("After move - current player:", newGameState.currentPlayer)
    console.log("Led suit:", newGameState.currentTrick.ledSuit)
    console.log("Cards played:", Object.values(newGameState.currentTrick.cards).filter(c => c !== null).length)
  }
}

if (typeof window === 'undefined') {
  testSingleTrick()
  testAlgorithm()
} 