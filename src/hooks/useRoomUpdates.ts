import { useEffect } from 'react'
import { websocketService } from '../services/websocketService'
import { useRoomDataStore } from '../stores/roomDataStore'
import { WebSocketActions } from '../config/websocket'

export function useRoomUpdates(roomId: string | undefined) {
  const { updateCurrentRoom } = useRoomDataStore()

  useEffect(() => {
    if (!roomId) return

    // Handler for room updates
    const handleRoomUpdate = (data: any) => {
      if (data.room) {
        updateCurrentRoom(data.room)
      }
    }

    // Handler for player joined
    const handlePlayerJoined = (data: any) => {
      if (data.room) {
        updateCurrentRoom(data.room)
      }
    }

    // Handler for player left
    const handlePlayerLeft = (data: any) => {
      if (data.room) {
        updateCurrentRoom(data.room)
      }
    }

    // Register message handlers
    websocketService.onMessage(WebSocketActions.ROOM_UPDATE, handleRoomUpdate)
    websocketService.onMessage(WebSocketActions.PLAYER_JOINED, handlePlayerJoined)
    websocketService.onMessage(WebSocketActions.PLAYER_LEFT, handlePlayerLeft)

    // Cleanup function
    return () => {
      websocketService.offMessage(WebSocketActions.ROOM_UPDATE)
      websocketService.offMessage(WebSocketActions.PLAYER_JOINED)
      websocketService.offMessage(WebSocketActions.PLAYER_LEFT)
    }
  }, [roomId, updateCurrentRoom])
}
