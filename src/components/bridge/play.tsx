import { useState } from 'react'
import { BiddingArea } from './components/BiddingArea'
import { useGameStore } from '../../stores/gameStore'
import { useRoomDataStore } from '../../stores/roomDataStore'
import { useUserStore } from '../../stores/userStore'
import { PlayingCard, Position } from './types'
import { toDisplayPosition } from '../../utils/positionUtils'
import { convertFrontendCardToServer } from '../../utils/gameStateConverter'
import { roomWebSocketService } from '../../services/websocketService'
import { useErrorStore } from '../../stores/errorStore'
import { sortVisibleHand } from '../../utils/handOrder'
import { SeatPresence } from './components/SeatPresence'
import { useRoomFeaturesStore } from '../../stores/roomFeaturesStore'
import { ClaimControls } from './components/ClaimControls'

export function TableCard({
  card,
  playable,
  onPlay,
  index = 0,
}: {
  card: PlayingCard
  playable?: boolean
  onPlay?: () => void
  index?: number
}) {
  const suitNames = {
    '♣': 'clubs',
    '♦': 'diamonds',
    '♥': 'hearts',
    '♠': 'spades',
  }
  const name = `${card.rank} of ${suitNames[card.suit]}`
  return (
    <button
      type="button"
      className={`table-card ${
        card.suit === '♥' || card.suit === '♦' ? 'red-suit' : ''
      }`}
      aria-label={`${onPlay ? 'Play ' : ''}${name}`}
      disabled={!playable}
      onClick={onPlay}
      style={{ '--deal-index': index } as React.CSSProperties}
    >
      <span className="card-corner">
        {card.rank}
        <span>{card.suit}</span>
      </span>
      <span className="card-pip" aria-hidden="true">
        {card.suit}
      </span>
      <span className="card-corner bottom" aria-hidden="true">
        {card.rank}
        <span>{card.suit}</span>
      </span>
    </button>
  )
}

export default function BridgeGame({
  onDisconnect,
}: {
  onDisconnect?: () => void
}) {
  const {
    gameData: game,
    currentPlayerPosition: viewer,
    makeBid,
    playCard,
    pendingAction,
  } = useGameStore()
  const { currentRoom: room, getPlayerDisplayName } = useRoomDataStore()
  const [nextPending, setNextPending] = useState(false)
  const features = useRoomFeaturesStore((state) => state.roomId === room?.roomId ? state.board : undefined)
  const claimPending = features?.claim?.status === 'pending'
  const event = useRoomFeaturesStore((state) => state.duplicateEvent)
  const lastEventBoard = !!features?.eventId && !!event && event.eventId === features.eventId && game.gameNumber >= event.boardCount
  const collecting = game.completedTrick
  const collectionRemaining = game.scheduledAction?.kind === 'clearTrick'
    ? Math.max(0, game.scheduledAction.dueAt - (game.serverTimeMs ?? Date.now()))
    : 1200
  const seats: Position[] = ['North', 'East', 'South', 'West']
  const currentHasCards = Object.values(game.currentTrick.cards).some(Boolean)
  const nextBoard = async () => {
    const user = useUserStore.getState().userId
    if (!room || !user || claimPending || lastEventBoard) return
    setNextPending(true)
    try {
      const state = useRoomFeaturesStore.getState()
      await roomWebSocketService.nextBoard(room.roomId, user, state.roomId === room.roomId ? { boardId: state.board.boardId, revision: state.board.revision } : undefined)
    } catch (error) {
      useErrorStore
        .getState()
        .showError(
          error instanceof Error
            ? error.message
            : 'Next board was not confirmed'
        )
    } finally {
      setNextPending(false)
    }
  }
  const contract = game.contract
  const result = game.result
  const status =
    claimPending
      ? 'Claim pending · play paused by server'
      : game.phase === 'completed'
      ? 'Board complete'
      : game.isMyTurn
      ? game.playSeat === game.dummy && game.dummy !== viewer
        ? `Your turn · play from dummy (${game.dummy})`
        : `Your turn to ${game.phase === 'bidding' ? 'bid' : 'play'}`
      : `Waiting for ${game.currentPlayer}`
  return (
    <main className="room-shell game-room">
      <header className="room-topbar">
        <div>
          <span className="room-eyebrow">THE BRIDGE ROOM</span>
          <h1>{room?.roomName || 'Bridge table'}</h1>
        </div>
        <div className="board-meta">
          <span>Board {game.gameNumber}</span>
          <span>Dealer {game.dealer}</span>
          <span>
            Vulnerable:{' '}
            {game.vulnerability.NS && game.vulnerability.EW
              ? 'Both'
              : game.vulnerability.NS
              ? 'N–S'
              : game.vulnerability.EW
              ? 'E–W'
              : 'None'}
          </span>
        </div>
        <button className="room-button secondary" onClick={onDisconnect}>
          Disconnect
        </button>
      </header>
      <div className="game-layout">
        <section
          className="felt-table"
          aria-label={`Bridge table. You are ${viewer}`}
        >
          <div className="felt-mark" aria-hidden="true">
            ♠<span>BRIDGE CLUB</span>
          </div>
          {seats.map((actual) => {
            const display = toDisplayPosition(actual, viewer)
            const dummyVisible = actual === game.dummy && game.firstCardPlayed
            const visible = actual === viewer || dummyVisible
            const cards = visible
              ? sortVisibleHand(game.hands[actual], contract?.suit)
              : []
            const count =
              game.handCounts?.[actual] ?? (visible ? cards.length : 0)
            const controlled =
              game.isMyTurn &&
              !collecting &&
              !pendingAction &&
              !claimPending &&
              game.phase === 'playing' &&
              game.playSeat === actual
            return (
              <section
                key={`${game.gameNumber}-${actual}`}
                className={`table-seat seat-${display.toLowerCase()} ${
                  dummyVisible ? 'dummy-seat' : ''
                } ${game.currentPlayer === actual ? 'active-seat' : ''}`}
                aria-label={`${actual} hand${dummyVisible ? ', dummy' : ''}`}
              >
                <div className="seat-label">
                  <b className="seat-compass">{actual[0]}</b>
                  <div>
                    <strong>
                      {actual === viewer ? 'You' : getPlayerDisplayName(actual)}
                    </strong>
                    <small>
                      {actual}
                      {actual === game.dummy
                        ? ' · Dummy'
                        : actual === contract?.declarer
                        ? ' · Declarer'
                        : ''}{' '}
                      · {count} cards
                    </small>
                    <SeatPresence seat={actual} />
                  </div>
                </div>
                <div
                  className={`hand-fan ${visible ? 'face-up' : 'face-down'}`}
                  aria-label={
                    visible
                      ? `${actual} cards`
                      : `${actual}: ${count} hidden cards`
                  }
                >
                  {visible
                    ? cards.map((card, index) => (
                        <TableCard
                          key={convertFrontendCardToServer(card)}
                          card={card}
                          index={index}
                          playable={
                            controlled &&
                            game.legalCards?.includes(
                              convertFrontendCardToServer(card)
                            )
                          }
                          onPlay={
                            controlled ? () => void playCard(card) : undefined
                          }
                        />
                      ))
                    : Array.from({ length: count }, (_, index) => (
                        <span
                          className="card-back"
                          key={index}
                          style={
                            { '--deal-index': index } as React.CSSProperties
                          }
                        />
                      ))}
                </div>
              </section>
            )
          })}
          {game.phase !== 'bidding' && (
            <div className="trick-zone" aria-label="Current trick">
              {!currentHasCards && !collecting && (
                <div className="trick-placeholder">
                  ♣
                  <span>
                    {game.phase === 'completed' ? 'Well played' : 'Lead a card'}
                  </span>
                </div>
              )}
              {!collecting && seats.map((actual) => {
                const card = game.currentTrick.cards[actual]
                const position = toDisplayPosition(actual, viewer).toLowerCase()
                return card ? (
                  <div
                    key={`${
                      game.tricks.length
                    }-${actual}-${convertFrontendCardToServer(card)}`}
                    className={`trick-card trick-${position}`}
                  >
                    <TableCard card={card} />
                    <span className="played-seat">{actual}</span>
                  </div>
                ) : null
              })}
              {collecting &&
                seats.map((actual) => {
                  const card = collecting.cards[actual]
                  return card ? (
                    <div
                      key={`collect-${game.tricks.length}-${actual}`}
                      style={{
                        '--collection-duration': `${Math.min(800, collectionRemaining)}ms`,
                        '--collection-delay': `${Math.max(0, collectionRemaining - 800)}ms`,
                      } as React.CSSProperties}
                      className={`trick-card trick-${toDisplayPosition(
                        actual,
                        viewer
                      ).toLowerCase()} collect-trick collect-${toDisplayPosition(
                        collecting.winner || actual,
                        viewer
                      ).toLowerCase()}`}
                    >
                      <TableCard card={card} />
                      <span className="played-seat">{actual}</span>
                    </div>
                  ) : null
                })}
            </div>
          )}
          {game.phase === 'bidding' && (
            <div className="table-auction-summary">
              <span className="room-eyebrow">AUCTION IN PROGRESS</span>
              <strong>{game.currentPlayer} to bid</strong>
            </div>
          )}
        </section>
        <aside className="game-sidebar">
          <section
            className={`turn-status ${game.isMyTurn && !collecting ? 'your-turn' : ''}`}
            role="status"
            aria-live="polite"
          >
            <span className="status-dot" />
            {collecting
              ? `Collecting trick · ${collecting.winner} won`
              : game.scheduledAction?.kind === 'robotCard'
              ? `${game.currentPlayer} is thinking…`
              : pendingAction ? 'Waiting for server confirmation…' : status}
          </section>
          {game.phase === 'bidding' ? (
            <BiddingArea onMakeBid={makeBid} />
          ) : (
            <section className="score-panel">
              <span className="room-eyebrow">CONTRACT</span>
              <h2>
                {contract
                  ? `${contract.level}${contract.suit}${
                      contract.redoubled ? ' XX' : contract.doubled ? ' X' : ''
                    }`
                  : 'Passed out'}
              </h2>
              {contract && (
                <p>
                  {contract.declarer} declares · {contract.level + 6} tricks
                  needed
                </p>
              )}
              <div className="trick-score">
                <div>
                  <span>N–S</span>
                  <strong>
                    {
                      game.tricks.filter(
                        (trick) =>
                          trick.winner === 'North' || trick.winner === 'South'
                      ).length
                    }
                  </strong>
                </div>
                <div>
                  <span>E–W</span>
                  <strong>
                    {
                      game.tricks.filter(
                        (trick) =>
                          trick.winner === 'East' || trick.winner === 'West'
                      ).length
                    }
                  </strong>
                </div>
              </div>
              <p className="muted">{features?.claimSettlement ? 'Played tricks only · claim allocation below' : 'Tricks won'} · {game.tricks.length} / 13</p>
              {game.scores && (
                <p>
                  Session score · N–S {game.scores.NS} / E–W {game.scores.EW}
                </p>
              )}
            </section>
          )}
          {game.phase === 'completed' && !collecting && (
            <section className="result-panel" aria-label="Board result">
              <h2>
                {result?.passedOut
                  ? 'Passed out'
                  : result
                  ? result.made
                    ? 'Contract made'
                    : 'Contract defeated'
                  : 'Board complete'}
              </h2>
              {result && !result.passedOut && (
                <p>
                  {result.declarerTricks} tricks · N–S {result.scoreNS} · E–W{' '}
                  {result.scoreEW}
                </p>
              )}
              {lastEventBoard ? (
                <p>Your event boards are finished. Other tables may still be playing; see Duplicate club tables for released results.</p>
              ) : room?.ownerId === useUserStore.getState().userId ? (
                <button
                  className="room-button"
                  disabled={nextPending || !!collecting || claimPending}
                  onClick={nextBoard}
                >
                  {nextPending ? 'Dealing…' : 'Deal next board'}
                </button>
              ) : (
                <p>Waiting for the host to deal the next board.</p>
              )}
            </section>
          )}
          <ClaimControls />
          {game.previousTrick && (
            <details className="last-trick">
              <summary>Last trick · {game.previousTrick.winner} won</summary>
              <div>
                {seats.map((seat) => (
                  <span key={seat}>
                    {seat}:{' '}
                    {game.previousTrick?.cards[seat]
                      ? `${game.previousTrick.cards[seat]!.rank}${
                          game.previousTrick.cards[seat]!.suit
                        }`
                      : '—'}
                  </span>
                ))}
              </div>
            </details>
          )}
          <p className="table-help">
            Select a legal card to play. Cards support Tab and Enter. The server
            manages computer turns and all rules.
          </p>
        </aside>
      </div>
    </main>
  )
}
