import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { userAuthService } from '../services/userAuthService'
import { tokenManager } from '../services/tokenManager'

let authGeneration = 0
let refreshPromise: Promise<boolean> | null = null
let loggingOut = false
export const getAuthGeneration = () => authGeneration

function discardGuestCredentials() {
  try { sessionStorage.removeItem('bridge-guest-session') } catch { /* Storage may be disabled. */ }
}

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
        authGeneration += 1
        refreshPromise = null
        tokenManager.stopTokenMonitoring()
        discardGuestCredentials()
        set({ isAuthenticated: true, accessToken, user, userId: user.userId, playerName: user.username, position: null, wasAuthenticated: true })
        
        // Initialize token monitoring when user logs in
        tokenManager.initialize()
      },
      clearAuthData: () => {
        authGeneration += 1
        refreshPromise = null
        discardGuestCredentials()
        set({ isAuthenticated: false, accessToken: null, user: null, userId: null, playerName: null, position: null, wasAuthenticated: false })
        
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
        loggingOut = true
        get().clearAuthData()
        try {
          await userAuthService.logout()
        } finally {
          loggingOut = false
        }
      },
      
      attemptTokenRefresh: async () => {
        if (loggingOut || !get().user || !(get().isAuthenticated || get().wasAuthenticated)) return false
        if (refreshPromise) return refreshPromise
        const generation = authGeneration
        const user = get().user!
        const promise = (async () => {
          try {
            const response = await userAuthService.refreshToken()
            if (generation !== authGeneration) return false
            if (!response.accessToken || (response.userId && response.userId !== user.userId))
              throw new Error('Invalid refreshed account identity')
            set({ isAuthenticated: true, accessToken: response.accessToken, user,
              userId: user.userId, wasAuthenticated: true })
            tokenManager.initialize()
            return true
          } catch {
            if (generation === authGeneration) get().clearAuthData()
            return false
          }
        })()
        refreshPromise = promise
        try { return await promise } finally {
          if (refreshPromise === promise) refreshPromise = null
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