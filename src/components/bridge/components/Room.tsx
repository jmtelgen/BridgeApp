import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, Plus, LogIn, RefreshCw } from "lucide-react"
import type { Theme } from "./ThemeSelector"
import { roomService } from "../../../services"
import { connectionService } from "../../../services/connectionService"
import { useUserStore } from "../../../stores/userStore"
import { useRoomDataStore } from "../../../stores/roomDataStore"

interface RoomManagerProps {
  theme: Theme
  onRoomJoined: (roomId: string, playerPosition: string) => void
}

export function RoomManager({ theme, onRoomJoined }: RoomManagerProps) {
  const { playerName: storedPlayerName, setPlayerName } = useUserStore()
  const { setCurrentRoom, setCurrentPlayerPosition } = useRoomDataStore()
  const [activeTab, setActiveTab] = useState<"create" | "join">("create")
  const [isLoading, setIsLoading] = useState(false)
  const [connectionCount, setConnectionCount] = useState<number>(0)
  const [activeUserCount, setActiveUserCount] = useState<number>(0)
  const [activeRoomCount, setActiveRoomCount] = useState<number>(0)
  const [isLoadingConnections, setIsLoadingConnections] = useState(true)

  // Create room form state
  const [roomName, setRoomName] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [playerName, setLocalPlayerName] = useState(storedPlayerName || "")

  // Join room form state
  const [roomId, setRoomId] = useState("")
  const [joinPlayerName, setJoinPlayerName] = useState(storedPlayerName || "")

  // Update stored player name when user finishes editing (on blur)
  const handlePlayerNameBlur = () => {
    if (playerName && playerName !== storedPlayerName) {
      setPlayerName(playerName)
    }
  }

  const handleJoinPlayerNameBlur = () => {
    if (joinPlayerName && joinPlayerName !== storedPlayerName) {
      setPlayerName(joinPlayerName)
    }
  }

  // Fetch connection count function
  const fetchConnectionCount = async () => {
    try {
      setIsLoadingConnections(true)
      const response = await connectionService.getConnectionCount()
      if (response.success && response.data) {
        setConnectionCount(response.data.totalConnections || 0)
        setActiveUserCount(response.data.activeUserCount || 0)
        setActiveRoomCount(response.data.activeRoomCount || 0)
      } else {
        // Handle API error response
        console.error('Failed to fetch connection count:', response.error)
      }
    } catch (error) {
      console.error('Failed to fetch connection count:', error)
    } finally {
      setIsLoadingConnections(false)
    }
  }

  // Fetch connection count on component mount
  useEffect(() => {
    fetchConnectionCount()
  }, [])

  // Auto-refresh connection count every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchConnectionCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const createRoom = async () => {
    if (!roomName.trim() || !playerName.trim()) {
      // Use the error store to show validation error
      const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
      showError("Please fill in all required fields")
      return
    }

    setIsLoading(true)

    try {
      // Update stored player name
      setPlayerName(playerName.trim())

      const response = await roomService.createRoom({
        roomName: roomName.trim(),
        isPrivate,
        maxPlayers: 4,
        playerName: playerName.trim(),
      })

      if (response.success && response.data) {
        const roomData = response.data.room // Access the nested room object
        
        // Store the room data
        setCurrentRoom(roomData)
        
        // Find the first available seat or assign South as default
        // The backend uses N,S,W,E seat keys
        const availableSeats = ["S", "N", "E", "W"]
        const fullSeatNames = ["South", "North", "East", "West"]
        
        let playerPosition = "South" // Default
        for (let i = 0; i < availableSeats.length; i++) {
          const seatKey = availableSeats[i]
          const fullName = fullSeatNames[i]
          if (!roomData.seats[seatKey]) {
            playerPosition = fullName
            break
          }
        }

        // Set the current player position
        setCurrentPlayerPosition(playerPosition)

        // Navigate to the room
        onRoomJoined(roomData.roomId, playerPosition)
      } else {
        // Handle API error response
        const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
        showError(response.error || "Failed to create room")
      }
    } catch (error) {
      console.error('Error creating room:', error)
      const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
      showError("Failed to create room. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const joinRoom = async () => {
    if (!roomId.trim() || !joinPlayerName.trim()) {
      // Use the error store to show validation error
      const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
      showError("Please fill in all required fields")
      return
    }

    setIsLoading(true)

    try {
      // Update stored player name
      setPlayerName(joinPlayerName.trim())

      const response = await roomService.joinRoom({
        playerName: joinPlayerName.trim(),
        roomId: roomId.trim(),
      })

      if (response.success && response.data) {
        const roomData = response.data.room
        
        // Store the room data
        setCurrentRoom(roomData)
        
        // Find which seat the current player is assigned to
        const seatMapping: Record<string, string> = {
          "N": "North",
          "S": "South", 
          "E": "East",
          "W": "West"
        }
        
        // Find the seat where the current player is assigned
        let playerPosition = "North" // Default fallback
        for (const [seatKey, playerName] of Object.entries(roomData.seats)) {
          if (playerName === joinPlayerName.trim()) {
            playerPosition = seatMapping[seatKey] || "North"
            break
          }
        }

        // Set the current player position
        setCurrentPlayerPosition(playerPosition)

        // Navigate to the room
        onRoomJoined(roomData.roomId, playerPosition)
      } else {
        // Handle API error response
        const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
        showError(response.error || "Failed to join room")
      }
    } catch (error) {
      console.error('Error joining room:', error)
      const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
      showError("Failed to join room. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const quickJoin = async () => {
    if (!playerName.trim()) {
      // Use the error store to show validation error
      const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
      showError("Please enter your player name")
      return
    }

    setIsLoading(true)

    try {
      // Update stored player name
      setPlayerName(playerName.trim())

      // For now, simulate quick join since we don't have a quick join endpoint
      // In a real implementation, you would call your quick join API endpoint
      const mockRoomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const mockRoomData: {
        roomId: string
        ownerId: string
        seats: Record<string, string>
        state: string
        gameData: any
      } = {
        roomId: mockRoomId,
        ownerId: "quick-join-owner",
        seats: { "E": playerName.trim() },
        state: "waiting",
        gameData: null
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // Find the first available seat or assign East as default
      // The backend uses N,S,W,E seat keys
      const availableSeats = ["S", "N", "E", "W"]
      const fullSeatNames = ["South", "North", "East", "West"]
      
      let playerPosition = "East" // Default
      for (let i = 0; i < availableSeats.length; i++) {
        const seatKey = availableSeats[i]
        const fullName = fullSeatNames[i]
        if (!mockRoomData.seats[seatKey]) {
          playerPosition = fullName
          break
        }
      }

      // Set the current player position
      setCurrentPlayerPosition(playerPosition)

      // Show success message
      const { showSuccess } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
      showSuccess("Quick joined room successfully!")

      // Navigate to the room
      onRoomJoined(mockRoomData.roomId, playerPosition)
    } catch (error) {
      console.error('Error quick joining:', error)
      const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
      showError("Failed to quick join. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`min-h-screen ${theme.colors.background} p-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-4xl font-bold mb-2 ${theme.colors.text}`}>Bridge Rooms</h1>
          <p className={`text-lg ${theme.colors.textMuted}`}>Create or join a bridge game room</p>
          
          {/* Active Users Display */}
          <div className="mt-4 flex justify-center items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <span className={`text-sm ${theme.colors.textMuted}`}>
              {isLoadingConnections ? (
                "Loading active users..."
              ) : (
                `${activeUserCount} active user${activeUserCount !== 1 ? 's' : ''} online`
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchConnectionCount}
              disabled={isLoadingConnections}
              className="p-1 h-auto"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingConnections ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className={`flex ${theme.colors.cardBackground} rounded-lg p-1 border ${theme.colors.border}`}>
            <Button
              variant={activeTab === "create" ? "default" : "ghost"}
              onClick={() => setActiveTab("create")}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Room
            </Button>
            <Button
              variant={activeTab === "join" ? "default" : "ghost"}
              onClick={() => setActiveTab("join")}
              className="flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Join Room
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {/* Error Display */}

        {/* Create Room Tab */}
        {activeTab === "create" && (
          <div className="max-w-md mx-auto">
            <Card className={`${theme.colors.cardBackground} border ${theme.colors.border}`}>
              <CardHeader>
                <CardTitle className={`text-center ${theme.colors.text}`}>Create New Room</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="playerName" className={theme.colors.text}>
                    Your Name
                  </Label>
                  <Input
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setLocalPlayerName(e.target.value)}
                    onBlur={handlePlayerNameBlur}
                    placeholder="Enter your name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="roomName" className={theme.colors.text}>
                    Room Name
                  </Label>
                  <Input
                    id="roomName"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Enter room name"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="isPrivate" className={theme.colors.text}>
                    Private Room
                  </Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={createRoom}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {isLoading ? "Creating..." : "Create Room"}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className={`w-full border-t ${theme.colors.border}`} />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className={`${theme.colors.background} px-2 ${theme.colors.textMuted}`}>Or</span>
                  </div>
                </div>

                <Button
                  onClick={quickJoin}
                  disabled={isLoading || !playerName.trim()}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 bg-transparent"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  {isLoading ? "Finding..." : "Quick Join Available Room"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Join Room Tab */}
        {activeTab === "join" && (
          <div className="max-w-md mx-auto">
            <Card className={`${theme.colors.cardBackground} border ${theme.colors.border}`}>
              <CardHeader>
                <CardTitle className={`text-center ${theme.colors.text}`}>Join Existing Room</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="joinPlayerName" className={theme.colors.text}>
                    Your Name
                  </Label>
                  <Input
                    id="joinPlayerName"
                    value={joinPlayerName}
                    onChange={(e) => setJoinPlayerName(e.target.value)}
                    onBlur={handleJoinPlayerNameBlur}
                    placeholder="Enter your name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="roomId" className={theme.colors.text}>
                    Room ID
                  </Label>
                  <Input
                    id="roomId"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter room ID"
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={joinRoom}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  {isLoading ? "Joining..." : "Join Room"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-8 max-w-4xl mx-auto">
          <Card className={`${theme.colors.cardBackground} border ${theme.colors.border}`}>
            <CardHeader>
              <CardTitle className={`text-lg ${theme.colors.text}`}>How to Create a Room</CardTitle>
            </CardHeader>
            <CardContent className={theme.colors.textMuted}>
              <ul className="space-y-2 text-sm">
                <li>• Enter your name and a room name</li>
                <li>• Choose if the room should be private</li>
                <li>• Share the room ID with friends to join</li>
                <li>• Or use Quick Join to find an available room</li>
              </ul>
            </CardContent>
          </Card>

          <Card className={`${theme.colors.cardBackground} border ${theme.colors.border}`}>
            <CardHeader>
              <CardTitle className={`text-lg ${theme.colors.text}`}>How to Join a Room</CardTitle>
            </CardHeader>
            <CardContent className={theme.colors.textMuted}>
              <ul className="space-y-2 text-sm">
                <li>• Get a room ID from a friend</li>
                <li>• Enter your name and the room ID</li>
                <li>• You'll be assigned a position automatically</li>
                <li>• Wait for other players to join</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Room Status */}
        <div className="text-center mt-8">
          <div className="flex justify-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Online Players: {isLoadingConnections ? "..." : activeUserCount}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Active Rooms: {isLoadingConnections ? "..." : activeRoomCount}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
