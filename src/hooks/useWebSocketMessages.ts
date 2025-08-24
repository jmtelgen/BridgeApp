import { useEffect } from 'react'
import { websocketService } from '../services/websocketService'
import { useRoomDataStore } from '../stores/roomDataStore'
import { useGameStore } from '../stores/gameStore'
import { WebSocketActions } from '../config/websocket'
import { Position, SeatBasedGameResponse, BroadcastMessage } from '../components/bridge/types'
import { useUserStore } from '../stores/userStore'
import { 
  getAllPositions, 
  getServerToFrontendPositionMap, 
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

interface SeatBasedBidMadeMessage {
  action: string
  success: boolean
  bid: ServerBid
  nextTurn: string
  publicState: any
  privateState: any
  seat: string
  playerId: string
  lastAction: any
  message: string
}

interface SeatBasedCardPlayedMessage {
  action: string
  success: boolean
  play: {
    seat: string
    card: string
    timestamp: number
  }
  nextTurn: string
  publicState: any
  privateState: any
  seat: string
  playerId: string
  lastAction: any
  message: string
}

interface SeatBasedGameStateUpdateMessage {
  action: string
  success: boolean
  publicState: any
  privateState: any
  seat: string
  playerId: string
  lastAction: any
  message: string
}

export function useWebSocketMessages(roomId: string | undefined) {
  const { updateCurrentRoom, currentRoom } = useRoomDataStore()
  const { gameData, setAiThinking, updateGameData } = useGameStore()
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
      
      const seatMapping: Record<string, Position> = { N: 'North', S: 'South', E: 'East', W: 'West' }
      for (const [seatKey, playerId] of Object.entries(currentRoom.seats)) {
        if (playerId === userId) {
          return seatMapping[seatKey] || 'North'
        }
      }
      return 'North'
    }

    // New seat-based message handlers
    const handleSeatBasedGameStateUpdate = (data: SeatBasedGameStateUpdateMessage) => {
      console.log('Received seat-based game state update:', data)
      
      if (data.publicState && data.privateState) {
        const response: SeatBasedGameResponse = {
          publicState: data.publicState,
          privateState: data.privateState,
          seat: data.seat,
          playerId: data.playerId,
          lastAction: data.lastAction,
          message: data.message
        }
        
        const currentPlayerPosition = getCurrentPlayerPosition()
        const { currentRoom } = useRoomDataStore.getState()
        
        if (currentRoom) {
          const convertedGameData = convertSeatBasedResponseToGameData(
            response,
            currentRoom.seats,
            currentPlayerPosition
          )
          
          updateGameData(convertedGameData)
          setAiThinking(false)
        }
      }
    }

    const handleSeatBasedBidMade = (data: SeatBasedBidMadeMessage) => {
      console.log('Received seat-based bid made:', data)
      
      if (data.publicState && data.privateState) {
        const response: SeatBasedGameResponse = {
          publicState: data.publicState,
          privateState: data.privateState,
          seat: data.seat,
          playerId: data.playerId,
          lastAction: data.lastAction,
          message: data.message
        }
        
        const currentPlayerPosition = getCurrentPlayerPosition()
        const { currentRoom } = useRoomDataStore.getState()
        
        if (currentRoom) {
          const convertedGameData = convertSeatBasedResponseToGameData(
            response,
            currentRoom.seats,
            currentPlayerPosition
          )
          
          updateGameData(convertedGameData)
          setAiThinking(false)
        }
      }
    }

    const handleSeatBasedCardPlayed = (data: SeatBasedCardPlayedMessage) => {
      console.log('Received seat-based card played:', data)
      
      if (data.publicState && data.privateState) {
        const response: SeatBasedGameResponse = {
          publicState: data.publicState,
          privateState: data.privateState,
          seat: data.seat,
          playerId: data.playerId,
          lastAction: data.lastAction,
          message: data.message
        }
        
        const currentPlayerPosition = getCurrentPlayerPosition()
        const { currentRoom } = useRoomDataStore.getState()
        
        if (currentRoom) {
          const convertedGameData = convertSeatBasedResponseToGameData(
            response,
            currentRoom.seats,
            currentPlayerPosition
          )
          
          updateGameData(convertedGameData)
          setAiThinking(false)
        }
      }
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
        
        if (currentRoom) {
          const convertedGameData = convertSeatBasedResponseToGameData(
            response,
            currentRoom.seats,
            currentPlayerPosition
          )
          
          console.log('Bid made - converted game data:', convertedGameData)
          console.log('Bid made - currentPlayer after conversion:', convertedGameData.currentPlayer)
          
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
        const convertedGameData = {
          ...data.gameData,
          // Add missing GameData properties with defaults
          dealer: "North" as Position,
          previousTrick: null,
          dummy: null,
          firstCardPlayed: false,
          gameNumber: 1,
          vulnerability: { NS: false, EW: false }
        } as any
        
        useGameStore.getState().updateGameData(convertedGameData)
        setAiThinking(false)
      }
    }

    const handleGameCompleted = (data: any) => {
      console.log('Game completed:', data)
      if (data.gameData) {
        // Convert ServerGameData to GameData format
        const convertedGameData = {
          ...data.gameData,
          // Add missing GameData properties with defaults
          dealer: "North" as Position,
          previousTrick: null,
          dummy: null,
          firstCardPlayed: false,
          gameNumber: 1,
          vulnerability: { NS: false, EW: false }
        } as any
        
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
          
          // Find which seat this user is assigned to
          const seatMapping: Record<string, Position> = { N: 'North', S: 'South', E: 'East', W: 'West' }
          let playerPosition: Position | null = null
          
          for (const [seatKey, playerId] of Object.entries(data.room.seats)) {
            if (playerId === userId) {
              playerPosition = seatMapping[seatKey] || 'North'
              break
            }
          }
          
          if (playerPosition) {
            // Set the current player position in the room data store
            useRoomDataStore.getState().setCurrentPlayerPosition(playerPosition)
            console.log('Start room - set current player position to:', playerPosition)
          } else {
            console.log('Start room - could not determine player position for userId:', userId)
            console.log('Start room - available seats:', Object.keys(data.room.seats))
            console.log('Start room - seat values:', Object.values(data.room.seats))
          }
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
            // Convert from server format (N, E, S, W) to frontend format (North, East, South, West)
            const positionMap = getServerToFrontendPositionMap()
            const convertedHands: Record<string, any[]> = {}
            
            Object.entries(hands).forEach(([key, cards]) => {
              const frontendPosition = positionMap[key as keyof typeof positionMap]
              if (frontendPosition && Array.isArray(cards)) {
                // Convert string format to object format
                convertedHands[frontendPosition] = cards.map(cardString => {
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
          // Convert user ID to position by checking which position this user is assigned to
          const { currentRoom } = useRoomDataStore.getState()
          if (currentRoom) {
            // Find which seat this user is assigned to
            const seatMapping = getServerToFrontendPositionMap()
            for (const [seatKey, playerId] of Object.entries(currentRoom.seats)) {
              if (playerId && gameData.turn === playerId) {
                gameData.currentPlayer = seatMapping[seatKey] || 'North'
                break
              }
            }
          }
          // If we couldn't find a match, default to the first available position
          if (!gameData.currentPlayer) {
            gameData.currentPlayer = 'North'
          }
        }
        
        // Convert ServerGameData to GameData format
        const convertedGameData = {
          ...gameData,
          // Add missing GameData properties with defaults
          dealer: "North" as Position,
          previousTrick: null,
          contract: null,
          dummy: null,
          firstCardPlayed: false,
          gameNumber: 1,
          vulnerability: { NS: false, EW: false }
        } as any // Type assertion since we know the structure will be correct
        
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

    // New seat-based handlers
    websocketService.onMessage(WebSocketActions.SEAT_BASED_GAME_STATE_UPDATE, handleSeatBasedGameStateUpdate)
    websocketService.onMessage(WebSocketActions.SEAT_BASED_BID_MADE, handleSeatBasedBidMade)
    websocketService.onMessage(WebSocketActions.SEAT_BASED_CARD_PLAYED, handleSeatBasedCardPlayed)
    
    // Legacy game state handlers (for backward compatibility)
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
      
      // New seat-based handlers
      websocketService.offMessage(WebSocketActions.SEAT_BASED_GAME_STATE_UPDATE)
      websocketService.offMessage(WebSocketActions.SEAT_BASED_BID_MADE)
      websocketService.offMessage(WebSocketActions.SEAT_BASED_CARD_PLAYED)
      
      // Legacy handlers
      websocketService.offMessage(WebSocketActions.GAME_STARTED)
      websocketService.offMessage(WebSocketActions.GAME_COMPLETED)
      websocketService.offMessage(WebSocketActions.BID_MADE)
      websocketService.offMessage(WebSocketActions.CARD_PLAYED)
    }
  }, [roomId, updateCurrentRoom, setAiThinking, updateGameData, userId])
}
