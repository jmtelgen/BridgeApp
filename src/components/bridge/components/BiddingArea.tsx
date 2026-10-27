import { useState } from 'react'
import { BidType, Position, Suit } from '../types'
import { useGameStore } from '../../../stores/gameStore'
import { useRoomFeaturesStore } from '../../../stores/roomFeaturesStore'
import { useRoomDataStore } from '../../../stores/roomDataStore'

interface BiddingAreaProps {
  onMakeBid: (type: BidType, level?: number, suit?: Suit | 'NT') => void
}
export function BiddingArea({ onMakeBid }: BiddingAreaProps) {
  const { gameData, pendingAction } = useGameStore()
  const [level, setLevel] = useState(1)
  const roomId = useRoomDataStore((state) => state.currentRoom?.roomId)
  const claimPending = useRoomFeaturesStore((state) => state.roomId === roomId && state.board.claim?.status === 'pending')
  const enabled = gameData.isMyTurn && !pendingAction && !claimPending
  const suits: [string, Suit | 'NT'][] = [
    ['C', '♣'],
    ['D', '♦'],
    ['H', '♥'],
    ['S', '♠'],
    ['NT', 'NT'],
  ]
  const seats: Position[] = ['North', 'East', 'South', 'West']
  const order = [
    ...seats.slice(seats.indexOf(gameData.dealer)),
    ...seats.slice(0, seats.indexOf(gameData.dealer)),
  ]
  return (
    <section className="auction-panel" aria-label="Auction">
      <h2>Auction</h2>
      <div className="auction-history" role="log" aria-label="Bidding history">
        {order.map((seat) => (
          <strong key={seat}>
            {seat}
            <small>{seat === gameData.dealer ? 'Dealer' : '\u00a0'}</small>
          </strong>
        ))}
        {gameData.bids.map((bid, index) => (
          <span key={`${index}-${bid.player}`} title={bid.player}>
            {bid.type === 'Bid'
              ? `${bid.level}${bid.suit}`
              : bid.type === 'Double'
              ? 'X'
              : bid.type === 'Redouble'
              ? 'XX'
              : 'Pass'}
          </span>
        ))}
      </div>
      <fieldset disabled={!enabled}>
        <legend>
          {enabled
            ? 'Choose your bid'
            : `Waiting for ${gameData.currentPlayer}`}
        </legend>
        <div className="bid-levels">
          {[1, 2, 3, 4, 5, 6, 7].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`Level ${value}`}
              aria-pressed={level === value}
              disabled={
                !gameData.validBids?.some((bid) =>
                  bid.startsWith(String(value))
                )
              }
              onClick={() => setLevel(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="bid-suits">
          {suits.map(([code, suit]) => (
            <button
              key={code}
              aria-label={`Bid ${level}${code}`}
              className={code === 'H' || code === 'D' ? 'red-suit' : ''}
              disabled={!gameData.validBids?.includes(`${level}${code}`)}
              onClick={() => onMakeBid('Bid', level, suit)}
            >
              {level}
              {suit}
            </button>
          ))}
        </div>
        <div className="bid-actions">
          {(['Pass', 'Double', 'Redouble'] as const).map((type) => (
            <button
              key={type}
              disabled={!gameData.validBids?.includes(type.toLowerCase())}
              onClick={() => onMakeBid(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  )
}
