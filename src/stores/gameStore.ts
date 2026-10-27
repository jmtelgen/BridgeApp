import { create } from 'zustand'
import {
  GameData,
  PlayingCard,
  BidType,
  Suit,
  Position,
} from '../components/bridge/types'
import { gameWebSocketService } from '../services/websocketService'
import { useRoomDataStore } from './roomDataStore'
import { useUserStore } from './userStore'
import { useErrorStore } from './errorStore'
import { convertFrontendCardToServer } from '../utils/gameStateConverter'
import { useRoomFeaturesStore } from './roomFeaturesStore'

const initializeGame = (): GameData => ({
  phase: 'setup',
  currentPlayer: 'North',
  dealer: 'North',
  bids: [],
  hands: { North: [], East: [], South: [], West: [] },
  currentTrick: {
    cards: { North: null, East: null, South: null, West: null },
    winner: null,
    ledSuit: null,
    trickLeader: null,
  },
  tricks: [],
  previousTrick: null,
  contract: null,
  dummy: null,
  firstCardPlayed: false,
  gameNumber: 1,
  vulnerability: { NS: false, EW: false },
})
useRoomDataStore.subscribe((state, previous) => {
  if (previous.currentRoom && !state.currentRoom) {
    useGameStore.getState().startNewGame()
    useRoomFeaturesStore.getState().clear()
  }
})
interface GameStore {
  gameData: GameData
  selectedCard: PlayingCard | null
  aiThinking: boolean
  pendingAction: boolean
  currentPlayerPosition: Position
  setSelectedCard: (card: PlayingCard | null) => void
  updateGameData: (data: GameData) => void
  startNewGame: () => void
  makeBid: (type: BidType, level?: number, suit?: Suit | 'NT') => Promise<void>
  playCard: (card: PlayingCard) => Promise<void>
  setAiThinking: (thinking: boolean) => void
  setCurrentPlayerPosition: (position: Position) => void
  detectAndSetCurrentPlayerPosition: (
    seats: Record<string, string>,
    userId: string
  ) => Position | null
  getCurrentPlayerPosition: () => Position
  handleAITurn: () => Promise<void>
  isMyTurn: () => boolean
  canMakeMove: () => boolean
}
export const useGameStore = create<GameStore>((set, get) => {
  const send = async (
    operation: (roomId: string, userId: string) => Promise<unknown>
  ) => {
    const room = useRoomDataStore.getState().currentRoom
    const userId = useUserStore.getState().userId
    if (!room || !userId || get().pendingAction) return
    set({ pendingAction: true })
    try {
      await operation(room.roomId, userId)
      set({ selectedCard: null })
    } catch (error) {
      useErrorStore
        .getState()
        .showError(
          error instanceof Error
            ? error.message
            : 'The server could not confirm your move.'
        )
    } finally {
      set({ pendingAction: false })
    }
  }
  return {
    gameData: initializeGame(),
    selectedCard: null,
    aiThinking: false,
    pendingAction: false,
    currentPlayerPosition: 'North',
    setSelectedCard: (selectedCard) => set({ selectedCard }),
    updateGameData: (gameData) =>
      set({ gameData, selectedCard: null, aiThinking: false }),
    // Reset only when changing rooms; a new board must be requested from the server.
    startNewGame: () =>
      set({
        gameData: initializeGame(),
        selectedCard: null,
        pendingAction: false,
        aiThinking: false,
      }),
    setAiThinking: (aiThinking) => set({ aiThinking }),
    makeBid: async (type, level, suit) => {
      const { gameData } = get()
      const value =
        type === 'Bid'
          ? `${level}${
              { '♣': 'C', '♦': 'D', '♥': 'H', '♠': 'S', NT: 'NT' }[suit!]
            }`
          : type.toLowerCase()
      if (
        gameData.phase !== 'bidding' ||
        !get().canMakeMove() ||
        !gameData.validBids?.includes(value)
      )
        return
      await send((room, user) =>
        gameWebSocketService.makeBid(room, user, { type, level, suit })
      )
    },
    playCard: async (card) => {
      const { gameData } = get()
      if (
        gameData.phase !== 'playing' ||
        !get().canMakeMove() ||
        !gameData.legalCards?.includes(convertFrontendCardToServer(card))
      )
        return
      await send((room, user) =>
        gameWebSocketService.playCard(room, user, card)
      )
    },
    // Robot turns are exclusively server-owned. Kept as a compatibility no-op for old callers.
    handleAITurn: async () => {},
    isMyTurn: () => get().gameData.isMyTurn === true,
    canMakeMove: () => {
      const feature = useRoomFeaturesStore.getState()
      const roomId = useRoomDataStore.getState().currentRoom?.roomId
      return get().gameData.isMyTurn === true && !get().pendingAction &&
        !(feature.roomId === roomId && feature.board.claim?.status === 'pending')
    },
    setCurrentPlayerPosition: (currentPlayerPosition) =>
      set({ currentPlayerPosition }),
    getCurrentPlayerPosition: () => get().currentPlayerPosition,
    detectAndSetCurrentPlayerPosition: (seats, userId) => {
      const position = Object.entries(seats).find(
        ([key, value]) =>
          value === userId && ['North', 'East', 'South', 'West'].includes(key)
      )?.[0] as Position | undefined
      if (position) set({ currentPlayerPosition: position })
      return position || null
    },
  }
})
