// Utility functions for testing WebSocket handlers

/**
 * Simulate a startRoom WebSocket message for testing
 */
export function simulateStartRoomMessage(data: any = {}) {
  const mockMessage = {
    action: 'startRoom',
    success: true,
    room: data.room || {
      roomId: 'test-room-123',
      roomName: 'Test Room',
      ownerId: 'test-owner',
      seats: { N: 'Player1', S: 'Player2', E: 'Player3', W: 'Player4' },
      state: 'playing',
      isPrivate: false
    },
    gameState: data.gameState || null,
    timestamp: Date.now()
  }

  // Dispatch the custom event that the handler listens for
  window.dispatchEvent(new CustomEvent('roomStarted', { detail: mockMessage }))
  
  console.log('Simulated startRoom message:', mockMessage)
  return mockMessage
}

/**
 * Test the startRoom handler by simulating a message
 */
export function testStartRoomHandler() {
  console.log('Testing startRoom handler...')
  
  // Add a temporary listener to see if the event is received
  const testListener = (event: CustomEvent) => {
    console.log('✅ startRoom event received in test:', event.detail)
  }
  
  window.addEventListener('roomStarted', testListener as EventListener)
  
  // Simulate the message
  const message = simulateStartRoomMessage()
  
  // Clean up after a short delay
  setTimeout(() => {
    window.removeEventListener('roomStarted', testListener as EventListener)
    console.log('Test completed')
  }, 1000)
  
  return message
}
