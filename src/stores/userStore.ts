import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserStore {
  userId: string | null
  playerName: string | null
  position: "N" | "S" | "E" | "W" | null
  generateUserId: () => string
  setPlayerName: (name: string) => void
  setPosition: (position: "N" | "S" | "E" | "W") => void
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
      position: null,

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
      }
    }),
    {
      name: 'bridge-user-storage', // localStorage key
      partialize: (state) => ({ 
        userId: state.userId,
        playerName: state.playerName,
      })
    }
  )
) 