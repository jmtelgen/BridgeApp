# WebSocket Message Handlers

This document describes the WebSocket message handlers implemented in the Bridge Game application.

## Room Management Handlers

### startRoom Handler

The `startRoom` handler is responsible for processing messages when a room transitions from the lobby state to the game state.

#### Configuration

The handler is configured in the following files:

1. **WebSocket Configuration** (`src/config/websocket.ts`):
   - Added `'startRoom'` to the `supportedActions` array
   - Added `ROOM_STARTED: 'startRoom'` to the `WebSocketActions` object

2. **WebSocket Service** (`src/services/websocketService.ts`):
   - Added `onStartRoom()` and `offStartRoom()` methods to `roomWebSocketService`
   - These methods register/unregister message handlers for the `startRoom` action

#### Message Handler Implementation

The handler is implemented in `src/hooks/useWebSocketMessages.ts`:

```typescript
const handleStartRoom = (data: any) => {
  console.log('Start room:', data)
  
  // Update room data if provided
  if (data.room) {
    updateCurrentRoom(data.room)
  }
  
  // Update game state if provided
  if (data.gameState) {
    useGameStore.setState({ gameState: data.gameState })
    setAiThinking(false)
  }
  
  // Emit a custom event that components can listen to
  window.dispatchEvent(new CustomEvent('startRoom', { detail: data }))
}
```

#### Component Integration

Components that need to respond to room started events can listen for the custom `startRoom` event:

```typescript
useEffect(() => {
  const handleStartRoom = (event: CustomEvent) => {
    console.log('Start room event received:', event.detail)
    // Handle the room started event
    setGameStarted(true)
  }

  window.addEventListener('startRoom', handleStartRoom as EventListener)

  return () => {
    window.removeEventListener('startRoom', handleStartRoom as EventListener)
  }
}, [])
```

#### Triggering Room Start

To start a room, use the `roomWebSocketService.startRoom()` method:

```typescript
import { roomWebSocketService } from '../services/websocketService'

const handleStartGame = async () => {
  try {
    await roomWebSocketService.startRoom(roomId, userId)
    // The startRoom event will be handled automatically
  } catch (error) {
    console.error('Failed to start room:', error)
  }
}
```

#### Testing

You can test the handler using the utility functions in `src/utils/testWebSocket.ts`:

```typescript
import { testStartRoomHandler } from '../utils/testWebSocket'

// Test the handler
testStartRoomHandler()
```

#### Message Format

The expected message format for `startRoom` is:

```typescript
{
  action: 'startRoom',
  success: boolean,
  room?: {
    roomId: string,
    roomName: string,
    ownerId: string,
    seats: Record<string, string>,
    state: string,
    isPrivate: boolean
  },
  gameState?: GameState,
  timestamp: number
}
```

## Other Handlers

### Room Updates
- `roomUpdated`: Handles general room updates
- `playerJoined`: Handles when a new player joins the room
- `playerLeft`: Handles when a player leaves the room

### Game State Updates
- `gameStateUpdate`: Handles general game state updates
- `bidUpdate`: Handles bid-related updates
- `cardPlayed`: Handles when a card is played
- `gameStarted`: Handles when the game begins
- `gameCompleted`: Handles when the game ends

## Usage Examples

### In a React Component

```typescript
import { useEffect } from 'react'
import { useWebSocketMessages } from '../hooks/useWebSocketMessages'

function GameComponent({ roomId }: { roomId: string }) {
  // Set up WebSocket message handling
  useWebSocketMessages(roomId)
  
  // Listen for specific events
  useEffect(() => {
    const handleStartRoom = (event: CustomEvent) => {
      console.log('Game is starting!', event.detail)
    }
    
    window.addEventListener('startRoom', handleStartRoom as EventListener)
    
    return () => {
      window.removeEventListener('startRoom', handleStartRoom as EventListener)
    }
  }, [])
  
  return <div>Game Component</div>
}
```

### Manual WebSocket Message Handling

```typescript
import { websocketService } from '../services/websocketService'
import { WebSocketActions } from '../config/websocket'

// Register a custom handler
websocketService.onMessage(WebSocketActions.ROOM_STARTED, (data) => {
  console.log('Custom room started handler:', data)
})

// Clean up when done
websocketService.offMessage(WebSocketActions.ROOM_STARTED)
```
