
import { websocketConfig, WebSocketActions } from '../config/websocket'
import { BidType, Suit } from '../components/bridge/types'
import { getCurrentUserId, getCurrentPlayerName } from '../utils/userUtils'

export interface WebSocketMessage {
  action: string
  data?: any
  roomId?: string
  userId?: string
  timestamp?: number
}

export interface WebSocketResponse {
  action: string
  success: boolean
  error?: string
  room?: any
  assignedSeat?: string
  gameState?: any
  message?: string
}

export interface GameAction {
  type: 'bid' | 'play' | 'pass' | 'double' | 'redouble'
  data?: any
  playerId: string
  roomId: string
}

export interface RoomAction {
  type: 'create' | 'join' | 'leave' | 'start_game'
  data?: any
  userId: string
  roomId?: string
}

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = websocketConfig.reconnectAttempts
  private reconnectDelay = websocketConfig.reconnectDelay
  private messageHandlers: Map<string, (data: any) => void> = new Map()
  private connectionPromise: Promise<void> | null = null
  private isConnecting = false

  // AWS API Gateway WebSocket endpoint
  private wsEndpoint = websocketConfig.endpoint

  /**
   * Connect to WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return Promise.resolve()
    }

    if (this.isConnecting && this.connectionPromise) {
      console.log('WebSocket connection already in progress')
      return this.connectionPromise
    }

    this.isConnecting = true
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const wsUrl = this.getWebSocketUrl()
        console.log('Connecting to WebSocket with URL:', wsUrl)
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          this.isConnecting = false
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data).catch(error => {
            console.error('Error handling WebSocket message:', error)
          })
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          this.isConnecting = false
          this.handleDisconnect().catch(error => {
            console.error('Error handling WebSocket disconnect:', error)
          })
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.isConnecting = false
          reject(error)
        }

      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })

    return this.connectionPromise
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this.isConnecting = false
    this.connectionPromise = null
  }

  /**
   * Send message to WebSocket
   */
  async sendMessage(message: WebSocketMessage): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect()
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const messageString = JSON.stringify(message)
      console.log('Sending WebSocket message:', messageString)
      this.ws.send(messageString)
    } else {
      throw new Error('WebSocket is not connected')
    }
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(data: string): Promise<void> {
    try {
      const message: WebSocketResponse = JSON.parse(data)
      console.log('Received WebSocket message:', message)
      console.log('Message action:', message.action)
      console.log('Message success:', message.success)
      console.log('Message updateType:', (message as any).updateType)

      const handler = this.messageHandlers.get(message.action)
      if (handler) {
        console.log(`Calling handler for action: ${message.action}`)
        handler(message)
      } else {
        console.log(`No handler registered for action: ${message.action}`)
        console.log('Available handlers:', Array.from(this.messageHandlers.keys()))
      }

      // Handle errors
      if (!message.success && message.error) {
        const { useErrorStore } = await import('../stores/errorStore')
        useErrorStore.getState().showError(message.error)
      }

    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }

  /**
   * Handle disconnect and attempt reconnection
   */
  private async handleDisconnect(): Promise<void> {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error)
        })
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      const { useErrorStore } = await import('../stores/errorStore')
      useErrorStore.getState().showError('Lost connection to game server. Please refresh the page.')
    }
  }

  /**
   * Get WebSocket URL with query parameters
   */
  private getWebSocketUrl(): string {
    // Get user info for query parameters
    const userId = getCurrentUserId()
    const playerName = getCurrentPlayerName()

    // Build WebSocket URL with query parameters
    let wsUrl = this.wsEndpoint
    if (userId || playerName) {
      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (playerName) params.append('userName', playerName)
      wsUrl = `${this.wsEndpoint}?${params.toString()}`
    }

    return wsUrl
  }

  /**
   * Register message handler
   */
  onMessage(action: string, handler: (data: any) => void): void {
    this.messageHandlers.set(action, handler)
  }

  /**
   * Remove message handler
   */
  offMessage(action: string): void {
    this.messageHandlers.delete(action)
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Cleanup room-specific subscriptions and handlers
   */
  cleanupRoom(roomId: string): void {
    console.log(`Cleaning up WebSocket handlers for room: ${roomId}`)
    
    // Remove all message handlers for this room
    this.messageHandlers.forEach((handler, action) => {
      if (action.includes('game_state') || action.includes('room')) {
        this.messageHandlers.delete(action)
      }
    })
  }

  /**
   * Cleanup all subscriptions and handlers
   */
  cleanupAll(): void {
    console.log('Cleaning up all WebSocket handlers')
    this.messageHandlers.clear()
  }
}

// Create singleton instance
export const websocketService = new WebSocketService()

// Room Management WebSocket Methods
export const roomWebSocketService = {
  /**
   * Create room via WebSocket
   */
  createRoom: async (roomData: {
    roomName: string
    isPrivate: boolean
    maxPlayers: number
    playerName: string
    ownerId: string
  }): Promise<WebSocketResponse> => {
    const message: WebSocketMessage = {
      action: WebSocketActions.CREATE_ROOM,
      data: roomData,
      userId: roomData.ownerId, // Include userId at top level as well
      timestamp: Date.now()
    }

    console.log('Sending WebSocket createRoom message:', JSON.stringify(message, null, 2))
    await websocketService.sendMessage(message)
    
    // Wait for the actual response from the server
    // The server might respond with either CREATE_ROOM or roomUpdated action
    return new Promise((resolve) => {
      const createRoomHandler = (data: any) => {
        console.log('Received CREATE_ROOM response:', data)
        websocketService.offMessage(WebSocketActions.CREATE_ROOM)
        websocketService.offMessage('roomUpdated')
        resolve(data)
      }
      
      const roomUpdatedHandler = (data: any) => {
        console.log('Received roomUpdated response for create room:', data)
        // Resolve for any roomUpdated message with room data
        if (data.room && data.updateType === 'roomCreated') {
          console.log('Promise handler resolving for create room')
          websocketService.offMessage(WebSocketActions.CREATE_ROOM)
          // Don't remove the roomUpdated handler here - let the event handler keep it
          resolve(data)
        }
      }
      
      // Listen for both possible response types
      websocketService.onMessage(WebSocketActions.CREATE_ROOM, createRoomHandler)
      websocketService.onMessage('roomUpdated', roomUpdatedHandler)
      
      // Add timeout to prevent hanging
      setTimeout(() => {
        console.warn('Create room request timed out')
        websocketService.offMessage(WebSocketActions.CREATE_ROOM)
        // Don't remove the roomUpdated handler here - let the event handler keep it
        resolve({
          action: WebSocketActions.CREATE_ROOM,
          success: false,
          error: 'Create room request timed out'
        })
      }, 10000) // 10 second timeout
    })
  },

  /**
   * Join room via WebSocket
   */
  joinRoom: async (joinData: {
    roomId: string
    userId: string
    playerName: string
  }): Promise<WebSocketResponse> => {
    const message: WebSocketMessage = {
      action: WebSocketActions.JOIN_ROOM,
      data: joinData,
      roomId: joinData.roomId,
      userId: joinData.userId,
      timestamp: Date.now()
    }

    console.log('Sending WebSocket joinRoom message:', JSON.stringify(message, null, 2))
    await websocketService.sendMessage(message)
    
    // Wait for the actual response from the server
    // The server might respond with either JOIN_ROOM or roomUpdated action
    return new Promise((resolve) => {
      const joinRoomHandler = (data: any) => {
        console.log('Received JOIN_ROOM response:', data)
        websocketService.offMessage(WebSocketActions.JOIN_ROOM)
        websocketService.offMessage('roomUpdated')
        resolve(data)
      }
      
      const roomUpdatedHandler = (data: any) => {
        console.log('Received roomUpdated response for join room:', data)
        // Resolve for any roomUpdated message with room data
        if (data.room && data.updateType === 'userJoined') {
          console.log('Promise handler resolving for join room')
          websocketService.offMessage(WebSocketActions.JOIN_ROOM)
          // Don't remove the roomUpdated handler here - let the event handler keep it
          resolve(data)
        }
      }
      
      // Listen for both possible response types
      websocketService.onMessage(WebSocketActions.JOIN_ROOM, joinRoomHandler)
      websocketService.onMessage('roomUpdated', roomUpdatedHandler)
      
      // Add timeout to prevent hanging
      setTimeout(() => {
        console.warn('Join room request timed out')
        websocketService.offMessage(WebSocketActions.JOIN_ROOM)
        // Don't remove the roomUpdated handler here - let the event handler keep it
        resolve({
          action: WebSocketActions.JOIN_ROOM,
          success: false,
          error: 'Join room request timed out'
        })
      }, 10000) // 10 second timeout
    })
  },

  /**
   * Start room via WebSocket
   */
  startRoom: async (roomId: string, userId: string): Promise<void> => {
    const message: WebSocketMessage = {
      action: WebSocketActions.START_ROOM,
      data: { 
        userId,
        roomId
      },
      timestamp: Date.now()
    }

    await websocketService.sendMessage(message)
  },

  /**
   * Handle start room message
   */
  onStartRoom: (handler: (data: any) => void): void => {
    websocketService.onMessage(WebSocketActions.ROOM_STARTED, handler)
  },

  /**
   * Remove start room handler
   */
  offStartRoom: (): void => {
    websocketService.offMessage(WebSocketActions.ROOM_STARTED)
  }
}

// Game Actions WebSocket Methods
export const gameWebSocketService = {
  /**
   * Make a bid via WebSocket
   */
  makeBid: async (roomId: string, userId: string, bid: {
    type: BidType
    level?: number
    suit?: Suit | "NT"
  }): Promise<void> => {
    // Convert bid to server format
    let bidString: string
    if (bid.type === "Pass") {
      bidString = "pass"
    } else if (bid.type === "Double") {
      bidString = "double"
    } else if (bid.type === "Redouble") {
      bidString = "redouble"
    } else if (bid.type === "Bid" && bid.level && bid.suit) {
      const suitMap: Record<string, string> = { "♣": "C", "♦": "D", "♥": "H", "♠": "S", "NT": "NT" }
      bidString = `${bid.level}${suitMap[bid.suit]}`
    } else {
      throw new Error("Invalid bid format")
    }

    const message: WebSocketMessage = {
      action: WebSocketActions.MAKE_BID,
      data: {
        bid: bidString,
        userId: userId,
        roomId: roomId
      },
      timestamp: Date.now()
    }

    await websocketService.sendMessage(message)
  },

  /**
   * Play a card via WebSocket
   */
  playCard: async (roomId: string, userId: string, card: {
    suit: string
    rank: string
  }): Promise<void> => {
    const message: WebSocketMessage = {
      action: WebSocketActions.PLAY_CARD,
      data: {
        type: 'play',
        card,
        userId: userId,
        roomId: roomId
      },
      timestamp: Date.now()
    }

    await websocketService.sendMessage(message)
  }
}

export default websocketService 