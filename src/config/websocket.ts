// WebSocket Configuration for AWS API Gateway WebSocket API

export const websocketConfig = {
  // WebSocket endpoint - should be set in environment variables
  endpoint: import.meta.env.VITE_WS_ENDPOINT || 'wss://ipp77av3oi.execute-api.us-west-2.amazonaws.com/dev',
  
  // Connection settings
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  
  // Message timeout (in milliseconds)
  messageTimeout: 10000,
  
  // Heartbeat interval (in milliseconds) - for keeping connection alive
  heartbeatInterval: 30000,

  // Query parameters for WebSocket connection
  queryParams: {
    userId: true,    // Include user ID in connection
    userName: true   // Include player name in connection
  },
  
  // AWS API Gateway WebSocket specific settings
  aws: {
    // Route selection expression (if using custom route selection)
    routeSelectionExpression: '$request.body.action',
    
    // Supported actions for AWS API Gateway routes
    supportedActions: [
      // Room management
      'createRoom',
      'joinRoom',
      'startRoom',
      
      // Game actions
      'makeBid',
      'playCard'
    ]
  }
}

// WebSocket message types for type safety
export const WebSocketActions = {
  // Room management
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  START_ROOM: 'startRoom',
  ROOM_UPDATE: 'roomUpdated', // Fixed to match server action
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  
  // Game actions
  MAKE_BID: 'makeBid',
  PLAY_CARD: 'playCard',
  
  // Game state updates (from server)
  GAME_STATE_UPDATE: 'gameStateUpdate',
  BID_UPDATE: 'bidUpdate',
  CARD_PLAYED: 'cardPlayed',
  GAME_STARTED: 'gameStarted',
  GAME_COMPLETED: 'gameCompleted'
} as const

export type WebSocketAction = typeof WebSocketActions[keyof typeof WebSocketActions]

// Environment variable validation
export function validateWebSocketConfig(): void {
  // Only warn if no endpoint is configured at all
  if (!websocketConfig.endpoint) {
    console.warn('WebSocket endpoint not configured. Please set VITE_WS_ENDPOINT environment variable.')
  }
}

// Initialize configuration validation
validateWebSocketConfig() 