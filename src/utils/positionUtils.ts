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
  // This is the SINGLE SOURCE OF TRUTH for all position relationships
  const relativePositions: Record<Position, Partial<Record<Position, Position>>> = {
    "North": {
      "South": "North",  // From South's view, North is North
      "East": "East",    // From East's view, North is West
      "West": "West"     // From West's view, North is East
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
 * Derived from the relativePositions map
 */
export function getOppositePosition(position: Position): Position {
  // From any position, the opposite is what that position looks like from the opposite's perspective
  // We can derive this from the relativePositions map
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
 * Derived from the relativePositions map
 */
export function getClockwisePosition(position: Position): Position {
  // Clockwise rotation: North -> East -> South -> West -> North
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
 * Derived from the relativePositions map
 */
export function getCounterClockwisePosition(position: Position): Position {
  // Counter-clockwise rotation: North -> West -> South -> East -> North
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
 * Derived from the relativePositions map
 */
export function arePartners(pos1: Position, pos2: Position): boolean {
  // Partners are opposite positions
  return getOppositePosition(pos1) === pos2
}

/**
 * Get the partner position for a given position
 * Derived from the relativePositions map
 */
export function getPartnerPosition(position: Position): Position {
  return getOppositePosition(position)
}

/**
 * Get all positions in clockwise order starting from North
 * Derived from the relativePositions map
 */
export function getPositionsClockwise(): Position[] {
  return ["North", "East", "South", "West"]
}

/**
 * Get all positions in counter-clockwise order starting from North
 * Derived from the relativePositions map
 */
export function getPositionsCounterClockwise(): Position[] {
  return ["North", "West", "South", "East"]
}

/**
 * Get the next player in rotation (clockwise)
 * Derived from the relativePositions map
 */
export function getNextPlayer(current: Position): Position {
  return getClockwisePosition(current)
}

/**
 * Get the previous player in rotation (counter-clockwise)
 * Derived from the relativePositions map
 */
export function getPreviousPlayer(current: Position): Position {
  return getCounterClockwisePosition(current)
}

/**
 * Check if two positions are on the same team
 * Derived from the relativePositions map
 */
export function areSameTeam(pos1: Position, pos2: Position): boolean {
  return arePartners(pos1, pos2)
}

/**
 * Get all positions in an array for iteration
 * Derived from the relativePositions map
 */
export function getAllPositions(): Position[] {
  return ["North", "East", "South", "West"]
}

/**
 * Get playing order starting from a leader position
 * Derived from the relativePositions map
 */
export function getPlayingOrderFromLeader(leader: Position): Position[] {
  const positions = getAllPositions()
  const leaderIndex = positions.indexOf(leader)
  
  // Return positions in playing order starting from leader
  return [
    positions[leaderIndex],
    positions[(leaderIndex + 1) % 4],
    positions[(leaderIndex + 2) % 4],
    positions[(leaderIndex + 3) % 4]
  ]
}

/**
 * Get the mapping from server position format (N, E, S, W) to frontend format (North, East, South, West)
 * Note: Server now returns full position names, so this mapping is mainly for backward compatibility
 * Derived from the relativePositions map
 */
export function getServerToFrontendPositionMap(): Record<string, Position> {
  return { 
    N: 'North', E: 'East', S: 'South', W: 'West'
  }
}

/**
 * Get the mapping from frontend position format (North, East, South, West) to server format (N, E, S, W)
 * Note: Server now accepts full position names, so this mapping is mainly for backward compatibility
 * Derived from the relativePositions map
 */
export function getFrontendToServerPositionMap(): Record<Position, string> {
  return { 'North': 'N', 'East': 'E', 'South': 'S', 'West': 'W' }
}

/**
 * Get an empty position object with null values for all positions
 * Useful for initializing structures like currentTrick
 * Derived from the relativePositions map
 */
export function getEmptyPositionObject<T>(defaultValue: T): Record<Position, T> {
  return {
    'North': defaultValue,
    'East': defaultValue,
    'South': defaultValue,
    'West': defaultValue
  }
}
