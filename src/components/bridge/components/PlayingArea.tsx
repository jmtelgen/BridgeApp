import { Badge } from "@/components/ui/badge"
import { Card } from './Card'
import { PlayingCard, Position, GameData } from '../types'

interface PlayingAreaProps {
  gameState: GameData
}

export const PlayingArea = ({ gameState }: PlayingAreaProps) => {
  return (
    <div className="bg-green-100 rounded-lg p-8 shadow-sm border relative">
      {/* Turn indicator - prominently displayed at the top center */}
      <div className="text-center mb-4">
        <div className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md">
          <span className="font-semibold">Current Turn: </span>
          <span className="font-bold text-lg">{gameState.currentPlayer}</span>
        </div>
      </div>
      
      <div className="absolute top-2 left-2">
        <Badge variant="secondary">
          {(() => {
            // Defensive check for currentTrick
            if (!gameState.currentTrick) {
              return `Trick ${(gameState.tricks?.length || 0) + 1}`
            }
            const hasCurrentCards = Object.values(gameState.currentTrick.cards).some(card => card !== null)
            if (hasCurrentCards) {
              return `Trick ${(gameState.tricks?.length || 0) + 1}`
            } else if (gameState.previousTrick) {
              return `Previous Trick (${gameState.tricks?.length || 0})`
            } else {
              return `Trick ${(gameState.tricks?.length || 0) + 1}`
            }
          })()}
        </Badge>
      </div>
      {gameState.contract && (
        <div className="absolute top-2 right-2">
          <Badge variant="default">
            {gameState.contract.level}{gameState.contract.suit} by {gameState.contract.declarer}
            {gameState.contract.doubled ? " X" : ""}
            {gameState.contract.redoubled ? " XX" : ""}
          </Badge>
        </div>
      )}

      {/* Message when no cards are being played yet */}
      {gameState.phase === "playing" && (!gameState.currentTrick || !Object.values(gameState.currentTrick.cards).some(card => card !== null)) && (
        <div className="text-center text-gray-600 mt-8">
          <p className="text-lg">Waiting for cards to be played...</p>
          <p className="text-sm mt-2">Cards will appear in the center of the screen when played</p>
        </div>
      )}

      {/* Dummy indicator */}
      {gameState.dummy && (
        <div className="absolute bottom-2 left-2">
          <Badge variant="outline">Dummy: {gameState.dummy}</Badge>
        </div>
      )}
    </div>
  )
} 