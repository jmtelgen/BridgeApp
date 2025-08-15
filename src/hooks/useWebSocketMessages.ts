import { useEffect } from 'react'
import { websocketService } from '../services/websocketService'
import { useRoomDataStore } from '../stores/roomDataStore'
import { useGameStore } from '../stores/gameStore'
import { WebSocketActions } from '../config/websocket'
import { Position } from '../components/bridge/types'
import { useUserStore } from '../stores/userStore'

// TypeScript interfaces for WebSocket message data
interface ServerBid {
  seat: string
  bid: string
  timestamp: number
}

interface ServerGameData {
  bids: ServerBid[]
  tricks: any[]
  turn: string
  hands: Record<string, string[]>
  currentPhase: string
  phase?: string
  currentPlayer?: string
  currentTrick?: any
}

interface BidMadeMessage {
  action: string
  success: boolean
  bid: ServerBid
  nextTurn: string
  gameData: ServerGameData
  roomState: string
  updateType: string
  message: string
}

interface RoomStartedMessage {
  action: string
  success: boolean
  room: {
    roomId: string
    ownerId: string
    playerName: string
    roomName: string
    isPrivate: boolean
    seats: Record<string, string>
    state: string
  }
  gameData: ServerGameData
  gameState?: any // Optional gameState property
  updateType: string
  message: string
  hands?: Record<string, string[]>
}



export function useWebSocketMessages(roomId: string | undefined) {
  const { updateCurrentRoom } = useRoomDataStore()
  const { gameState, setAiThinking } = useGameStore()

  // Add global error handler to catch length errors
  useEffect(() => {
    const originalError = console.error
    console.error = (...args) => {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('length')) {
        console.log('LENGTH ERROR DETECTED!')
        console.log('Error args:', args)
        console.log('Current game state:', useGameStore.getState().gameState)
        console.log('Current room state:', useRoomDataStore.getState().currentRoom)
      }
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

    // Room update handlers
    const handleRoomUpdate = (data: any) => {
      console.log('Received room update:', data)
      console.log('Room update - updateType:', data.updateType)
      console.log('Room update - assignedSeat:', data.assignedSeat)
      console.log('Room update - newUser:', data.newUser)
      console.log('Room update - room data:', data.room)
      
      // Handle all roomUpdated messages the same way - they all update the UI
      if (data.updateType === 'userJoined' && data.assignedSeat && data.newUser) {
        console.log(`User ${data.newUser} joined and was assigned seat ${data.assignedSeat}`)
        
        // Update the current room's seats to reflect the new user
        const { currentRoom } = useRoomDataStore.getState()
        console.log('Current room before update:', currentRoom)
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
          console.log('Updated room seats after user joined:', updatedRoom.seats)
        } else {
          console.log('No current room found, cannot update seats')
        }
      } else if (data.updateType === 'userLeft' && data.leftUser) {
        console.log(`User ${data.leftUser} left the room`)
        
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
      console.log('Game state update - data.gameState:', data.gameState)
      console.log('Game state update - data.gameState?.currentTrick:', data.gameState?.currentTrick)
      console.log('Game state update - data.gameState?.tricks:', data.gameState?.tricks)
      console.log('Game state update - data.gameState?.tricks?.length:', data.gameState?.tricks?.length)
      
      if (data.gameState) {
        // Update the game state in the store
        useGameStore.getState().updateGameState(data.gameState)
        
        // Clear AI thinking state if game state was updated externally
        setAiThinking(false)
      }
    }

    const handleBidUpdate = (data: any) => {
      console.log('Received bid update:', data)
      if (data.gameState) {
        useGameStore.getState().updateGameState(data.gameState)
        setAiThinking(false)
      }
    }

    const handleBidMade = (data: BidMadeMessage) => {
      console.log('Received bid made:', data)
      console.log('Bid made - bid:', data.bid)
      console.log('Bid made - nextTurn:', data.nextTurn)
      console.log('Bid made - gameData:', data.gameData)
      
      // Handle the bid data if provided
      if (data.bid) {
        const bid = data.bid
        console.log('Processing bid:', bid)
        
        // Convert seat from server format (E) to frontend format (East)
        const seatMap: Record<string, string> = { N: 'North', E: 'East', S: 'South', W: 'West' }
        const frontendSeat = seatMap[bid.seat] || bid.seat
        
        // Convert bid string (4H) to bid object
        let bidType: string = 'Pass'
        let level: number | undefined
        let suit: string | undefined
        
        if (bid.bid === 'pass') {
          bidType = 'Pass'
        } else if (bid.bid === 'double') {
          bidType = 'Double'
        } else if (bid.bid === 'redouble') {
          bidType = 'Redouble'
        } else {
          // Parse bid like "4H" -> level: 4, suit: "♥"
          const match = bid.bid.match(/^(\d+)([CDHSNT]+)$/)
          if (match) {
            level = parseInt(match[1])
            const suitChar = match[2]
            const suitMap: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' }
            suit = suitMap[suitChar] || suitChar
            bidType = 'Bid'
          }
        }
        
        console.log('Converted bid:', { type: bidType, level, suit, player: frontendSeat })
      }
      
      // Update game state if provided
      if (data.gameData) {
        // Convert gameData to the expected format if needed
        const gameData = data.gameData
        console.log('Bid made - processing gameData, currentPlayer before conversion:', gameData.currentPlayer)
        
        // Ensure hands are properly formatted for frontend
        if (gameData.hands) {
          const hands = gameData.hands
          if (typeof hands === 'object' && !Array.isArray(hands)) {
            // Convert from server format (N, E, S, W) to frontend format (North, East, South, West)
            const positionMap = { N: 'North', E: 'East', S: 'South', W: 'West' }
            const convertedHands: Record<string, any[]> = {}
            
            Object.entries(hands).forEach(([key, cards]) => {
              const frontendPosition = positionMap[key as keyof typeof positionMap]
              if (frontendPosition && Array.isArray(cards)) {
                convertedHands[frontendPosition] = cards.map(cardString => {
                  // Handle "10" cards correctly
                  let rank: string
                  let suitChar: string
                  
                  if (cardString.startsWith('10')) {
                    rank = '10'
                    suitChar = cardString.slice(2) // Take everything after "10"
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
            gameData.hands = convertedHands
          }
        }
        
        // Convert currentPhase to phase if needed
        if (gameData.currentPhase && !gameData.phase) {
          console.log('Bid made - setting phase from currentPhase:', gameData.currentPhase)
          // Don't set phase to completed during bidding
          if (gameData.currentPhase === 'completed') {
            console.log('Bid made - preventing phase from being set to completed during bidding')
            gameData.phase = 'bidding'
          } else {
            gameData.phase = gameData.currentPhase
          }
        }
        
        // Debug: Log the phase values
        console.log('Bid made - gameData.phase:', gameData.phase)
        console.log('Bid made - gameData.currentPhase:', gameData.currentPhase)
        console.log('Bid made - data.roomState:', data.roomState)
        
        // Ensure phase is not incorrectly set to "completed" during bidding
        if (data.roomState === "bidding" && gameData.phase === "completed") {
          console.log('Bid made - fixing incorrect phase from completed to bidding')
          gameData.phase = "bidding"
        }
        
        console.log('Bid made - gameData.currentPlayer after hands conversion:', gameData.currentPlayer)
        
        // Convert turn to currentPlayer if needed
        if (data.nextTurn && !gameData.currentPlayer) {
          // Convert user ID to position by checking which position this user is assigned to
          const { currentRoom } = useRoomDataStore.getState()
          if (currentRoom) {
            // Find which seat this user is assigned to
            const seatMapping: Record<string, string> = { N: 'North', S: 'South', E: 'East', W: 'West' }
            for (const [seatKey, playerId] of Object.entries(currentRoom.seats)) {
              if (playerId && data.nextTurn.includes(playerId)) {
                gameData.currentPlayer = seatMapping[seatKey] || 'North'
                console.log('Bid made - converted nextTurn to currentPlayer:', data.nextTurn, '->', gameData.currentPlayer)
                break
              }
            }
          }
        }
        
        // Ensure currentPlayer is set correctly - prioritize gameData.currentPlayer if available
        if (gameData.currentPlayer) {
          console.log('Bid made - using gameData.currentPlayer:', gameData.currentPlayer)
        } else if (data.nextTurn) {
          // Fallback: use nextTurn to determine current player
          const { currentRoom } = useRoomDataStore.getState()
          if (currentRoom) {
            const seatMapping: Record<string, string> = { N: 'North', S: 'South', E: 'East', W: 'West' }
            for (const [seatKey, playerId] of Object.entries(currentRoom.seats)) {
              if (playerId && data.nextTurn.includes(playerId)) {
                gameData.currentPlayer = seatMapping[seatKey] || 'North'
                console.log('Bid made - fallback: converted nextTurn to currentPlayer:', data.nextTurn, '->', gameData.currentPlayer)
                break
              }
            }
          }
        }
        
        console.log('Bid made - final currentPlayer before updateGameState:', gameData.currentPlayer)
        
        // Convert ServerGameData to GameState format
        const convertedGameState = {
          ...gameData,
          // Add missing GameState properties with defaults
          dealer: "North" as Position,
          previousTrick: null,
          contract: null,
          dummy: null,
          firstCardPlayed: false,
          gameNumber: 1,
          vulnerability: { NS: false, EW: false }
        } as any // Type assertion since we know the structure will be correct
        
        // Final safety check: if we're receiving a bidMade message, we should not be in completed phase
        if (convertedGameState.phase === "completed") {
          console.log('Bid made - final safety check: correcting phase from completed to bidding')
          convertedGameState.phase = "bidding"
        }
        
        useGameStore.getState().updateGameState(convertedGameState)
        console.log('Bid made - final game state after update:', useGameStore.getState().gameState)
        console.log('Bid made - final currentPlayer:', useGameStore.getState().gameState.currentPlayer)
        setAiThinking(false)
      }
    }

    const handleCardPlayed = (data: any) => {
      console.log('Received card played update:', data)
      if (data.gameState) {
        useGameStore.getState().updateGameState(data.gameState)
        setAiThinking(false)
      }
    }

    const handleGameStarted = (data: any) => {
      console.log('Game started:', data)
      if (data.gameState) {
        useGameStore.getState().updateGameState(data.gameState)
        setAiThinking(false)
      }
    }

    const handleGameCompleted = (data: any) => {
      console.log('Game completed:', data)
      if (data.gameState) {
        useGameStore.getState().updateGameState(data.gameState)
        setAiThinking(false)
      }
    }

    const handleStartRoom = (data: RoomStartedMessage) => {
      console.log('Start room:', data)
      console.log('Start room - data.gameState:', (data as any).gameState)
      console.log('Start room - data.gameData:', data.gameData)
      if (data.gameState) {
        useGameStore.getState().updateGameState(data.gameState)
        setAiThinking(false)
      }
      
      // Update room data if provided
      if (data.room) {
        updateCurrentRoom(data.room)
        
        // Determine current player's position based on their user ID in the seats
        const { userId } = useUserStore.getState()
        if (userId && data.room.seats) {
          console.log('Start room - determining player position for userId:', userId)
          console.log('Start room - room seats:', data.room.seats)
          console.log('Start room - room data structure:', data.room)
          
          // Find which seat this user is assigned to
          const seatMapping: Record<string, string> = { N: 'North', S: 'South', E: 'East', W: 'West' }
          let playerPosition: string | null = null
          
          for (const [seatKey, playerId] of Object.entries(data.room.seats)) {
            console.log(`Start room - checking seat ${seatKey}: ${playerId} vs userId: ${userId}`)
            if (playerId === userId) {
              playerPosition = seatMapping[seatKey] || 'North'
              console.log('Start room - found player position:', playerPosition)
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
      
      // Update game state if provided (check both gameState and gameData)
      if (data.gameState) {
        console.log('Start room - setting gameState:', data.gameState)
        console.log('Start room - gameState.currentTrick:', data.gameState.currentTrick)
        console.log('Start room - gameState.tricks:', data.gameState.tricks)
        useGameStore.getState().updateGameState(data.gameState)
        setAiThinking(false)
      } else if (data.gameData) {
        console.log('Start room - processing gameData:', data.gameData)
        console.log('Start room - gameData.currentTrick before fix:', data.gameData.currentTrick)
        console.log('Start room - gameData.tricks before fix:', data.gameData.tricks)
        
        // Ensure currentTrick is properly initialized
        const gameData = data.gameData
        if (!gameData.currentTrick) {
          console.log('Start room - initializing currentTrick')
          gameData.currentTrick = {
            cards: { North: null, East: null, South: null, West: null },
            winner: null,
            ledSuit: null,
            trickLeader: null
          }
        }
        // Ensure tricks array is properly initialized
        if (!gameData.tricks) {
          console.log('Start room - initializing tricks array')
          gameData.tricks = []
        }
        
        // Ensure hands are properly formatted for frontend
        console.log('Start room - gameData.hands before fix:', gameData.hands)
        console.log('Start room - gameData.hands type:', typeof gameData.hands)
        console.log('Start room - gameData.hands keys:', gameData.hands ? Object.keys(gameData.hands) : 'undefined')
        if (gameData.hands) {
          // Convert hands to the expected format if needed
          const hands = gameData.hands
          if (typeof hands === 'object' && !Array.isArray(hands)) {
            // Convert from server format (N, E, S, W) to frontend format (North, East, South, West)
            const positionMap = { N: 'North', E: 'East', S: 'South', W: 'West' }
            const convertedHands: Record<string, any[]> = {}
            
            Object.entries(hands).forEach(([key, cards]) => {
              const frontendPosition = positionMap[key as keyof typeof positionMap]
              if (frontendPosition && Array.isArray(cards)) {
                console.log(`Start room - converting ${key} to ${frontendPosition}:`, cards)
                // Convert string format to object format
                convertedHands[frontendPosition] = cards.map(cardString => {
                  // Handle "10" cards correctly
                  let rank: string
                  let suitChar: string
                  
                  if (cardString.startsWith('10')) {
                    rank = '10'
                    suitChar = cardString.slice(2) // Take everything after "10"
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
            console.log('Start room - converted hands:', convertedHands)
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
          console.log('Start room - converted phase to:', gameData.phase)
        }
        
        // Convert turn to currentPlayer
        if (gameData.turn) {
          console.log('Start room - converting turn from:', gameData.turn)
          // Convert user ID to position by checking which position this user is assigned to
          const { currentRoom } = useRoomDataStore.getState()
          if (currentRoom) {
            // Find which seat this user is assigned to
            const seatMapping: Record<string, string> = { N: 'North', S: 'South', E: 'East', W: 'West' }
            for (const [seatKey, playerId] of Object.entries(currentRoom.seats)) {
              if (playerId && gameData.turn.includes(playerId)) {
                gameData.currentPlayer = seatMapping[seatKey] || 'North'
                console.log('Start room - converted currentPlayer to:', gameData.currentPlayer)
                break
              }
            }
          }
          // If we couldn't find a match, default to the first available position
          if (!gameData.currentPlayer) {
            gameData.currentPlayer = 'North'
            console.log('Start room - defaulted currentPlayer to:', gameData.currentPlayer)
          }
        }
        
        console.log('Start room - gameData after fixes:', gameData)
        console.log('Start room - gameData.currentTrick after fix:', gameData.currentTrick)
        console.log('Start room - gameData.tricks after fix:', gameData.tricks)
        console.log('Start room - gameData.hands after fix:', gameData.hands)
        
        console.log('Start room - about to set game state in store')
        useGameStore.getState().updateGameState(gameData as any)
        console.log('Start room - game state set in store')
        console.log('Start room - current store state:', useGameStore.getState().gameState)
        setAiThinking(false)
      }
      
      // Emit a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('roomStarted', { detail: data }))
    }

    // Register all message handlers
    console.log('useWebSocketMessages - registering handlers for roomId:', roomId)
    websocketService.onMessage(WebSocketActions.ROOM_UPDATE, handleRoomUpdate)
    websocketService.onMessage(WebSocketActions.PLAYER_JOINED, handlePlayerJoined)
    websocketService.onMessage(WebSocketActions.PLAYER_LEFT, handlePlayerLeft)
    websocketService.onMessage(WebSocketActions.ROOM_STARTED, handleStartRoom)
    
    // Also handle the specific roomUpdated action that includes updateType
    websocketService.onMessage('roomUpdated', handleRoomUpdate)
    console.log('useWebSocketMessages - handlers registered for roomUpdated')
    
    // Game state handlers
    websocketService.onMessage(WebSocketActions.GAME_STATE_UPDATE, handleGameStateUpdate)
    websocketService.onMessage(WebSocketActions.BID_UPDATE, handleBidUpdate)
    websocketService.onMessage(WebSocketActions.BID_MADE, handleBidMade) // Added handleBidMade
    websocketService.onMessage(WebSocketActions.CARD_PLAYED, handleCardPlayed)
    websocketService.onMessage(WebSocketActions.GAME_STARTED, handleGameStarted)
    websocketService.onMessage(WebSocketActions.GAME_COMPLETED, handleGameCompleted)

    // Cleanup function
    return () => {
      websocketService.offMessage(WebSocketActions.ROOM_UPDATE)
      websocketService.offMessage(WebSocketActions.PLAYER_JOINED)
      websocketService.offMessage(WebSocketActions.PLAYER_LEFT)
      websocketService.offMessage(WebSocketActions.ROOM_STARTED)
      websocketService.offMessage('roomUpdated')
      websocketService.offMessage(WebSocketActions.GAME_STATE_UPDATE)
      websocketService.offMessage(WebSocketActions.BID_UPDATE)
      websocketService.offMessage(WebSocketActions.BID_MADE) // Added offMessage for handleBidMade
      websocketService.offMessage(WebSocketActions.CARD_PLAYED)
      websocketService.offMessage(WebSocketActions.GAME_STARTED)
      websocketService.offMessage(WebSocketActions.GAME_COMPLETED)
    }
  }, [roomId, updateCurrentRoom, setAiThinking])
}
