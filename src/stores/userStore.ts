import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

      generateUserId: () => {
        const currentUserId = get().userId
        if (currentUserId) {
          return currentUserId
        }

        const newUserId = generateRandomUserId()
        set({ userId: newUserId })
        console.log('Generated new user ID:', newUserId)
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
        set({ isAuthenticated: true, accessToken, user })
      },
      clearAuthData: () => {
        set({ isAuthenticated: false, accessToken: null, user: null })
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
        set({ isAuthenticated: false, accessToken: null, user: null })
        console.log('User logged out.')
      }
    }),
    {
      name: 'bridge-user-storage', // localStorage key
      partialize: (state) => ({ 
        userId: state.userId,
        playerName: state.playerName,
        // Note: accessToken and user are NOT persisted to localStorage for security
        // They are only stored in memory and will be cleared on page refresh
      })
    }
  )
) 