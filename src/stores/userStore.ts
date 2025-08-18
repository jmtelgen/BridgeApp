import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { userAuthService } from '../services/userAuthService'
import { tokenManager } from '../services/tokenManager'

interface User {
  userId: string
  username: string
  email: string
  createdAt: string
}

interface UserStore {
  userId: string | null
  playerName: string | null
  position: "N" | "S" | "E" | "W" | null
  
  // Authentication state
  isAuthenticated: boolean
  accessToken: string | null
  user: User | null
  wasAuthenticated: boolean // Flag for token refresh on page load
  
  // Methods
  generateUserId: () => string
  setPlayerName: (name: string) => void
  setPosition: (position: "N" | "S" | "E" | "W") => void
  clearUser: () => void
  
  // Authentication methods
  setAuthData: (accessToken: string, user: User) => void
  clearAuthData: () => void
  getAccessToken: () => string | null
  updateAccessToken: (newToken: string) => void
  logout: () => Promise<void>
  attemptTokenRefresh: () => Promise<boolean>
}

// Generate a random user ID
const generateRandomUserId = (): string => {
  // Generate a random string with timestamp for uniqueness
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 15)
  return `user_${timestamp}_${randomStr}`
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      userId: null,
      playerName: null,
      position: null,

      // Authentication state
      isAuthenticated: false,
      accessToken: null,
      user: null,
      wasAuthenticated: false,

      generateUserId: () => {
        const currentUserId = get().userId
        if (currentUserId) {
          return currentUserId
        }

        const newUserId = generateRandomUserId()
        set({ userId: newUserId })
        return newUserId
      },

      setPlayerName: (name: string) => {
        set({ playerName: name })
      },

      setPosition: (position: "N" | "S" | "E" | "W") => {
        set({ position })
      },

      clearUser: () => {
        set({ userId: null, playerName: null, position: null })
      },
      
      // Authentication methods
      setAuthData: (accessToken: string, user: User) => {
        set({ isAuthenticated: true, accessToken, user, wasAuthenticated: true })
        
        // Initialize token monitoring when user logs in
        tokenManager.initialize()
      },
      clearAuthData: () => {
        set({ isAuthenticated: false, accessToken: null, user: null, wasAuthenticated: false })
        
        // Stop token monitoring when user logs out
        tokenManager.stopTokenMonitoring()
      },
      getAccessToken: () => {
        return get().accessToken
      },
      updateAccessToken: (newToken: string) => {
        set({ accessToken: newToken })
      },
      logout: async () => {
        // In a real application, you would call an auth service to log out
        // For now, we'll just clear the data locally
        set({ isAuthenticated: false, accessToken: null, user: null, wasAuthenticated: false })
        
        // Stop token monitoring
        tokenManager.stopTokenMonitoring()
      },
      
      attemptTokenRefresh: async () => {
        try {
          const response = await userAuthService.refreshToken()
          
          if (response.accessToken) {
            // Update the store with new token
            set({ 
              isAuthenticated: true, 
              accessToken: response.accessToken,
              user: get().user, // Keep existing user data
              wasAuthenticated: true
            })
            
            // Initialize token monitoring
            tokenManager.initialize()
            
            return true
          } else {
            throw new Error('No access token in refresh response')
          }
        } catch (error) {
          // Clear auth data if refresh fails
          set({ isAuthenticated: false, accessToken: null, user: null, wasAuthenticated: false })
          return false
        }
      }
    }),
    {
      name: 'bridge-user-storage', // localStorage key
      partialize: (state) => ({ 
        userId: state.userId,
        playerName: state.playerName,
        // Store minimal auth info for token refresh on page load
        // We'll store a flag indicating the user was previously authenticated
        wasAuthenticated: state.isAuthenticated,
        // Store user info (without sensitive data) for better UX
        user: state.user ? {
          userId: state.user.userId,
          username: state.user.username,
          email: state.user.email
        } : null
      })
    }
  )
) 