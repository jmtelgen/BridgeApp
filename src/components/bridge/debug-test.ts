import { DoubleDummySolver, createDoubleDummySolver } from './double-dummy-solver'
import { PlayingCard, Position } from './types'

// Create a very simple test case
const createSimpleTestHands = (): Record<Position, PlayingCard[]> => {
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

export function debugTest() {
  console.log("=== DEBUG TEST ===")
  
  const hands = createSimpleTestHands()
  
  // Log the hands to verify they're correct
  console.log("Hands:")
  for (const [position, cards] of Object.entries(hands)) {
    console.log(`${position}: ${cards.length} cards`)
    console.log(`  ${cards.map(c => `${c.rank}${c.suit}`).join(' ')}`)
  }
  
  const contract = {
    level: 3,
    suit: "NT" as const,
    declarer: "South" as Position
  }
  
  console.log(`\nContract: ${contract.level}${contract.suit} by ${contract.declarer}`)
  console.log(`Dummy: ${contract.declarer === "North" ? "South" : contract.declarer === "South" ? "North" : contract.declarer === "East" ? "West" : "East"}`)
  
  const solver = createDoubleDummySolver(hands, contract)
  
  // Test with West leading
  console.log("\n--- Testing with West leading ---")
  const maxTricks = solver.solve("West")
  console.log(`Maximum tricks: ${maxTricks}`)
  
  // Let's also test a simpler case - just one trick
  console.log("\n--- Testing single trick ---")
  testSingleTrick()
}

function testSingleTrick() {
  // Create a very simple hand where declarer should win all tricks
  const simpleHands: Record<Position, PlayingCard[]> = {
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
  
  const contract = {
    level: 1,
    suit: "NT" as const,
    declarer: "South" as Position
  }
  
  const solver = createDoubleDummySolver(simpleHands, contract)
  const maxTricks = solver.solve("West")
  console.log(`Single trick test - Max tricks: ${maxTricks}`)
}

if (typeof window === 'undefined') {
  debugTest()
} 