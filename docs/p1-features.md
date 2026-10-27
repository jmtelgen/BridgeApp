# P1 frontend features

## Scope, plan, and assumptions

This bounded wave implements room presence/reconnect, authorized completed-board
replay, a versioned read-only partnership convention card, and persisted player
preferences. Existing edits/deletions and live hand ordering/lift/pacing are
preserved. No dependency, AWS, deployment, or commit changes are required.

Implementation sequence: coordinate server envelopes first; isolate feature state
from live/private hands; add accessible room tools and explicit server-confirmed
membership operations; add preferences without local game timers; validate unit,
production-build, and desktop/mobile Chromium flows. The server remains the only
authority for membership, legality, archives, agreement versions, and timing.

The local adapter is a single-process development service. Archive availability
lasts only for its server lifetime, not durable storage. Signed guest renewal
retains the identity; an expired/rejected credential cannot invent a replacement
identity to regain a seat. Browser tab session storage is not cross-device login.

Backend references: [board records](../../BridgeLambdas/docs/board-records.md)
and [room lifecycle](../../BridgeLambdas/docs/room-lifecycle.md).

## Contracts consumed

- `room.presence[seat]`: `{status: online|reconnecting|offline|robot|empty,
connectionCount, userId?, reservedUntil?}`. `reservedUntil` is epoch **seconds**;
  `publicState.serverTimeMs` and archive `completedAt` are milliseconds.
  The countdown is display-only. At grace expiry the client requests another
  authoritative snapshot; it does not locally mark a seat replaceable.
- Disconnect leaves a 120-second reservation. Another valid tab keeps presence
  online; refresh/reconnect with the same signed identity reclaims the seat.
  Only the owner sees explicit `replacePlayer {roomId,seat}` for server-reported
  offline seats. No automatic robot replacement or ownership transfer.
- `leaveRoom {roomId}` → `roomLeft`; `transferOwnership {roomId,newOwnerId}`
  → `roomUpdated/updateType:ownershipTransferred`. Both are **waiting/setup
  only**, including the server's conservative prohibition after board completion.
  An owner with another human must transfer before releasing a seat. During a
  board the UI offers disconnect, accurately distinct from leave.
- `setRoomLock {roomId,locked}` → `roomUpdated/roomLockChanged`.
  `createInvitation {roomId}` → `roomInvitation`
  `{roomId,invitationId,invitationToken,expiresAt}`;
  invitation `expiresAt` is epoch seconds.
  `revokeInvitation {roomId,invitationId}` →
  `roomUpdated/invitationRevoked`. Replacement uses `playerReplaced`.
  Private invitations use `#roomId=…&invitationToken=…`, never authentication
  credentials. The invitation is removed from the address bar after confirmed
  joining. Locked rooms cannot admit new members even with an invitation;
  existing seat holders still reconnect.
- `listBoardArchives {roomId,limit:100}` → `boardArchives {roomId,boards,…}`.
  `getBoardArchive {roomId,boardId}` → `boardArchive {roomId,board}`.
  Only a server-authorized, completed archive with schema version 1, result,
  completed timestamp, and four `initialHands` arrays is rendered. Nothing
  reconstructs unrevealed hands from live game state.
  Archive fields include `auction`, `tricks[].plays`, trick winners, contract,
  declarer, dealer, vulnerability, final result, and frozen `agreements`.
- `getAgreementCard {roomId,version?}` → `agreementCard {roomId,card,agreements}`.
  `card` contains `system`, `version`, `title`, `supported[{topic,description}]`,
  `unsupported[]`, `deviations[]`, and `source`. Current board references come
  from `publicState.agreements.{NS,EW}`. The only supported system is the
  server's actual SAYC subset, not a simulated customizable convention editor.
- `publicState.boardId/revision` accompany `nextBoard` to prevent delayed retries
  skipping boards. Snapshot agreement/pace metadata is memory-only and follows
  existing stale-revision/wrong-room guards.
- `setPracticePace {roomId,revision,practiceMode:true,robotCardDelayMs,trickHoldMs}`
  → full snapshot `practicePaceChanged`.
  Only the owner of a started one-human, three-robot room can opt into solo
  practice. The backend
  enforces this restriction; changing a select does not alter local timers.
  Existing pending actions keep their deadline. Standard remains 700/1200 ms;
  relaxed is 1400/2400 ms and quick is 300/1000 ms. Saved speed is applied only
  by explicit user action and only saved after server confirmation.

## Preferences and accessibility

`bridge-player-preferences` local storage contains validated, versioned
`motion`, `sound`, and `practiceSpeed` values. Motion choices are automatic,
reduced, and full; an OS reduced-motion request always wins, including full.
Animation reduction never changes a server deadline or the 6px legal-card lift.

Sound is silent by default. A click must successfully unlock Web Audio in each
tab, even when the enabled preference survived reload. A short cue occurs only
for a newly received live turn transition, deduplicated by room/board revision;
initial/reconnect snapshots and duplicate frames do not repeat it. Audio
activation errors are shown rather than treating a blocked browser as enabled.

The responsive native dialog provides modal focus containment, Escape closing,
and focus restoration. Replay has buttons plus focused-panel Left/Right,
Home/End keys. It steps auction calls, each trick card, and trick winners; shows
authorized remaining hands, final score, and board-frozen agreements. The live
store is never rewound. Room controls expose server errors and do not update
membership optimistically.

## Acceptance and exact validation commands

From `BridgeGame`:

```sh
npx tsc --noEmit -p tsconfig.app.json
npx vite build
npx vitest run --config vitest.config.ts tests/frontend tests/components/Room.test.tsx --reporter=dot
npx playwright test tests/browser/p1.e2e.cts tests/browser/table.e2e.cts --reporter=line
```

For an isolated real-server flow, do not stop existing 4200/3001/3002 services:

```sh
# In BridgeLambdas, verify 3101/3102 are free, then keep this bounded helper attached:
PYTHONDONTWRITEBYTECODE=1 venv/bin/python scripts/local_server.py --http-port 3101 --ws-port 3102
# In BridgeGame; Playwright owns and stops its frontend helper on 4201:
BRIDGE_LIVE_E2E=1 VITE_API_BASE_URL=http://127.0.0.1:3101 VITE_WS_ENDPOINT=ws://127.0.0.1:3102 npx playwright test --reporter=line
```

If Chromium is missing, install only after that missing-runtime failure and keep
all download working files inside the project:

```sh
mkdir -p node_modules/.cache/playwright-work
TMPDIR="$PWD/node_modules/.cache/playwright-work" PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.cache/playwright" npx playwright install chromium
# Prefix subsequent Playwright commands with both:
TMPDIR="$PWD/node_modules/.cache/playwright-work" PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.cache/playwright"
```

Focused tests cover authorized replay denial/steps, agreement frozen version and
unsupported sections, presence countdown/duplicate tabs, explicit replacement
failure, stale snapshots, persistence/system motion, gesture failure, sound
deduplication, and backend-confirmed solo speed. Chromium covers 390/1440px P1
tools plus existing 360/1440px sorting/lift and server-clearance regressions.
The real two-client test additionally disconnects/reclaims, finishes 13 tricks,
loads the archive's four initial hands and server convention card, and advances
the next board using the server's identity/revision.

Recorded local evidence on 2026-10-26:

- Typecheck and production Vite build passed. The existing mixed dynamic/static
  `errorStore` chunk warning remains nonfatal.
- Focused frontend/room suite: **95 tests passed**, including **16 P1 feature/
  service tests**, rechecked after replay selection/modal refinement.
- All Chromium browser tests with real loopback API: **12 passed**, including
  two-client full-board replay, private invitation/lock/transfer/release, solo
  pace persistence, desktop/mobile/reduced motion, and existing card regressions.
  Final focused replay-dialog rerun: **2 passed**.
  That rerun also verifies actual Chromium gesture-based audio unlock and that
  reload requires a new tab activation despite the persisted enabled preference.
- The real private-control test initially exposed a helper that had imported an
  older mutation envelope. Restarting only the owned 3101/3102 helper loaded the
  finalized contracts; no production/parent service was restarted or stopped.
  Frontend room creation/join also accepts a correctly matched authoritative
  membership broadcast even if its optional `success` field is absent.
- Test helpers 4201/3101/3102 were stopped after verification. Existing parent
  services 4200/3001/3002 were untouched. No AWS traffic or deployment occurred.
- Screenshots retained under `.browser-artifacts/evidence/`:
  `p1-real-local-completed-board.png`, `p1-replay-390.png`, and
  `p1-replay-1440.png`.

## Follow-on work and limitations

- P2 scoreboard/match display, hints/computer-level UI, claims, duplicate deals,
  saved archives, seat movement, and richer room administration are intentionally
  not expanded here. Backend hints must remain solo-practice-only; this wave
  creates no hints or analysis from concealed live hands.
- The archive selector currently lists the most recent 100 completed boards.
  Server pagination is a follow-on UI improvement.
- Only the invitation generated in this open component is directly revocable in
  this UI; a durable invitation administration list is future work.
- Multi-device restoration requires a signed account. Cloning a tab can share
  guest credentials through browser session-storage copying, but unrelated
  browser contexts obtain distinct signed guest identities.

- Long (120-second) offline replacement authorization is tested by the backend
  clock-controlled suite; the real UI flow verifies immediate disconnect/reclaim.
- Production multi-instance archive persistence and token/Origin deployment
  configuration remain separate backend/release work.
