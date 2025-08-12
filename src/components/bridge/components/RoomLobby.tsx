import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, Bot, User, Play, RefreshCw } from "lucide-react"
import { useRoomDataStore } from "../../../stores/roomDataStore"
import { useUserStore } from "../../../stores/userStore"

interface RoomLobbyProps {
  onStartGame: () => void
  onLeaveRoom: () => void
}

export function RoomLobby({ onStartGame, onLeaveRoom }: RoomLobbyProps) {
  const { currentRoom, isRobot } = useRoomDataStore()
  const { playerName } = useUserStore()
  const [isStarting, setIsStarting] = useState(false)

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
    // Add a small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 1000))
    onStartGame()
  }

  const getSeatDisplayName = (seat: string) => {
    const seatNames: Record<string, string> = {
      "N": "North",
      "S": "South", 
      "E": "East",
      "W": "West"
    }
    return seatNames[seat] || seat
  }



  const isCurrentPlayer = (seatPlayerName: string) => {
    return seatPlayerName === playerName
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{currentRoom.roomName}</h1>
          <p className="text-lg text-gray-600">Room ID: {currentRoom.roomId}</p>
          <div className="mt-2">
            <Badge variant={currentRoom.isPrivate ? "destructive" : "outline"}>
              {currentRoom.isPrivate ? "Private Room" : "Public Room"}
            </Badge>
          </div>
        </div>

        {/* Seat Layout */}
        <div className="grid grid-cols-5 gap-4 h-[400px] mb-8">
          {/* West Player */}
          <div className="flex flex-col justify-center">
            <Card className="text-center p-4">
              <div className="mb-2">
                {seats["W"] ? (
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {isRobot(seats["W"]) ? (
                      <Bot className="w-5 h-5 text-blue-600" />
                    ) : (
                      <User className="w-5 h-5 text-green-600" />
                    )}
                    <Badge variant={isCurrentPlayer(seats["W"]) ? "default" : "outline"}>
                      {isCurrentPlayer(seats["W"]) ? "You" : seats["W"]}
                    </Badge>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Empty</p>
                  </div>
                )}
              </div>
              <Badge variant="secondary">West</Badge>
            </Card>
          </div>

          {/* Center Column */}
          <div className="col-span-3 flex flex-col">
            {/* North Player */}
            <div className="mb-4">
              <Card className="text-center p-4">
                <div className="mb-2">
                  {seats["N"] ? (
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {isRobot(seats["N"]) ? (
                        <Bot className="w-5 h-5 text-blue-600" />
                      ) : (
                        <User className="w-5 h-5 text-green-600" />
                      )}
                      <Badge variant={isCurrentPlayer(seats["N"]) ? "default" : "outline"}>
                        {isCurrentPlayer(seats["N"]) ? "You" : seats["N"]}
                      </Badge>
                    </div>
                  ) : (
                    <div className="text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Empty</p>
                    </div>
                  )}
                </div>
                <Badge variant="secondary">North</Badge>
              </Card>
            </div>

            {/* Center Area */}
            <div className="flex-1 flex items-center justify-center">
              <Card className="p-6 text-center">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Waiting for Players</h3>
                  <p className="text-gray-600">
                    {occupiedSeats.length}/4 players joined
                  </p>
                </div>
                
                {isOwner && (
                  <Button 
                    onClick={handleStartGame}
                    disabled={!isReadyToStart || isStarting}
                    className="flex items-center gap-2"
                  >
                    {isStarting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {isStarting ? "Starting..." : "Start Game"}
                  </Button>
                )}
                
                {!isOwner && (
                  <p className="text-sm text-gray-500">
                    Waiting for host to start the game...
                  </p>
                )}
              </Card>
            </div>

            {/* South Player */}
            <div className="mt-4">
              <Card className="text-center p-4">
                <div className="mb-2">
                  {seats["S"] ? (
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {isRobot(seats["S"]) ? (
                        <Bot className="w-5 h-5 text-blue-600" />
                      ) : (
                        <User className="w-5 h-5 text-green-600" />
                      )}
                      <Badge variant={isCurrentPlayer(seats["S"]) ? "default" : "outline"}>
                        {isCurrentPlayer(seats["S"]) ? "You" : seats["S"]}
                      </Badge>
                    </div>
                  ) : (
                    <div className="text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Empty</p>
                    </div>
                  )}
                </div>
                <Badge variant="secondary">South</Badge>
              </Card>
            </div>
          </div>

          {/* East Player */}
          <div className="flex flex-col justify-center">
            <Card className="text-center p-4">
              <div className="mb-2">
                {seats["E"] ? (
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {isRobot(seats["E"]) ? (
                      <Bot className="w-5 h-5 text-blue-600" />
                    ) : (
                      <User className="w-5 h-5 text-green-600" />
                    )}
                    <Badge variant={isCurrentPlayer(seats["E"]) ? "default" : "outline"}>
                      {isCurrentPlayer(seats["E"]) ? "You" : seats["E"]}
                    </Badge>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Empty</p>
                  </div>
                )}
              </div>
              <Badge variant="secondary">East</Badge>
            </Card>
          </div>
        </div>

        {/* Legend */}
        <div className="text-center mb-6">
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Human Player</span>
            </div>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600">AI/Robot</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button onClick={onLeaveRoom} variant="outline">
            Leave Room
          </Button>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          {isOwner && (
            <Button 
              onClick={handleStartGame}
              disabled={!isReadyToStart || isStarting}
              className="flex items-center gap-2"
            >
              {isStarting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isStarting ? "Starting..." : "Start Game"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
