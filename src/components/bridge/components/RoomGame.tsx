import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomLobby } from './RoomLobby'
import BridgeGame from '../play'
import { useRoomDataStore } from '../../../stores/roomDataStore'
import { useWebSocketMessages } from '../../../hooks/useWebSocketMessages'

export function RoomGame() {
  const navigate = useNavigate()
  const { currentRoom, clearCurrentRoom } = useRoomDataStore()
  const [gameStarted, setGameStarted] = useState(false)

  // Set up real-time WebSocket message handling for both room and game updates
  useWebSocketMessages(currentRoom?.roomId)

  // Periodic room refresh as fallback (every 10 seconds)
  useEffect(() => {
    if (!currentRoom?.roomId) return

    const interval = setInterval(async () => {
      try {
        // You could add a roomService.getRoom(roomId) method here
        // For now, we'll rely on WebSocket updates
        console.log('Periodic room refresh check')
      } catch (error) {
        console.error('Failed to refresh room data:', error)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [currentRoom?.roomId])

  const handleStartGame = () => {
    setGameStarted(true)
  }

  const handleLeaveRoom = () => {
    clearCurrentRoom()
    navigate('/')
  }

  // If no room data, show loading or error
  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Loading Room...</h2>
          <p className="text-gray-600 mb-4">Please wait while we load the room data.</p>
          <button 
            onClick={handleLeaveRoom}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back to Rooms
          </button>
        </div>
      </div>
    )
  }

  // Show lobby if game hasn't started, otherwise show the game
  if (!gameStarted) {
    return (
      <RoomLobby 
        onStartGame={handleStartGame}
        onLeaveRoom={handleLeaveRoom}
      />
    )
  }

  return <BridgeGame />
}
