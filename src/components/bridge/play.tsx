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


export default function BridgeGame() {
  const navigate = useNavigate()
  const {
    gameState,
    selectedCard,
    setSelectedCard,
    aiThinking,
    startNewGame,
    makeBid,
    playCard
  } = useGameStore()
  const { getNorthPlayerName, getWestPlayerName, getEastPlayerName, getPlayerName, getCurrentPlayerPosition, isRobot, getDisplayPositionLabel } = useRoomDataStore()

  // Handle AI turns automatically
  useAITurn()

  const handleBackToRoom = () => {
    navigate('/')
  }

  const handleCardClick = (card: PlayingCard) => {
    if (gameState.phase === "playing") {
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
    const gamePosition: Position = subtractPositions(displayPosition, currentPlayerPosition)
    
    // Check if cards should be shown
    const showCards = isCurrentPlayer || 
      (gameState.phase === "playing" && gameState.dummy === gamePosition && gameState.firstCardPlayed)
    
    // Check if this is a dummy hand
    const isDummy = gameState.phase === "playing" && gameState.dummy === gamePosition
    
    // Check if current player should control this hand
    const shouldCurrentPlayerControl = isCurrentPlayer && gameState.currentPlayer === currentPlayerPosition
    
    // For East/West dummy hands, use column display
    const displayAsDummy = isDummy && (displayPosition === "East" || displayPosition === "West")

    return (
      <PlayerHand
        position={displayPosition}
        cards={gameState.hands[gamePosition] || []}
        isCurrentPlayer={isCurrentPlayer}
        isPlayerTurn={shouldCurrentPlayerControl}
        showCards={showCards}
        isDummy={isDummy}
        selectedCard={selectedCard}
        currentTrickCard={gameState.currentTrick?.cards?.[gamePosition] || null}
        onCardClick={shouldCurrentPlayerControl ? handleCardClick : undefined}
        displayAsDummy={displayAsDummy}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button onClick={handleBackToRoom} variant="outline">
              ← Back to Room
            </Button>
            <h1 className="text-3xl font-bold">Bridge Game</h1>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={startNewGame} variant="outline">
              New Game
            </Button>
            <Badge variant="secondary">
              {currentPlayerPosition} to {gameState.phase === "bidding" ? "bid" : "play"}
            </Badge>
            {gameState.phase === "bidding" && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Dealer: {gameState.dealer}
              </Badge>
            )}
          </div>
        </div>

        {/* Game Layout */}
        <div className="grid grid-cols-7 gap-6 h-[700px]">
          {/* West Player Name */}
          <div className="flex flex-col justify-center px-2">
            <div className="text-center mb-6 transform -rotate-90 origin-center bg-white/80 backdrop-blur-sm rounded-lg p-2 shadow-sm">
              <div className="text-sm font-medium text-gray-700 mb-1 whitespace-nowrap">
                {getWestPlayerName()}
              </div>
                <div className="flex justify-center gap-1 flex-wrap">
                  <Badge variant="outline">
                    {westDisplayLabel}
                  </Badge>
                  {gameState.dealer === westDisplayLabel && gameState.phase === "bidding" && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">Dealer</Badge>
                  )}
                  {gameState.dummy === westDisplayLabel && <Badge variant="secondary">Dummy</Badge>}
                  {getWestPlayerName() && isRobot(String(getWestPlayerName())) && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">AI</Badge>
                  )}
                </div>
            </div>
          </div>

          {/* West Player Cards */}
          <div className="flex flex-col justify-center">
            <div className="transform -rotate-90 origin-center">
              {renderPlayerHand("West")}
            </div>
          </div>

          {/* Center Column */}
          <div className="col-span-3 flex flex-col">
            {/* North Player */}
            <div className="mb-4">
              <div className="text-center mb-2 bg-white/80 backdrop-blur-sm rounded-lg p-2 shadow-sm">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {getNorthPlayerName()}
                </div>
                <div className="flex justify-center gap-1 flex-wrap">
                  <Badge variant="outline">
                    {northDisplayLabel}
                  </Badge>
                  {gameState.dealer === northDisplayLabel && gameState.phase === "bidding" && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">Dealer</Badge>
                  )}
                  {gameState.dummy === northDisplayLabel && <Badge variant="secondary">Dummy</Badge>}
                  {getNorthPlayerName() && isRobot(String(getNorthPlayerName())) && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">AI</Badge>
                  )}
                </div>
              </div>
              <div className="flex justify-center">
                {renderPlayerHand("North")}
              </div>
            </div>

            {/* Center Playing/Bidding Area */}
            <div className="flex-1 flex items-center justify-center">
              {gameState.phase === "bidding" && (
                <BiddingArea onMakeBid={makeBid} />
              )}
              {gameState.phase === "playing" && (
                <PlayingArea gameState={gameState} />
              )}
              {gameState.phase === "completed" && (
                <GameCompleted
                  gameState={gameState}
                  onNewGame={startNewGame}
                  onBackToRoom={handleBackToRoom}
                />
              )}
            </div>

            //Bottom section
            <div className="mt-4">
              <div className="text-center mb-2 bg-white/80 backdrop-blur-sm rounded-lg p-2 shadow-sm">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {`${getPlayerName(currentPlayerPosition)} (You)`}
                </div>
                <div className="flex justify-center gap-1 flex-wrap">
                  <Badge variant={"default"}>
                    {southDisplayLabel}
                  </Badge>
                  {gameState.dealer === currentPlayerPosition && gameState.phase === "bidding" && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">Dealer</Badge>
                  )}
                  {gameState.dummy === currentPlayerPosition && <Badge variant="secondary">Dummy</Badge>}
                </div>
              </div>
              <div className="flex justify-center">
                {renderPlayerHand("South")}
              </div>
            </div>
          </div>

          {/* East Player Cards */}
          <div className="flex flex-col justify-center">
            <div className="transform rotate-90 origin-center">
              {renderPlayerHand("East")}
            </div>
          </div>

          {/* East Player Name */}
          <div className="flex flex-col justify-center px-2">
            <div className="text-center mb-6 transform rotate-90 origin-center bg-white/80 backdrop-blur-sm rounded-lg p-2 shadow-sm">
              <div className="text-sm font-medium text-gray-700 mb-1 whitespace-nowrap">
                {getEastPlayerName()}
              </div>
                <div className="flex justify-center gap-1 flex-wrap">
                  <Badge variant={"outline"}>
                    {eastDisplayLabel}
                  </Badge>
                  {gameState.dealer === eastDisplayLabel && gameState.phase === "bidding" && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">Dealer</Badge>
                  )}
                  {gameState.dummy === eastDisplayLabel && <Badge variant="secondary">Dummy</Badge>}
                </div>
            </div>
          </div>
        </div>

        {/* Game Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            {gameState.phase}
            {gameState.phase === "bidding"
              ? "Players are bidding. Make your bid when it's your turn."
              : gameState.phase === "playing"
                ? "Playing phase. Click a card from your hand to play it."
                : "Game completed!"}
          </p>
          {aiThinking && (
            <p className="text-blue-600 font-medium mt-2">
              AI is thinking using SAYC bidding conventions...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
