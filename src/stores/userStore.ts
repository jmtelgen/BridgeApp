import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserStore {
  userId: string | null
  playerName: string | null
  generateUserId: () => string
  setPlayerName: (name: string) => void
  clearUser: () => void
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

      clearUser: () => {
        set({ userId: null, playerName: null })
      }
    }),
    {
      name: 'bridge-user-storage', // localStorage key
      partialize: (state) => ({ 
        userId: state.userId,
        playerName: state.playerName 
      })
    }
  )
) 