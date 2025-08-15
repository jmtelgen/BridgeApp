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
  const { getPlayerName, getCurrentPlayerPosition, isRobot } = useRoomDataStore()

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

  // Get the current player's position
  const currentPlayerPosition = getCurrentPlayerPosition()

  // Map game positions to display positions based on current player
  // The current player should always be displayed at the bottom with their own direction
  const getDisplayPosition = (gamePosition: Position): Position => {
    console.log("getGamePosition", gamePosition, currentPlayerPosition);
    console.log(getPlayerName(gamePosition));
    // If current player is South, no rotation needed
    if (currentPlayerPosition === "South") {
      return gamePosition
    }
    
    // If current player is North, rotate 180 degrees
    if (currentPlayerPosition === "North") {
      const northMap: Record<Position, Position> = {
        "North": "South",
        "South": "North", 
        "East": "West",
        "West": "East"
      }
      return northMap[gamePosition] || gamePosition
    }
    
    // If current player is East, rotate 90 degrees clockwise
    if (currentPlayerPosition === "East") {
      const eastMap: Record<Position, Position> = {
        "North": "West",
        "South": "East",
        "East": "North", 
        "West": "South"
      }
      return eastMap[gamePosition] || gamePosition
    }
    
    // If current player is West, rotate 90 degrees counter-clockwise
    if (currentPlayerPosition === "West") {
      const westMap: Record<Position, Position> = {
        "North": "East",
        "South": "West", 
        "East": "South",
        "West": "North"
      }
      return westMap[gamePosition] || gamePosition
    }
    
    return gamePosition
  }

  // Get the actual game position from display position
  const getGamePosition = (displayPosition: Position): Position => {    
    // If current player is South, no rotation needed
    if (currentPlayerPosition === "South") {
      return displayPosition
    }
    
    // If current player is North, rotate 180 degrees
    if (currentPlayerPosition === "North") {
      const northMap: Record<Position, Position> = {
        "North": "South",
        "South": "North", 
        "East": "West",
        "West": "East"
      }
      return northMap[displayPosition] || displayPosition
    }
    
    // If current player is East, rotate 90 degrees counter-clockwise
    if (currentPlayerPosition === "East") {
      const eastMap: Record<Position, Position> = {
        "North": "East",
        "South": "West",
        "East": "South", 
        "West": "North"
      }
      return eastMap[displayPosition] || displayPosition
    }
    
    // If current player is West, rotate 90 degrees clockwise
    if (currentPlayerPosition === "West") {
      const westMap: Record<Position, Position> = {
        "North": "West",
        "South": "East", 
        "East": "North",
        "West": "South"
      }
      return westMap[displayPosition] || displayPosition
    }
    
    return displayPosition
  }

  // Pre-calculate game positions to avoid repeated calls to getGamePosition
  const westGamePosition = getGamePosition("West")
  const northGamePosition = getGamePosition("North")
  const southGamePosition = getGamePosition("South")
  const eastGamePosition = getGamePosition("East")
  
  // Create a map for easy lookup
  const gamePositionMap: Record<Position, Position> = {
    "West": westGamePosition,
    "North": northGamePosition,
    "South": southGamePosition,
    "East": eastGamePosition
  }

  // Helper function to get the seat key for a game position
  const getSeatKey = (gamePosition: Position): string => {
    const seatMap: Record<Position, string> = {
      "North": "N",
      "South": "S", 
      "East": "E",
      "West": "W"
    }
    return seatMap[gamePosition] || "N"
  }

  // Helper function to get player name for a game position
  const getPlayerNameForPosition = (gamePosition: Position): string => {
    const seatKey = getSeatKey(gamePosition)
    const { getPlayerDisplayName } = useRoomDataStore.getState()
    return getPlayerDisplayName(seatKey)
  }
  
  // Pre-calculate player names to avoid repeated calls to getPlayerNameForPosition
  const westPlayerName = getPlayerNameForPosition(westGamePosition)
  const northPlayerName = getPlayerNameForPosition(northGamePosition)
  const southPlayerName = getPlayerNameForPosition(southGamePosition)
  const eastPlayerName = getPlayerNameForPosition(eastGamePosition)
  
  // Create a map for easy lookup
  const playerNameMap: Record<Position, string> = {
    "West": westPlayerName,
    "North": northPlayerName,
    "South": southPlayerName,
    "East": eastPlayerName
  }
  
  // Pre-calculate display positions to avoid repeated calls to getDisplayPosition
  const westDisplayPosition = getDisplayPosition(westGamePosition)
  const northDisplayPosition = getDisplayPosition(northGamePosition)
  const southDisplayPosition = getDisplayPosition(southGamePosition)
  const eastDisplayPosition = getDisplayPosition(eastGamePosition)

  const renderPlayerHand = (displayPosition: Position) => {
    // Get the actual game position for this display position
    const gamePosition = getGamePosition(displayPosition)
    
    const isCurrentPlayer = gameState.currentPlayer === gamePosition
    const isPlayerTurn = gameState.phase === "playing" && isCurrentPlayer
    const showCards = 
      (gamePosition === getCurrentPlayerPosition()) || 
      (gameState.phase === "playing" && gameState.dummy === gamePosition && gameState.firstCardPlayed)
    const isDummy = gameState.phase === "playing" && gameState.dummy === gamePosition
    
    // Check if the current player should control this hand
    // Current player can control their own hand when it's their turn
    // Current player can control dummy hand only when dummy is the current player AND current player is the declarer
    const shouldCurrentPlayerControl = 
      (gamePosition === getCurrentPlayerPosition() && gameState.currentPlayer === gamePosition) || 
      (gameState.contract && gameState.contract.declarer === gamePosition && 
       gameState.dummy === gamePosition && gameState.currentPlayer === gamePosition)
    
    // Update isPlayerTurn to include dummy control by current player
    const isPlayerTurnForControl = isPlayerTurn || 
      (gameState.contract && gameState.contract.declarer === gamePosition && 
       gameState.dummy === gamePosition && gameState.currentPlayer === gamePosition)

    // For East/West dummy hands, use column display
    const displayAsDummy = isDummy && (displayPosition === "East" || displayPosition === "West")

    return (
      <PlayerHand
        position={displayPosition}
        cards={gameState.hands[gamePosition]}
        isCurrentPlayer={isCurrentPlayer}
        isPlayerTurn={isPlayerTurnForControl!}
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
            <Badge
              variant={
                (gameState.currentPlayer === "North" || gameState.currentPlayer === "South") ? "default" : "secondary"
              }
            >
              {playerNameMap[gameState.currentPlayer]} to {gameState.phase === "bidding" ? "bid" : "play"}
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
                {westPlayerName}
                {westGamePosition === getCurrentPlayerPosition() && " (You)"}
              </div>
              <div className="flex justify-center gap-1 flex-wrap">
                <Badge variant={gameState.currentPlayer === westGamePosition ? "default" : "outline"}>
                  {westDisplayPosition}
                </Badge>
                {gameState.dealer === westGamePosition && gameState.phase === "bidding" && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">Dealer</Badge>
                )}
                {gameState.dummy === westGamePosition && <Badge variant="secondary">Dummy</Badge>}
                {isRobot(westPlayerName) && (
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
                  {northPlayerName}
                  {northGamePosition === getCurrentPlayerPosition() && " (You)"}
                </div>
                <div className="flex justify-center gap-1 flex-wrap">
                  <Badge variant={gameState.currentPlayer === northGamePosition ? "default" : "outline"}>
                    {northDisplayPosition}
                  </Badge>
                  {gameState.dealer === northGamePosition && gameState.phase === "bidding" && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">Dealer</Badge>
                  )}
                  {gameState.dummy === northGamePosition && <Badge variant="secondary">Dummy</Badge>}
                  {isRobot(northPlayerName) && (
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

            {/* South Player */}
            <div className="mt-4">
              <div className="text-center mb-2 bg-white/80 backdrop-blur-sm rounded-lg p-2 shadow-sm">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {southPlayerName}
                  {southGamePosition === getCurrentPlayerPosition() && " (You)"}
                </div>
                <div className="flex justify-center gap-1 flex-wrap">
                  <Badge variant={currentPlayerPosition === "South" ? "default" : "outline"}>
                    {southDisplayPosition}
                  </Badge>
                  {gameState.dealer === "South" && gameState.phase === "bidding" && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">Dealer</Badge>
                  )}
                  {gameState.dummy === "South" && <Badge variant="secondary">Dummy</Badge>}
                  {isRobot(southPlayerName) && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">AI</Badge>
                  )}
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
                {eastPlayerName}
                {eastGamePosition === getCurrentPlayerPosition() && " (You)"}
              </div>
              <div className="flex justify-center gap-1 flex-wrap">
                <Badge variant={gameState.currentPlayer === eastGamePosition ? "default" : "outline"}>
                  {eastDisplayPosition}
                </Badge>
                {gameState.dealer === eastGamePosition && gameState.phase === "bidding" && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">Dealer</Badge>
                )}
                {gameState.dummy === eastGamePosition && <Badge variant="secondary">Dummy</Badge>}
                {isRobot(eastPlayerName) && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">AI</Badge>
                )}
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
