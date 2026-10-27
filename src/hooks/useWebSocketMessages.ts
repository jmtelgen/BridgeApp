import { useEffect } from 'react'
import {
  roomWebSocketService,
  websocketService,
} from '../services/websocketService'
import { useRoomDataStore } from '../stores/roomDataStore'
import { useGameStore } from '../stores/gameStore'
import { useUserStore } from '../stores/userStore'
import { Position } from '../components/bridge/types'
import { convertSeatBasedResponseToGameData } from '../utils/gameStateConverter'
import { observeSoundSnapshot, resetSoundBaseline } from '../services/soundService'
import { useRoomFeaturesStore } from '../stores/roomFeaturesStore'

export function applyRoomMessage(data: any, roomId: string): void {
  if (
    (data.roomId || data.room?.roomId) &&
    (data.roomId || data.room?.roomId) !== roomId
  )
    return
  if (data.success === false || data.error) return
  const rooms = useRoomDataStore.getState()
  if (rooms.currentRoom && rooms.currentRoom.roomId !== roomId) return
  const revision = data.publicState?.revision ?? data.revision
  const currentRevision = useGameStore.getState().gameData.revision
  if (
    rooms.currentRoom?.roomId === roomId &&
    revision != null &&
    currentRevision != null &&
    revision < currentRevision
  )
    return
  observeSoundSnapshot(data, roomId)
  if (data.publicState) {
    const { boardId, revision, agreements, practiceMode, pacing, scoreboard, computerLevel, eventId, claim, claimSettlement } = data.publicState
    useRoomFeaturesStore.getState().update(roomId, { boardId, revision, agreements, practiceMode, pacing, scoreboard, computerLevel, eventId, claim, claimSettlement })
  }
  const userId = useUserStore.getState().userId
  if (data.room) {
    // Never retain the server's internal deal in the persisted room cache.
    const { gameData: _hidden, ...safeRoom } = data.room
    rooms.setCurrentRoom({ ...safeRoom, gameData: null } as any)
    if (userId)
      useGameStore
        .getState()
        .detectAndSetCurrentPlayerPosition(data.room.seats || {}, userId)
  }
  if (
    data.publicState &&
    data.privateState &&
    (rooms.currentRoom?.roomId === roomId || data.room?.roomId === roomId)
  ) {
    if (data.publicState.currentPhase === 'waiting') return
    const position = data.privateState.seat || data.seat
    if (!['North', 'East', 'South', 'West'].includes(position)) return
    const game = useGameStore.getState()
    game.setCurrentPlayerPosition(position as Position)
    game.updateGameData(
      convertSeatBasedResponseToGameData(
        data,
        data.room?.seats || rooms.currentRoom?.seats || {},
        position
      )
    )
  }
}

export function useWebSocketMessages(roomId: string | undefined) {
  useEffect(() => {
    if (!roomId) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let active = true
    const resync = (delay = 1000) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        const userId = useUserStore.getState().userId
        if (active && userId)
          roomWebSocketService.getGameState(roomId, userId).catch(() => {})
      }, delay)
    }
    const actions = [
      'roomUpdated',
      'playerJoined',
      'playerLeft',
      'roomStarted',
      'gameStarted',
      'gameCompleted',
      'bidMade',
      'cardPlayed',
      'trickCleared',
      'gameState',
      'boardStarted',
      'presenceChanged',
      'practicePaceChanged',
      'computerLevelChanged',
      'claimUpdated',
      'duplicateEventStarted',
    ]
    const disposers = actions.map((action) =>
      websocketService.onMessage(action, (data) => {
        if (
          (data.roomId || data.room?.roomId) &&
          (data.roomId || data.room?.roomId) !== roomId
        )
          return
        applyRoomMessage(data, roomId)
        if (timer) clearTimeout(timer)
        const scheduled = data.publicState?.pendingAction
        if (scheduled || data.robotPending) {
          const remaining = scheduled && data.publicState?.serverTimeMs != null
            ? Math.max(100, scheduled.dueAt - data.publicState.serverTimeMs + 50)
            : 1000
          resync(remaining)
        } else if (data.publicState?.claim?.status === 'pending') {
          resync(Math.max(100, data.publicState.claim.expiresAt - (data.publicState.serverTimeMs ?? Date.now()) + 100))
        }
      })
    )
    disposers.push(
      websocketService.onMessage('connection', () => resetSoundBaseline()),
      websocketService.onMessage('error', (data) => {
        if (data.statusCode === 409) resync()
        if (data.statusCode === 401)
          websocketService.reconnect().catch(() => {})
      })
    )
    return () => {
      active = false
      if (timer) clearTimeout(timer)
      disposers.forEach((dispose) => dispose())
    }
  }, [roomId])
}
