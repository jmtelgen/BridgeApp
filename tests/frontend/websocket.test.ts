import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocketService } from '../../src/services/websocketService'

vi.mock('../../src/services/gameSessionService', () => ({
  ensureGameSession: vi.fn(async () => ({ userId: 'me', accessToken: 'signed-token', expiresAt: Date.now() + 3600000 })),
}))
class Socket {
  static OPEN = 1
  static instances: Socket[] = []
  readyState = 0
  onopen?: () => void
  onclose?: () => void
  onerror?: () => void
  onmessage?: (event: { data: string }) => void
  send = vi.fn()
  constructor(public url: string, public protocols: string[]) { Socket.instances.push(this) }
  open() { this.readyState = 1; this.onopen?.() }
  receive(data: any) { this.onmessage?.({ data: JSON.stringify(data) }) }
  close() { this.readyState = 3; this.onclose?.() }
}
describe('websocket subscription ownership', () => {
  let service: WebSocketService
  beforeEach(() => {
    vi.useFakeTimers()
    Socket.instances = []
    vi.stubGlobal('WebSocket', Socket)
    service = new WebSocketService()
  })
  afterEach(() => { service.disconnect(); vi.useRealTimers(); vi.unstubAllGlobals() })
  const connected = async () => {
    const promise = service.connect()
    await vi.advanceTimersByTimeAsync(0)
    Socket.instances[0].open()
    await promise
    return Socket.instances[0]
  }
  it('keeps additive listeners and disposes only the subscriber', async () => {
    const socket = await connected()
    const one = vi.fn(), two = vi.fn()
    const dispose = service.onMessage('gameState', one)
    service.onMessage('gameState', two)
    socket.receive({ action: 'gameState' })
    dispose()
    socket.receive({ action: 'gameState' })
    expect(one).toHaveBeenCalledTimes(1)
    expect(two).toHaveBeenCalledTimes(2)
  })
  it('registers before send and clears request timers without removing global listeners', async () => {
    const socket = await connected()
    const global = vi.fn()
    service.onMessage('gameState', global)
    socket.send.mockImplementation(() => socket.receive({ action: 'gameState', roomId: 'a' }))
    await expect(service.request({ action: 'getGameState' }, ['gameState'])).resolves.toMatchObject({ roomId: 'a' })
    expect(global).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(1) // Only proactive signed-session renewal remains.
    socket.receive({ action: 'gameState' })
    expect(global).toHaveBeenCalledTimes(2)
  })
  it('rejects and disposes on timeout, ignores unrelated room replies', async () => {
    const socket = await connected()
    const promise = service.request({ action: 'getGameState' }, ['gameState'], data => data.roomId === 'a')
    const rejected = expect(promise).rejects.toThrow('timed out')
    socket.receive({ action: 'gameState', roomId: 'b' })
    await vi.advanceTimersByTimeAsync(12000)
    await rejected
    expect(vi.getTimerCount()).toBe(1)
  })
  it('reconnects unexpected closes but never intentional disconnects', async () => {
    const socket = await connected()
    const states = vi.fn()
    service.onMessage('connection', states)
    socket.close()
    await vi.advanceTimersByTimeAsync(1000)
    expect(Socket.instances).toHaveLength(2)
    Socket.instances[1].open()
    await Promise.resolve()
    expect(states).toHaveBeenCalledWith({ connected: true })
    service.disconnect()
    await vi.advanceTimersByTimeAsync(30000)
    expect(Socket.instances).toHaveLength(2)
  })
  it('carries signed credentials only in the authentication subprotocol, not URL identity', async () => {
    const socket = await connected()
    expect(socket.protocols).toEqual(['bridge.v1', 'bridge.auth.signed-token'])
    expect(socket.url).not.toContain('signed-token')
    expect(socket.url).not.toContain('userId=')
  })
  it('aborts an abandoned request before sending and leaves no request timer', async () => {
    const socket = await connected()
    const controller = new AbortController()
    const promise = service.request({ action: 'getGameState' }, ['gameState'], () => true, controller.signal)
    const rejected = expect(promise).rejects.toThrow('cancelled')
    controller.abort()
    await rejected
    await Promise.resolve()
    expect(socket.send).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(1)
  })
})
