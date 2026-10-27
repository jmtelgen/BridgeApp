import { websocketConfig, WebSocketActions } from '../config/websocket'
import { BidType, Suit } from '../components/bridge/types'
import { ensureGameSession } from './gameSessionService'
import { useUserStore } from '../stores/userStore'

export interface WebSocketMessage {
  action: string
  data?: any
  roomId?: string
  userId?: string
  timestamp?: number
}
export interface WebSocketResponse {
  action: string
  success?: boolean
  error?: string
  room?: any
  assignedSeat?: string
  gameState?: any
  message?: string
  [key: string]: any
}
type Handler = (data: any) => void

export class WebSocketService {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<Handler>>()
  private connectionPromise: Promise<void> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private intentionalClose = false
  private pending = new Set<(error: Error) => void>()
  private generation = 0
  private authTimer: ReturnType<typeof setTimeout> | null = null

  connect(): Promise<void> {
    if (!websocketConfig.endpoint)
      return Promise.reject(
        new Error(
          'Game server is not configured. Set VITE_WS_ENDPOINT before connecting.'
        )
      )
    if (this.isConnected()) return Promise.resolve()
    if (this.connectionPromise) return this.connectionPromise
    this.intentionalClose = false
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    const generation = ++this.generation
    const promise = ensureGameSession().then((session) => {
      if (generation !== this.generation || this.intentionalClose)
        throw new Error('Connection cancelled')
      return new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(websocketConfig.endpoint, [
          'bridge.v1',
          `bridge.auth.${session.accessToken}`,
        ])
        this.ws = socket
        const timeout = setTimeout(() => {
          reject(new Error('Connection timed out'))
          socket.close()
        }, 10000)
        socket.onopen = () => {
          clearTimeout(timeout)
          this.reconnectAttempts = 0
          this.connectionPromise = null
          this.authTimer = setTimeout(() => {
            this.reconnect().catch(() => {})
          }, Math.max(1000, session.expiresAt - Date.now() - 60000))
          resolve()
          this.emit('connection', { connected: true })
        }
        socket.onmessage = ({ data }) => {
          try {
            const message = JSON.parse(data)
            this.emit(message.action, message)
            if (message.error) {
              import('../stores/errorStore').then(({ useErrorStore }) =>
                useErrorStore.getState().showError(message.error)
              )
            }
          } catch (error) {
            console.error('Invalid server message', error)
          }
        }
        socket.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('Cannot connect to the game server'))
          socket.close()
        }
        socket.onclose = () => {
          clearTimeout(timeout)
          reject(new Error('Connection closed'))
          if (this.ws !== socket) return
          if (this.authTimer) clearTimeout(this.authTimer)
          this.authTimer = null
          this.ws = null
          this.connectionPromise = null
          this.pending.forEach((cancel) =>
            cancel(new Error('Connection lost. Reconnect before trying again.'))
          )
          this.emit('connection', { connected: false })
          if (
            !this.intentionalClose &&
            this.reconnectAttempts < websocketConfig.reconnectAttempts
          ) {
            this.reconnectAttempts += 1
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null
              this.connect().catch(() => {})
            }, websocketConfig.reconnectDelay * this.reconnectAttempts)
          }
        }
      })
    })
    this.connectionPromise = promise
    promise.catch((error) => {
      if (this.connectionPromise === promise) {
        this.connectionPromise = null
        this.emit('connection', {
          connected: false,
          error:
            error instanceof Error ? error.message : 'Authentication failed',
        })
      }
    })
    return promise
  }

  disconnect(): void {
    this.intentionalClose = true
    this.generation += 1
    if (this.authTimer) clearTimeout(this.authTimer)
    this.authTimer = null
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.pending.forEach((cancel) => cancel(new Error('Disconnected')))
    this.ws?.close(1000, 'Client disconnect')
    this.ws = null
    this.connectionPromise = null
    this.emit('connection', { connected: false })
  }

  reconnect(): Promise<void> {
    this.disconnect()
    return this.connect()
  }

  async sendMessage(message: WebSocketMessage): Promise<void> {
    await this.connect()
    if (!this.isConnected()) throw new Error('WebSocket is not connected')
    this.ws!.send(JSON.stringify(message))
  }

  /** Register before sending: local mocks and fast servers may respond synchronously. */
  request(
    message: WebSocketMessage,
    actions: string[],
    matches: (data: WebSocketResponse) => boolean = () => true,
    signal?: AbortSignal
  ): Promise<WebSocketResponse> {
    return new Promise((resolve, reject) => {
      const disposers: (() => void)[] = []
      let settled = false
      const cleanup = () => {
        settled = true
        clearTimeout(timer)
        disposers.forEach((dispose) => dispose())
        this.pending.delete(cancel)
        signal?.removeEventListener('abort', abort)
      }
      const cancel = (error: Error) => {
        if (settled) return
        cleanup()
        reject(error)
      }
      const abort = () => cancel(new Error('Request cancelled'))
      const timer = setTimeout(
        () =>
          cancel(
            new Error(
              `${message.action} timed out. The server did not confirm the request.`
            )
          ),
        12000
      )
      this.pending.add(cancel)
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) {
        abort()
        return
      }
      for (const action of new Set([...actions, 'error'])) {
        disposers.push(
          this.onMessage(action, (data) => {
            if (settled || !matches(data)) return
            cleanup()
            if (data.success === false || data.error)
              reject(
                new Error(data.error || data.message || 'Request rejected')
              )
            else resolve(data)
          })
        )
      }
      this.connect()
        .then(() => {
          if (!settled) return this.sendMessage(message)
        })
        .catch(cancel)
    })
  }

  private emit(action: string, data: any): void {
    for (const handler of [...(this.handlers.get(action) || [])]) {
      try {
        handler(data)
      } catch (error) {
        console.error('Message listener failed', error)
      }
    }
  }

  onMessage(action: string, handler: Handler): () => void {
    if (!this.handlers.has(action)) this.handlers.set(action, new Set())
    this.handlers.get(action)!.add(handler)
    return () => this.offMessage(action, handler)
  }
  offMessage(action: string, handler?: Handler): void {
    if (!handler) return
    this.handlers.get(action)?.delete(handler)
    if (!this.handlers.get(action)?.size) this.handlers.delete(action)
  }
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
  // Subscriptions belong to the caller; leaving one room must not erase another listener.
  cleanupRoom(_roomId: string): void {}
  cleanupAll(): void {
    this.pending.forEach((cancel) => cancel(new Error('Subscriptions closed')))
    this.handlers.clear()
  }
}

export const websocketService = new WebSocketService()
useUserStore.subscribe((state, previous) => {
  if (
    (state.isAuthenticated !== previous.isAuthenticated &&
      (!state.isAuthenticated || !previous.wasAuthenticated)) ||
    (websocketService.isConnected() && state.userId !== previous.userId) ||
    (previous.user && state.user && previous.user.userId !== state.user.userId) ||
    (previous.user !== null && state.user === null)
  )
    websocketService.disconnect()
})
const roomMatches = (roomId: string) => (data: WebSocketResponse) =>
  (!data.roomId && !data.room?.roomId) ||
  (data.roomId || data.room?.roomId) === roomId

export const roomWebSocketService = {
  leaveRoom: (roomId: string) =>
    websocketService.request(
      { action: 'leaveRoom', data: { roomId } },
      ['roomLeft'],
      roomMatches(roomId)
    ),
  getGameState: (roomId: string, userId: string, signal?: AbortSignal) =>
    websocketService.request(
      { action: 'getGameState', data: { roomId, userId }, roomId, userId },
      ['gameState'],
      roomMatches(roomId),
      signal
    ),
  nextBoard: (roomId: string, userId: string, state?: { revision?: number; boardId?: string }) =>
    websocketService.request(
      { action: 'nextBoard', data: { roomId, userId, ...state } },
      ['boardStarted'],
      roomMatches(roomId)
    ),
  createRoom: (data: {
    roomName: string
    isPrivate: boolean
    maxPlayers: number
    playerName: string
    ownerId: string
  }) =>
    websocketService.request(
      { action: WebSocketActions.CREATE_ROOM, data, userId: data.ownerId },
      [WebSocketActions.CREATE_ROOM, 'roomUpdated'],
      (response) =>
        response.action !== 'roomUpdated' ||
        (response.updateType === 'roomCreated' &&
          response.room?.ownerId === data.ownerId)
    ),
  joinRoom: (data: { roomId: string; userId: string; playerName: string; invitationToken?: string }) =>
    websocketService.request(
      {
        action: WebSocketActions.JOIN_ROOM,
        data,
        roomId: data.roomId,
        userId: data.userId,
      },
      [WebSocketActions.JOIN_ROOM, 'roomUpdated'],
      (response) =>
        roomMatches(data.roomId)(response) &&
        (response.action !== 'roomUpdated' ||
          (response.room?.seats &&
            Object.values(response.room.seats).includes(data.userId)))
    ),
  startRoom: (roomId: string, userId: string) =>
    websocketService.request(
      { action: WebSocketActions.START_ROOM, data: { roomId, userId } },
      [WebSocketActions.ROOM_STARTED],
      roomMatches(roomId)
    ),
  onStartRoom: (handler: Handler) =>
    websocketService.onMessage(WebSocketActions.ROOM_STARTED, handler),
  offStartRoom: (handler?: Handler) =>
    websocketService.offMessage(WebSocketActions.ROOM_STARTED, handler),
}

export const gameWebSocketService = {
  makeBid: (
    roomId: string,
    userId: string,
    bid: { type: BidType; level?: number; suit?: Suit | 'NT' }
  ) => {
    const suits: Record<string, string> = {
      '♣': 'C',
      '♦': 'D',
      '♥': 'H',
      '♠': 'S',
      NT: 'NT',
    }
    const value =
      bid.type === 'Bid'
        ? `${bid.level}${suits[bid.suit!]}`
        : bid.type.toLowerCase()
    return websocketService.request(
      {
        action: WebSocketActions.MAKE_BID,
        data: { roomId, userId, bid: value },
      },
      [WebSocketActions.BID_MADE],
      roomMatches(roomId)
    )
  },
  playCard: (
    roomId: string,
    userId: string,
    card: { suit: string; rank: string }
  ) => {
    const suits: Record<string, string> = {
      '♣': 'C',
      '♦': 'D',
      '♥': 'H',
      '♠': 'S',
    }
    const value =
      (card.rank === '10' ? 'T' : card.rank) + (suits[card.suit] || card.suit)
    return websocketService.request(
      {
        action: WebSocketActions.PLAY_CARD,
        data: { roomId, userId, card: value },
      },
      [WebSocketActions.CARD_PLAYED],
      roomMatches(roomId)
    )
  },
}
export default websocketService
