# Bridge delivery backlog

This is a handoff for focused future workers, not a claim of production readiness.
The initial review found implemented room/auth/socket scaffolding, SAYC bidding
and DDS experiments, but also complete-game blockers. Existing uncommitted work
in all repositories must be preserved. Do not restore intentionally deleted
historical design documents or tests without understanding their replacements.

## Delivery work packages

The ten-feature local roadmap is now delivered; its acceptance evidence, focused
contracts and follow-on hardening work are in `docs/feature-roadmap.md`.
AWS staging is currently paused by the user until a
scoped non-root deployment identity exists; see
`BridgeLambdas/docs/AWS_READINESS.md`. The original local-only target below
describes the first milestone, not authorization to deploy AWS changes.

| ID | Owner/scope | Deliverable | Acceptance |
| --- | --- | --- | --- |
| GAME-01 | Backend rules and handlers | Authoritative auction, trick, dummy and board lifecycle | Legal double/redouble and declarer; follow suit; all 52 cards consumed once; thirteen tricks serialize and score |
| GAME-02 | Backend coordinator | Bounded server robot progression | One through four humans; winner leads; no lost/duplicate moves; stops on human input/completion |
| ROOM-01 | Frontend transport/state | Reliable subscriptions, authoritative snapshots and truthful controls | Subscribe before sending; independent disposers; intentional disconnect stays closed; reconnect restores intended room |
| TABLE-01 | Frontend presentation | Responsive game room and oriented hands/trick | All four viewer seats; declarer controls visible dummy; concealed counts accurate; keyboard and reduced-motion support |
| AI-01 | Backend robot modules | Fair bounded computer card selection | No-peeking invariance; sampled card conservation/voids; legal fallback; reproducible decisions |
| DOC-01 | Cross-repository documentation | Architecture, exact contract, runbook and residual work | Commands and limitations reflect actual implementation and evidence |
| LOCAL-01 | Local development adapter | Real local HTTP/WebSocket transport reusing Lambda handlers | Two independently authenticated clients can join/start/play/reconnect; no real AWS calls |

Component workers maintain their implementation details, verification evidence and
follow-on issues in:

- `BridgeGame/docs/frontend-readiness.md`
- `BridgeLambdas/docs/WEBSOCKET_CONTRACT.md`
- `BridgeLambdas/docs/robot-engine-contract.md`
- `BridgeLambdas/docs/LOCAL_DEVELOPMENT.md`

## Release gates and follow-on tasks

**Local delivery status:** GAME-01, GAME-02, ROOM-01, TABLE-01, AI-01,
DOC-01 and LOCAL-01 are implemented. INT-01 and INT-02 passed local acceptance.
Connection-bound signed sessions and conditional revisions implement MULTI-01's
core protections locally; production infrastructure and load acceptance remain
separate. OPS-01, broader AI-02 evaluation and TEST-01 remain future work.

### INT-01: Local integrated complete-game harness

**Depends on:** GAME-01, GAME-02, ROOM-01, AI-01.

Exercise real handler-to-snapshot conversion with isolated fake persistence and
delivery. Cover one human/three robots, two humans at different orientations,
four humans, passed-out auctions, doubled/redoubled contracts, robot trick winners,
human declarer controlling dummy and repeat boards. Assert 52 unique played cards,
13 tricks, consistent score and no hidden-card leakage to any recipient.

Add contract fixtures consumed by frontend conversion tests. Unit tests that mock
all orchestration or filtering do not meet this gate.

### INT-02: Multi-client browser acceptance

**Depends on:** INT-01 and LOCAL-01.

The selected target is local development; do not change AWS resources.

Use two independent browser contexts and separate accounts. Create/invite/join,
change seats while waiting, start, bid, follow suit, control dummy, finish a board,
advance, disconnect/reconnect and reload a shared room URL. Verify both views
agree and no unseen hands appear in browser/network state. Cover 360px mobile and
desktop layouts, keyboard input and reduced motion. Record actual animation
behavior rather than inferring fluidity from CSS alone.

### MULTI-01: Concurrent input and identity

**Depends on:** authoritative room transitions.

Bind socket actions to authenticated connection identity. Use conditional
room-version writes and request identifiers so duplicate/stale messages cannot
advance state twice. Race simultaneous seat claims, repeated cards and reconnects
against isolated persistence. Rejected input must return actionable errors.
Document table keys/indexes before changing scans or update expressions.

### OPS-01: Reproducible isolated deployment

**Depends on:** finalized handlers/routes and MULTI-01.

Represent API Gateway routes, route responses, Lambda runtime/architecture,
DynamoDB schemas/indexes, IAM and environment configuration in reproducible
infrastructure. Build native DDS/bcrypt against the Lambda target, not an
arbitrary host. Verify private start/update/snapshot delivery and reconnect in a
non-production environment before release. Never assume existing deployment ZIPs
or manual AWS configuration match the source.

### AI-02: Strength evaluation and inference

**Depends on:** AI-01 and complete-board scoring.

Publish a seeded duplicate-deal benchmark against the legal heuristic baseline.
Pair seats/deals and report IMP or duplicate-score differences, uncertainty,
illegal-action rate, degraded-solver rate and p50/p95 decision latency. Add
auction-informed sampling only with tested, documented bidding assumptions.
Do not label the opponent expert or mature based solely on DDS integration.

### DDS-01: Wrapper correctness and build provenance

**Depends on:** an identified consumer of the wrapper being changed.

Native DDS known-answer checks passed during discovery. Separate WASM findings:
the `dds` artifact solved a smoke deal, but the checked-in `ddsWrapper` artifact
exited on its first solve. Wrapper sources ignored solve errors and equivalent
card masks, and documented leader/strain semantics incorrectly. Fix and test
source adapters, error propagation, bounds, equivalent ranks, partial tricks and
output ordering before rebuilding pinned artifacts. Preserve existing local
resource-initialization changes. Do not replace a working native backend with
unverified browser artifacts.

### TEST-01: Consolidate validation entry points

Frontend has separate Vitest collection roots (`tests/**` and `src/**`).
Backend has stale historical test imports and a misnamed pytest config section.
Create an honest, reproducible CI entry point after distinguishing obsolete tests
from required regressions. Existing failures must be recorded separately from
new failures, not silently excluded or described as a full pass.

## Initial verified baseline

| Area | Evidence |
| --- | --- |
| Backend bid handler | 58 existing targeted tests passed; orchestration/filtering mocked |
| Backend SAYC subset | 40 passed, 3 failed at 2NT/3NT opening expectations |
| Backend historical collection | 14 collection errors from obsolete imports |
| Native DDS | Three known-answer tests passed |
| Python DDS examples | 17 tests passed against the working wrapper; documented alternate wrapper constructor failed |
| Deployment/browser multiplayer | Not verified |

Implementation evidence below must distinguish automated local checks from real
browser and deployment acceptance. Workers should append future tasks with exact
files, dependencies and observable acceptance criteria, rather than spawning
unbounded work without a handoff.

## Implementation evidence

### Authoritative games and fair robot core

The rules, coordinator, privacy projection and fair-player implementation are
delivered locally, including signed socket/guest sessions and conditional room
revisions. The final independent backend run passed **374 tests**, including all
58 original bid tests, complete-board lifecycle, fair play, native benchmark,
SAYC boundaries and real local HTTP/WebSocket clients:

```bash
cd ~/Projects/BridgeLambdas
PYTHONDONTWRITEBYTECODE=1 AWS_EC2_METADATA_DISABLED=true \
AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing \
AWS_DEFAULT_REGION=us-east-1 \
venv/bin/python -m pytest -p no:cacheprovider --rootdir=. -q --tb=short \
  tests/test_bridge_lifecycle.py tests/test_socket_sessions.py \
  tests/test_websocket_make_bid.py \
  tests/test_robot_fair_play.py tests/test_robot_bidder_fair.py \
  tests/test_robot_benchmark.py \
  lambdas/tests/unit/test_sayc_opening_bids.py \
  lambdas/tests/unit/test_sayc_simple.py \
  lambdas/tests/unit/test_sayc_1nt_responses.py \
  tests/test_robot_sayc_boundaries.py tests/test_local_server.py
```

These are local checks, including isolated persisted complete games, not evidence
that deployed AWS resources work. Real local browser acceptance is recorded
separately below.

The three initial SAYC opening failures were traced to malformed hand fixtures,
not incorrect opening thresholds. Corrected fixtures and new boundary/response
cases document the supported agreements rather than changing thresholds to fit
invalid hands.

### Local playable environment

The local adapter runs the production handlers with signed guest/account
authentication, real WebSockets and isolated in-memory AWS resources. It blocks
real AWS SDK wire calls. Health is available at
`http://127.0.0.1:3001/health`; WebSockets use port 3002.

```bash
# Terminal 1
cd ~/Projects/BridgeLambdas
PYTHONDONTWRITEBYTECODE=1 venv/bin/python scripts/local_server.py

# Terminal 2
cd ~/Projects/BridgeGame
VITE_API_BASE_URL=http://127.0.0.1:3001 \
VITE_WS_ENDPOINT=ws://127.0.0.1:3002 \
npx vite --host 127.0.0.1 --port 4200
```

Open `http://127.0.0.1:4200`. Use the same hostname throughout so cookies and
allowed origins agree; do not mix `localhost` and `127.0.0.1`. Local state resets
when the backend stops. Restarting requires clients to establish new sessions.
This adapter is development-only, not a production persistence/auth deployment.
Dependency setup and detailed instructions are in
`BridgeLambdas/docs/LOCAL_DEVELOPMENT.md`.

### Game-room frontend and real browser acceptance

The frontend now uses signed sessions and server-owned gameplay, with
authoritative refresh/reconnect, server-valid bids, oriented hands, declarer
control of dummy, responsive felt-table presentation and card/trick animations.
Unsupported controls do not fabricate successful gameplay.

Independent final verification passed 111 focused frontend tests, TypeScript
checking and the Nx production build. Five Chromium cases passed together:

- A real two-browser signed-guest game completed 52 cards and 13 tricks, refreshed
  a participant, checked hand privacy and advanced to a server-created next board.
- Declarer selected dummy cards by keyboard at 360px and 1440px without horizontal
  overflow.
- A mobile defender saw the public dummy without gaining control; reduced-motion
  behavior was respected.
- The mobile auction exposed only server-valid calls.

Reproduction commands, exact test selectors, session configuration and screenshot
locations are in `docs/frontend-readiness.md`. Browser test helpers use port 4201
and do not stop the persistent frontend at 4200 or backend at 3001/3002.

The broader historical suites still have documented failures: 22 external-suite
failures and 7 legacy DDS failures, alongside backend obsolete-import collection
errors. Focused passing checks are not a claim that every historical test passes.
Build warnings also flag a large JavaScript chunk and mixed dynamic/static error
store imports; bundle optimization is a separate task, not a gameplay blocker.

### Computer-player pilot

The native benchmark runner was independently exercised on 32 paired deals:

```bash
cd ~/Projects/BridgeLambdas
PYTHONDONTWRITEBYTECODE=1 AWS_EC2_METADATA_DISABLED=true \
AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing \
AWS_DEFAULT_REGION=us-east-1 \
venv/bin/python scripts/benchmark_robots.py \
  --boards 32 --seed 2026 --samples 4 --budget-ms 50
```

Both policies received lawful observations. The pilot used fixed contracts and
paired partnership swaps, **not bidding**, against a simple legal heuristic.

| Metric | Observed |
| --- | --- |
| Played actions | 3,328, all legal |
| Sampled-policy result | +178 IMPs total, +5.56 per pair; 30 wins, 2 ties |
| Exploratory 95% bootstrap interval | +4.31 to +6.91 mean IMPs per pair |
| Sampled-policy latency | p50 3.42 ms; p95 50.27 ms; maximum 113.10 ms |
| Budget fallback | 13 of 1,664 sampled-policy decisions (0.78%) |
| Solver errors | 0 |

The deadline is soft: an in-progress native solve can exceed the budget. Timing
excludes initialization, transport, persistence and broadcasts. A wall-clock
budget can change decisions between runs; use `--budget-ms 0` for fixed-sample
replay. This limited benchmark supports improvement over the included weak
baseline, **not mature/expert bridge strength**, general tournament strength, or
auction quality. AI-02 remains a release gate.

### Card experience and robot pacing follow-up

Delivered:

- Low-to-high C/D/H/S hand order, with trump on the right for suit contracts.
- Stable fan order and stacking; focus/selection raises a card by 6 px.
- Server-owned 700 ms robot card delay and 1200 ms completed-trick hold, followed
  by a distinct clearance transition and another delay before a robot leads.
- Human leads blocked until clearance; final results wait for the final trick.
- Autonomous local timers and tested AWS tick-worker source. AWS stream, queue,
  permissions and event mappings remain unprovisioned while deployment is paused.

Independent verification passed 342 backend pacing/game/session/robot cases,
40 focused frontend cases, type checking, production build and eight Chromium
cases including a real paced two-browser complete board. The local backend was
restarted to load pacing; its in-memory state reset as documented. Local
frontend/backend remain at ports 4200 and 3001/3002.

AWS read-only inventory found the public site reachable but missing required
guest/snapshot/next-board integration and associated configuration. Do not claim
the updated application is deployed there. The user selected isolated staging
before public rollout and paused changes until a scoped deployment identity is
available.

### Completed feature-roadmap milestone

All P1/P2/P3 roadmap features are implemented locally: presence/private controls,
authorized archives/replay, frozen convention cards, preferences, match scores,
lawful solo practice, computer policy tiers, claims/concessions and duplicate
events. Independent acceptance passed 501 selected backend cases, 123 frontend
cases, type checking, the Nx build and 21 Chromium cases covering real multi-client
flows. Commands and usage are in `docs/p1-features.md`,
`docs/p2-p3-features.md` and the backend feature contracts linked by the roadmap.

The running local backend was restarted with these features; previous
process-lifetime state reset. AWS deployment and broad computer-strength claims
remain blocked as documented. A new presence-heartbeat lease hardening task
records the missed-disconnect-callback limitation rather than hiding it.
