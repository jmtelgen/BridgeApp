import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "./components/Card"
import { PlayerHand } from "./components/PlayerHand"
import { BiddingArea } from "./components/BiddingArea"
import { PlayingArea } from "./components/PlayingArea"
import { GameCompleted } from "./components/GameCompleted"
import { useGameStore } from "../../stores/gameStore"
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

  const renderPlayerHand = (position: Position) => {
    const isCurrentPlayer = gameState.currentPlayer === position
    const isPlayerTurn = gameState.phase === "playing" && isCurrentPlayer
    const showCards = 
      position === "South" || 
      (gameState.phase === "playing" && gameState.dummy === position && gameState.firstCardPlayed)
    const isDummy = gameState.phase === "playing" && gameState.dummy === position
    
    // Check if South should control this hand
    // South can control their own hand when it's their turn
    // South can control dummy hand only when dummy is the current player AND South is the declarer
    const shouldSouthControl = 
      (position === "South" && gameState.currentPlayer === "South") || 
      (gameState.contract && gameState.contract.declarer === "South" && 
       gameState.dummy === position && gameState.currentPlayer === position)
    
    // Update isPlayerTurn to include dummy control by South
    const isPlayerTurnForControl = isPlayerTurn || 
      (gameState.contract && gameState.contract.declarer === "South" && 
       gameState.dummy === position && gameState.currentPlayer === position)

    // For East/West dummy hands, use column display
    const displayAsDummy = isDummy && (position === "East" || position === "West")

    return (
      <PlayerHand
        position={position}
        cards={gameState.hands[position]}
        isCurrentPlayer={isCurrentPlayer}
        isPlayerTurn={isPlayerTurnForControl!}
        showCards={showCards}
        isDummy={isDummy}
        selectedCard={selectedCard}
        currentTrickCard={gameState.currentTrick.cards[position]}
        onCardClick={shouldSouthControl ? handleCardClick : undefined}
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
              <Badge variant={gameState.currentPlayer === "West" ? "default" : "outline"}>West</Badge>
              {gameState.dealer === "West" && gameState.phase === "bidding" && (
                <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-800">Dealer</Badge>
              )}
              {gameState.dummy === "West" && <Badge variant="secondary" className="ml-1">Dummy</Badge>}
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
                <Badge variant={gameState.currentPlayer === "North" ? "default" : "outline"}>North</Badge>
                {gameState.dealer === "North" && gameState.phase === "bidding" && (
                  <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-800">Dealer</Badge>
                )}
                {gameState.dummy === "North" && <Badge variant="secondary" className="ml-1">Dummy</Badge>}
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
                <Badge variant={gameState.currentPlayer === "South" ? "default" : "outline"}>South (You)</Badge>
                {gameState.dealer === "South" && gameState.phase === "bidding" && (
                  <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-800">Dealer</Badge>
                )}
                {gameState.dummy === "South" && <Badge variant="secondary" className="ml-1">Dummy</Badge>}
              </div>
              <div className="flex justify-center">
                {renderPlayerHand("South")}
              </div>
            </div>
          </div>

          {/* East Player */}
          <div className="flex flex-col justify-center">
            <div className="text-center mb-2">
              <Badge variant={gameState.currentPlayer === "East" ? "default" : "outline"}>East</Badge>
              {gameState.dealer === "East" && gameState.phase === "bidding" && (
                <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-800">Dealer</Badge>
              )}
              {gameState.dummy === "East" && <Badge variant="secondary" className="ml-1">Dummy</Badge>}
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
