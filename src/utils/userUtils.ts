import { useUserStore } from '../stores/userStore'

/**
 * Get the current user ID from the store
 * @returns The current user ID or null if not set
 */
export function getCurrentUserId(): string | null {
  return useUserStore.getState().userId
}

/**
 * Get the current player name from the store
 * @returns The current player name or null if not set
 */
export function getCurrentPlayerName(): string | null {
  return useUserStore.getState().playerName
}

/**
 * Check if the user is properly initialized
 * @returns True if user ID exists, false otherwise
 */
export function isUserInitialized(): boolean {
  return !!getCurrentUserId()
}

/**
 * Get user info for API calls
 * @returns Object with userId and playerName
 */
export function getUserInfo(): { userId: string | null; playerName: string | null } {
  const state = useUserStore.getState()
  return {
    userId: state.userId,
    playerName: state.playerName
  }
}

/**
 * Validate that user is initialized before making API calls
 * @returns True if user is ready, false otherwise
 */
export function validateUserReady(): boolean {
  const userId = getCurrentUserId()
  if (!userId) {
    console.error('User ID not found. User may not be initialized.')
    return false
  }
  return true
} 