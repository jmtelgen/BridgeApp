import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bid, BidType, Position, Suit, GameState } from '../types'

interface BiddingAreaProps {
  gameState: GameState
  onMakeBid: (type: BidType, level?: number, suit?: Suit | "NT") => void
  aiThinking: boolean
}

export const BiddingArea = ({ gameState, onMakeBid, aiThinking }: BiddingAreaProps) => {
  const [selectedBidLevel, setSelectedBidLevel] = useState<number | null>(null)
  const [selectedBidSuit, setSelectedBidSuit] = useState<Suit | "NT" | null>(null)

  const handleBidClick = (type: BidType, level?: number, suit?: Suit | "NT") => {
    onMakeBid(type, level, suit)
    setSelectedBidLevel(null)
    setSelectedBidSuit(null)
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h3 className="font-semibold mb-3 text-center">Bidding</h3>

      {/* Bidding History */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-sm">
        {/* Determine the bidding order starting from the first bidder */}
        {(() => {
          const positions: Position[] = ["North", "East", "South", "West"]
          const firstBidderIndex = positions.indexOf(gameState.dealer === "West" ? "North" : 
                                                   gameState.dealer === "North" ? "East" : 
                                                   gameState.dealer === "East" ? "South" : "West")
          
          const biddingOrder = [
            positions[firstBidderIndex],
            positions[(firstBidderIndex + 1) % 4],
            positions[(firstBidderIndex + 2) % 4],
            positions[(firstBidderIndex + 3) % 4]
          ]
          
          return (
            <>
              {biddingOrder.map((position) => (
                <div key={position} className="font-semibold text-center">
                  {position}
                  {gameState.dealer === position && (
                    <span className="text-blue-600 text-xs block">(Dealer)</span>
                  )}
                </div>
              ))}
              {gameState.bids.map((bid, index) => (
                <div key={index} className="text-center p-1 bg-gray-50 rounded">
                  {bid.type === "Pass"
                    ? "Pass"
                    : bid.type === "Double"
                      ? "X"
                      : bid.type === "Redouble"
                        ? "XX"
                        : `${bid.level}${bid.suit}`}
                </div>
              ))}
            </>
          )
        })()}
      </div>

      {/* Bid Selection */}
      {gameState.currentPlayer === "South" && (
        <div className="space-y-4">
          {/* Level Selection */}
          <div>
            <p className="text-sm font-medium mb-2">Select Level:</p>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5, 6, 7].map((level) => (
                <Button
                  key={level}
                  variant={selectedBidLevel === level ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedBidLevel(level)}
                  className="w-10 h-10"
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Suit Selection - only show if level is selected */}
          {selectedBidLevel && (
            <div>
              <p className="text-sm font-medium mb-2">Select Suit:</p>
              <div className="flex gap-2 justify-center">
                {(["♣", "♦", "♥", "♠", "NT"] as const).map((suit) => (
                  <Button
                    key={suit}
                    variant={selectedBidSuit === suit ? "default" : "outline"}
                    size="sm"
                    className="w-12 h-10 bg-transparent"
                    onClick={() => {
                      setSelectedBidSuit(suit)
                      handleBidClick("Bid", selectedBidLevel, suit)
                    }}
                  >
                    <span className={suit === "♥" || suit === "♦" ? "text-red-600" : ""}>{suit}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBidClick("Pass")}
            >
              Pass
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBidClick("Double")}
            >
              Double
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBidClick("Redouble")}
            >
              Redouble
            </Button>
          </div>
        </div>
      )}

      {/* AI players will bid automatically */}
      {gameState.currentPlayer !== "South" && gameState.phase === "bidding" && (
        <div className="text-center text-sm text-gray-600">
          {aiThinking ? (
            <div>
              {gameState.currentPlayer} is thinking...
              <br />
              <span className="text-xs">(Using SAYC bidding conventions)</span>
            </div>
          ) : (
            <div>
              {gameState.currentPlayer} is thinking...
              <br />
              <span className="text-xs">(AI will bid automatically using SAYC)</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 