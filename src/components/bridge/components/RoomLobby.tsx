import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, Bot, User, Play, RefreshCw, ArrowLeft, Share2 } from "lucide-react"
import { useRoomDataStore } from "../../../stores/roomDataStore"
import { useUserStore } from "../../../stores/userStore"
import { roomWebSocketService } from "../../../services/websocketService"

interface RoomLobbyProps {
  onStartGame: () => void
  onLeaveRoom: () => void
}

export function RoomLobby({ onStartGame, onLeaveRoom }: RoomLobbyProps) {
  const { currentRoom, isRobot } = useRoomDataStore()
  const { playerName } = useUserStore()
  const [isStarting, setIsStarting] = useState(false)

  // Listen for roomStarted events from WebSocket
  useEffect(() => {
    const handleStartRoom = (event: CustomEvent) => {
      onStartGame()
    }

    window.addEventListener('roomStarted', handleStartRoom as EventListener)

    return () => {
      window.removeEventListener('roomStarted', handleStartRoom as EventListener)
    }
  }, [onStartGame])

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Room Not Found</h2>
          <p className="text-gray-600 mb-4">The room data could not be loaded.</p>
          <Button onClick={onLeaveRoom} variant="outline">
            Back to Rooms
          </Button>
        </div>
      </div>
    )
  }

  const seats = currentRoom.seats
  const isOwner = currentRoom.ownerId === useUserStore.getState().userId
  const occupiedSeats = Object.keys(seats).filter(seat => seats[seat])
  const isReadyToStart = occupiedSeats.length >= 2 // Minimum 2 players to start

  const handleStartGame = async () => {
    setIsStarting(true)
    
    try {
      // Send start room message via WebSocket
      const userId = useUserStore.getState().userId
      
      if (!currentRoom?.roomId || !userId) {
        throw new Error('Missing room ID or user ID')
      }
      
      await roomWebSocketService.startRoom(currentRoom.roomId, userId)
      
      // The roomStarted event will be handled by the WebSocket message handler
      // which will automatically call onStartGame()
      
    } catch (error) {
      console.error('Failed to start room:', error)
      setIsStarting(false)
      // Show error to user
      const { showError } = await import('../../../stores/errorStore').then(m => m.useErrorStore.getState())
      showError('Failed to start the game. Please try again.')
    }
  }

  const isCurrentPlayer = (seatPlayerName: string) => {
    return seatPlayerName === playerName
  }

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/room/${currentRoom.roomId}`
    navigator.clipboard.writeText(shareUrl)
    // Could add toast notification here
  }

  const getPlayerInitial = (playerName: string) => {
    return playerName ? playerName.charAt(0).toUpperCase() : "?"
  }

  const getPlayerColor = (seat: string) => {
    // Server now returns full position names, so we can use the seat directly
    if (seat === 'North' || seat === 'South' || seat === 'East' || seat === 'West') {
      const colors: Record<string, string> = {
        "North": "from-blue-500 to-blue-600",
        "South": "from-emerald-500 to-emerald-600",
        "East": "from-pink-500 to-pink-600",
        "West": "from-purple-500 to-purple-600"
      }
      return colors[seat] || "from-gray-500 to-gray-600"
    }
    // Fallback for any abbreviated format
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

      <div className="fixed inset-0 z-20 pointer-events-none">
        {/* North Player - Top */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 rotate-180 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              {seats["N"] ? (
                <>
                  <div className={`w-8 h-8 bg-gradient-to-br ${getPlayerColor("N")} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                    {isRobot(seats["N"]) ? "🤖" : getPlayerInitial(seats["N"])}
                  </div>
                  <span className="font-semibold text-gray-800">
                    {isCurrentPlayer(seats["N"]) ? "You" : seats["N"]}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    ?
                  </div>
                  <span className="font-semibold text-gray-600">Empty</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* West Player - Left */}
        <div className="absolute left-8 top-1/2 transform -translate-y-1/2 rotate-90 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              {seats["W"] ? (
                <>
                  <div className={`w-8 h-8 bg-gradient-to-br ${getPlayerColor("W")} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                    {isRobot(seats["W"]) ? "🤖" : getPlayerInitial(seats["W"])}
                  </div>
                  <span className="font-semibold text-gray-800">
                    {isCurrentPlayer(seats["W"]) ? "You" : seats["W"]}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    ?
                  </div>
                  <span className="font-semibold text-gray-600">Empty</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* East Player - Right */}
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 -rotate-90 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              {seats["E"] ? (
                <>
                  <div className={`w-8 h-8 bg-gradient-to-br ${getPlayerColor("E")} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                    {isRobot(seats["E"]) ? "🤖" : getPlayerInitial(seats["E"])}
                  </div>
                  <span className="font-semibold text-gray-800">
                    {isCurrentPlayer(seats["E"]) ? "You" : seats["E"]}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    ?
                  </div>
                  <span className="font-semibold text-gray-600">Empty</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* South Player - Bottom (You) */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              {seats["S"] ? (
                <>
                  <div className={`w-8 h-8 bg-gradient-to-br ${getPlayerColor("S")} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                    {isRobot(seats["S"]) ? "🤖" : getPlayerInitial(seats["S"])}
                  </div>
                  <span className="font-semibold text-gray-800">
                    {isCurrentPlayer(seats["S"]) ? "You" : seats["S"]}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    ?
                  </div>
                  <span className="font-semibold text-gray-600">Empty</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="bg-white rounded-lg shadow-xl p-4 min-w-[200px]">
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Room Code</div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-lg text-gray-800">{currentRoom.roomId}</span>
                <button
                  onClick={handleShare}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Copy share link"
                >
                  <Share2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Room Name</div>
              <div className="font-semibold text-gray-800">{currentRoom.roomName}</div>
              <div className="mt-2">
                <Badge variant={currentRoom.isPrivate ? "destructive" : "outline"}>
                  {currentRoom.isPrivate ? "Private Room" : "Public Room"}
                </Badge>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Players</div>
              <div className="font-semibold text-gray-800">{occupiedSeats.length}/4 players joined</div>
            </div>

            <div className="flex flex-col gap-3">
              <button className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <Users className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-800">Invite Friends</span>
              </button>

              <button 
                onClick={onLeaveRoom}
                className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-800">Leave Game</span>
              </button>

              {isOwner && (
                <button 
                  onClick={handleStartGame}
                  disabled={!isReadyToStart || isStarting}
                  className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStarting ? (
                    <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5 text-green-600" />
                  )}
                  <span className="font-medium text-gray-800">
                    {isStarting ? "Starting..." : "Start Game"}
                  </span>
                </button>
              )}

              {!isOwner && (
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                    <span className="font-medium text-gray-600">Waiting for host to start...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full h-screen">{/* Future components will go here */}</div>
    </main>
  )
}
