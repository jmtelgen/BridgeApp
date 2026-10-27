# WebSocket integration

This is the frontend integration guide. The authoritative backend contract is
[`BridgeLambdas/docs/WEBSOCKET_CONTRACT.md`](../BridgeLambdas/docs/WEBSOCKET_CONTRACT.md).
See [frontend readiness](docs/frontend-readiness.md) for validation and release gates.

## Authentication before connection

Account access tokens come from the existing account login / refresh flow.
Guests first call `POST /api/auth/guest`; the server, not the browser, assigns
their identity and signs a dedicated guest credential. The guest token and
subject are stored in `sessionStorage` for reload continuity within the tab.
A still-valid bearer can renew the same guest identity. Expired or invalid
credentials are rejected; the client does not silently manufacture a replacement
identity or claim to recover its seat.

The browser opens the configured `VITE_WS_ENDPOINT` using protocols:

```text
bridge.v1
bridge.auth.<signed access or guest token>
```

The server verifies the credential and exact allowed Origin, then selects only
`bridge.v1`. Tokens and authoritative identity are not placed in URL query
parameters. Configure the backend Origin allowlist and guest bootstrap route
before using the frontend. Guest credentials are not account access tokens.

## Requests and personalized responses

Requests have `{ action, data }`; room/game actions include `roomId` in `data`.
`userId` is retained where the existing request contract expects it, but is an
assertion against the connection's verified identity, not authentication.

| Request | Expected success event | Purpose |
| --- | --- | --- |
| `createRoom` | `createRoom` or matching `roomUpdated` | Create an actual server room |
| `joinRoom` | `joinRoom` or matching `roomUpdated` | Join the specified server room |
| `startRoom` | `roomStarted` | Host starts a board; server fills empty seats |
| `getGameState` | `gameState` | Waiting-room / active-board hydration and reconnect |
| `makeBid` | `bidMade` | Submit a server-listed legal bid |
| `playCard` | `cardPlayed` | Submit a server-listed legal card |
| `nextBoard` | `boardStarted` | Host requests the next board after completion |

The `getGameState` and `nextBoard` API Gateway routes must target the lifecycle
Lambda described by the backend contract. They cannot be assumed to exist on a
previously deployed stack.

Gameplay envelopes include `action`, sanitized `room`, `publicState`,
`privateState`, `seat`, and `message`. Waiting-room snapshots may have no active
game. Every active recipient receives its own private state. The frontend
accepts only its room and ignores older revisions before applying either room
metadata or game state.

- Seats use `North`, `East`, `South`, `West`.
- Cards use rank then suit: `AS`, `TH`, `2C`.
- Bids use `pass`, `double`, `redouble`, `1C` through `7NT`.
- Robot IDs use `ROBOT_*`; all robot progression is server-owned.
- Only `privateState.hand` and the revealed public `dummyHand` become visible
  cards. Other hands are never reconstructed from counts.
- `validBids`, `legalCards`, `playSeat`, and `isMyTurn` govern enabled controls.
  The server performs final legality checks, including declarer's dummy control.

## Lifecycle and error handling

Subscriptions are additive and return individual disposer functions. A request
registers its listeners before sending, removes only its own listeners, and
clears its timeout after success, failure, cancellation, or disconnection.
Aborted route hydration cannot send a deferred request after unmount.

Unexpected socket closes reconnect with bounded backoff, then request a fresh
personalized snapshot. Signed sessions are renewed before connection expiry.
Explicit disconnect cancels renewal and reconnect timers. `robotPending`
schedules a snapshot to resume server-owned work; `409` requests resynchronization;
`401` reconnects through signed-session validation.

No active-game REST fallback is used: legacy room APIs can expose internal
deal shapes and are not authoritative route hydration. Missing routes and
timeouts show errors, not success toasts, fabricated room IDs, or local boards.

The available control is **Disconnect**, not an invented leave-seat operation.
There is no implemented authoritative leave-seat route in this frontend/backend
contract. Local room state clears after disconnect, but the UI does not promise
that membership or a seat was released.
