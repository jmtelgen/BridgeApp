import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RoomGame } from '../../src/components/bridge/components/RoomGame'
import { useRoomDataStore } from '../../src/stores/roomDataStore'
import { useUserStore } from '../../src/stores/userStore'
import { useGameStore } from '../../src/stores/gameStore'
import { roomWebSocketService, websocketService } from '../../src/services/websocketService'
import { snapshot } from './fixtures'
import { useWebSocketMessages } from '../../src/hooks/useWebSocketMessages'
vi.mock('../../src/services/gameSessionService', () => ({
  ensureGameSession: vi.fn(async () => ({ userId: 'me', accessToken: 'mock-session', expiresAt: Date.now() + 3600000 })),
}))

const renderRoom = () => render(<MemoryRouter initialEntries={['/room/table-1']}><Routes>
  <Route path="/room/:roomId" element={<RoomGame />} />
</Routes></MemoryRouter>)
describe('server-owned room lifecycle', () => {
  beforeEach(() => {
    useUserStore.setState({ userId: 'me' })
    useGameStore.getState().startNewGame()
    useRoomDataStore.getState().clearCurrentRoom()
  })
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })
  it('waits for the authoritative due time before recovery polling and cancels on trick clear', async () => {
    vi.useFakeTimers()
    const listeners = new Map<string, (data: any) => void>()
    vi.spyOn(websocketService, 'onMessage').mockImplementation((action, listener) => {
      listeners.set(action, listener)
      return () => listeners.delete(action)
    })
    const get = vi.spyOn(roomWebSocketService, 'getGameState').mockResolvedValue(snapshot() as any)
    const { unmount } = renderHook(() => useWebSocketMessages('table-1'))
    const fixture = snapshot()
    fixture.publicState.completedTrick = fixture.publicState.previousTrick
    fixture.publicState.pendingAction = { kind: 'clearTrick', dueAt: 2200 }
    fixture.publicState.serverTimeMs = 1000
    act(() => listeners.get('cardPlayed')?.(fixture))
    await act(() => vi.advanceTimersByTimeAsync(1249))
    expect(get).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(get).toHaveBeenCalledTimes(1)
    act(() => listeners.get('cardPlayed')?.(fixture))
    fixture.publicState.completedTrick = null
    fixture.publicState.pendingAction = null
    fixture.publicState.revision! += 1
    act(() => listeners.get('trickCleared')?.(fixture))
    expect(useGameStore.getState().gameData.completedTrick).toBeNull()
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(get).toHaveBeenCalledTimes(1)
    unmount()
    expect(listeners.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('restores active play from a fresh URL using only the personalized snapshot', async () => {
    const get = vi.spyOn(roomWebSocketService, 'getGameState').mockResolvedValue(snapshot() as any)
    renderRoom()
    await screen.findByRole('region', { name: 'North hand' })
    expect(get).toHaveBeenCalledWith('table-1', 'me', expect.any(AbortSignal))
    expect(useGameStore.getState().gameData.phase).toBe('playing')
  })
  it('does not render a stale persisted room if synchronization is unsupported', async () => {
    useRoomDataStore.getState().setCurrentRoom({ ...(snapshot() as any).room, roomId: 'wrong-room' })
    vi.spyOn(roomWebSocketService, 'getGameState').mockRejectedValue(new Error('Unsupported action: getGameState'))
    renderRoom()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('getGameState server route'))
    expect(screen.queryByLabelText('Bridge table. You are North')).not.toBeInTheDocument()
    expect(useRoomDataStore.getState().currentRoom).toBeNull()
  })
  it('returns to sync mode on disconnect and requests authoritative state on reconnect', async () => {
    let connection: ((data: any) => void) | undefined
    const original = websocketService.onMessage.bind(websocketService)
    vi.spyOn(websocketService, 'onMessage').mockImplementation((action, callback) => {
      if (action === 'connection') connection = callback
      return original(action, callback)
    })
    const get = vi.spyOn(roomWebSocketService, 'getGameState').mockResolvedValue(snapshot() as any)
    renderRoom()
    await screen.findByRole('region', { name: 'North hand' })
    act(() => connection?.({ connected: false }))
    expect(screen.queryByRole('region', { name: 'North hand' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Connection lost')
    act(() => connection?.({ connected: true }))
    await screen.findByRole('region', { name: 'North hand' })
    expect(get).toHaveBeenCalledTimes(2)
  })
})
