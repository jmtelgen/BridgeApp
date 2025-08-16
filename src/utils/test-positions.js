// Simple test to verify position subtraction logic
// This will be run with Node.js to test the logic

// Mock the Position type for testing
const Position = {
  North: "North",
  South: "South", 
  East: "East",
  West: "West"
}

function subtractPositions(a, b) {
  // If we're subtracting the same position, return North (the "forward" position)
  if (a === b) {
    return "North"
  }
  
  // Define the relative positions from each perspective
  // This maps: from position 'b', what does position 'a' look like?
  const relativePositions = {
    "North": {
      "South": "North",  // From South's view, North is North
      "East": "West",    // From East's view, North is West
      "West": "East"     // From West's view, North is East
    },
    "South": {
      "North": "South",  // From North's view, South is South
      "East": "East",    // From East's view, South is East
      "West": "West"     // From West's view, South is West
    },
    "East": {
      "North": "East",   // From North's view, East is East
      "South": "West",   // From South's view, East is West
      "West": "North"    // From West's view, East is North
    },
    "West": {
      "North": "West",   // From North's view, West is West
      "South": "East",   // From South's view, West is East
      "East": "South"    // From East's view, West is South
    }
  }
  
  const result = relativePositions[a][b]
  if (!result) {
    throw new Error(`No relative position defined for ${a} - ${b}`)
  }
  
  return result
}

// Test the examples you specified
console.log('=== Testing Position Subtraction ===')
console.log('North - South =', subtractPositions('North', 'South')) // Should be North
console.log('North - East =', subtractPositions('North', 'East'))   // Should be West
console.log('West - East =', subtractPositions('West', 'East'))     // Should be North

console.log('\n=== Additional Tests ===')
console.log('South - North =', subtractPositions('South', 'North')) // Should be South
console.log('East - West =', subtractPositions('East', 'West'))     // Should be South
console.log('East - North =', subtractPositions('East', 'North'))  // Should be East
console.log('West - North =', subtractPositions('West', 'North'))  // Should be West
