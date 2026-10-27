import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Users, Plus, LogIn, UserPlus, DoorOpen, RefreshCw, ArrowRight, LockKeyhole, Spade } from "lucide-react"
import { roomService } from "../../../services"
import { connectionService } from "../../../services/connectionService"
import { useUserStore } from "../../../stores/userStore"
import { useRoomDataStore } from "../../../stores/roomDataStore"
import { Position } from "../types"
import { useGameStore } from "../../../stores/gameStore"
import { Link } from "react-router-dom"
import { PlayerPreferences } from "./PlayerPreferences"
import "./RoomEntry.css"

interface RoomManagerProps {
  onRoomJoined: (roomId: string, playerPosition: Position) => void
}

export function RoomManager({ onRoomJoined }: RoomManagerProps) {
  const { playerName: storedPlayerName, setPlayerName, isAuthenticated, user, logout } = useUserStore()
  const [logoutError, setLogoutError] = useState("")
  const [loggingOut, setLoggingOut] = useState(false)
  const { setCurrentRoom } = useRoomDataStore()
  const [isLoading, setIsLoading] = useState(false)
  const [entryError, setEntryError] = useState("")
  const [pendingAction, setPendingAction] = useState<"create" | "join" | "computer" | null>(null)
  const [activeUserCount, setActiveUserCount] = useState<number>(0)
  const [activeRoomCount, setActiveRoomCount] = useState<number>(0)
  const [isLoadingConnections, setIsLoadingConnections] = useState(true)
  const [statsUnavailable, setStatsUnavailable] = useState(false)
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
        setStatsUnavailable(false)
        setActiveUserCount(response.data.activeUserCount || 0)
        setActiveRoomCount(response.data.activeRoomCount || 0)
      } else {
        setStatsUnavailable(true)
        // Handle API error response
        console.error('Failed to fetch connection count:', response.error)
      }
    } catch (error) {
      setStatsUnavailable(true)
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
    setEntryError("")
    if (!roomName.trim() || !playerName.trim()) {
      // Use the error store to show validation error
      const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
      setEntryError("Please fill in all required fields")
      showError("Please fill in all required fields")
      return
    }

    setIsLoading(true)
    setPendingAction("create")

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
        if (!detectedPosition) throw new Error('The server did not assign you a seat')
        const playerPosition = detectedPosition
        
        // Navigate to the room
        onRoomJoined(roomData.roomId, playerPosition)
      } else {
        // Handle API error response
        const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
        setEntryError(response.error || "Failed to create room")
        showError(response.error || "Failed to create room")
      }
    } catch (error) {
      console.error('Error creating room:', error)
      const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
      setEntryError("Failed to create room. Please try again.")
      showError("Failed to create room. Please try again.")
    } finally {
      setIsLoading(false)
      setPendingAction(null)
    }
  }

  const joinRoom = async () => {
    setEntryError("")
    if (!roomId.trim() || !joinPlayerName.trim()) {
      // Use the error store to show validation error
      const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
      setEntryError("Please fill in all required fields")
      showError("Please fill in all required fields")
      return
    }

    setIsLoading(true)
    setPendingAction("join")

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
        if (!detectedPosition) throw new Error('The server did not assign you a seat')
        const playerPosition = detectedPosition
        
        // Navigate to the room
        onRoomJoined(roomData.roomId, playerPosition)
      } else {
        // Handle API error response
        const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
        setEntryError(response.error || "Failed to join room")
        showError(response.error || "Failed to join room")
      }
    } catch (error) {
      console.error('Error joining room:', error)
      const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
      setEntryError("Failed to join room. Please try again.")
      showError("Failed to join room. Please try again.")
    } finally {
      setIsLoading(false)
      setPendingAction(null)
    }
  }

  const quickJoin = async () => {
    setEntryError("")
    if (!playerName.trim()) {
      // Use the error store to show validation error
      const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
      setEntryError("Please enter your player name")
      showError("Please enter your player name")
      return
    }

    setIsLoading(true)
    setPendingAction("computer")

    try {
      // Update stored player name
      setPlayerName(playerName.trim())

      const response = await roomService.createRoom({
        roomName: `${playerName.trim()}'s computer table`, playerName: playerName.trim(), isPrivate: true, maxPlayers: 4,
      })
      if (!response.success || !response.data?.room) throw new Error(response.error || 'The server did not create a table')
      const room = response.data.room
      setCurrentRoom(room)
      const userId = useUserStore.getState().userId
      const position = userId ? useGameStore.getState().detectAndSetCurrentPlayerPosition(room.seats, userId) : null
      if (!position) throw new Error('The server did not assign you a seat')
      onRoomJoined(room.roomId, position)
    } catch (error) {
      console.error('Error quick joining:', error)
      const { showError } = await import("../../../stores/errorStore").then(m => m.useErrorStore.getState())
      const message = error instanceof Error ? error.message : "Could not create a computer table. Please try again."
      setEntryError(message)
      showError(message)
    } finally {
      setIsLoading(false)
      setPendingAction(null)
    }
  }

  return (
    <main className="room-manager bridge-entry">
      <a className="entry-skip" href="#entry-actions">Skip to room options</a>
      <header className="entry-header">
        <Link to="/" className="entry-brand" aria-label="Next Level Bridge home">
          <span className="entry-brand-mark" aria-hidden="true"><Spade /></span>
          <span data-testid="app-title">Next Level Bridge</span>
        </Link>
        <nav className="entry-navigation" aria-label="Account">
          {isAuthenticated || logoutError ? <>
            {isAuthenticated && <span>Signed in as {user?.username}</span>}
            <Button variant="ghost" disabled={loggingOut} onClick={async () => {
              setLoggingOut(true)
              setLogoutError("")
              setLocalPlayerName("")
              setJoinPlayerName("")
              try { await logout() } catch {
                setLogoutError("Signed out on this device, but server logout failed. Your refresh cookie may still be active. Retry logout.")
              } finally { setLoggingOut(false) }
            }}>{loggingOut ? "Signing out..." : logoutError ? "Retry logout" : "Log out"}</Button>
          </> : <>
          <Button asChild variant="ghost" data-testid="login-button">
            <Link to="/login"><LogIn aria-hidden="true" />Login</Link>
          </Button>
          <Button asChild variant="ghost" className="entry-signup" data-testid="signup-button">
            <Link to="/create-account"><UserPlus aria-hidden="true" />Sign Up</Link>
          </Button>
          </>}
        </nav>
      </header>
      {logoutError && <p role="alert">{logoutError}</p>}

      <div className="entry-layout">
        <section className="entry-introduction" aria-labelledby="entry-heading">
          <p className="entry-eyebrow"><span aria-hidden="true">♠</span> A place at the table</p>
          <h1 id="entry-heading">Good company.<br /><em>Great hands.</em></h1>
          <p className="entry-lead">Bring your bridge partners together, or settle in for a hand with computers. Your next table starts here.</p>
          <div className="entry-card-scene" aria-hidden="true">
            <div className="entry-card-orbit" />
            <div className="entry-playing-card entry-club"><span>A<small>♣</small></span><b>♣</b></div>
            <div className="entry-playing-card entry-diamond"><span>A<small>♦</small></span><b>♦</b></div>
            <div className="entry-playing-card entry-heart"><span>A<small>♥</small></span><b>♥</b></div>
            <div className="entry-playing-card entry-spade"><span>A<small>♠</small></span><b>♠</b></div>
            <span className="entry-scene-caption">Four seats. Two partnerships. One shared table.</span>
          </div>
          <ul className="entry-highlights">
            <li><Users aria-hidden="true" /><span><strong>Play together</strong><small>Create a room and share its code.</small></span></li>
            <li><LockKeyhole aria-hidden="true" /><span><strong>Keep it private</strong><small>Invite friends with a private link.</small></span></li>
            <li><Spade aria-hidden="true" /><span><strong>Find your rhythm</strong><small>Start a solo table with computers.</small></span></li>
          </ul>
        </section>

        <section id="entry-actions" className="entry-actions" aria-label="Room options" tabIndex={-1}>
          <div className="entry-mode-picker" role="group" aria-label="Choose how to play">
            <Button variant="ghost" className="entry-mode" aria-pressed={activeTab === "create"} aria-controls="entry-form" disabled={isLoading}
              onClick={() => { setActiveTab("create"); setEntryError("") }} data-testid="create-room-tab">
              <Plus aria-hidden="true" /><span>Create Room<small>Host your own table</small></span>
            </Button>
            <Button variant="ghost" className="entry-mode" aria-pressed={activeTab === "join"} aria-controls="entry-form" disabled={isLoading}
              onClick={() => { setActiveTab("join"); setEntryError("") }} data-testid="join-room-tab">
              <DoorOpen aria-hidden="true" /><span>Join Room<small>Have a room code?</small></span>
            </Button>
          </div>
          <Card id="entry-form" className="entry-form-card" data-testid={activeTab === "create" ? "create-room-card" : "join-room-card"}>
            <CardHeader>
              <p className="entry-form-eyebrow">{activeTab === "create" ? "Make yourself at home" : "Pull up a chair"}</p>
              <h2 data-testid={activeTab === "create" ? "create-room-title" : "join-room-title"}>
                {activeTab === "create" ? "Create New Room" : "Join Room"}
              </h2>
              <CardDescription>{activeTab === "create" ? "Choose a name for your table. Invite your friends once you’re in." : "Enter the code shared by your host to join their table."}</CardDescription>
            </CardHeader>
            <CardContent>
              <form aria-label={activeTab === "create" ? "Create room" : "Join room"} aria-busy={isLoading}
                onSubmit={(event) => { event.preventDefault(); if (!isLoading) void (activeTab === "create" ? createRoom() : joinRoom()) }}>
                <fieldset disabled={isLoading} className="entry-fields">
                  {activeTab === "create" ? (
                    <>
                      <label htmlFor="create-player-name">Your name</label>
                      <Input id="create-player-name" placeholder="How should we call you?" aria-label="Your name for a new room" autoComplete="nickname" required maxLength={50}
                        value={playerName} onChange={(e) => setLocalPlayerName(e.target.value)} onBlur={handlePlayerNameBlur} data-testid="create-player-name-input" />
                      <label htmlFor="create-room-name">Room name</label>
                      <Input id="create-room-name" placeholder="e.g. Sunday bridge" required
                        value={roomName} onChange={(e) => setRoomName(e.target.value)} data-testid="create-room-name-input" />
                      <div className="entry-private">
                        <input type="checkbox" id="isPrivate" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)}
                          aria-describedby="entry-private-help" data-testid="private-room-checkbox" />
                        <div><label htmlFor="isPrivate">Private Room</label><p id="entry-private-help">Guests will need an invitation link, not just a room code.</p></div>
                        <LockKeyhole aria-hidden="true" />
                      </div>
                      <Button variant="ghost" type="submit" className="entry-primary" disabled={isLoading || !roomName.trim() || !playerName.trim()} data-testid="create-room-button">
                        {pendingAction === "create" ? "Creating..." : <>Create Room<ArrowRight aria-hidden="true" /></>}
                      </Button>
                      <div className="entry-divider"><span>Prefer a solo hand?</span></div>
                      <Button type="button" onClick={quickJoin} disabled={isLoading || !playerName.trim()} variant="outline"
                        className="entry-computer" aria-describedby="entry-computer-help" data-testid="quick-join-button">
                        <Spade aria-hidden="true" />{pendingAction === "computer" ? "Creating computer table..." : "Play with computers"}
                      </Button>
                      <p id="entry-computer-help" className="entry-help">Just your name is needed. Creates a private table; press Start game in the room to fill empty seats with computers.</p>
                    </>
                  ) : (
                    <>
                      <label htmlFor="join-player-name">Your name</label>
                      <Input id="join-player-name" placeholder="How should we call you?" aria-label="Your name for joining a room" autoComplete="nickname" required maxLength={50}
                        value={joinPlayerName} onChange={(e) => setJoinPlayerName(e.target.value)} onBlur={handleJoinPlayerNameBlur} data-testid="join-player-name-input" />
                      <label htmlFor="join-room-code">Room code</label>
                      <Input id="join-room-code" placeholder="Paste your room code" autoCapitalize="none" spellCheck={false} required aria-describedby="entry-code-help"
                        value={roomId} onChange={(e) => setRoomId(e.target.value)} data-testid="join-room-id-input" />
                      <p id="entry-code-help" className="entry-help">Use the exact code from your host. For a private room, open their invitation link instead.</p>
                      <Button variant="ghost" type="submit" className="entry-primary" disabled={isLoading || !roomId.trim() || !joinPlayerName.trim()} data-testid="join-room-button">
                        {pendingAction === "join" ? "Joining..." : <>Join Room<ArrowRight aria-hidden="true" /></>}
                      </Button>
                      <div className="entry-join-note"><Users aria-hidden="true" /><p>One table, up to four players.<br />Your host starts the game when you’re ready.</p></div>
                    </>
                  )}
                </fieldset>
                {isLoading && <p role="status" className="entry-help entry-pending">Connecting to your table. Please wait…</p>}
                {entryError && <p role="alert" className="entry-error">{entryError}</p>}
              </form>
              <p className="entry-guest-note">No account needed to play as a guest.</p>
            </CardContent>
          </Card>
        </section>
      </div>

      <footer className="entry-footer">
        <div className="entry-live" aria-label="Live room activity">
          <span className="entry-live-label">At the tables</span>
          <div role="status" className="entry-stats">
            <span data-testid="active-players-badge">
              {isLoadingConnections ? "Loading..." : statsUnavailable ? "Players unavailable" : `${activeUserCount} Active Players`}
            </span>
            <span data-testid="active-rooms-badge">
              {isLoadingConnections ? "Loading..." : statsUnavailable ? "Rooms unavailable" : `${activeRoomCount} Active Rooms`}
            </span>
          </div>
          <Button variant="ghost" size="icon" aria-label="Refresh room activity" onClick={fetchConnectionCount} disabled={isLoadingConnections} data-testid="refresh-connections-button">
            <RefreshCw aria-hidden="true" />
          </Button>
        </div>
        <PlayerPreferences />
      </footer>
    </main>
  )
}
