# WebSocket API Integration

This document describes the WebSocket API integration for the Bridge Game application, designed to work with AWS API Gateway WebSocket API.

## Overview

The application now supports real-time communication through WebSocket connections, with fallback to REST API when WebSocket is unavailable. This provides:

- **Real-time game updates**: Instant game state synchronization
- **Live bidding and playing**: Immediate feedback for game actions
- **Room management**: Real-time room creation and joining
- **Automatic reconnection**: Robust connection handling
- **On-demand connection**: WebSocket connects only when user creates or joins a room

## Architecture

### Frontend WebSocket Service

The WebSocket functionality is implemented in `src/services/websocketService.ts` with the following components:

- **WebSocketService**: Core WebSocket connection management
- **roomWebSocketService**: Room management operations
- **gameWebSocketService**: Game action operations

### Connection Timing

The WebSocket connection is established **on-demand** when the user:
1. **Creates a room** - Connection established before room creation
2. **Joins a room** - Connection established before joining
3. **Reconnects after disconnection** - Automatic reconnection when needed

The connection is **maintained** during:
- **Page navigation** - Connection stays alive when moving between pages
- **Tab switching** - Connection remains active when switching tabs
- **Component unmounting** - Connection persists when components unmount

The connection is **disconnected** only when:
- **Tab is closed** - User closes the browser tab
- **Page is refreshed** - User refreshes the page

This approach ensures efficient resource usage while providing seamless user experience.

### Configuration

WebSocket settings are configured in `src/config/websocket.ts`:

```typescript
export const websocketConfig = {
  endpoint: import.meta.env.VITE_WS_ENDPOINT,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  messageTimeout: 10000,
  heartbeatInterval: 30000
}
```

## Environment Variables

Set the following environment variable for WebSocket connection:

```bash
# Development
VITE_WS_ENDPOINT=wss://ipp77av3oi.execute-api.us-west-2.amazonaws.com/dev

# Production
VITE_WS_ENDPOINT=wss://ipp77av3oi.execute-api.us-west-2.amazonaws.com/dev
```

## WebSocket Message Format

All WebSocket messages follow this format:

```typescript
interface WebSocketMessage {
  action: string          // Action type (e.g., 'create_room', 'make_bid')
  data?: any             // Action-specific data
  roomId?: string        // Room identifier (for room-specific actions)
  userId?: string        // User identifier
  timestamp?: number     // Message timestamp
}
```

## Supported Actions

### Room Management

| Action | Description | Data Format |
|--------|-------------|-------------|
| `create_room` | Create a new game room | `{ roomName, isPrivate, maxPlayers, playerName }` |
| `join_room` | Join an existing room | `{ roomId, userId, playerName }` |
| `leave_room` | Leave a room | `{ userId }` |
| `start_game` | Start a new game in room | `{ userId }` |

### Game Actions

| Action | Description | Data Format |
|--------|-------------|-------------|
| `make_bid` | Make a bid | `{ type: 'bid', bid: { suit, level }, playerId }` |
| `play_card` | Play a card | `{ type: 'play', card: { suit, rank }, playerId }` |
| `pass` | Pass (no bid) | `{ type: 'pass', playerId }` |
| `double` | Double current bid | `{ type: 'double', playerId }` |
| `redouble` | Redouble current bid | `{ type: 'redouble', playerId }` |

### Game State

| Action | Description | Data Format |
|--------|-------------|-------------|
| `subscribe_game_state` | Subscribe to game updates | `{ roomId }` |
| `unsubscribe_game_state` | Unsubscribe from updates | `{ roomId }` |

## AWS API Gateway WebSocket Setup

### Your WebSocket Endpoint

Your AWS API Gateway WebSocket API is configured at:
- **WebSocket URL**: `wss://ipp77av3oi.execute-api.us-west-2.amazonaws.com/dev`
- **Connections URL**: `https://ipp77av3oi.execute-api.us-west-2.amazonaws.com/dev/@connections`

### Connection Query Parameters

The WebSocket connection includes query parameters for user identification:

```
wss://ipp77av3oi.execute-api.us-west-2.amazonaws.com/dev?userId=user_123&userName=Alice
```

**Query Parameters:**
- `userId`: The unique user identifier (auto-generated)
- `userName`: The player's display name (user-provided)

### Required Routes

Configure the following routes in your AWS API Gateway WebSocket API:

1. **$connect** - Handle WebSocket connections
2. **$disconnect** - Handle WebSocket disconnections
3. **$default** - Handle unknown actions

### Custom Routes

Create custom routes for each action:

- `create_room`
- `join_room`
- `leave_room`
- `start_game`
- `make_bid`
- `play_card`
- `pass`
- `double`
- `redouble`
- `subscribe_game_state`
- `unsubscribe_game_state`

### Route Selection Expression

Use this route selection expression to route messages based on the action:

```
$request.body.action
```

### Lambda Integration

Each route should integrate with a Lambda function that:

1. Parses the incoming message
2. Validates the action and data
3. Processes the request
4. Sends response back to the client
5. Broadcasts updates to other connected clients

### Connection Handler ($connect)

The `$connect` Lambda function receives query parameters:

```python
def lambda_handler(event, context):
    # Extract query parameters
    query_params = event.get('queryStringParameters', {}) or {}
    user_id = query_params.get('userId')
    user_name = query_params.get('userName')
    
    # Store connection info in DynamoDB
    connection_id = event['requestContext']['connectionId']
    
    # Validate user information
    if not user_id:
        return {'statusCode': 400, 'body': 'userId is required'}
    
    # Store connection with user info
    # ... store in DynamoDB
    
    return {'statusCode': 200, 'body': 'Connected'}
```

## Usage Examples

### Creating a Room

```typescript
import { roomService } from './services/roomService'

// WebSocket connection is automatically established before room creation
const response = await roomService.createRoom({
  roomName: 'My Bridge Game',
  isPrivate: false,
  maxPlayers: 4,
  playerName: 'Alice'
})

if (response.success) {
  console.log('Room created:', response.data)
}
```

### Making a Bid

```typescript
import { gameService } from './services/gameService'

// WebSocket connection should already be established from room creation/joining
await gameService.makeBid(roomId, {
  suit: 'hearts',
  level: 3
})
```

### Subscribing to Game Updates

```typescript
import { gameService } from './services/gameService'

// WebSocket connection should already be established from room creation/joining
gameService.subscribeToGameState(roomId, (gameState) => {
  console.log('Game state updated:', gameState)
  // Update UI with new game state
})
```

## Error Handling

The WebSocket service includes comprehensive error handling:

- **Connection errors**: Automatic reconnection with exponential backoff
- **Message errors**: Graceful fallback to REST API
- **Timeout handling**: Configurable message timeouts
- **User feedback**: Error messages displayed via error store

## Cleanup and Resource Management

The application implements comprehensive WebSocket cleanup to prevent memory leaks and ensure proper resource management:

### **Automatic Cleanup**

1. **Tab Close**: WebSocket disconnects only when the browser tab is closed
2. **Page Navigation**: Connection is maintained when navigating between pages
3. **Tab Switching**: Connection is maintained when switching between tabs
4. **Component Unmounting**: Room-specific subscriptions are cleaned up but connection remains
5. **Room Navigation**: Game state subscriptions are removed when leaving rooms

### **Cleanup Hooks**

Custom React hooks for WebSocket management:

```typescript
// Room-specific cleanup
useWebSocketCleanup(roomId)

// Game-specific cleanup
useGameWebSocketCleanup(roomId)

// Connection management
useWebSocketConnection(shouldConnect)
```

### **Cleanup Methods**

Service-level cleanup methods:

```typescript
// Cleanup room-specific handlers
websocketService.cleanupRoom(roomId)

// Cleanup all handlers
websocketService.cleanupAll()

// Leave room with cleanup
roomService.leaveRoomAndCleanup(roomId, userId)

// Cleanup game subscriptions
gameService.cleanupGame(roomId)
```

### **Browser Event Handling**

- **beforeunload**: Disconnects WebSocket when tab closes/refreshes
- **visibilitychange**: Maintains connection when switching tabs
- **Component unmount**: Cleans up subscriptions but maintains connection

## Fallback Strategy

When WebSocket operations fail, the application automatically falls back to REST API calls:

1. **Primary**: Attempt WebSocket operation
2. **Fallback**: If WebSocket fails, use REST API
3. **Error handling**: Display appropriate error messages

This ensures the application remains functional even when WebSocket connections are unavailable.

## Testing

### Local Development

For local development, you can mock WebSocket responses or use a local WebSocket server.

### Production Testing

1. **Set Environment Variables**:
   ```bash
   VITE_WS_ENDPOINT=wss://ipp77av3oi.execute-api.us-west-2.amazonaws.com/dev
   ```

2. **Test WebSocket Connection**:
   - Start the development server: `npm start`
   - Open browser console to check WebSocket connection status
   - Look for "WebSocket connected" message

3. **Test Game Actions**:
   - Create a room and verify WebSocket connection
   - Join a room and test real-time updates
   - Make bids and play cards to test game actions
   - Monitor CloudWatch logs for Lambda function execution

### Connection Testing

You can test the WebSocket connection directly in the browser console:

```javascript
// Test WebSocket connection with query parameters
const userId = 'test_user_123'
const userName = 'Test Player'
const wsUrl = `wss://ipp77av3oi.execute-api.us-west-2.amazonaws.com/dev?userId=${userId}&userName=${encodeURIComponent(userName)}`

const ws = new WebSocket(wsUrl)

ws.onopen = () => console.log('Connected to WebSocket with user info')
ws.onmessage = (event) => console.log('Received:', JSON.parse(event.data))
ws.onerror = (error) => console.error('WebSocket error:', error)
ws.onclose = (event) => console.log('Disconnected:', event.code, event.reason)

// Test message
ws.send(JSON.stringify({
  action: 'create_room',
  data: { roomName: 'Test Room', isPrivate: false, maxPlayers: 4, playerName: userName },
  timestamp: Date.now()
}))
```

## Monitoring

Monitor your WebSocket API using:

- **CloudWatch Metrics**: Connection count, message count, error rates
- **CloudWatch Logs**: Lambda function logs for debugging
- **API Gateway Dashboard**: Request/response metrics

## Security Considerations

1. **Authentication**: Implement proper authentication for WebSocket connections
2. **Authorization**: Validate user permissions for room and game actions
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Input Validation**: Validate all incoming WebSocket messages
5. **CORS**: Configure CORS settings for WebSocket connections

## Performance Optimization

1. **Connection Pooling**: Reuse WebSocket connections when possible
2. **Message Batching**: Batch multiple updates when appropriate
3. **Compression**: Enable WebSocket compression for large messages
4. **Caching**: Cache frequently accessed game state data 