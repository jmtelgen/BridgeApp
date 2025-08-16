// Test the fixed position logic
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
      "South": "East",   // From South's view, East is East
      "West": "North"    // From West's view, East is North
    },
    "West": {
      "North": "West",   // From North's view, West is West
      "South": "West",   // From South's view, West is West
      "East": "South"    // From East's view, West is South
    }
  }
  
  const result = relativePositions[a][b]
  if (!result) {
    throw new Error(`No relative position defined for ${a} - ${b}`)
  }
  
  return result
}

console.log('=== Testing Fixed Position Logic ===')
console.log('When current player is at South:')
console.log('North - South =', subtractPositions('North', 'South')) // Should be North
console.log('East - South =', subtractPositions('East', 'South'))   // Should be East
console.log('West - South =', subtractPositions('West', 'South'))   // Should be West
console.log('South - South =', subtractPositions('South', 'South')) // Should be North

console.log('\nWhen current player is at North:')
console.log('South - North =', subtractPositions('South', 'North')) // Should be South
console.log('East - North =', subtractPositions('East', 'North'))   // Should be East
console.log('West - North =', subtractPositions('West', 'North'))   // Should be West
