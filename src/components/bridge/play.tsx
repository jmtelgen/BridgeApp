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
    if (!currentPlayerPosition) return gamePosition
    
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
    if (!currentPlayerPosition) return displayPosition
    
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
    const playerName = getPlayerName(seatKey)
    

    
    // The backend uses N,S,W,E, so we should get the player name directly
    // If no player name found, it might be an empty seat
    return playerName || `Empty ${gamePosition}`
  }

  const renderPlayerHand = (displayPosition: Position) => {
    // Get the actual game position for this display position
    const gamePosition = getGamePosition(displayPosition)
    
    const isCurrentPlayer = gameState.currentPlayer === gamePosition
    const isPlayerTurn = gameState.phase === "playing" && isCurrentPlayer
    const showCards = 
      displayPosition === "South" || 
      (gameState.phase === "playing" && gameState.dummy === gamePosition && gameState.firstCardPlayed)
    const isDummy = gameState.phase === "playing" && gameState.dummy === gamePosition
    
    // Check if the current player should control this hand
    // Current player can control their own hand when it's their turn
    // Current player can control dummy hand only when dummy is the current player AND current player is the declarer
    const shouldCurrentPlayerControl = 
      (displayPosition === "South" && gameState.currentPlayer === gamePosition) || 
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
        currentTrickCard={gameState.currentTrick.cards[gamePosition]}
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
                gameState.currentPlayer === "North" || gameState.currentPlayer === "South" ? "default" : "secondary"
              }
            >
              {gameState.currentPlayer} to {gameState.phase === "bidding" ? "bid" : "play"}
            </Badge>
            {gameState.phase === "bidding" && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Dealer: {gameState.dealer}
              </Badge>
            )}
          </div>
        </div>

        {/* Game Layout */}
        <div className="grid grid-cols-5 gap-4 h-[600px]">
          {/* West Player */}
          <div className="flex flex-col justify-center">
            <div className="text-center mb-2">
              <div className="text-sm font-medium text-gray-700 mb-1">
                {getPlayerNameForPosition(getGamePosition("West"))}
                {getGamePosition("West") === getCurrentPlayerPosition() && " (You)"}
              </div>
              <Badge variant={gameState.currentPlayer === getGamePosition("West") ? "default" : "outline"}>
                {getDisplayPosition(getGamePosition("West"))}
              </Badge>
              {gameState.dealer === getGamePosition("West") && gameState.phase === "bidding" && (
                <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-800">Dealer</Badge>
              )}
              {gameState.dummy === getGamePosition("West") && <Badge variant="secondary" className="ml-1">Dummy</Badge>}
              {isRobot(getPlayerNameForPosition(getGamePosition("West"))) && (
                <Badge variant="outline" className="ml-1 bg-blue-50 text-blue-700">AI</Badge>
              )}
            </div>
            <div className="transform -rotate-90 origin-center">
              {renderPlayerHand("West")}
            </div>
          </div>

          {/* Center Column */}
          <div className="col-span-3 flex flex-col">
            {/* North Player */}
            <div className="mb-4">
              <div className="text-center mb-2">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {getPlayerNameForPosition(getGamePosition("North"))}
                  {getGamePosition("North") === getCurrentPlayerPosition() && " (You)"}
                </div>
                <Badge variant={gameState.currentPlayer === getGamePosition("North") ? "default" : "outline"}>
                  {getDisplayPosition(getGamePosition("North"))}
                </Badge>
                {gameState.dealer === getGamePosition("North") && gameState.phase === "bidding" && (
                  <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-800">Dealer</Badge>
                )}
                {gameState.dummy === getGamePosition("North") && <Badge variant="secondary" className="ml-1">Dummy</Badge>}
                {isRobot(getPlayerNameForPosition(getGamePosition("North"))) && (
                  <Badge variant="outline" className="ml-1 bg-blue-50 text-blue-700">AI</Badge>
                )}
              </div>
              <div className="flex justify-center">
                {renderPlayerHand("North")}
              </div>
            </div>

            {/* Center Playing/Bidding Area */}
            <div className="flex-1 flex items-center justify-center">
              {gameState.phase === "bidding" && (
                <BiddingArea
                  gameState={gameState}
                  onMakeBid={makeBid}
                  aiThinking={aiThinking}
                />
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
              <div className="text-center mb-2">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {getPlayerNameForPosition(getGamePosition("South"))}
                  {getGamePosition("South") === getCurrentPlayerPosition() && " (You)"}
                </div>
                <Badge variant={gameState.currentPlayer === getGamePosition("South") ? "default" : "outline"}>
                  {getDisplayPosition(getGamePosition("South"))}
                </Badge>
                {gameState.dealer === getGamePosition("South") && gameState.phase === "bidding" && (
                  <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-800">Dealer</Badge>
                )}
                {gameState.dummy === getGamePosition("South") && <Badge variant="secondary" className="ml-1">Dummy</Badge>}
                {isRobot(getPlayerNameForPosition(getGamePosition("South"))) && (
                  <Badge variant="outline" className="ml-1 bg-blue-50 text-blue-700">AI</Badge>
                )}
              </div>
              <div className="flex justify-center">
                {renderPlayerHand("South")}
              </div>
            </div>
          </div>

          {/* East Player */}
          <div className="flex flex-col justify-center">
            <div className="text-center mb-2">
              <div className="text-sm font-medium text-gray-700 mb-1">
                {getPlayerNameForPosition(getGamePosition("East"))}
                {getGamePosition("East") === getCurrentPlayerPosition() && " (You)"}
              </div>
              <Badge variant={gameState.currentPlayer === getGamePosition("East") ? "default" : "outline"}>
                {getDisplayPosition(getGamePosition("East"))}
              </Badge>
              {gameState.dealer === getGamePosition("East") && gameState.phase === "bidding" && (
                <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-800">Dealer</Badge>
              )}
              {gameState.dummy === getGamePosition("East") && <Badge variant="secondary" className="ml-1">Dummy</Badge>}
              {isRobot(getPlayerNameForPosition(getGamePosition("East"))) && (
                <Badge variant="outline" className="ml-1 bg-blue-50 text-blue-700">AI</Badge>
              )}
            </div>
            <div className="transform rotate-90 origin-center">
              {renderPlayerHand("East")}
            </div>
          </div>
        </div>

        {/* Game Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
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
