import { useEffect } from 'react'
import { websocketService } from '../services/websocketService'

/**
 * Custom hook for WebSocket cleanup in components
 * Automatically handles cleanup when component unmounts or room changes
 */
export function useWebSocketCleanup(roomId?: string) {
  useEffect(() => {
    // Cleanup function that runs when component unmounts or roomId changes
    return () => {
      if (roomId) {
        console.log(`Component unmounting, cleaning up room subscriptions for: ${roomId}`)
        // Cleanup room-specific subscriptions but keep connection alive
        websocketService.cleanupRoom(roomId)
      }
    }
  }, [roomId])
}

/**
 * Custom hook for game-specific WebSocket cleanup
 * Handles game state subscriptions and room cleanup
 */
export function useGameWebSocketCleanup(roomId?: string) {
  useEffect(() => {
    // Cleanup function that runs when component unmounts or roomId changes
    return () => {
      if (roomId) {
        console.log(`Game component unmounting, cleaning up game subscriptions for room: ${roomId}`)
        // Cleanup game-specific subscriptions but keep connection alive
        websocketService.offMessage('game_state_update')
        websocketService.cleanupRoom(roomId)
      }
    }
  }, [roomId])
}

/**
 * Custom hook for WebSocket connection management
 * Handles connection and disconnection based on component lifecycle
 */
export function useWebSocketConnection(shouldConnect: boolean = true) {
  useEffect(() => {
    if (shouldConnect) {
      // Connect to WebSocket when component mounts
      websocketService.connect().catch(error => {
        console.warn('Failed to connect to WebSocket:', error)
      })
    }

    // Cleanup function - don't disconnect on component unmount
    return () => {
      if (shouldConnect) {
        console.log('Component unmounting, keeping WebSocket connection alive')
        // Don't disconnect - connection will be maintained for navigation
      }
    }
  }, [shouldConnect])
} 