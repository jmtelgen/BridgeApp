import { getAIBid, BiddingContext } from './sayc-bidding'
import { PlayingCard, Position, Bid } from '../types'

/**
 * Integration function to get AI's next bid for the game
 * This can be called from the game logic when it's an AI player's turn to bid
 */
export function getNextAIBid(
  hand: PlayingCard[],
  position: Position,
  previousBids: Bid[],
  vulnerability: 'none' | 'ns' | 'ew' | 'both' = 'none'
): Bid {
  const context: BiddingContext = {
    hand,
    position,
    previousBids,
    vulnerability
  }
  
  return getAIBid(context)
}

/**
 * Example usage:
 * 
 * // When it's North's turn to bid
 * const northHand = hands.North
 * const previousBids = gameState.bids
 * const nextBid = getNextAIBid(northHand, "North", previousBids)
 * 
 * // The bid will be automatically determined based on SAYC conventions
 * // If no valid bid is found, it will return a Pass
 */ 