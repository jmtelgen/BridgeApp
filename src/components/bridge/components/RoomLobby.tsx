import { useState } from 'react'
import { useRoomDataStore } from '../../../stores/roomDataStore'
import { useUserStore } from '../../../stores/userStore'
import { roomWebSocketService } from '../../../services/websocketService'
import { useErrorStore } from '../../../stores/errorStore'
import { Position } from '../types'
import { useGameStore } from '../../../stores/gameStore'
import { toDisplayPosition } from '../../../utils/positionUtils'
import { SeatPresence } from './SeatPresence'

interface RoomLobbyProps {
  onStartGame: () => void
  onLeaveRoom: () => void
}
export function RoomLobby({ onLeaveRoom }: RoomLobbyProps) {
  const { currentRoom: room, getPlayerDisplayName } = useRoomDataStore()
  const viewer = useGameStore((state) => state.currentPlayerPosition)
  const userId = useUserStore((state) => state.userId)
  const [starting, setStarting] = useState(false)
  const [shareStatus, setShareStatus] = useState('')
  if (!room)
    return (
      <main className="room-shell room-loading">
        <h1>Room unavailable</h1>
        <button onClick={onLeaveRoom}>Back to rooms</button>
      </main>
    )
  const start = async () => {
    if (!userId) return
    setStarting(true)
    try {
      await roomWebSocketService.startRoom(room.roomId, userId)
    } catch (error) {
      useErrorStore
        .getState()
        .showError(
          error instanceof Error
            ? error.message
            : 'The server did not start the game'
        )
    } finally {
      setStarting(false)
    }
  }
  const share = async () => {
    const link = `${window.location.origin}/room/${encodeURIComponent(
      room.roomId
    )}`
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(link)
      setShareStatus(
        'Invite link copied. Friends can join using this room code.'
      )
    } catch {
      setShareStatus(`Copy this room code to invite a friend: ${room.roomId}`)
    }
  }
  return (
    <main className="room-shell game-room">
      <header className="room-topbar">
        <div>
          <span className="room-eyebrow">THE BRIDGE ROOM</span>
          <h1>{room.roomName || 'Your table'}</h1>
        </div>
        <button className="room-button secondary" onClick={onLeaveRoom}>
          Disconnect and return
        </button>
      </header>
      <section className="felt-table lobby-table" aria-label="Waiting room">
        {(['North', 'East', 'South', 'West'] as Position[]).map((seat) => (
          <div
            key={seat}
            className={`table-seat seat-${toDisplayPosition(
              seat,
              viewer
            ).toLowerCase()}`}
          >
            <div className="seat-label">
              <b className="seat-compass">{seat[0]}</b>
              <div>
                <strong>
                  {room.seats[seat]
                    ? room.seats[seat] === userId
                      ? 'You'
                      : getPlayerDisplayName(seat)
                    : 'Open seat'}
                </strong>
                <small>{seat}</small>
                <SeatPresence seat={seat} />
              </div>
            </div>
          </div>
        ))}
        <section className="lobby-panel">
          <span className="room-eyebrow">TAKE A SEAT</span>
          <h2>Ready for a hand?</h2>
          <p>
            {Object.values(room.seats).filter(Boolean).length} of 4 seats
            occupied
          </p>
          <p>
            Empty seats are filled by the server with computer partners and
            opponents when the host starts.
          </p>
          <label>
            Room code <strong className="room-code">{room.roomId}</strong>
          </label>
          {!room.isPrivate && !room.eventId && <button className="room-button secondary" onClick={share}>
            Invite friends · copy link
          </button>}
          {room.isPrivate && !room.eventId && <p>Use Room membership and access below to create a private invitation.</p>}
          <p role="status" className="share-status">
            {shareStatus}
          </p>
          {room.eventId ? (
            <p role="status">Registered duplicate table. Use Duplicate club tables below; only the event organizer can start all tables.</p>
          ) : room.ownerId === userId ? (
            <button className="room-button" disabled={starting} onClick={start}>
              {starting ? 'Waiting for server…' : 'Start game'}
            </button>
          ) : (
            <p role="status">Waiting for the host to start.</p>
          )}
          <small>
            Disconnecting closes this connection; it does not claim to release
            your seat.
          </small>
        </section>
      </section>
    </main>
  )
}
