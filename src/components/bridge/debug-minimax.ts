import { DoubleDummySolver, createDoubleDummySolver } from './double-dummy-solver'
import { PlayingCard, Position } from './types'

// Create a hand where North-South should win ALL tricks
const createDominantHands = (): Record<Position, PlayingCard[]> => {
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

function testDominantHand() {
  console.log("=== TESTING DOMINANT HAND ===")
  
  const hands = createDominantHands()
  const contract = {
    level: 3,
    suit: "NT" as const,
    declarer: "South" as Position
  }
  
  console.log("Hands:")
  for (const [position, cards] of Object.entries(hands)) {
    console.log(`${position}: ${cards.length} cards`)
    console.log(`  ${cards.map(c => `${c.rank}${c.suit}`).join(' ')}`)
  }
  
  console.log(`\nContract: ${contract.level}${contract.suit} by ${contract.declarer}`)
  
  const solver = createDoubleDummySolver(hands, contract)
  
  // Test with different opening leads
  const openingLeads: Position[] = ["West", "North", "East"]
  
  for (const lead of openingLeads) {
    console.log(`\n--- Testing with ${lead} leading ---`)
    
    const maxTricks = solver.solve(lead)
    const isMakeable = solver.isContractMakeable(lead)
    const overtricks = solver.getOvertricks(lead)
    
    console.log(`Maximum tricks: ${maxTricks}`)
    console.log(`Contract makeable: ${isMakeable}`)
    console.log(`Overtricks: ${overtricks}`)
    console.log(`Expected: 13 tricks (North-South should win all tricks)`)
    
    if (maxTricks !== 13) {
      console.log("❌ ERROR: Should win all 13 tricks!")
    } else {
      console.log("✅ CORRECT: Winning all 13 tricks!")
    }
  }
}

// Test a simple case where we can manually verify
function testSimpleCase() {
  console.log("\n=== TESTING SIMPLE CASE ===")
  
  // Create a very simple hand where North-South should win 4 tricks
  const simpleHands: Record<Position, PlayingCard[]> = {
    North: [
      { suit: "♠", rank: "A", value: 14 },
      { suit: "♠", rank: "K", value: 13 },
      { suit: "♥", rank: "A", value: 14 },
      { suit: "♥", rank: "K", value: 13 }
    ],
    East: [
      { suit: "♠", rank: "Q", value: 12 },
      { suit: "♠", rank: "J", value: 11 },
      { suit: "♥", rank: "Q", value: 12 },
      { suit: "♥", rank: "J", value: 11 }
    ],
    South: [
      { suit: "♠", rank: "10", value: 10 },
      { suit: "♠", rank: "9", value: 9 },
      { suit: "♥", rank: "10", value: 10 },
      { suit: "♥", rank: "9", value: 9 }
    ],
    West: [
      { suit: "♠", rank: "8", value: 8 },
      { suit: "♠", rank: "7", value: 7 },
      { suit: "♥", rank: "8", value: 8 },
      { suit: "♥", rank: "7", value: 7 }
    ]
  }
  
  const contract = {
    level: 1,
    suit: "NT" as const,
    declarer: "South" as Position
  }
  
  console.log("Simple 4-card hands:")
  for (const [position, cards] of Object.entries(simpleHands)) {
    console.log(`${position}: ${cards.map(c => `${c.rank}${c.suit}`).join(' ')}`)
  }
  
  const solver = createDoubleDummySolver(simpleHands, contract)
  const maxTricks = solver.solve("West")
  
  console.log(`\nMax tricks: ${maxTricks}`)
  console.log(`Expected: 4 tricks (North-South should win all 4 tricks)`)
  
  if (maxTricks !== 4) {
    console.log("❌ ERROR: Should win all 4 tricks!")
  } else {
    console.log("✅ CORRECT: Winning all 4 tricks!")
  }
}

if (typeof window === 'undefined') {
  testDominantHand()
  testSimpleCase()
} 