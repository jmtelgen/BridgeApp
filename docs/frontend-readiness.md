# Frontend readiness

## Scope and status

Implemented in `BridgeGame`; no commits, deployment, AWS mutation, or live-AWS
verification was performed. Real local adapter verification is recorded below.
Existing working-tree changes and deleted legacy
tests/documents were preserved. This document records the actual frontend
behavior, local evidence, and remaining acceptance work. Overarching design and
release tracking live in [architecture](architecture.md) and the
[implementation backlog](implementation-backlog.md).

Canonical backend reference:
[`BridgeLambdas/docs/WEBSOCKET_CONTRACT.md`](../../BridgeLambdas/docs/WEBSOCKET_CONTRACT.md).
Frontend transport summary: [`WEBSOCKET_API.md`](../WEBSOCKET_API.md).

## Implemented behavior

- Room URLs hydrate from a signed, personalized `getGameState` WebSocket
  snapshot, including waiting rooms, refresh, and reconnect. A stale persisted
  room is not mistaken for the route's authoritative state. Unsupported
  synchronization is visible, with retry and an invitation join form.
- Guests bootstrap through `POST /api/auth/guest` (backend `/auth/guest`).
  The server chooses the identity and returns a signed dedicated guest token.
  Credentials and subject live in this tab's `sessionStorage`; valid bearer
  renewal retains the identity. An expired/invalid supplied credential does not
  silently mint a replacement or claim to restore its seat.
- Account credentials use the existing login and refresh-cookie flow. The
  authenticated `user.userId` replaces the legacy locally generated ID. Before
  connection, access-token validity is checked. Connections renew before signed
  credential expiry, and changing authenticated identity closes an existing
  socket.
- Public/guest lobby requests do not force an unrelated account-cookie refresh
  or redirect guests to login. Account API retries are bounded to one refresh.
  The application no longer generates a local ID on startup; signed identities
  are obtained on demand.
- WebSocket authentication uses `bridge.v1` and `bridge.auth.<token>`
  subprotocols; identity/token are not sent in URL query parameters.
  Backend exact-Origin allowlisting and JWT verification are mandatory.
- Listeners are additive and individually disposable. Pending requests register
  before sending, time out, clear their listeners/timers, and support abort.
  Intentional closes do not reconnect. Room changes cancel abandoned snapshot
  work; transient disconnects suppress gameplay until resynchronization.
- Wrong-room and older-revision envelopes are ignored before updating either
  room metadata or game data. `409` resynchronizes; `401` reconnects through
  signed-session validation. `robotPending` triggers a delayed snapshot to let
  the server resume its own robot progression.
- Every seat's label, actual hand, public dummy, and played card use the same
  orientation with the viewer at the bottom. Hidden hands render only the
  server's public remaining count. Room persistence strips internal `gameData`,
  including migration of an older cached deal.
- Only the recipient's private hand and revealed public dummy become visible.
  Dummy remains visible between tricks. Only the server's `playSeat`,
  `legalCards`, and `isMyTurn` permit interaction; declarer can play dummy.
  Keyboard users can Tab to legal cards and play with Enter/Space.
- Bidding is limited to `validBids`, including double/redouble. Auction columns
  start with the actual dealer. Converter fixtures retain completed tricks,
  winners, doubled/redoubled contracts, board number, scores, and result.
- Computer bidding/play run exclusively on the server. The previous live client
  AI hook is not mounted; its store compatibility entry point is a no-op.
  No browser robot obtains or synthesizes an opponent's private hand.
- Completion displays server results and partnership trick counts. Only the host
  can request `nextBoard`, and the UI waits for the authoritative new-board
  envelope instead of resetting locally.
- "Play with computers" creates a real private room, then the host can start
  with server-filled computer seats. It does not fabricate a quick-join ID.
  Login/sign-up navigate to existing account pages. Invite uses an actual copy
  operation with an explicit room-code fallback if clipboard access fails.
  Failed connection statistics show "unavailable", not fabricated zero counts.
- The game room has a responsive felt table, readable seat indicators, keyed
  face-up/back cards, CSS deal/play/collection transitions, and a reduced-motion
  override. Mobile side dummy is kept clear of the player's bottom hand.
- Every visible hand (own hand and public dummy, including the legacy
  `PlayerHand` renderer) uses the same non-mutating ordering helper: clubs,
  diamonds, hearts, spades; ranks 2 through ace. A suit contract moves its trump
  group to the right; no-trump preserves the base order. Card identity remains
  suit/rank keyed, not dependent on selection or sorted-array index.
- Legal-card hover, keyboard focus, and press lift the card only 6px, without
  rotation, DOM reordering, or promoting it above the fan. Each card retains
  its logical stack index. The deal animation uses backwards fill, not
  forwards fill: its final transform no longer overrides the later focus lift.
  Keyboard Enter/Space and pointer activation still submit exactly one real
  server action. Touch does not depend on a sticky hover state; reduced motion
  disables animated transitions while retaining the modest focus indicator.
- Computer pacing and trick clearance are authoritative backend actions, not
  locally synthesized plays. The UI consumes `publicState.completedTrick`,
  `pendingAction: {kind, dueAt}`, and `serverTimeMs`, and listens for
  `trickCleared`. A completed trick holds for the remaining server deadline
  minus its final 800ms collection animation. Late snapshots shorten the
  presentation rather than restarting a full local timer. Historical
  `previousTrick` never reanimates on refresh.
- All hand interactions and the final result/next-board control wait while
  `completedTrick` is present. A collecting/winner status replaces "your turn";
  scheduled robot cards show a thinking status. Only the authoritative clear
  enables a human lead or exposes the next trick. The backend also rejects
  premature leads and waits until clearance before scheduling its next robot
  card. Recovery snapshots are requested just after the server's advertised
  deadline if no autonomous broadcast arrives, with timers cancelled on newer
  broadcasts or unmount. Reduced motion preserves that rules/timing gate.

## Setup and environment

Use Node 20+ for a supported development toolchain. Local validation also ran on
the existing Node 18.15 environment; its pre-existing ESLint dependencies warn
that they require a newer Node. Playwright is pinned to `1.56.1` and its config
uses `.cts` to avoid the older Node ESM-loader restriction.

```bash
cd /home/jatelgen/Projects/BridgeGame
npm ci
npm start
```

Environment variable **names**:

| Name | Meaning |
| --- | --- |
| `VITE_WS_ENDPOINT` | WebSocket endpoint for the intended local or deployed environment; unset produces an explicit error, not a production fallback |
| `VITE_API_BASE_URL` | Vite development proxy target; frontend requests remain same-origin `/api`, which Vite forwards after stripping the `/api` prefix |
| `PLAYWRIGHT_BROWSERS_PATH` | Optional local browser installation path used by the smoke commands below |
| `TMPDIR` | Set to a project-local artifact directory for browser tooling in this environment; do not use system temporary paths |

No remote endpoint/token/secret values are documented here. Production
same-origin `/api` needs reverse-proxy routes to the account/auth and backend
REST APIs; `VITE_API_BASE_URL` configures the development proxy, not a deployed
reverse proxy. The backend must
configure `WS_ALLOWED_ORIGINS` or its documented `FRONTEND_URL` fallback to the
exact frontend origin and deploy `/auth/guest`, `getGameState`, and `nextBoard`
with appropriate integrations. Follow its contract for signing keys and IAM.
Account refresh cookies also require a compatible same-site deployment; default
unrelated frontend/API domains can prevent the existing strict cookie working.

### Local development first, without AWS

Follow the backend's
[`docs/LOCAL_DEVELOPMENT.md`](../../BridgeLambdas/docs/LOCAL_DEVELOPMENT.md)
for its isolated Python dependency setup. The adapter wraps the real Lambda
handlers with in-memory Moto tables, a newly generated local signing secret,
HTTP on port 3001, and real WebSockets on port 3002.

Terminal 1:

```bash
cd /home/jatelgen/Projects/BridgeLambdas
venv/bin/python scripts/local_server.py
```

Terminal 2:

```bash
cd /home/jatelgen/Projects/BridgeGame
VITE_API_BASE_URL=http://127.0.0.1:3001 \
VITE_WS_ENDPOINT=ws://127.0.0.1:3002 \
  npx vite --host 127.0.0.1 --port 4200 --strictPort
```

Open `http://127.0.0.1:4200`; use Create Room or Play with computers. Friends
can join from another browser/profile using the room code. No AWS endpoint is
the fallback. Backend readiness: `curl --fail http://127.0.0.1:3001/health`.
Anonymous lobby statistics can be unavailable because the existing statistics
handler requires an account access token.

Restarting the adapter deliberately loses its rooms and local signing secret.
Use a fresh browser tab/profile after a local reset, or explicitly clear that
tab's `bridge-guest-session` session-storage entry; the frontend will not silently
replace an invalid credential or pretend it recovered the previous seat.

## Exact validation commands

All commands below run from the frontend repository root. The two Vitest
configurations are intentionally separate: `vitest.config.ts` collects
`tests/**`; `vite.config.ts` collects `src/**`. Playwright `.e2e.cts` files are
not collected by either unit-test configuration.

Focused implementation and directly related regression coverage:

```bash
npx vitest run --config vitest.config.ts \
  tests/frontend/state.test.ts \
  tests/frontend/websocket.test.ts \
  tests/frontend/session.test.ts \
  tests/frontend/api.test.ts \
  tests/frontend/table.test.tsx \
  tests/frontend/lifecycle.test.tsx \
  tests/components/Room.test.tsx \
  tests/components/gameStore.test.ts \
  tests/components/userStore.test.ts \
  --pool=forks --poolOptions.forks.singleFork=true
```

Independent baseline suites:

```bash
npx vitest run --config vitest.config.ts --pool=forks --poolOptions.forks.singleFork=true
npx vitest run --config vite.config.ts src/components/bridge/dds/double-dummy-solver.spec.ts --pool=forks --poolOptions.forks.singleFork=true
npx tsc --noEmit -p tsconfig.app.json
npm run build -- --skip-nx-cache
```

Browser installation and smoke (project-local artifacts, no AWS calls):

```bash
mkdir -p .browser-artifacts
TMPDIR="$PWD/.browser-artifacts" \
PLAYWRIGHT_BROWSERS_PATH="$PWD/.browser-artifacts/browsers" \
  npx playwright install chromium
TMPDIR="$PWD/.browser-artifacts" \
PLAYWRIGHT_BROWSERS_PATH="$PWD/.browser-artifacts/browsers" \
  npx playwright test --config=playwright.config.cts tests/browser/table.e2e.cts --reporter=line
```

The Playwright runner owns an attached local Vite server on port 4201 and stops
it when finished. It refuses to reuse an unrelated server. The smoke explicitly
mocks signed guest bootstrap and personalized WebSocket envelopes; fake browser
credentials do **not** validate backend JWT handling or an AWS deployment.

With the local adapter already running, the separate **real two-browser**
acceptance uses no HTTP/session/WebSocket mocks:

```bash
TMPDIR="$PWD/.browser-artifacts" \
PLAYWRIGHT_BROWSERS_PATH="$PWD/.browser-artifacts/browsers" \
VITE_API_BASE_URL=http://127.0.0.1:3001 \
VITE_WS_ENDPOINT=ws://127.0.0.1:3002 \
BRIDGE_LIVE_E2E=1 \
  npx playwright test --config=playwright.config.cts \
    tests/browser/local-multiplayer.e2e.cts --reporter=line
```

The test requires loopback API/WS endpoints and otherwise skips unless explicitly
enabled. It starts/stops its own Vite server on 4201, not the user's 4200 server.

## Local results and browser evidence

### Focused hand ordering, selection, and pacing follow-up

- Targeted frontend unit coverage: **40 tests passed across five files**.
  The initial combined run passed 39; the additional deadline/subscription
  lifecycle regression then passed with that file's four cases. Commands:

  ```bash
  npx vitest run --config vitest.config.ts \
    tests/frontend/handOrder.test.ts tests/frontend/table.test.tsx \
    tests/frontend/state.test.ts tests/frontend/lifecycle.test.tsx \
    tests/frontend/websocket.test.ts \
    --pool=forks --poolOptions.forks.singleFork=true
  # After adding the deadline/subscription case:
  npx vitest run --config vitest.config.ts tests/frontend/lifecycle.test.tsx \
    --pool=forks --poolOptions.forks.singleFork=true
  ```

  The table-driven tests cover every suit trump plus NT/no contract, all ranks,
  immutable source arrays, visible own/dummy sorting, pointer/Enter/Space
  activation with stable DOM identity, completed-fourth-card display, disabled
  human leads, authoritative clear, final-result gating, and no historical
  trick replay. Recovery coverage checks due-time polling and timer/listener
  cancellation.
- `npx tsc --noEmit -p tsconfig.app.json` and
  `npm run build -- --skip-nx-cache` passed. The pre-existing non-fatal
  `errorStore` static/dynamic import warning remains.
- The documented mocked Chromium command now passes **7 tests**, including
  desktop/mobile geometry and computed stacking checks: focus/hover lift is
  exactly 6px with unchanged horizontal positions, names, and z-indices;
  clicking an exposed interior rank corner sends the canonical `TC` once.
  Collection reaches opacity zero before any authoritative clear can enable a
  lead; the final result remains hidden until `trickCleared`, including under
  reduced motion.
- This follow-up did not repeat full baseline suites, deploy to AWS, or stop
  the existing detached backend (3001/3002) or frontend (4200). Its Playwright
  helper used port 4201 and exited after the checks. Real local server pacing
  acceptance is coordinated separately with the backend timing worker; the
  mocked smoke does not claim to validate server scheduling.
- The real two-guest acceptance now additionally checks all thirteen
  authoritative trick-clear revisions, disabled controls while held, no
  premature completed-board phase, and that the next revision respects each
  clear/robot-card deadline. Its updated test parses with Playwright `--list`;
  executing those new assertions awaits the parent's coordinated local-backend
  restart and final acceptance, not the pre-existing detached server process.
  Its live-board loop has a deliberate 120-second wall-clock budget inside a
  180-second test timeout, accommodating 700ms robot turns, thirteen 1200ms
  clearances, and multi-browser overhead without replacing fake-clock unit
  timing checks with real sleeps.

### Earlier integration baseline (before the focused follow-up)

- Focused frontend and directly related regression coverage: **111 passed**,
  including **34** new focused frontend tests.
- App TypeScript checking and the real Nx production build pass. Vite retains a
  non-fatal warning about static/dynamic imports of `errorStore`.
- The full `tests/**` suite retains **22 pre-existing failures**:
  17 `tests/components/errorStore.test.ts` cases have an incompatible toast
  mock, and 5 `tests/components/roomDataStore.test.ts` cases assert older
  truncation/seat-label/robot behavior. No deleted tests were restored.
  Related room-cache assertions were updated to require stripped internal deal
  data, and local reset assertions now require `setup`, not a locally dealt
  board. Room control mocks/timers now test real server-backed behavior.
  Final full-suite count: **134 passed / 22 failed / 156 total**.
- The separate `src/**` suite retains **7 pre-existing DDS failures out of 19**:
  its fixtures pass rank+suit values to the legacy suit+rank browser utility.
  The live frontend no longer imports that client robot/DDS path.
- Real headless Chromium smoke: **4 passing tests** at 360px and 1440px,
  validating no horizontal overflow; own/dummy orientation; a real keyboard
  dummy play and canonical `TH` request; authoritative refresh; side-dummy
  visibility/non-control; reduced-motion CSS; and mobile legal-bid controls.
  Browser evidence exposed overflow, overlap, and duplicate StrictMode snapshot
  requests during development; those were fixed and the smoke rerun.
- Real local multiplayer browser acceptance: **1 passed in 12.7 seconds** using
  two isolated Chromium contexts, two real server-issued signed guests, and
  the unmocked local adapter. It created/joined a server room, started two
  humans plus server robots, refreshed the second browser without changing
  identity, submitted only enabled legal bids/cards, completed all **52 cards /
  13 tricks**, verified both results and personalized payload privacy, then
  requested the next board and saw a fresh auction in both clients. This
  uncovered and fixed the anonymous-lobby account-refresh redirect. Intended
  fan overlap is exercised by clicking exposed rank corners, not covered
  card centers.
- PNGs are generated under ignored `test-results/` folders:
  `table-360.png`, `table-1440.png`, `mobile-side-dummy.png`, and
  `mobile-auction.png`. The test attaches each image to its result. These were
  inspected after the layout fixes; they are mocked browser evidence, not
  screenshots of an AWS service. A future smoke rerun regenerates that folder.
  Copies of all four and the **real local** completion screenshot
  `real-local-completed-board.png` are preserved in
  `.browser-artifacts/evidence/`. No helper server from these checks was left
  running; the parent can start the local servers separately for the user.

## Remaining release gates and follow-on tasks

1. **Live staging integration:** deploy the agreed signed guest/auth Origin
   configuration and multiplexed lifecycle routes, configure frontend `/api`
   proxying, then create/join/start/play/reconnect/complete/next-board using real
   accounts and guests. The UI deliberately errors if a route is absent.
2. **Real multi-client browser match:** finish thirteen tricks with 1, 2, 3, and
   4 humans, including a human dummy controlled by a robot declarer. Verify
   account-token renewal and valid guest-token renewal while a table is open,
   guest tab refresh, multi-tab account broadcasts, stale-action recovery,
   disconnect/reconnect, board completion, and rotating dealer/vulnerability.
   The **two-guest browser case is now locally verified**, including next board
   and refresh. The 1/3/4-human, account-renewal, and broader device cases remain;
   local backend tests are separate evidence for those scenarios.
3. **Privacy capture:** inspect real network and storage before the opening
   lead and afterward. Only the viewer's hand and revealed dummy may appear;
   no token should appear in URL/logs, and a forged/expired credential or
   disallowed Origin must fail closed.
4. **Membership operation:** P1 now consumes authoritative presence,
   `leaveRoom`, explicit offline robot replacement, and owner lock/invitation
   controls; see [P1 features](p1-features.md). Leaving and ownership transfer
   are waiting/setup-only and require backend confirmation. During active or
   completed boards, disconnect still accurately preserves membership rather
   than claiming to release a seat. Public matchmaking remains a follow-on
   feature; the computer-table control is not matchmaking.
5. **Guest recovery / account upgrade:** `sessionStorage` guest identity is
   tab-scoped and bearer-readable by same-origin JavaScript. A lost, expired,
   revoked, or closed-tab credential does not recover the prior seat. Design
   secure recovery/upgrade and restrictive CSP/XSS defenses; do not downgrade
   silently or allow account endpoints to accept guest credentials.
6. **Broader UX acceptance:** test physical touch devices, Safari/Firefox,
   landscape/zoom, long names and translated text, screen readers, focus
   visibility, all animation transitions under live network timing, and the
   clipboard fallback. Chromium screenshot assertions do not prove those.
   Mobile prioritizes fitting the table; the sidebar can require vertical
   scrolling. Evaluate larger touch targets / alternate hand browsing.
   Other humans currently display a shortened ID when the sanitized room
   metadata has no public display-name map; add such metadata rather than
   attempting to infer identity or expose private account data.
7. **Legacy tests and utilities:** reconcile the documented unrelated toast,
   seat-label, and browser DDS test assumptions separately. Retire unused
   client-robot/REST lifecycle helpers only as an explicit cleanup task; they
   are not part of the authoritative live route.

## P1 feature wave

See [P1 features](p1-features.md) for the bounded implementation plan, exact
server contracts, preference rules, acceptance commands, assumptions, and
follow-on UI needs. New room tools provide authoritative seat presence and
120-second reconnect countdowns, explicit owner replacement only after the
server reports an offline seat, private invitation/lock controls, authorized
completed-board auction/trick/score replay, and the actual supported versioned
SAYC card with explicit unsupported sections. Live hidden hands are never used
to populate replay. Motion/sound/solo-speed preferences persist; full motion
still respects system reduction, audio requires a browser gesture each tab,
and speed changes are server-enforced one-human practice operations only.

P1 local validation on 2026-10-26: app `tsc` and production `vite build` passed;
95 focused frontend/room tests passed, including 16 P1 feature/service tests after
modal refinement. All 12 Chromium cases passed against isolated local API ports
3101/3102, including real two-client disconnect/reclaim, thirteen tricks,
authorized archive/replay, convention card, next board, private invitation/lock/
ownership transfer/seat release, and solo practice speed persistence.
The final 390/1440px replay-dialog checks passed again after improving modal
centering, sticky close controls, contrast, and background scroll containment.
Server helpers 3101/3102 and frontend helper 4201 were stopped; existing
4200/3001/3002 services were not touched. Evidence and exact repeat commands are
in [P1 features](p1-features.md).

## P2/P3 feature wave

See [P2/P3 features](p2-p3-features.md) for the implementation plan, exact
coordinated backend contracts, policy/information boundaries, command lines,
acceptance evidence and deliberate limits.

Implemented interfaces now include cumulative duplicate-point match scores and
cursor-paginated completed-board results; lawful SOLO legal explanations and
optional degraded-aware suggestions; owner-only named computer **card-play**
policies; configurable private invitation expiry and revocation by saved ID;
server-tracked claims/full concessions with all required human votes; and
2–4-table/1–8-board duplicate enrollment, organizer start, member status,
per-board embargo and released IMP/matchpoint comparisons.

Pending claims gate existing bidding, cards, store moves and next board, not a
client-only countdown. Rejection/cancellation restores authoritative play without
revealing hands. Accepted replay renders actual played/partial cards and explicit
settlement rather than inventing 52 plays. Event membership freezes at enrollment;
advice/pace are off, other-table waiting is truthful, and each room advances only
its own configured boards. Another table's completion is discovered by explicit
refresh/five-second member polling; archive refresh is independently available.

Existing P1 agreements, preferences, invitation locks/presence and server-owned
timing remain intact. The SAYC card is read-only; there is no unsupported
convention editor, seed/hidden-hand display, invented invitation-directory route,
expert-strength claim or simulated event movement.

P2/P3 local validation on 2026-10-26: **92/92 frontend tests** passed, including
28 new P2/P3 service/component/store cases; app TypeScript, production Vite build
and whitespace checks passed. **9/9 new real signed-client Chromium cases** passed
at 390/1440 px against a fresh isolated backend, covering real explanations/
playing hints, policies, invitations, four-human partial-trick claims, human
dummy consent, rejection/cancellation, concessions, cumulative replay and
two-/three-table IMP/matchpoint events with per-board embargo, independent
two-board advancement and final-board guards. **4/4 P1 browser regressions**
also passed: two real local flows and two explicitly mocked P1 contract cases.
There were no skipped new features. Actual screenshots are saved under ignored
`node_modules/.cache/p2-p3-evidence/test-results/`; exact repeat commands and
residuals are in the feature document.

Earlier repeated diagnostics saturated the retained-room local adapter and
caused request deadlines; the final coherent acceptance used a fresh isolated
3101/3102 server, not parent 3001/3002. This is not a load/durability claim.
Own helpers 3101/3102/4201 were stopped afterward; parent services and existing
working-tree/user edits were preserved, with no AWS, dependency or commit changes.
