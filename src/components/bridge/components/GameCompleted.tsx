import { Button } from "@/components/ui/button"
import { GameState } from '../types'

interface GameCompletedProps {
  gameState: GameState
  onNewGame: () => void
  onBackToRoom?: () => void
}

export const GameCompleted = ({ gameState, onNewGame, onBackToRoom }: GameCompletedProps) => {
  // Calculate tricks taken by each team
  console.log('GameCompleted - gameState.tricks:', gameState.tricks)
  console.log('GameCompleted - gameState.tricks?.length:', gameState.tricks?.length)
  
  const nsTricks = (gameState.tricks || []).filter(trick => 
    trick.winner === "North" || trick.winner === "South"
  ).length
  
  const ewTricks = (gameState.tricks || []).filter(trick => 
    trick.winner === "East" || trick.winner === "West"
  ).length

  // Determine which team was declarer
  const declarerTeam = gameState.contract?.declarer === "North" || gameState.contract?.declarer === "South" ? "NS" : "EW"
  const declarerTricks = declarerTeam === "NS" ? nsTricks : ewTricks
  const defenderTricks = declarerTeam === "NS" ? ewTricks : nsTricks

  return (
    <div className="bg-white rounded-lg p-8 shadow-sm border text-center">
      <h3 className="text-2xl font-bold mb-4">Game Complete!</h3>
      <div className="space-y-2">
        <p>Contract: {gameState.contract?.level}{gameState.contract?.suit} by {gameState.contract?.declarer}</p>
        <p>Total tricks played: {(() => {
          console.log('GameCompleted - rendering tricks length:', gameState.tricks?.length)
          return gameState.tricks?.length || 0
        })()}</p>
        <p>Declarer team ({declarerTeam}): {declarerTricks} tricks</p>
        <p>Defender team ({declarerTeam === "NS" ? "EW" : "NS"}): {defenderTricks} tricks</p>
        <div className="flex gap-2 justify-center mt-4">
          <Button onClick={onNewGame}>
            Start New Game
          </Button>
          {onBackToRoom && (
            <Button onClick={onBackToRoom} variant="outline">
              Back to Room
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 