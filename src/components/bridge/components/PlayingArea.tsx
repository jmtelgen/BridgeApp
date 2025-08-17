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
            console.log('PlayingArea - gameState.currentTrick:', gameState.currentTrick)
            console.log('PlayingArea - gameState.tricks:', gameState.tricks)
            console.log('PlayingArea - gameState.tricks?.length:', gameState.tricks?.length)
            
            // Defensive check for currentTrick
            if (!gameState.currentTrick) {
              console.log('PlayingArea - currentTrick is undefined, returning default')
              return `Trick ${(gameState.tricks?.length || 0) + 1}`
            }
            const hasCurrentCards = Object.values(gameState.currentTrick.cards).some(card => card !== null)
            console.log('PlayingArea - hasCurrentCards:', hasCurrentCards)
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

      {/* Played cards in center */}
      <div className="grid grid-cols-3 grid-rows-3 gap-4 w-48 h-48 mx-auto">
        {/* Determine which trick to show - current trick if cards are being played, previous trick if not */}
        {(() => {
          console.log('PlayingArea - render section - gameState.currentTrick:', gameState.currentTrick)
          console.log('PlayingArea - render section - gameState.previousTrick:', gameState.previousTrick)
          
          // Defensive check for currentTrick
          if (!gameState.currentTrick) {
            console.log('PlayingArea - render section - currentTrick is undefined, returning null')
            return null
          }
          const hasCurrentCards = Object.values(gameState.currentTrick.cards).some(card => card !== null)
          console.log('PlayingArea - render section - hasCurrentCards:', hasCurrentCards)
          const trickToShow = hasCurrentCards ? gameState.currentTrick : gameState.previousTrick
          console.log('PlayingArea - render section - trickToShow:', trickToShow)
          
          if (!trickToShow) return null
          
          return (
            <>
              {/* North card */}
              <div></div>
              <div className="flex justify-center">
                {trickToShow.cards.North && (
                  <Card
                    card={trickToShow.cards.North}
                    isClickable={false}
                    isSelected={false}
                    isPlayed={true}
                  />
                )}
              </div>
              <div></div>

              {/* West and East cards */}
              <div className="flex justify-center items-center">
                {trickToShow.cards.West && (
                  <Card
                    card={trickToShow.cards.West}
                    isClickable={false}
                    isSelected={false}
                    isPlayed={true}
                  />
                )}
              </div>
              <div></div>
              <div className="flex justify-center items-center">
                {trickToShow.cards.East && (
                  <Card
                    card={trickToShow.cards.East}
                    isClickable={false}
                    isSelected={false}
                    isPlayed={true}
                  />
                )}
              </div>

              {/* South card */}
              <div></div>
              <div className="flex justify-center">
                {trickToShow.cards.South && (
                  <Card
                    card={trickToShow.cards.South}
                    isClickable={false}
                    isSelected={false}
                    isPlayed={true}
                  />
                )}
              </div>
              <div></div>
            </>
          )
        })()}
      </div>

      {/* Dummy indicator */}
      {gameState.dummy && (
        <div className="absolute bottom-2 left-2">
          <Badge variant="outline">Dummy: {gameState.dummy}</Badge>
        </div>
      )}
    </div>
  )
} 