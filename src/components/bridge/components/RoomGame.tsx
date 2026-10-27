import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RoomLobby } from './RoomLobby'
import BridgeGame from '../play'
import { useRoomDataStore } from '../../../stores/roomDataStore'
import { useGameStore } from '../../../stores/gameStore'
import { useUserStore } from '../../../stores/userStore'
import {
  useWebSocketMessages,
  applyRoomMessage,
} from '../../../hooks/useWebSocketMessages'
import {
  roomWebSocketService,
  websocketService,
} from '../../../services/websocketService'
import { roomService } from '../../../services/roomService'
import { ensureGameSession } from '../../../services/gameSessionService'
import { RoomFeatures } from './RoomFeatures'
import { useRoomFeaturesStore } from '../../../stores/roomFeaturesStore'

export function RoomGame() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const currentRoom = useRoomDataStore((state) => state.currentRoom)
  const phase = useGameStore((state) => state.gameData.phase)
  const [status, setStatus] = useState('Connecting to your table…')
  const [ready, setReady] = useState(false)
  const [retry, setRetry] = useState(0)
  const [joining, setJoining] = useState(false)
  const [joinName, setJoinName] = useState(
    useUserStore.getState().playerName || ''
  )
  const [failed, setFailed] = useState(false)
  const [invitationToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('invitationToken') || undefined)
  useWebSocketMessages(roomId)

  useEffect(() => {
    if (!roomId) return
    let active = true
    let syncing = false
    const controller = new AbortController()
    setReady(false)
    setFailed(false)
    useGameStore.getState().startNewGame()
    useRoomFeaturesStore.getState().clear()
    if (useRoomDataStore.getState().currentRoom?.roomId !== roomId)
      useRoomDataStore.getState().clearCurrentRoom()
    const sync = async () => {
      if (syncing || !active) return
      syncing = true
      setReady(false)
      setStatus('Synchronizing with the game server…')
      try {
        const { userId } = await ensureGameSession()
        if (!active) return
        const response = await roomWebSocketService.getGameState(
          roomId,
          userId,
          controller.signal
        )
        if (!active) return
        applyRoomMessage(response, roomId)
        if (useRoomDataStore.getState().currentRoom?.roomId !== roomId)
          throw new Error(
            'The server did not provide this room. Join it with its room code first.'
          )
        setReady(true)
      } catch (error) {
        if (active) {
          setFailed(true)
          setStatus(
            `${
              error instanceof Error ? error.message : 'Unable to load room'
            }. Live state synchronization requires the getGameState server route.`
          )
        }
      } finally {
        syncing = false
      }
    }
    const dispose = websocketService.onMessage(
      'connection',
      ({ connected, error }) => {
        if (!active) return
        if (connected) void sync()
        else {
          setReady(false)
          setStatus(
            error || 'Connection lost. Reconnecting and restoring your table…'
          )
          if (error) setFailed(true)
        }
      }
    )
    void sync()
    return () => {
      active = false
      controller.abort()
      dispose()
    }
  }, [roomId, retry])

  const disconnect = () => {
    websocketService.disconnect()
    useRoomDataStore.getState().clearCurrentRoom()
    useGameStore.getState().startNewGame()
    navigate('/')
  }
  const join = async () => {
    if (!roomId || !joinName.trim()) return
    setJoining(true)
    try {
      useUserStore.getState().setPlayerName(joinName.trim())
      const response = await roomService.joinRoom({
        roomId,
        playerName: joinName.trim(),
        invitationToken,
      })
      if (!response.success || !response.data?.room)
        throw new Error(
          response.error || 'The server did not confirm membership'
        )
      useRoomDataStore.getState().setCurrentRoom(response.data.room)
      if (invitationToken) window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setRetry((value) => value + 1)
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Unable to join this room'
      )
    } finally {
      setJoining(false)
    }
  }
  if (!ready || currentRoom?.roomId !== roomId)
    return (
      <main className="room-shell room-loading">
        <h1>Your bridge table</h1>
        <p role="status">{status}</p>
        {failed && (
          <form
            className="invite-join-form"
            onSubmit={(event) => {
              event.preventDefault()
              void join()
            }}
          >
            <p>
              Invited to room <strong>{roomId}</strong>? Join with your name,
              then synchronize.
            </p>
            <label>
              Your name
              <input
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                maxLength={50}
                autoComplete="nickname"
              />
            </label>
            <button
              className="room-button"
              disabled={joining || !joinName.trim()}
            >
              {joining ? 'Joining…' : 'Join this room'}
            </button>
          </form>
        )}
        <button
          className="room-button"
          onClick={() => setRetry((value) => value + 1)}
        >
          Retry synchronization
        </button>
        <button className="room-button secondary" onClick={disconnect}>
          Disconnect and return to rooms
        </button>
      </main>
    )
  return <>
    {phase === 'setup' ? <RoomLobby onStartGame={() => {}} onLeaveRoom={disconnect} /> : <BridgeGame onDisconnect={disconnect} />}
    <RoomFeatures onLeave={disconnect} />
  </>
}
