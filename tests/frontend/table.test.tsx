import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BridgeGame, { TableCard } from '../../src/components/bridge/play'
import { RoomLobby } from '../../src/components/bridge/components/RoomLobby'
import { BiddingArea } from '../../src/components/bridge/components/BiddingArea'
import { useRoomDataStore } from '../../src/stores/roomDataStore'
import { useUserStore } from '../../src/stores/userStore'
import { useGameStore } from '../../src/stores/gameStore'
import { applyRoomMessage } from '../../src/hooks/useWebSocketMessages'
import { gameWebSocketService, roomWebSocketService } from '../../src/services/websocketService'
import { snapshot } from './fixtures'
import { convertServerCardToFrontend } from '../../src/utils/gameStateConverter'

beforeEach(() => {
  vi.restoreAllMocks()
  useUserStore.setState({ userId: 'me', playerName: 'Player' })
  useGameStore.getState().startNewGame()
  applyRoomMessage(snapshot(), 'table-1')
})
describe('table interaction', () => {
  it('sorts own and public dummy hands without changing authoritative arrays', () => {
    const fixture = snapshot()
    fixture.publicState.contract = '1H'
    fixture.privateState.hand = ['AH', 'AS', '2D', 'AC', '2C', '2H']
    fixture.publicState.dummyHand = ['KH', 'KS', 'KD', 'KC']
    applyRoomMessage(fixture, 'table-1')
    render(<BridgeGame />)
    const names = (hand: HTMLElement) => within(hand).getAllByRole('button').map(button => button.getAttribute('aria-label'))
    expect(names(screen.getByRole('region', { name: 'North hand' }))).toEqual([
      '2 of clubs', 'A of clubs', '2 of diamonds', 'A of spades', '2 of hearts', 'A of hearts',
    ])
    expect(names(screen.getByRole('region', { name: 'South hand, dummy' }))).toEqual([
      'Play K of clubs', 'Play K of diamonds', 'Play K of spades', 'Play K of hearts',
    ])
    expect(useGameStore.getState().gameData.hands.North.map(card => card.rank + card.suit)).toEqual([
      'A♥', 'A♠', '2♦', 'A♣', '2♣', '2♥',
    ])
  })
  it.each(['pointer', 'Enter', 'Space'])('keeps card identity and order on %s selection', async method => {
    const play = vi.fn()
    const cards = ['2C', 'TC', 'AC'].map(convertServerCardToFrontend)
    const { rerender } = render(<div>{cards.map((card, index) =>
      <TableCard key={card.rank} card={card} index={index} playable onPlay={play} />
    )}</div>)
    const before = screen.getAllByRole('button')
    const selected = before[1]
    if (method === 'pointer') {
      await userEvent.click(selected)
    } else {
      selected.focus()
      await userEvent.keyboard(method === 'Space' ? ' ' : '{Enter}')
    }
    expect(play).toHaveBeenCalledTimes(1)
    expect(selected).toHaveFocus()
    rerender(<div>{cards.map((card, index) =>
      <TableCard key={card.rank} card={card} index={index} playable={false} onPlay={play} />
    )}</div>)
    expect(screen.getAllByRole('button')).toEqual(before)
    expect(selected.style.getPropertyValue('--deal-index')).toBe('1')
  })
  it('holds the completed fourth card, blocks a premature lead and waits for authoritative clear', () => {
    const fixture = snapshot()
    fixture.publicState.completedTrick = fixture.publicState.previousTrick
    fixture.publicState.pendingAction = { kind: 'clearTrick', dueAt: 2200 }
    fixture.publicState.serverTimeMs = 1000
    applyRoomMessage(fixture, 'table-1')
    render(<BridgeGame />)
    expect(within(screen.getByLabelText('Current trick')).getAllByRole('button')).toHaveLength(4)
    expect(screen.getByRole('status')).toHaveTextContent('Collecting trick · East won')
    expect(within(screen.getByRole('region', { name: 'South hand, dummy' })).getAllByRole('button').every(card => card.hasAttribute('disabled'))).toBe(true)
    fixture.publicState.completedTrick = null
    fixture.publicState.pendingAction = null
    fixture.publicState.revision! += 1
    act(() => applyRoomMessage(fixture, 'table-1'))
    expect(screen.getByRole('button', { name: 'Play 10 of hearts' })).toBeEnabled()
    expect(within(screen.getByLabelText('Current trick')).queryAllByRole('button')).toHaveLength(0)
  })
  it('does not reanimate historical tricks on refresh or show results before final collection', () => {
    const fixture = snapshot()
    fixture.publicState.currentPhase = 'completed'
    fixture.publicState.completedTrick = fixture.publicState.previousTrick
    applyRoomMessage(fixture, 'table-1')
    render(<BridgeGame />)
    expect(screen.queryByRole('region', { name: 'Board result' })).not.toBeInTheDocument()
    fixture.publicState.completedTrick = null
    fixture.publicState.revision! += 1
    act(() => applyRoomMessage(fixture, 'table-1'))
    expect(screen.getByRole('region', { name: 'Board result' })).toBeInTheDocument()
    expect(within(screen.getByLabelText('Current trick')).queryAllByRole('button')).toHaveLength(0)
  })
  it('rotates own hand and center cards consistently and displays actual counts', () => {
    const fixture = snapshot()
    fixture.publicState.currentTrick = [{ seat: 'East', card: 'AS' }]
    applyRoomMessage(fixture, 'table-1')
    render(<BridgeGame />)
    const mine = screen.getByRole('region', { name: 'North hand' })
    expect(mine).toHaveClass('seat-south')
    expect(within(mine).getByText('North · Declarer · 12 cards')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'South hand, dummy' })).toHaveClass('seat-north')
    const trick = screen.getByLabelText('Current trick')
    expect(within(trick).getByRole('button', { name: 'A of spades' }).closest('.trick-card')).toHaveClass('trick-west')
    expect(screen.queryByRole('button', { name: 'K of spades' })).not.toBeInTheDocument()
  })
  it('lets declarer play legal dummy cards by keyboard, not own or illegal cards', async () => {
    const play = vi.spyOn(gameWebSocketService, 'playCard').mockResolvedValue({ action: 'cardPlayed' })
    render(<BridgeGame />)
    expect(screen.getByRole('button', { name: 'A of hearts' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Play 2 of clubs' })).toBeDisabled()
    const legal = screen.getByRole('button', { name: 'Play 10 of hearts' })
    expect(legal).toBeEnabled()
    legal.focus()
    await userEvent.keyboard('{Enter}')
    expect(play).toHaveBeenCalledTimes(1)
    expect(play).toHaveBeenCalledWith('table-1', 'me', expect.objectContaining({ rank: '10', suit: '♥' }))
  })
  it('never enables dummy for another player or exposes hidden cards', () => {
    const fixture = snapshot()
    fixture.privateState.isMyTurn = false
    fixture.privateState.playSeat = null
    applyRoomMessage(fixture, 'table-1')
    render(<BridgeGame />)
    const dummy = screen.getByRole('region', { name: 'South hand, dummy' })
    expect(within(dummy).getAllByRole('button').every(button => button.hasAttribute('disabled'))).toBe(true)
    expect(screen.getByLabelText('East: 12 hidden cards').children).toHaveLength(12)
  })
  it('shows only server-valid bidding options and dealer starts auction', () => {
    const fixture = snapshot()
    fixture.publicState.currentPhase = 'bidding'
    fixture.publicState.turn = 'North'
    fixture.privateState.validBids = ['pass', '1H', '1S', '1NT']
    applyRoomMessage(fixture, 'table-1')
    const bid = vi.fn()
    render(<BiddingArea onMakeBid={bid} />)
    expect(screen.getByRole('button', { name: 'Double' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bid 1C' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Bid 1H' }))
    expect(bid).toHaveBeenCalledWith('Bid', 1, '♥')
    expect(screen.getByRole('log').children[0]).toHaveTextContent('North')
  })
  it('next board waits for server and never resets local game on send', async () => {
    const fixture = snapshot()
    fixture.publicState.currentPhase = 'completed'
    fixture.publicState.result = { scoreNS: 100, scoreEW: -100, target: 7, declarerTricks: 7, made: true }
    applyRoomMessage(fixture, 'table-1')
    const next = vi.spyOn(roomWebSocketService, 'nextBoard').mockResolvedValue({ action: 'boardStarted' })
    render(<BridgeGame />)
    fireEvent.click(screen.getByRole('button', { name: 'Deal next board' }))
    await waitFor(() => expect(next).toHaveBeenCalledWith('table-1', 'me', { boardId: 'board-2', revision: 7 }))
    expect(useGameStore.getState().gameData.phase).toBe('completed')
  })
})

describe('lobby controls', () => {
  it('waits for authoritative roomStarted and does not call local start callback', async () => {
    const started = vi.fn()
    const start = vi.spyOn(roomWebSocketService, 'startRoom').mockResolvedValue({ action: 'roomStarted' })
    render(<RoomLobby onStartGame={started} onLeaveRoom={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }))
    await waitFor(() => expect(start).toHaveBeenCalledWith('table-1', 'me'))
    expect(started).not.toHaveBeenCalled()
  })
  it('invites using a copy operation and provides room-code fallback on failure', async () => {
    useRoomDataStore.getState().updateCurrentRoom({ isPrivate: false })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    render(<RoomLobby onStartGame={vi.fn()} onLeaveRoom={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Invite friends · copy link' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copy this room code'))
    expect(screen.getByRole('status')).toHaveTextContent('table-1')
  })
})
