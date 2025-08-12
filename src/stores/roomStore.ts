import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Theme {
  name: string
  colors: {
    background: string
    cardBackground: string
    tableBackground: string
    primary: string
    secondary: string
    accent: string
    text: string
    textMuted: string
    border: string
    cardBorder: string
    selectedCard: string
    currentPlayer: string
  }
}

const defaultTheme: Theme = {
  name: "Classic Green",
  colors: {
    background: "bg-green-50",
    cardBackground: "bg-white",
    tableBackground: "bg-green-200",
    primary: "bg-green-600 text-white",
    secondary: "bg-green-100 text-green-800",
    accent: "bg-green-500",
    text: "text-gray-900",
    textMuted: "text-gray-600",
    border: "border-green-300",
    cardBorder: "border-gray-300",
    selectedCard: "ring-green-500 bg-green-50",
    currentPlayer: "bg-green-600 text-white",
  },
}

interface RoomStore {
  // State
  validRooms: Set<string>
  theme: Theme
  
  // Actions
  addValidRoom: (roomId: string) => void
  isValidRoom: (roomId: string) => boolean
  setTheme: (theme: Theme) => void
  clearValidRooms: () => void
}

export const useRoomStore = create<RoomStore>()(
  persist(
    (set, get) => ({
      // Initial state
      validRooms: new Set(),
      theme: defaultTheme,

      // Actions
      addValidRoom: (roomId) => {
        set((state) => ({
          validRooms: new Set([...state.validRooms, roomId])
        }))
      },

      isValidRoom: (roomId) => {
        return get().validRooms.has(roomId)
      },

      setTheme: (theme) => {
        set({ theme })
      },

      clearValidRooms: () => {
        set({ validRooms: new Set() })
      }
    }),
    {
      name: 'bridge-room-storage', // localStorage key
      partialize: (state) => ({ 
        validRooms: Array.from(state.validRooms), // Convert Set to Array for storage
        theme: state.theme 
      }),
      onRehydrateStorage: () => (state) => {
        // Convert Array back to Set when rehydrating
        if (state && state.validRooms) {
          state.validRooms = new Set(state.validRooms)
        }
      }
    }
  )
) 