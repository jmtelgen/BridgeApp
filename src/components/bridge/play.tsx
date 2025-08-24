import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "./components/Card"
import { PlayerHand } from "./components/PlayerHand"
import { BiddingArea } from "./components/BiddingArea"
import { PlayingArea } from "./components/PlayingArea"
import { GameCompleted } from "./components/GameCompleted"
import { useGameStore } from "../../stores/gameStore"
import { useRoomDataStore } from "../../stores/roomDataStore"
import { useAITurn } from "../../hooks/useAITurn"
import { PlayingCard, Position } from "./types"
import { useNavigate } from "react-router-dom"
import { subtractPositions } from "../../utils/positionUtils"
import { ArrowLeft } from "lucide-react"
import { useMemo } from "react"


export default function BridgeGame() {
  const navigate = useNavigate()
  const {
    gameData,
    selectedCard,
    setSelectedCard,
    aiThinking,
    startNewGame,
    makeBid,
    playCard,
    isMyTurn,
    canMakeMove
  } = useGameStore()
  const { getNorthPlayerName, getWestPlayerName, getEastPlayerName, getPlayerName, getPlayerDisplayName, getCurrentPlayerPosition, isRobot, getDisplayPositionLabel } = useRoomDataStore()

  // Handle AI turns automatically
  useAITurn()

  // Memoize the turn check to prevent excessive function calls
  const isMyTurnResult = useMemo(() => isMyTurn(), [isMyTurn])

  const handleBackToRoom = () => {
    navigate('/')
  }

  const handleCardClick = (card: PlayingCard) => {
    if (gameData.phase === "playing") {
      playCard(card)
    } else {
      setSelectedCard(selectedCard?.suit === card.suit && selectedCard?.rank === card.rank ? null : card)
    }
  }

  // Calculate display position labels once for each direction
  const westDisplayLabel = getDisplayPositionLabel("West")
  const northDisplayLabel = getDisplayPositionLabel("North")
  const southDisplayLabel = getDisplayPositionLabel("South")
  const eastDisplayLabel = getDisplayPositionLabel("East")

  // Get the current player's position once
  const currentPlayerPosition = getCurrentPlayerPosition()

  const renderPlayerHand = (displayPosition: Position) => {
    // Determine if this is the current player's hand
    const isCurrentPlayer = displayPosition === "South"
    
    // Get the actual game position for this display position using subtractPositions
    const gamePosition: Position = subtractPositions(currentPlayerPosition, displayPosition)
    
    
    // Check if cards should be shown
    const showCards = isCurrentPlayer || 
      (gameData.phase === "playing" && gameData.dummy === gamePosition && gameData.firstCardPlayed)
    
    // Check if this is a dummy hand
    const isDummy = gameData.phase === "playing" && gameData.dummy === gamePosition
    
    // Check if current player should control this hand using new seat-based logic
    const shouldCurrentPlayerControl = isCurrentPlayer && isMyTurnResult && canMakeMove()
    
    // For East/West dummy hands, use column display
    const displayAsDummy = isDummy && (displayPosition === "East" || displayPosition === "West")

    return (
      <PlayerHand
        position={displayPosition}
        cards={gameData.hands[gamePosition] || []}
        isCurrentPlayer={isCurrentPlayer}
        isPlayerTurn={shouldCurrentPlayerControl}
        showCards={showCards}
        isDummy={isDummy}
        selectedCard={selectedCard}
        currentTrickCard={gameData.currentTrick?.cards?.[gamePosition] || null}
        onCardClick={shouldCurrentPlayerControl ? handleCardClick : undefined}
        displayAsDummy={displayAsDummy}
      />
    )
  }

  const getPlayerInitial = (playerName: String) => {
    return playerName ? playerName.charAt(0).toUpperCase() : "?"
  }

  const getPlayerColor = (seat: string) => {
    const colors: Record<string, string> = {
      "N": "from-blue-500 to-blue-600",
      "S": "from-emerald-500 to-emerald-600",
      "E": "from-pink-500 to-pink-600",
      "W": "from-purple-500 to-purple-600"
    }
    return colors[seat] || "from-gray-500 to-gray-600"
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-800 via-green-700 to-green-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-600/20 via-transparent to-green-900/40"></div>

      {/* Back to Room Button */}
      <button
        onClick={handleBackToRoom}
        className="fixed top-4 left-4 z-30 flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-gray-600" />
        <span className="font-medium text-gray-800">Back to Room</span>
      </button>

      {/* Game Layout - Players positioned at screen edges */}
      <div className="fixed inset-0 z-20 pointer-events-none">
        {/* North Player - Top */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="flex flex-col items-center gap-2">
            {/* North Player Cards */}
            <div className="flex gap-1 sm:gap-1 md:gap-1 lg:gap-1">
            {Array.from({ length: 13 }).map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-12 bg-blue-900 border border-blue-800 rounded-sm shadow-sm -ml-4 first:ml-0 xs:-ml-3 sm:-ml-2 md:-ml-1 lg:ml-0"
                />
              ))}
            </div>
            {/* North Player Info */}
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                {(() => {
                  const playerName = getNorthPlayerName();
                  return playerName ? (
                    <>
                      <div className={`w-8 h-8 bg-gradient-to-br ${getPlayerColor("N")} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                        {isRobot(String(playerName)) ? "🤖" : subtractPositions("North", currentPlayerPosition).charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-800">
                        {playerName}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        ?
                      </div>
                      <span className="font-semibold text-gray-600">Empty</span>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* West Player - Left */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-auto">
          <div className="flex items-center gap-4">
            {/* West Player Cards */}
            <div className="flex flex-col gap-1 sm:gap-1 md:gap-1 lg:gap-1">
              {Array.from({ length: 13 }).map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-8 bg-purple-900 border border-purple-800 rounded-sm shadow-sm -mt-4 first:mt-0 xs:-mt-3 sm:-mt-2 md:-mt-1 lg:mt-0"
                />
              ))}
            </div>
            {/* West Player Info */}
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg rotate-90">
              <div className="flex items-center gap-2">
                {(() => {
                  const playerName = getWestPlayerName();
                  return playerName ? (
                    <>
                      <div className={`w-8 h-8 bg-gradient-to-br ${getPlayerColor("W")} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                        {isRobot(String(playerName)) ? "🤖" : subtractPositions("West", currentPlayerPosition).charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-800">
                        {playerName}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        ?
                      </div>
                      <span className="font-semibold text-gray-600">Empty</span>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* East Player - Right */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-auto">
          <div className="flex items-center gap-4">
            {/* East Player Info */}
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg -rotate-90">
              <div className="flex items-center gap-2">
                {(() => {
                  const playerName = getEastPlayerName();
                  return playerName ? (
                    <>
                      <div className={`w-8 h-8 bg-gradient-to-br ${getPlayerColor("E")} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                        {isRobot(String(playerName)) ? "🤖" : subtractPositions("East", currentPlayerPosition).charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-800">
                        {playerName}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        ?
                      </div>
                      <span className="font-semibold text-gray-600">Empty</span>
                    </>
                  );
                })()}
              </div>
            </div>
            {/* East Player Cards */}
            <div className="flex flex-col gap-1 sm:gap-1 md:gap-1 lg:gap-1">
              {Array.from({ length: 13 }).map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-8 bg-purple-900 border border-purple-800 rounded-sm shadow-sm -mt-4 first:mt-0 xs:-mt-3 sm:-mt-2 md:-mt-1 lg:mt-0"
                />
              ))}
            </div>
          </div>
        </div>

        {/* South Player - Bottom (You) */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="flex flex-col items-center gap-2">
            {/* South Player Info */}
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                {(() => {
                  const playerName = getPlayerDisplayName(currentPlayerPosition);
                  return playerName ? (
                    <>
                      <div className={`w-8 h-8 bg-gradient-to-br ${getPlayerColor("S")} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                        {subtractPositions("South", currentPlayerPosition).charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-800">
                        {playerName}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        ?
                      </div>
                      <span className="font-semibold text-gray-600">Empty</span>
                    </>
                  );
                })()}
              </div>
            </div>
            {/* South Player Cards */}
            <div className="flex gap-1 sm:gap-1 md:gap-1 lg:gap-1">
              {renderPlayerHand("South")}
            </div>
          </div>
        </div>

        {/* Center Playing/Bidding Area */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-xl min-w-[400px]">
            {/* Turn indicator for playing phase */}
            {gameData.phase === "playing" && (
              <div className="mb-4 text-center">
                <div className={`inline-block px-6 py-3 rounded-xl shadow-lg border-2 ${
                  isMyTurnResult 
                    ? 'bg-green-600 text-white border-green-500' 
                    : 'bg-gray-400 text-gray-200 border-gray-300'
                }`}>
                  <span className="font-semibold text-lg">🎯 It's </span>
                  <span className="font-bold text-2xl text-yellow-300">{gameData.currentPlayer}'s</span>
                  <span className="font-semibold text-lg"> turn to play!</span>
                  {isMyTurnResult && (
                    <div className="text-sm mt-1 text-yellow-200">
                      It's your turn!
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Turn indicator for bidding phase */}
            {gameData.phase === "bidding" && (
              <div className="mb-4 text-center">
                <div className={`inline-block px-6 py-3 rounded-xl shadow-lg border-2 ${
                  isMyTurnResult 
                    ? 'bg-blue-600 text-white border-blue-500' 
                    : 'bg-gray-400 text-gray-200 border-gray-300'
                }`}>
                  <span className="font-semibold text-lg">🎯 It's </span>
                  <span className="font-bold text-2xl text-yellow-300">{gameData.currentPlayer}'s</span>
                  <span className="font-semibold text-lg"> turn to bid!</span>
                  {isMyTurnResult && (
                    <div className="text-sm mt-1 text-yellow-200">
                      It's your turn!
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {gameData.phase === "bidding" && (
              <BiddingArea onMakeBid={makeBid} />
            )}
            {gameData.phase === "playing" && (
              <PlayingArea gameState={gameData} />
            )}
            {gameData.phase === "completed" && (
              <GameCompleted
                gameState={gameData}
                onNewGame={startNewGame}
                onBackToRoom={handleBackToRoom}
              />
            )}
          </div>
        </div>
      </div>

      {/* Game Info 
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-center text-sm text-white/90 pointer-events-auto">
        <p>
          {gameData.phase}
          {gameData.phase === "bidding"
            ? "Players are bidding. Make your bid when it's your turn."
            : gameData.phase === "playing"
              ? "Playing phase. Click a card from your hand to play it."
              : "Game completed!"}
        </p>
        {aiThinking && (
          <p className="text-yellow-300 font-medium mt-2">
            AI is thinking using SAYC bidding conventions...
          </p>
        )}
      </div>*/}

      {/* Center area for bridge gameplay */}
      <div className="relative z-10 w-full h-screen">{/* Future components will go here */}</div>
    </main>
  )
}
