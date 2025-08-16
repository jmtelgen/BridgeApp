import { Position } from "../components/bridge/types"

/**
 * Position subtraction utility for bridge game logic.
 * This allows calculating relative positions and rotations.
 * 
 * Examples:
 * - North - South = North (North is always North from South's perspective)
 * - North - East = West (North is West from East's perspective)
 * - West - East = North (West is North from East's perspective)
 * 
 * The logic follows the standard bridge table orientation:
 * - North is at the top
 * - South is at the bottom  
 * - East is on the right
 * - West is on the left
 */
export function subtractPositions(a: Position, b: Position): Position {
  // This function calculates what position 'a' looks like from position 'b's perspective
  // In bridge, each player sees themselves as "South" and others relative to that
  
  // If we're subtracting the same position, return South (the "forward" position)
  if (a === b) {
    return "South"
  }
  
  // Define the relative positions from each perspective
  // This maps: from position 'b', what does position 'a' look like?
  const relativePositions: Record<Position, Partial<Record<Position, Position>>> = {
    "North": {
      "South": "North",  // From South's view, North is North
      "East": "West",    // From East's view, North is West
      "West": "East"     // From West's view, North is East
    },
    "South": {
      "North": "North",  // From North's view, South is North
      "East": "West",    // From East's view, South is West
      "West": "East"     // From West's view, South is East
    },
    "East": {
      "North": "West",   // From North's view, East is West
      "South": "East",   // From South's view, East is East
      "West": "North"    // From West's view, East is North
    },
    "West": {
      "North": "East",   // From North's view, West is East
      "South": "West",   // From South's view, West is West
      "East": "North"    // From East's view, West is North
    }
  }
  
  const result = relativePositions[a][b]
  if (!result) {
    throw new Error(`No relative position defined for ${a} - ${b}`)
  }
  
  return result
}

/**
 * Alternative function that returns the relative position from one position to another.
 * This is the same as subtractPositions but with more intuitive naming.
 */
export function getRelativePosition(from: Position, to: Position): Position {
  return subtractPositions(to, from)
}

/**
 * Get the opposite position (180 degrees across the table)
 */
export function getOppositePosition(position: Position): Position {
  const opposites: Record<Position, Position> = {
    "North": "South",
    "South": "North", 
    "East": "West",
    "West": "East"
  }
  return opposites[position]
}

/**
 * Get the position that is 90 degrees clockwise from the given position
 */
export function getClockwisePosition(position: Position): Position {
  const clockwise: Record<Position, Position> = {
    "North": "East",
    "East": "South",
    "South": "West", 
    "West": "North"
  }
  return clockwise[position]
}

/**
 * Get the position that is 90 degrees counter-clockwise from the given position
 */
export function getCounterClockwisePosition(position: Position): Position {
  const counterClockwise: Record<Position, Position> = {
    "North": "West",
    "West": "South",
    "South": "East",
    "East": "North"
  }
  return counterClockwise[position]
}

/**
 * Check if two positions are partners (North-South or East-West)
 */
export function arePartners(pos1: Position, pos2: Position): boolean {
  return (pos1 === "North" && pos2 === "South") ||
         (pos1 === "South" && pos2 === "North") ||
         (pos1 === "East" && pos2 === "West") ||
         (pos1 === "West" && pos2 === "East")
}

/**
 * Get the partner position for a given position
 */
export function getPartnerPosition(position: Position): Position {
  return getOppositePosition(position)
}

/**
 * Get all positions in clockwise order starting from North
 */
export function getPositionsClockwise(): Position[] {
  return ["North", "East", "South", "West"]
}

/**
 * Get all positions in counter-clockwise order starting from North
 */
export function getPositionsCounterClockwise(): Position[] {
  return ["North", "West", "South", "East"]
}
