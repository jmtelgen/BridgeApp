import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { solveExample } from "./double-dummy-solver"

type Suit = "♠" | "♥" | "♦" | "♣"
type Rank = "A" | "K" | "Q" | "J" | "10" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2"
type Position = "North" | "South" | "East" | "West"
type GamePhase = "setup" | "bidding" | "playing" | "completed"
type BidType = "Pass" | "Double" | "Redouble" | "Bid"

interface PlayingCard {
  suit: Suit
  rank: Rank
  value: number // For sorting and comparison
}

interface Bid {
  level: number | "Pass" | "Double" | "Redouble"
  suit?: Suit | "NT"
  player: Position
  type: BidType
}

interface Trick {
  cards: Record<Position, PlayingCard | null>
  winner: Position | null
  ledSuit: Suit | null
}

interface GameState {
  phase: GamePhase
  currentPlayer: Position
  dealer: Position
  bids: Bid[]
  hands: Record<Position, PlayingCard[]>
  currentTrick: Trick
  tricks: Trick[]
  contract: {
    level: number
    suit: Suit | "NT"
    declarer: Position
    doubled: boolean
    redoubled: boolean
  } | null
  dummy: Position | null
  gameNumber: number
  vulnerability: {
    NS: boolean
    EW: boolean
  }
}

// Card values for sorting and comparison
const cardValues: Record<Rank, number> = {
  "A": 14, "K": 13, "Q": 12, "J": 11, "10": 10, "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2
}

// Create a full deck
const createDeck = (): PlayingCard[] => {
  const suits: Suit[] = ["♠", "♥", "♦", "♣"]
  const ranks: Rank[] = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"]
  const deck: PlayingCard[] = []
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: cardValues[rank] })
    }
  }
  
  return deck
}

// Shuffle deck using Fisher-Yates algorithm
const shuffleDeck = (deck: PlayingCard[]): PlayingCard[] => {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Deal cards to four players
const dealCards = (deck: PlayingCard[]): Record<Position, PlayingCard[]> => {
  const hands: Record<Position, PlayingCard[]> = {
    North: [],
    East: [],
    South: [],
    West: []
  }
  
  const positions: Position[] = ["North", "East", "South", "West"]
  
  for (let i = 0; i < deck.length; i++) {
    const position = positions[i % 4]
    hands[position].push(deck[i])
  }
  
  return hands
}

// Sort cards by suit and rank
const sortHand = (hand: PlayingCard[]): PlayingCard[] => {
  const suitOrder: Record<Suit, number> = { "♠": 0, "♥": 1, "♦": 2, "♣": 3 }
  
  return hand.sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit]
    }
    return b.value - a.value // Higher cards first
  })
}

// Sort cards for dummy display (lowest to highest in each suit)
const sortHandForDummy = (hand: PlayingCard[]): PlayingCard[] => {
  const suitOrder: Record<Suit, number> = { "♠": 0, "♥": 1, "♦": 2, "♣": 3 }
  
  return hand.sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit]
    }
    return a.value - b.value // Lower cards first (dummy convention)
  })
}

// Get next player in rotation
const getNextPlayer = (current: Position): Position => {
  const players: Position[] = ["North", "East", "South", "West"]
  const currentIndex = players.indexOf(current)
  return players[(currentIndex + 1) % 4]
}

// Check if a bid is valid
const isValidBid = (newBid: Bid, previousBids: Bid[]): boolean => {
  if (newBid.type === "Pass" || newBid.type === "Double" || newBid.type === "Redouble") {
    return true
  }
  
  if (newBid.type !== "Bid" || !newBid.level || !newBid.suit) {
    return false
  }
  
  // Find the highest previous bid
  let highestBid: Bid | null = null
  for (let i = previousBids.length - 1; i >= 0; i--) {
    if (previousBids[i].type === "Bid") {
      highestBid = previousBids[i]
      break
    }
  }
  
  if (!highestBid) {
    return true // First bid
  }
  
  const suitValues = { "♣": 1, "♦": 2, "♥": 3, "♠": 4, "NT": 5 }
  
  if (newBid.level > highestBid.level) {
    return true
  }
  
  if (newBid.level === highestBid.level) {
    return suitValues[newBid.suit!] > suitValues[highestBid.suit!]
  }
  
  return false
}

  // Determine contract and declarer
  const determineContract = (bids: Bid[]): { level: number; suit: Suit | "NT"; declarer: Position; doubled: boolean; redoubled: boolean } | null => {
    let highestBid: Bid | null = null
    let declarer: Position | null = null
    let doubled = false
    let redoubled = false
    
    // Check for doubles and redoubles
    for (let i = bids.length - 1; i >= 0; i--) {
      if (bids[i].type === "Redouble") {
        redoubled = true
        break
      } else if (bids[i].type === "Double") {
        doubled = true
        break
      }
    }
    
    for (let i = bids.length - 1; i >= 0; i--) {
      if (bids[i].type === "Bid") {
        highestBid = bids[i]
        declarer = bids[i].player
        break
      }
    }
    
    if (!highestBid || !declarer) {
      return null
    }
    
    return {
      level: highestBid.level as number,
      suit: highestBid.suit!,
      declarer,
      doubled,
      redoubled
    }
  }

// Check if bidding is complete
const isBiddingComplete = (bids: Bid[]): boolean => {
  if (bids.length < 4) return false
  
  // Check if we have 3 consecutive passes after a bid
  let consecutivePasses = 0
  for (let i = bids.length - 1; i >= 0; i--) {
    if (bids[i].type === "Pass") {
      consecutivePasses++
    } else {
      break
    }
  }
  
  return consecutivePasses >= 3
}

// Check if a card can be played
const canPlayCard = (card: PlayingCard, hand: PlayingCard[], ledSuit: Suit | null): boolean => {
  if (!ledSuit) return true // First card of trick
  
  // If player has cards in led suit, must follow suit
  const hasLedSuit = hand.some(c => c.suit === ledSuit)
  if (hasLedSuit) {
    return card.suit === ledSuit
  }
  
  return true // Can play any card if not following suit
}

// Determine trick winner
const determineTrickWinner = (trick: Trick, trumpSuit: Suit | "NT"): Position => {
  const cards = Object.entries(trick.cards).filter(([_, card]) => card !== null) as [Position, PlayingCard][]
  if (cards.length === 0) return "North" // Shouldn't happen
  
  let winner = cards[0]
  const ledSuit = trick.ledSuit!
  
  for (const [position, card] of cards) {
    if (trumpSuit !== "NT") {
      // Trump suit wins
      if (card.suit === trumpSuit && winner[1].suit !== trumpSuit) {
        winner = [position, card]
      } else if (card.suit === trumpSuit && winner[1].suit === trumpSuit) {
        if (card.value > winner[1].value) {
          winner = [position, card]
        }
      } else if (card.suit === ledSuit && winner[1].suit !== trumpSuit) {
        if (card.value > winner[1].value) {
          winner = [position, card]
        }
      }
    } else {
      // No trump, follow led suit
      if (card.suit === ledSuit && winner[1].suit !== ledSuit) {
        winner = [position, card]
      } else if (card.suit === ledSuit && winner[1].suit === ledSuit) {
        if (card.value > winner[1].value) {
          winner = [position, card]
        }
      }
    }
  }
  
  return winner[0]
}

// Initialize new game
const initializeGame = (): GameState => {
  const deck = shuffleDeck(createDeck())
  const hands = dealCards(deck)
  
  // Sort all hands
  for (const position of ["North", "East", "South", "West"] as Position[]) {
    hands[position] = sortHand(hands[position])
  }
  
  const dealer: Position = "North" // Start with North as dealer
  const firstBidder: Position = "East" // First bid is always East (left of dealer)
  
  return {
    phase: "bidding",
    currentPlayer: firstBidder,
    dealer,
    bids: [],
    hands,
    currentTrick: {
      cards: { North: null, East: null, South: null, West: null },
      winner: null,
      ledSuit: null
    },
    tricks: [],
    contract: null,
    dummy: null,
    gameNumber: 1,
    vulnerability: { NS: false, EW: false }
  }
}

export default function BridgeGame() {
  const [gameState, setGameState] = useState<GameState>(initializeGame)
  const [selectedCard, setSelectedCard] = useState<PlayingCard | null>(null)
  const [selectedBidLevel, setSelectedBidLevel] = useState<number | null>(null)
  const [selectedBidSuit, setSelectedBidSuit] = useState<Suit | "NT" | null>(null)



  // Start new game
  const startNewGame = () => {
    setGameState(initializeGame())
    setSelectedCard(null)
    setSelectedBidLevel(null)
    setSelectedBidSuit(null)
  }

  // Make a bid
  const makeBid = (type: BidType, level?: number, suit?: Suit | "NT") => {
    if (gameState.phase !== "bidding") return
    
    const newBid: Bid = {
      level: type === "Bid" ? level! : type,
      suit: type === "Bid" ? suit : undefined,
      player: gameState.currentPlayer,
      type
    }
    
    if (!isValidBid(newBid, gameState.bids)) {
      return // Invalid bid
    }
    
    const newBids = [...gameState.bids, newBid]
    const nextPlayer = getNextPlayer(gameState.currentPlayer)
    
    if (isBiddingComplete(newBids)) {
      // Bidding is complete, determine contract
      const contract = determineContract(newBids)
      if (contract) {
        const dummy = getNextPlayer(contract.declarer)
        setGameState(prev => ({
          ...prev,
          phase: "playing",
          currentPlayer: getNextPlayer(contract.declarer), // First lead is after declarer
          bids: newBids,
          contract,
          dummy
        }))
      } else {
        // All passed, start new game
        startNewGame()
      }
    } else {
      setGameState(prev => ({
        ...prev,
        currentPlayer: nextPlayer,
        bids: newBids
      }))
    }
    
    setSelectedBidLevel(null)
    setSelectedBidSuit(null)
  }

  // Play a card
  const playCard = (card: PlayingCard) => {
    if (gameState.phase !== "playing") return
    
    const currentHand = gameState.hands[gameState.currentPlayer]
    if (!canPlayCard(card, currentHand, gameState.currentTrick.ledSuit)) {
      return // Invalid play
    }
    
    // Remove card from hand
    const newHands = { ...gameState.hands }
    newHands[gameState.currentPlayer] = currentHand.filter(c => 
      c.suit !== card.suit || c.rank !== card.rank
    )
    
    // Add card to current trick
    const newCurrentTrick = { ...gameState.currentTrick }
    newCurrentTrick.cards[gameState.currentPlayer] = card
    
    if (!newCurrentTrick.ledSuit) {
      newCurrentTrick.ledSuit = card.suit
    }
    
    const nextPlayer = getNextPlayer(gameState.currentPlayer)
    
    if (nextPlayer === gameState.currentPlayer || 
        Object.values(newCurrentTrick.cards).every(c => c !== null)) {
      // Trick is complete
      const winner = determineTrickWinner(newCurrentTrick, gameState.contract!.suit)
      const newTricks = [...gameState.tricks, { ...newCurrentTrick, winner }]
      
      // Check if game is complete
      if (newTricks.length === 13) {
        setGameState(prev => ({
          ...prev,
          phase: "completed",
          currentTrick: newCurrentTrick,
          tricks: newTricks
        }))
      } else {
        // Start new trick
        setGameState(prev => ({
          ...prev,
          currentPlayer: winner,
          hands: newHands,
          currentTrick: {
            cards: { North: null, East: null, South: null, West: null },
            winner: null,
            ledSuit: null
          },
          tricks: newTricks
        }))
      }
    } else {
      setGameState(prev => ({
        ...prev,
        currentPlayer: nextPlayer,
        hands: newHands,
        currentTrick: newCurrentTrick
      }))
    }
    
    setSelectedCard(null)
  }

  const getSuitColor = (suit: Suit) => {
    return suit === "♥" || suit === "♦" ? "text-red-600" : "text-black"
  }

  const renderCard = (card: PlayingCard, isClickable = false, isSelected = false, isPlayed = false) => (
    <div
      className={`
        bg-white border border-gray-300 rounded-lg p-2 min-w-[40px] h-[60px] flex flex-col items-center justify-center text-sm font-semibold shadow-sm
        ${isClickable ? "cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all" : ""}
        ${isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""}
        ${isPlayed ? "ring-2 ring-green-500 bg-green-50" : ""}
      `}
      onClick={isClickable ? () => {
        if (gameState.phase === "playing") {
          playCard(card)
        } else {
          setSelectedCard(isSelected ? null : card)
        }
      } : undefined}
    >
      <span className={getSuitColor(card.suit)}>{card.rank}</span>
      <span className={`${getSuitColor(card.suit)} text-lg`}>{card.suit}</span>
    </div>
  )

  const renderPlayerHand = (position: Position, cards: PlayingCard[]) => {
    const isCurrentPlayer = gameState.currentPlayer === position
    const isPlayerTurn = gameState.phase === "playing" && isCurrentPlayer
    const showCards = 
      position === "South" || 
      (gameState.phase === "playing" && gameState.dummy === position)
    const isDummy = gameState.phase === "playing" && gameState.dummy === position

    if (!showCards && cards.length > 0) {
      return (
        <div className="flex gap-1">
          {Array.from({ length: cards.length }).map((_, i) => (
            <div key={i} className="bg-blue-900 border border-blue-800 rounded-lg w-[40px] h-[60px] shadow-sm" />
          ))}
        </div>
      )
    }

    // For dummy, display cards in columns by suit
    if (isDummy) {
      const sortedCards = sortHandForDummy(cards)
      const cardsBySuit: Record<Suit, PlayingCard[]> = {
        "♠": [],
        "♥": [],
        "♦": [],
        "♣": []
      }
      
      sortedCards.forEach(card => {
        cardsBySuit[card.suit].push(card)
      })

      return (
        <div className="flex gap-2">
          {(["♠", "♥", "♦", "♣"] as Suit[]).map(suit => (
            <div key={suit} className="flex flex-col gap-1">
              {cardsBySuit[suit].map((card, index) =>
                renderCard(
                  card,
                  false, // Dummy cards are not clickable
                  false,
                  gameState.currentTrick.cards[position]?.suit === card.suit && 
                  gameState.currentTrick.cards[position]?.rank === card.rank
                )
              )}
            </div>
          ))}
        </div>
      )
    }

    // For regular hands, display in a row
    return (
      <div className="flex gap-1 flex-wrap">
        {cards.map((card, index) =>
          renderCard(
            card, 
            isPlayerTurn, 
            selectedCard?.suit === card.suit && selectedCard?.rank === card.rank,
            gameState.currentTrick.cards[position]?.suit === card.suit && 
            gameState.currentTrick.cards[position]?.rank === card.rank
          ),
        )}
      </div>
    )
  }

  const renderBiddingArea = () => (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h3 className="font-semibold mb-3 text-center">Bidding</h3>

      {/* Bidding History */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-sm">
        <div className="font-semibold text-center">North</div>
        <div className="font-semibold text-center">East</div>
        <div className="font-semibold text-center">South</div>
        <div className="font-semibold text-center">West</div>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => console.log(solveExample())}
            >
              Solve
            </Button>
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
                      makeBid("Bid", selectedBidLevel, suit)
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
              onClick={() => makeBid("Pass")}
            >
              Pass
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => makeBid("Double")}
            >
              Double
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => makeBid("Redouble")}
            >
              Redouble
            </Button>
          </div>
        </div>
      )}

      {/* AI players will bid automatically */}
      {gameState.currentPlayer !== "South" && gameState.phase === "bidding" && (
        <div className="text-center text-sm text-gray-600">
          {gameState.currentPlayer} is thinking...
          <br />
          <span className="text-xs">(AI will bid automatically)</span>
        </div>
      )}
    </div>
  )

  const renderPlayingArea = () => (
    <div className="bg-green-100 rounded-lg p-8 shadow-sm border relative">
      <div className="absolute top-2 left-2">
        <Badge variant="secondary">Trick {gameState.tricks.length + 1}</Badge>
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
        {/* North card */}
        <div></div>
        <div className="flex justify-center">
          {gameState.currentTrick.cards.North && renderCard(gameState.currentTrick.cards.North, false, false, true)}
        </div>
        <div></div>

        {/* West and East cards */}
        <div className="flex justify-center items-center">
          {gameState.currentTrick.cards.West && renderCard(gameState.currentTrick.cards.West, false, false, true)}
        </div>
        <div></div>
        <div className="flex justify-center items-center">
          {gameState.currentTrick.cards.East && renderCard(gameState.currentTrick.cards.East, false, false, true)}
        </div>

        {/* South card */}
        <div></div>
        <div className="flex justify-center">
          {gameState.currentTrick.cards.South && renderCard(gameState.currentTrick.cards.South, false, false, true)}
        </div>
        <div></div>
      </div>

      {/* Dummy indicator */}
      {gameState.dummy && (
        <div className="absolute bottom-2 left-2">
          <Badge variant="outline">Dummy: {gameState.dummy}</Badge>
        </div>
      )}
    </div>
  )

  const renderCompletedGame = () => (
    <div className="bg-white rounded-lg p-8 shadow-sm border text-center">
      <h3 className="text-2xl font-bold mb-4">Game Complete!</h3>
      <div className="space-y-2">
        <p>Contract: {gameState.contract?.level}{gameState.contract?.suit} by {gameState.contract?.declarer}</p>
        <p>Tricks taken: {gameState.tricks.length}</p>
        <Button onClick={startNewGame} className="mt-4">
          Start New Game
        </Button>
      </div>
    </div>
  )

  // Auto-play for AI players
  useEffect(() => {
    if (gameState.phase === "bidding" && gameState.currentPlayer !== "South") {
      // Simple AI bidding - just pass for now
      const timer = setTimeout(() => {
        makeBid("Pass")
      }, 1000)
      return () => clearTimeout(timer)
    } else if (gameState.phase === "playing" && gameState.currentPlayer !== "South") {
      // Simple AI playing - play first valid card
      const timer = setTimeout(() => {
        const hand = gameState.hands[gameState.currentPlayer]
        const validCards = hand.filter(card => 
          canPlayCard(card, hand, gameState.currentTrick.ledSuit)
        )
        if (validCards.length > 0) {
          playCard(validCards[0])
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [gameState.currentPlayer, gameState.phase])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Bridge Game</h1>
          <div className="flex gap-2">
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
          </div>
        </div>

        {/* Game Layout */}
        <div className="grid grid-cols-5 gap-4 h-[600px]">
          {/* West Player */}
          <div className="flex flex-col justify-center">
            <div className="text-center mb-2">
              <Badge variant={gameState.currentPlayer === "West" ? "default" : "outline"}>West</Badge>
              {gameState.dummy === "West" && <Badge variant="secondary" className="ml-1">Dummy</Badge>}
            </div>
            <div className="transform -rotate-90 origin-center">{renderPlayerHand("West", gameState.hands.West)}</div>
          </div>

          {/* Center Column */}
          <div className="col-span-3 flex flex-col">
            {/* North Player */}
            <div className="mb-4">
              <div className="text-center mb-2">
                <Badge variant={gameState.currentPlayer === "North" ? "default" : "outline"}>North</Badge>
                {gameState.dummy === "North" && <Badge variant="secondary" className="ml-1">Dummy</Badge>}
              </div>
              <div className="flex justify-center">{renderPlayerHand("North", gameState.hands.North)}</div>
            </div>

            {/* Center Playing/Bidding Area */}
            <div className="flex-1 flex items-center justify-center">
              {gameState.phase === "bidding" && renderBiddingArea()}
              {gameState.phase === "playing" && renderPlayingArea()}
              {gameState.phase === "completed" && renderCompletedGame()}
            </div>

            {/* South Player */}
            <div className="mt-4">
              <div className="text-center mb-2">
                <Badge variant={gameState.currentPlayer === "South" ? "default" : "outline"}>South (You)</Badge>
                {gameState.dummy === "South" && <Badge variant="secondary" className="ml-1">Dummy</Badge>}
              </div>
              <div className="flex justify-center">{renderPlayerHand("South", gameState.hands.South)}</div>
            </div>
          </div>

          {/* East Player */}
          <div className="flex flex-col justify-center">
            <div className="text-center mb-2">
              <Badge variant={gameState.currentPlayer === "East" ? "default" : "outline"}>East</Badge>
              {gameState.dummy === "East" && <Badge variant="secondary" className="ml-1">Dummy</Badge>}
            </div>
            <div className="transform rotate-90 origin-center">{renderPlayerHand("East", gameState.hands.East)}</div>
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
        </div>
      </div>
    </div>
  )
}
