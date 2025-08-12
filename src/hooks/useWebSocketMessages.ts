import { useEffect } from 'react'
import { websocketService } from '../services/websocketService'
import { useRoomDataStore } from '../stores/roomDataStore'
import { useGameStore } from '../stores/gameStore'
import { WebSocketActions } from '../config/websocket'

export function useWebSocketMessages(roomId: string | undefined) {
  const { updateCurrentRoom } = useRoomDataStore()
  const { gameState, setAiThinking } = useGameStore()

  useEffect(() => {
    if (!roomId) return

    // Room update handlers
    const handleRoomUpdate = (data: any) => {
      console.log('Received room update:', data)
      if (data.room) {
        updateCurrentRoom(data.room)
      }
      
      // Handle specific update types
      if (data.updateType === 'userJoined' && data.assignedSeat) {
        console.log(`User ${data.newUser} joined and was assigned seat ${data.assignedSeat}`)
      }
    }

    const handlePlayerJoined = (data: any) => {
      console.log('Player joined:', data)
      if (data.room) {
        updateCurrentRoom(data.room)
      }
    }

    const handlePlayerLeft = (data: any) => {
      console.log('Player left:', data)
      if (data.room) {
        updateCurrentRoom(data.room)
      }
    }

    // Game state update handlers
    const handleGameStateUpdate = (data: any) => {
      console.log('Received game state update:', data)
      if (data.gameState) {
        // Update the game state in the store
        useGameStore.setState({ gameState: data.gameState })
        
        // Clear AI thinking state if game state was updated externally
        setAiThinking(false)
      }
    }

    const handleBidUpdate = (data: any) => {
      console.log('Received bid update:', data)
      if (data.gameState) {
        useGameStore.setState({ gameState: data.gameState })
        setAiThinking(false)
      }
    }

    const handleCardPlayed = (data: any) => {
      console.log('Received card played update:', data)
      if (data.gameState) {
        useGameStore.setState({ gameState: data.gameState })
        setAiThinking(false)
      }
    }

    const handleGameStarted = (data: any) => {
      console.log('Game started:', data)
      if (data.gameState) {
        useGameStore.setState({ gameState: data.gameState })
        setAiThinking(false)
      }
    }

    const handleGameCompleted = (data: any) => {
      console.log('Game completed:', data)
      if (data.gameState) {
        useGameStore.setState({ gameState: data.gameState })
        setAiThinking(false)
      }
    }

    // Register all message handlers
    websocketService.onMessage(WebSocketActions.ROOM_UPDATE, handleRoomUpdate)
    websocketService.onMessage(WebSocketActions.PLAYER_JOINED, handlePlayerJoined)
    websocketService.onMessage(WebSocketActions.PLAYER_LEFT, handlePlayerLeft)
    
    // Also handle the specific roomUpdated action that includes updateType
    websocketService.onMessage('roomUpdated', handleRoomUpdate)
    
    // Game state handlers
    websocketService.onMessage(WebSocketActions.GAME_STATE_UPDATE, handleGameStateUpdate)
    websocketService.onMessage(WebSocketActions.BID_UPDATE, handleBidUpdate)
    websocketService.onMessage(WebSocketActions.CARD_PLAYED, handleCardPlayed)
    websocketService.onMessage(WebSocketActions.GAME_STARTED, handleGameStarted)
    websocketService.onMessage(WebSocketActions.GAME_COMPLETED, handleGameCompleted)

    // Cleanup function
    return () => {
      websocketService.offMessage(WebSocketActions.ROOM_UPDATE)
      websocketService.offMessage(WebSocketActions.PLAYER_JOINED)
      websocketService.offMessage(WebSocketActions.PLAYER_LEFT)
      websocketService.offMessage('roomUpdated')
      websocketService.offMessage(WebSocketActions.GAME_STATE_UPDATE)
      websocketService.offMessage(WebSocketActions.BID_UPDATE)
      websocketService.offMessage(WebSocketActions.CARD_PLAYED)
      websocketService.offMessage(WebSocketActions.GAME_STARTED)
      websocketService.offMessage(WebSocketActions.GAME_COMPLETED)
    }
  }, [roomId, updateCurrentRoom, setAiThinking])
}
