import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, LogIn, UserPlus, DoorOpen, RefreshCw, Settings, Crown, Loader } from "lucide-react"
import { roomService } from "../../../services"
import { connectionService } from "../../../services/connectionService"
import { useUserStore } from "../../../stores/userStore"
import { useRoomDataStore } from "../../../stores/roomDataStore"
import { Position } from "../types"
import { useGameStore } from "../../../stores/gameStore"

interface RoomManagerProps {
  onRoomJoined: (roomId: string, playerPosition: Position) => void
}

export function RoomManager({ onRoomJoined }: RoomManagerProps) {
  const { playerName: storedPlayerName, setPlayerName } = useUserStore()
  const { setCurrentRoom } = useRoomDataStore()
  const [isLoading, setIsLoading] = useState(false)
  const [connectionCount, setConnectionCount] = useState<number>(0)
  const [activeUserCount, setActiveUserCount] = useState<number>(0)
  const [activeRoomCount, setActiveRoomCount] = useState<number>(0)
  const [isLoadingConnections, setIsLoadingConnections] = useState(true)
  const [activeTab, setActiveTab] = useState<"create" | "join">("create")

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
        
        // Use the game store method to detect and set position
        const { detectAndSetCurrentPlayerPosition } = useGameStore.getState()
        const { userId } = useUserStore.getState()
        const detectedPosition = userId ? detectAndSetCurrentPlayerPosition(roomData.seats, userId) : null
        const playerPosition = detectedPosition || "South"
        
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
        
        // Use the game store method to detect and set position
        const { detectAndSetCurrentPlayerPosition } = useGameStore.getState()
        const { userId } = useUserStore.getState()
        const detectedPosition = userId ? detectAndSetCurrentPlayerPosition(roomData.seats, userId) : null
        const playerPosition = detectedPosition || "North"
        
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
        seats: { "East": playerName.trim() },
        state: "waiting",
        gameData: null
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // Use the game store method to detect and set position
      const { detectAndSetCurrentPlayerPosition } = useGameStore.getState()
      const { userId } = useUserStore.getState()
      const detectedPosition = userId ? detectAndSetCurrentPlayerPosition(mockRoomData.seats, userId) : null
      const playerPosition = detectedPosition || "East"
      
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
    <main className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600">
        <div className="absolute inset-0 bg-gradient-to-tl from-cyan-400 via-blue-500 to-purple-600 opacity-70 animate-pulse"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-70" style={{ animation: 'float1 8s ease-in-out infinite' }}></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-yellow-400 to-pink-600 rounded-full mix-blend-multiply filter blur-xl opacity-70" style={{ animation: 'float2 10s ease-in-out infinite reverse' }}></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full mix-blend-multiply filter blur-xl opacity-70" style={{ animation: 'float1 8s ease-in-out infinite', animationDelay: '4s' }}></div>
      </div>

      <div className="absolute inset-0 backdrop-blur-sm bg-white/10 dark:bg-black/20"></div>

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center p-6">
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8 text-white" />
          <h1 className="text-2xl font-bold text-white">Bridge Game</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="text-white hover:bg-white/20">
            <LogIn className="h-4 w-4 mr-2" />
            Login
          </Button>
          <Button className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white border-0">
            <UserPlus className="h-4 w-4 mr-2" />
            Sign Up
          </Button>
        </div>
      </div>

      {/* Active Users Display - Fixed Position */}
      <div className="relative z-10 flex justify-center mb-8 mt-16">
        <div className="inline-flex items-center gap-4 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3">
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <Users className="h-3 w-3 mr-1" />
            {isLoadingConnections ? "Loading..." : `${activeUserCount} Active Players`}
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {isLoadingConnections ? "Loading..." : `${activeRoomCount} Active Rooms`}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchConnectionCount}
            disabled={isLoadingConnections}
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
          >
            <RefreshCw className={`h-3 w-3 ${isLoadingConnections ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tab Navigation - Fixed Position */}
      <div className="relative z-10 flex justify-center mb-4">
        <div className="flex bg-white/20 backdrop-blur-sm rounded-lg p-1">
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
            <DoorOpen className="w-4 h-4" />
            Join Room
          </Button>
        </div>
      </div>

      {/* Main Content - Cards Only */}
      <div className="relative z-10 flex justify-center">
        <div className="w-full max-w-md px-6">
          {/* Create Room Tab */}
          {activeTab === "create" && (
            <Card className="bg-white shadow-2xl border-0">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">Create New Room</CardTitle>
                <CardDescription className="text-gray-600">Start a new game and invite your friends</CardDescription>
              </CardHeader>
                             <CardContent className="space-y-5">
                 <Input
                   placeholder="Your name"
                   value={playerName}
                   onChange={(e) => setLocalPlayerName(e.target.value)}
                   onBlur={handlePlayerNameBlur}
                   className="text-center"
                 />
                 <Input
                   placeholder="Room name"
                   value={roomName}
                   onChange={(e) => setRoomName(e.target.value)}
                   className="text-center"
                 />
                 <div className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     id="isPrivate"
                     checked={isPrivate}
                     onChange={(e) => setIsPrivate(e.target.checked)}
                     className="rounded"
                   />
                   <label htmlFor="isPrivate" className="text-sm text-gray-600">
                     Private Room
                   </label>
                 </div>
                 <Button
                   onClick={createRoom}
                   disabled={isLoading || !roomName.trim() || !playerName.trim()}
                   className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3"
                 >
                   {isLoading ? (
                     <>
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                       Creating...
                     </>
                   ) : (
                     <>
                       <Plus className="h-5 w-5 mr-2" />
                       Create Room
                     </>
                   )}
                 </Button>

                 <div className="relative">
                   <div className="absolute inset-0 flex items-center">
                     <span className="w-full border-t border-gray-300" />
                   </div>
                   <div className="relative flex justify-center text-xs uppercase">
                     <span className="bg-white px-2 text-gray-500">Or</span>
                   </div>
                 </div>

                 <Button
                   onClick={quickJoin}
                   disabled={isLoading || !playerName.trim()}
                   variant="outline"
                   className="w-full"
                 >
                   {isLoading ? (
                     <>
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                       Finding...
                     </>
                   ) : (
                     <>
                       <Users className="h-5 w-5 mr-2" />
                       Quick Join
                     </>
                   )}
                 </Button>
               </CardContent>
            </Card>
          )}

          {/* Join Room Tab */}
          {activeTab === "join" && (
            <Card className="bg-white shadow-2xl border-0">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">Join Room</CardTitle>
                <CardDescription className="text-gray-600">Enter a room code to join an existing game</CardDescription>
              </CardHeader>
                <CardContent className="space-y-5">
                 <Input
                   placeholder="Your name"
                   value={joinPlayerName}
                   onChange={(e) => setJoinPlayerName(e.target.value)}
                   onBlur={handleJoinPlayerNameBlur}
                   className="text-center"
                 />
                 <Input
                   placeholder="ENTER ROOM CODE (E.G., GAME-1234)"
                   value={roomId}
                   onChange={(e) => setRoomId(e.target.value)}
                   className="text-center font-mono text-lg tracking-wider uppercase"
                   maxLength={9}
                 />
                 <Button
                   onClick={joinRoom}
                   disabled={isLoading || !roomId.trim() || !joinPlayerName.trim()}
                   className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 disabled:opacity-50"
                 >
                   {isLoading ? (
                     <>
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                       Joining...
                     </>
                   ) : (
                     <>
                       <Users className="h-5 w-5 mr-2" />
                       Join Room
                     </>
                   )}
                 </Button>
               </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}
