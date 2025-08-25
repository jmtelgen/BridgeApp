import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bid, BidType, Position, Suit } from '../types'
import { useGameStore } from '../../../stores/gameStore'
import { useRoomDataStore } from '../../../stores/roomDataStore'

interface BiddingAreaProps {
  onMakeBid: (type: BidType, level?: number, suit?: Suit | "NT") => void
}

export const BiddingArea = ({ onMakeBid }: BiddingAreaProps) => {
  const [selectedBidLevel, setSelectedBidLevel] = useState<number | null>(null)
  const [selectedBidSuit, setSelectedBidSuit] = useState<Suit | "NT" | null>(null)
  
  // Get data from stores
  const { gameData, aiThinking, isMyTurn, canMakeMove } = useGameStore()
  const { getPlayerDisplayName, isRobot, getDisplayPositionLabel } = useRoomDataStore()
  const { getCurrentPlayerPosition } = useGameStore()

  // Safety check - ensure gameData exists
  if (!gameData) {
    return <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h3 className="font-semibold mb-3 text-center">Loading Bidding Area...</h3>
    </div>
  }

  const handleBidClick = (type: BidType, level?: number, suit?: Suit | "NT") => {
    onMakeBid(type, level, suit)
    setSelectedBidLevel(null)
    setSelectedBidSuit(null)
  }

  // Helper function to get seat key for a position
  const getSeatKey = (position: Position): string => {
    const seatMap: Record<Position, string> = {
      "North": "N",
      "South": "S", 
      "East": "E",
      "West": "W"
    }
    return seatMap[position] || "N"
  }

  // Check if current player is human and it's their turn to bid using new seat-based logic
  const currentPlayerPosition = getCurrentPlayerPosition()
  const currentPlayerSeat = currentPlayerPosition ? getSeatKey(currentPlayerPosition) : null
  const displayPositionLabel = currentPlayerPosition ? getDisplayPositionLabel(currentPlayerPosition, currentPlayerPosition) : null
  const currentPlayerName = currentPlayerSeat ? getPlayerDisplayName(currentPlayerSeat) : "Unknown Player"
  const isCurrentPlayerHuman = currentPlayerName ? !isRobot(currentPlayerName) : false
  const isCurrentUserTurn = isMyTurn() && canMakeMove()
  
  // Debug logging

  
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h3 className="font-semibold mb-3 text-center">Bidding</h3>

      {/* Bidding History */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-sm">
        {/* Determine the bidding order starting from the first bidder */}
        {(() => {
          const positions: Position[] = ["North", "East", "South", "West"]
          const firstBidderIndex = positions.indexOf(gameData.dealer === "West" ? "North" : 
                                                   gameData.dealer === "North" ? "East" : 
                                                   gameData.dealer === "East" ? "South" : "West")
          
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
                  {gameData.dealer === position && (
                    <span className="text-blue-600 text-xs block">(Dealer)</span>
                  )}
                </div>
              ))}
              {gameData.bids.map((bid: Bid, index: number) => (
                <div key={index} className="text-center p-1 bg-gray-50 rounded">
                  {bid.type === "Pass"
                    ? "Pass"
                    : bid.type === "Double"
                      ? "X"
                      : bid.type === "Redouble"
                        ? "XX"
                        : bid.type === "Bid" && typeof bid.level === "number" && bid.suit
                          ? `${bid.level}${bid.suit}`
                          : "Invalid Bid"}
                </div>
              ))}
            </>
          )
        })()}
      </div>

      {/* Bid Selection - Show for current user only when it's their turn */}
      {isCurrentUserTurn && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <p className="text-sm font-medium">It's your turn to bid ({currentPlayerName})</p>
          </div>
          
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

      {/* Show waiting message when it's not the current user's turn */}
      {!isCurrentUserTurn && !aiThinking && (
        <div className="text-center text-sm text-gray-600">
          <div>
            Waiting for {gameData.currentPlayer} to bid...
          </div>
        </div>
      )}

      {/* AI players will bid automatically */}
      {!isCurrentPlayerHuman && gameData.phase === "bidding" && aiThinking && (
        <div className="text-center text-sm text-gray-600">
          <div>
            {currentPlayerName} is thinking...
            <br />
            <span className="text-xs">(Using SAYC bidding conventions)</span>
          </div>
        </div>
      )}
    </div>
  )
} 