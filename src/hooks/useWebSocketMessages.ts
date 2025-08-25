import { useEffect } from 'react'
import { websocketService } from '../services/websocketService'
import { useRoomDataStore } from '../stores/roomDataStore'
import { useGameStore } from '../stores/gameStore'
import { WebSocketActions } from '../config/websocket'
import { Position, SeatBasedGameResponse, BroadcastMessage, GameData } from '../components/bridge/types'
import { useUserStore } from '../stores/userStore'
import { 
  getAllPositions, 
  getFrontendToServerPositionMap,
  getEmptyPositionObject
} from '../utils/positionUtils'
import { convertSeatBasedResponseToGameData } from '../utils/gameStateConverter'

// TypeScript interfaces for WebSocket message data
interface ServerBid {
  seat: string
  bid: string
  timestamp: number
}

// Seat-based message interfaces
interface BidMadeMessage {
  action: string
  success: boolean
  message?: string
  publicState: any
  privateState: any
  seat: string
  playerId: string
  lastAction: {
    action: string
    bid: ServerBid
    timestamp: number
    nextTurn: string
  }
}

interface CardPlayedMessage {
  action: string
  success: boolean
  message?: string
  publicState: any
  privateState: any
  seat: string
  playerId: string
  lastAction: {
    action: string
    card: string
    timestamp: number
    nextTurn: string
  }
}

export function useWebSocketMessages(roomId: string | undefined) {
  const { updateCurrentRoom } = useRoomDataStore()
  const { setAiThinking, updateGameData } = useGameStore()
  const { userId } = useUserStore()

  // Add global error handler to catch length errors
  useEffect(() => {
    const originalError = console.error
    console.error = (...args) => {
      originalError.apply(console, args)
    }
    
    return () => {
      console.error = originalError
    }
  }, [])

  useEffect(() => {
    console.log('useWebSocketMessages - roomId:', roomId)
    if (!roomId) {
      console.log('useWebSocketMessages - no roomId, skipping handler registration')
      return
    }

    // Helper function to get current player position
    const getCurrentPlayerPosition = (): Position => {
      const { currentRoom } = useRoomDataStore.getState()
      if (!currentRoom || !userId) return 'North'
      
      // Server now returns full position names, so we can use the seat directly
      for (const [seatKey, playerId] of Object.entries(currentRoom.seats)) {
        if (playerId === userId) {
          if (seatKey === 'North' || seatKey === 'South' || seatKey === 'East' || seatKey === 'West') {
            return seatKey as Position
          }
          // Fallback for any abbreviated format
          const seatMapping: Record<string, Position> = { 
            N: 'North', S: 'South', E: 'East', W: 'West'
          }
          return seatMapping[seatKey] || 'North'
        }
      }
      return 'North'
    }

    // Room update handlers
    const handleRoomUpdate = (data: any) => {
      
      // Handle all roomUpdated messages the same way - they all update the UI
      if (data.updateType === 'userJoined' && data.assignedSeat && data.newUser) {
        
        // Update the current room's seats to reflect the new user
        const { currentRoom } = useRoomDataStore.getState()
        if (currentRoom) {
          const updatedRoom = {
            ...currentRoom,
            seats: {
              ...currentRoom.seats,
              [data.assignedSeat]: data.newUser
            }
          }
          console.log('Updated room:', updatedRoom)
          updateCurrentRoom(updatedRoom)
        } else {
          console.log('No current room found, cannot update seats')
        }
      } else if (data.updateType === 'userLeft' && data.leftUser) {
        
        // Update the current room's seats to remove the user
        const { currentRoom } = useRoomDataStore.getState()
        if (currentRoom) {
          const updatedSeats = { ...currentRoom.seats }
          // Find and remove the user from any seat
          Object.keys(updatedSeats).forEach(seat => {
            if (updatedSeats[seat] === data.leftUser) {
              updatedSeats[seat] = ''
            }
          })
          
          const updatedRoom = {
            ...currentRoom,
            seats: updatedSeats
          }
          updateCurrentRoom(updatedRoom)
          console.log('Updated room seats after user left:', updatedRoom.seats)
        }
      } else if (data.room) {
        // Handle any room update with room data
        console.log('Handling general room update with room data')
        updateCurrentRoom(data.room)
      } else {
        console.log('Room update did not match any conditions')
      }
    }

    const handlePlayerJoined = (data: any) => {
      if (data.room) {
        updateCurrentRoom(data.room)
      }
    }

    const handlePlayerLeft = (data: any) => {
      if (data.room) {
        updateCurrentRoom(data.room)
      }
    }

    // Legacy game state update handlers (for backward compatibility)
    const handleBidMade = (data: BidMadeMessage) => {
      console.log('Received bid made message:', data)
      console.log('Bid made - action:', data.action)
      console.log('Bid made - publicState:', data.publicState)
      console.log('Bid made - privateState:', data.privateState)
      
      // Handle seat-based format (new format)
      if (data.publicState && data.privateState) {
        console.log('Processing seat-based bid made format')
        const response: SeatBasedGameResponse = {
          publicState: data.publicState,
          privateState: data.privateState,
          seat: data.seat || '',
          playerId: data.playerId || '',
          lastAction: data.lastAction,
          message: data.message || ''
        }
        
        const currentPlayerPosition = getCurrentPlayerPosition()
        const { currentRoom } = useRoomDataStore.getState()
        
        console.log('Bid made - currentPlayerPosition:', currentPlayerPosition)
        console.log('Bid made - currentRoom:', currentRoom)
        
        if (currentRoom) {
          const convertedGameData = convertSeatBasedResponseToGameData(
            response,
            currentRoom.seats,
            currentPlayerPosition
          )
          
          console.log('Bid made - converted game data:', convertedGameData)
          console.log('Bid made - currentPlayer after conversion:', convertedGameData.currentPlayer)
          console.log('Bid made - phase:', convertedGameData.phase)
          
          updateGameData(convertedGameData)
          setAiThinking(false)
        }
      } else {
        console.warn('Bid made message missing required seat-based fields:', data)
      }
    }

    const handleCardPlayed = (data: CardPlayedMessage) => {
      console.log('Received card played update:', data)
      
      // Handle seat-based format (new format)
      if (data.publicState && data.privateState) {
        console.log('Processing seat-based card played format')
        const response: SeatBasedGameResponse = {
          publicState: data.publicState,
          privateState: data.privateState,
          seat: data.seat || '',
          playerId: data.playerId || '',
          lastAction: data.lastAction,
          message: data.message || ''
        }
        
        const currentPlayerPosition = getCurrentPlayerPosition()
        const { currentRoom } = useRoomDataStore.getState()
        
        if (currentRoom) {
          const convertedGameData = convertSeatBasedResponseToGameData(
            response,
            currentRoom.seats,
            currentPlayerPosition
          )
          
          console.log('Card played - converted game data:', convertedGameData)
          console.log('Card played - currentPlayer after conversion:', convertedGameData.currentPlayer)
          
          updateGameData(convertedGameData)
          setAiThinking(false)
        }
      } else {
        console.warn('Card played message missing required seat-based fields:', data)
      }
    }

    const handleGameStarted = (data: any) => {
      console.log('Game started:', data)
      if (data.gameData) {
        // Convert ServerGameData to GameData format
        const convertedGameData: GameData = {
          ...data.gameData,
          // Add missing GameData properties with defaults
          dealer: "North" as Position,
          previousTrick: null,
          dummy: null,
          firstCardPlayed: false,
          gameNumber: 1,
          vulnerability: { NS: false, EW: false }
        }
        
        useGameStore.getState().updateGameData(convertedGameData)
        setAiThinking(false)
      }
    }

    const handleGameCompleted = (data: any) => {
      console.log('Game completed:', data)
      if (data.gameData) {
        // Convert ServerGameData to GameData format
        const convertedGameData: GameData = {
          ...data.gameData,
          // Add missing GameData properties with defaults
          dealer: "North" as Position,
          previousTrick: null,
          dummy: null,
          firstCardPlayed: false,
          gameNumber: 1,
          vulnerability: { NS: false, EW: false }
        }
        
        useGameStore.getState().updateGameData(convertedGameData)
        setAiThinking(false)
      }
    }

    const handleStartRoom = (data: any) => {
      
      // Update room data if provided
      if (data.room) {
        updateCurrentRoom(data.room)
        
        // Determine current player's position based on their user ID in the seats
        const { userId } = useUserStore.getState()
        if (userId && data.room.seats) {
          // Use the game store method to detect and set position
          useGameStore.getState().detectAndSetCurrentPlayerPosition(data.room.seats, userId)
        } else {
          console.log('Start room - missing userId or room seats')
          console.log('Start room - userId:', userId)
          console.log('Start room - room seats:', data.room?.seats)
        }
      }
      
      // Update game state if provided
      if (data.gameData) {
        
        // Ensure currentTrick is properly initialized
        const gameData = data.gameData
        // Don't modify the original gameData object, we'll handle this in the conversion
        // Ensure tricks array is properly initialized
        if (!gameData.tricks) {
          gameData.tricks = []
        }
        
        // Ensure hands are properly formatted for frontend
        if (gameData.hands) {
          // Convert hands to the expected format if needed
          const hands = gameData.hands
          if (typeof hands === 'object' && !Array.isArray(hands)) {
            // Server now returns full position names, so we can use the keys directly
            const convertedHands: Record<string, any[]> = {}
            
            Object.entries(hands).forEach(([key, cards]) => {
              // Check if the key is a valid position
              if ((key === 'North' || key === 'South' || key === 'East' || key === 'West') && Array.isArray(cards)) {
                // Convert string format to object format
                convertedHands[key] = cards.map(cardString => {
                  // Handle "10" cards correctly. These cards start with T
                  let rank: string
                  let suitChar: string
                  
                  if (cardString.startsWith('T')) {
                    rank = '10'
                    suitChar = cardString.slice(1) // Take everything after "T"
                  } else {
                    rank = cardString.slice(0, -1)
                    suitChar = cardString.slice(-1)
                  }
                  
                  const suitMap: Record<string, string> = { D: '♦', C: '♣', H: '♥', S: '♠' }
                  const suit = suitMap[suitChar] || suitChar
                  const valueMap: Record<string, number> = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 }
                  const value = valueMap[rank] || parseInt(rank)
                  
                  return { suit, rank, value }
                })
              }
            })
            
            // Replace the hands object with the converted version
            gameData.hands = convertedHands
          }
        }
        
        // Convert phase from server format to frontend format
        if (gameData.currentPhase) {
          console.log('Start room - converting phase from:', gameData.currentPhase)
          const phaseMap: Record<string, string> = {
            'waiting': 'bidding',
            'bidding': 'bidding',
            'playing': 'playing',
            'completed': 'completed'
          }
          gameData.phase = phaseMap[gameData.currentPhase] || 'bidding'
        }
        
        // Convert turn to currentPlayer
        if (gameData.turn) {
          // The server now sends positions directly (e.g., "North", "South", "East", "West")
          // Since the server and frontend use the same format, we can use it directly
          if (gameData.turn === 'North' || gameData.turn === 'South' || gameData.turn === 'East' || gameData.turn === 'West') {
            gameData.currentPlayer = gameData.turn as Position
            console.log('Start room - using turn position directly:', gameData.turn)
          } else {
            // If we couldn't find a valid position, default to North
            gameData.currentPlayer = 'North'
            console.log('Start room - no valid position found for turn position:', gameData.turn, 'defaulting to North')
          }
        }
        
        // Convert ServerGameData to GameData format
        const convertedGameData: GameData = {
          ...gameData,
          // Add missing GameData properties with defaults
          dealer: "North" as Position,
          previousTrick: null,
          contract: null,
          dummy: null,
          firstCardPlayed: false,
          gameNumber: 1,
          vulnerability: { NS: false, EW: false }
        }
        
        useGameStore.getState().updateGameData(convertedGameData)
        setAiThinking(false)
      }
      
      // Emit a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('roomStarted', { detail: data }))
    }

    // Register all message handlers
    websocketService.onMessage(WebSocketActions.ROOM_UPDATE, handleRoomUpdate)
    websocketService.onMessage(WebSocketActions.PLAYER_JOINED, handlePlayerJoined)
    websocketService.onMessage(WebSocketActions.PLAYER_LEFT, handlePlayerLeft)
    websocketService.onMessage(WebSocketActions.ROOM_STARTED, handleStartRoom)
    
    websocketService.onMessage(WebSocketActions.GAME_STARTED, handleGameStarted)
    websocketService.onMessage(WebSocketActions.GAME_COMPLETED, handleGameCompleted)
    websocketService.onMessage(WebSocketActions.BID_MADE, handleBidMade)
    websocketService.onMessage(WebSocketActions.CARD_PLAYED, handleCardPlayed)

    // Cleanup function
    return () => {
      websocketService.offMessage(WebSocketActions.ROOM_UPDATE)
      websocketService.offMessage(WebSocketActions.PLAYER_JOINED)
      websocketService.offMessage(WebSocketActions.PLAYER_LEFT)
      websocketService.offMessage(WebSocketActions.ROOM_STARTED)
      
      websocketService.offMessage(WebSocketActions.GAME_STARTED)
      websocketService.offMessage(WebSocketActions.GAME_COMPLETED)
      websocketService.offMessage(WebSocketActions.BID_MADE)
      websocketService.offMessage(WebSocketActions.CARD_PLAYED)
    }
  }, [roomId, updateCurrentRoom, setAiThinking, updateGameData, userId])
}
