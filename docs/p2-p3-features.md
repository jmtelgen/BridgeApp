# P2/P3 frontend: match, lawful practice, claims and duplicate tables

## Scope and implementation plan

This wave extends the existing P1 frontend, without replacing its room lifecycle,
signed sessions, versioned SAYC card, preferences, replay or private-hand
boundary. Existing user edits, low-to-high C/D/H/S order with trump last,
6 px legal-card lift, reduced-motion behavior and authoritative 700/1200 ms
robot/trick timing are preserved. No dependencies, AWS resources, deployments
or commits were changed.

Implementation sequence:

1. Read the roadmap and P1/readiness documents; confirm backend practice/archive
   contracts and coordinate claims/duplicate envelopes directly with the backend
   owner before implementing UI.
2. Add typed services and memory-only room feature state. Keep live hand data
   separate from completed authorized archives.
3. Extend replay with cumulative scores, cursor pagination and claim settlement;
   add solo explanations/policy selection and private invitation administration.
4. Add server-consent claim controls and event enrollment/status/results. Gate
   existing play, bidding and next-board controls, not just the new controls.
5. Validate focused service/component/store tests, existing frontend regressions,
   app TypeScript, production build and actual signed multi-client Chromium
   flows on isolated local API ports 3101/3102 and frontend port 4201.

Backend references:
[board records](../../BridgeLambdas/docs/board-records.md),
[practice levels](../../BridgeLambdas/docs/practice-computer-levels.md),
[room lifecycle](../../BridgeLambdas/docs/room-lifecycle.md),
[claims and duplicate](../../BridgeLambdas/docs/claims-duplicate.md).
The parent owns the roadmap/architecture/backlog; those documents are not edited
by this wave.

## Match scores and archive pagination

`Completed boards` opens the existing modal with a **Multi-board match** section.
`getMatchScoreboard {roomId}` → `matchScoreboard {roomId,scoreboard}` returns
`{completedBoards,scoreNS,scoreEW,lastBoardId}`. Authoritative
`publicState.scoreboard` takes precedence over an earlier modal fetch. The client
never adds a received score or snapshot to a local total. Scores are signed
cumulative **duplicate points**, not rubber, IMPs or matchpoints.

`listBoardArchives {roomId,limit:20,beforeBoardNumber?}` →
`boardArchives {roomId,boards,nextBeforeBoardNumber}` loads newest summaries
first. **Load older boards** sends the returned positive integer cursor, appends
deduplicated summaries and stops only at a null cursor. An empty last page is
valid. **Refresh completed boards** reloads the first page, including newly
released event archives. Loading/error states are visible; selection/replay is
not manufactured from current live hands.

`getBoardArchive` remains room-membership authorized and completed-board only.
Shared event boards are omitted/denied until **every table finishes that board**,
even if a table has advanced to another board. An organizer has no cross-table
archive privilege. These process-memory archives and local match data do not
survive backend restart.

## Guided SOLO practice and computer policies

**Guided solo practice** appears only for the seated sole human with three
robots, without `room.eventId` or `publicState.eventId`. Explanations and hints
are enabled only on the human's current controlled bidding/play turn, including
exposed dummy controlled by that declarer, outside trick collection or a pending
claim. The server independently enforces the stronger SOLO/noncompetitive
authorization boundary on every request.

- `getPracticeHint {roomId,revision,suggest:false|true}` →
  `practiceHint {roomId,revision,hint}`. Render `phase`, `actor`, `controller`,
  `legalActions`, `explanation`, visible-hand `handHcp`/`shape` when present,
  `information`, and optional `suggestion
  {card,mode,completedSamples,degraded,caution}`.
- **Explain legal actions** skips policy work; **Ask for a practice hint**
  requests the optional suggestion. Bidding displays legal calls, visible HCP
  and S/H/D/C shape, not invented conventional advice or a fabricated bid.
- Responses are discarded if the room, board or revision changed during the
  request. A displayed hint disappears when its revision is no longer current.
  Hints are private responses and do not pause the server clock.
- `setComputerLevel {roomId,revision,computerLevel}` →
  `computerLevelChanged {roomId,revision,computerLevel,availableLevels}` is
  **not a full snapshot**. After confirmation the UI explicitly calls
  `getGameState` and applies the returned authoritative room/tier/revision.
  This avoids treating the response's policy-parameter object as the snapshot's
  string tier.

The owner-only selector exposes only actual named **card-play policies**:

| Policy | Samples | Budget |
| --- | ---: | --- |
| Heuristic | 0 | Legal heuristic; no DDS sampling |
| Standard | 4 | Soft 50 ms |
| Thoughtful | 8 | Soft 100 ms |

These are not skill ratings or bidding-strength levels. All tiers retain the
same supported SAYC bidding. Native solves can exceed soft limits; zero-batch
budget/solver failures yield a legal fallback. Degraded hints and server cautions
are displayed explicitly. The small exploratory benchmark does not establish
expert strength or prove Thoughtful stronger than Standard.

Sampled policies compare lawful possible deals, not the actual hidden
allocation. Neither actual nor sampled hidden hands, seeds or solver internals
are displayed. Speed is separate: existing explicit server-confirmed practice
pace remains unchanged and is also hidden in event rooms.

## Private invitations and membership administration

Existing lock/unlock remains owner-only and server-confirmed. Private invitation
creation now sends `createInvitation {roomId,expiresInSeconds}` with explicit
1-minute, 15-minute, 1-hour or 24-hour lifetimes. The server supports integer
1–86400 seconds; expiry returned as `expiresAt` is epoch **seconds**.
The UI shows the returned invitation ID and expiry and uses only the
room-invitation capability in the share URL fragment, never a signed identity
credential.

`revokeInvitation {roomId,invitationId}` can revoke the current link or an older
saved invitation ID entered explicitly. The backend has **no invitation-list
route**: the UI does not invent a directory or claim to recover old capabilities.
Changing lifetime creates a new invitation without revoking an older one.
Revocation prevents new joins, not existing seated reconnects.
Invalid/revoked/expired joins remain visible errors in the real invited-room
join form. Locked rooms deny invited new membership too.

An owner must transfer ownership before releasing a waiting-room seat; a sole
owner cannot abandon the room through the unsupported leave action. During an
event, joins/seat changes/release/replacement/ownership transfer freeze
immediately on enrollment. Their controls are hidden/disabled and the restriction
is explained. Existing members still reconnect. No event cancellation,
unenrollment, replacement or ownership override is invented.

## Claims and concessions

Controls are in the actual game sidebar, not only below the room.

| Request | Data beyond `roomId` | Reply |
| --- | --- | --- |
| `proposeClaim` | `boardId`, `revision`, client UUID `proposalId`, `tricks` | `claimUpdated` personalized snapshot |
| `respondClaim` | `boardId`, `revision`, `proposalId`, boolean `accept` | same |
| `cancelClaim` | `boardId`, `revision`, `proposalId` | same |

`tricks` means remaining tricks allocated to the **proposer's partnership**,
including an unfinished trick. Positive claims require both opponents human.
Against robots the UI offers only **Concede all remaining tricks**, sending
zero. Only the current human controller can propose, not a separately acting
human dummy or anyone during four-card trick collection.

`publicState.claim` includes proposal/board IDs, proposer/side, requested and
remaining tricks, status, required seats, votes and epoch-millisecond expiry.
Every other human, including partner/dummy, explicitly accepts. The UI shows
each required vote, explicit accept/reject, proposer cancellation and server
resolution. The backend imposes 60-second expiry and 16 proposals per board.

A pending claim disables the existing store move gate, bid fieldset, playable
cards and next-board action even if a stale local turn flag is true. The backend
also freezes legality/robots and publishes its claim-expiry deadline; the normal
snapshot resync follows that deadline. The UI never pauses/resumes a local game
clock as a substitute for server state. Rejection, cancellation, expiry or
disconnect resumes only from an authoritative snapshot and reveals no hand.

Proposal UUIDs are reused for an identical same-revision transport retry.
Responses are filtered by room/proposal and, for vote/cancel operations, by the
requested vote or cancelled status, rather than accepting an unrelated claim
broadcast as confirmation. Revision conflicts are visible; existing stale-state
resynchronization applies. A new board clears old claim metadata.

Accepted snapshots and schema-version-1 archives add `claimSettlement
{proposalId,proposer,allocation:{NS,EW},acceptedAt,unplayedTrick}`.
Only actual completed tricks are in `tricks`; actual partial plays precede an
explicit allocation step in replay. There is no fake trick winner, empty-hand
reconstruction or synthetic 52-card sequence. The sidebar labels played tricks
separately from the remaining settlement; normal duplicate scoring and
cumulative totals remain server-derived.

## Duplicate club tables

Owners first assemble all desired humans in their ordinary waiting rooms.
**Duplicate club tables** lets the current fresh owned waiting room create an
event or join an existing invitation:

| Request | Data | Reply |
| --- | --- | --- |
| `createDuplicateEvent` | `roomId`, `tableCount:2..4`, `boardCount:1..8` | `duplicateEventCreated` |
| `joinDuplicateEvent` | `eventId`, own `roomId`, `invitationToken` | `duplicateEventJoined` |
| `startDuplicateEvent` | `eventId` | `duplicateEventStarted` |
| `getDuplicateEvent` | `eventId` | `duplicateEvent` |

Replies include `{eventId,event}`; only creation returns the enrollment
capability. Selecting a table means selecting **this current owned room**;
the backend assigns table numbers in enrollment order. There is no arbitrary
table/seat selector, movement editor or cross-table player membership.
The organizer starts only after all requested rooms register; empty seats
become robots. Waiting member reads are supported; ordinary start-room is hidden
for registered event rooms.

The event is `{eventId,organizerId,status,tableCount,boardCount,scoring,tables,
boards,totals}`. Waiting events have no boards yet. Tables list assigned number
and room ID; boards show `boardNumber`, `completedTables`, `released` and,
only when released, per-table duplicate scores and comparison points.
Two-table comparisons display **IMPs**; three/four tables display
**matchpoints**. Totals are explicitly **released-board totals only**, not
estimated rankings or unimplemented team movements.

Enrolled members refresh explicitly or via a cleaned-up five-second read poll,
because another table's completion has no cross-room push broadcast. Poll
failures are visible alongside last confirmed results and do not erase a
mutation error. Unreleased comparisons remain hidden in the renderer even if
a malformed response supplied results.

Each owner advances their own completed board with the existing
`nextBoard {roomId,boardId,revision}`. The UI permits independent progress,
never claims other tables finished, and removes the next-board action after
the event board count. Finishing all boards at one table is not labeled an
event-wide completion while other tables remain active.

## Validation and exact commands

Use the existing installed dependencies. App validation:

```sh
cd /home/jatelgen/Projects/BridgeGame
npx vitest run tests/frontend --maxWorkers=1 --minWorkers=1
npx tsc --noEmit -p tsconfig.app.json
npx vite build
```

The new feature suite contains service, component, store, legality-gating,
pagination, stale-hint, policy-confirmation, consent, settlement-replay,
event-authorization/release and invitation-administration tests. P1 replay mocks
were updated for the paged API and explicit scoreboard fetch.

Start a **fresh** isolated backend in a separate managed terminal/process:

```sh
cd /home/jatelgen/Projects/BridgeLambdas
PYTHONDONTWRITEBYTECODE=1 venv/bin/python -B scripts/local_server.py \
  --http-port 3101 --ws-port 3102 --origin http://127.0.0.1:4201
```

Then run actual Chromium integration (no mocked routes or skipped features):

```sh
cd /home/jatelgen/Projects/BridgeGame
curl --fail --silent http://127.0.0.1:3101/health
PLAYWRIGHT_BROWSERS_PATH=node_modules/.cache/playwright \
TMPDIR="$PWD/node_modules/.cache/playwright-work" \
npx playwright test --config playwright.p2-p3.config.cts
```

The additional P1 browser regression command is:

```sh
cd /home/jatelgen/Projects/BridgeGame
BRIDGE_LIVE_E2E=1 \
VITE_WS_ENDPOINT=ws://127.0.0.1:3102 \
VITE_API_BASE_URL=http://127.0.0.1:3101 \
PLAYWRIGHT_BROWSERS_PATH=node_modules/.cache/playwright \
TMPDIR="$PWD/node_modules/.cache/playwright-work" \
npx playwright test tests/browser/p1.e2e.cts tests/browser/p1-live.e2e.cts \
  --config playwright.config.cts
```

The configuration starts/stops its own frontend on 4201 with API 3101 and
WebSocket 3102; it does not reuse parent services 4200/3001/3002. Stop the
isolated backend using its specific managed session/PID after the run.
Browser work files remain under the repository's ignored `node_modules/.cache`,
not system temporary directories.

Recorded acceptance results and residual limits are summarized in
[frontend readiness](frontend-readiness.md). Earlier failed diagnostic runs
exposed a selector accessible-name issue and a claim-acknowledgment race;
both were fixed rather than counted as passed. The final coherent run is the
acceptance evidence, not those diagnostics.

### Recorded local acceptance — 2026-10-26

- **92/92 frontend tests passed** in ten files, including **28 new P2/P3**
  service/component/store cases. App TypeScript, production Vite build and
  `git diff --check` passed.
- **9/9 new Chromium cases passed without skips or mocked transport** against
  the fresh local backend, at 390/1440 px with reduced motion. These cover
  actual bidding legal explanations and playing suggestions, persisted policy
  selection, full concessions versus robots, cumulative scores and authorized
  replay; four-human rejection with exact hand preservation, cancellation,
  keyboard opening lead, declarer-controlled human dummy consent, unanimous
  partial-trick settlement/replay and next board; two- and three-table events,
  IMPs/matchpoints, waiting/embargo/release, two-board independent advancement,
  old-board replay while a later board is active, final-board bounds and member
  refresh/reconnect; and revoked/actually expired invitations with a second
  signed client.
- **4/4 P1 Chromium regressions passed** afterward: two actual local cases
  for private invitation/lock/ownership transfer/seat release and persisted
  SOLO pace, plus two explicitly mocked 390/1440 px P1 contract-browser cases
  for replay, presence, agreements and preferences. They are distinct from
  the nine real P2/P3 integration cases.
- Actual pending-claim and released duplicate-result screenshots are retained
  under ignored `node_modules/.cache/p2-p3-evidence/test-results/`. Mobile claim
  and desktop three-table comparison images were inspected for readable controls,
  lawful exposed dummy, hidden opponents and responsive containment. The felt
  table does not stretch to the height of the longer new sidebar.
- Repeated earlier diagnostic runs accumulated many retained local rooms and
  eventually produced request-deadline failures. Restarting **only** the isolated
  3101/3102 adapter removed that diagnostic state; the final nine real cases
  passed together in about one minute, followed by all four P1 browser cases.
  This is bounded feature acceptance, not an unbounded-room load benchmark.
  Parent services 3001/3002/4200 were not restarted or stopped.
- Isolated backend and frontend helpers were stopped after validation; source
  ownership is returned to the parent. No backend source, roadmap, architecture,
  backlog, AWS state or commits were changed by this frontend wave.

## Deliberate limits

- Local backend restart loses rooms/accounts/events/archives; no production
  persistence or AWS acceptance is implied.
- No invitation directory, retrieval of lost invitation/event capabilities,
  event cancellation/unenrollment/movement, convention editor or expert-level
  bidding is supported by the backend, so none is fabricated.
- Physical touch devices, Safari/Firefox, screen-reader and account-renewal
  acceptance remain broader readiness work. Automated Chromium uses 390/1440 px,
  reduced motion, real signed clients and keyboard activation.
- Browser pagination with more than twenty real completed boards is not a
  separate live stress test; exact cursor traversal/deduplication has
  service/component coverage and the backend archive suite.
- The pre-existing Vite mixed static/dynamic `errorStore` import warning and
  React Router future-flag warnings do not prevent app validation. Existing
  historical tests outside the focused frontend suite and legacy global toast
  styling remain a separate cleanup. New feature failures have inline alerts
  independent of that existing toast presentation.
