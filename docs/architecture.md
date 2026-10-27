# Bridge application architecture

## Scope and source of truth

The application spans sibling repositories under `~/Projects`:

| Repository | Responsibility |
| --- | --- |
| `BridgeGame` | React/TypeScript game room, private player view, input and animation |
| `BridgeLambdas` | Python Lambda handlers, authoritative rooms, rules, robot decisions and persistence |
| `DDS` | Native double-dummy solver and Python experiments |
| `dds` | Native/WASM solver experiments, including existing local modifications |
| `ddsWrapper` | Separate WASM wrapper fork; its checked-in artifact is not verified for live use |

This document describes the intended integration boundary. Check the implementation
backlog and component readiness documents for verified delivery status. Local
changes and tests do not establish that the AWS deployment has been updated.

## Runtime boundaries

The browser sends player intentions over API Gateway WebSockets. Lambda validates
the connection, player, phase, turn and action against the persisted room. The
server determines the next state and advances computer turns. DynamoDB, not a
browser's persisted Zustand state, is authoritative.

Responses must be personalized. A player receives public room/game information
and that player's own hand, not the complete deal. Dummy becomes public only
after the opening lead. Declarer controls dummy's decisions; dummy is not a
second autonomous player while declarer is human.

The frontend may show pending input, card movement and a thinking indicator, but
must not independently advance robots, award tricks, deal a new board or invent
a successful room join. Refresh and reconnect require an authoritative snapshot.

### Existing wire conventions

| Value | Representation |
| --- | --- |
| Seats, turn and trick leader | `North`, `East`, `South`, `West` |
| Cards | Rank then suit: `AS`, `TH`, `2C`; suits `S`, `H`, `D`, `C` |
| Auction calls | `pass`, `double`, `redouble`, `1C` through `7NT` |
| Computer occupants | IDs prefixed with `ROBOT_` |
| Personalized gameplay | `action`, `publicState`, `privateState`, `seat`, `message` |

These are not a guarantee that every historical handler uses the same envelope.
The backend's `docs/WEBSOCKET_CONTRACT.md` documents the implemented route and
payload contract. Frontend conversion belongs at the boundary, not throughout
presentation components.

## Rules and board lifecycle

One rules implementation should determine legal auction calls, declarer, contract
multiplier, follow-suit obligations, trick winner and duplicate score. Robot and
human actions must obey the same rules.

The lifecycle is waiting room, auction, opening lead, play, completed board and an
explicit server-created next board. Four opening passes end a passed-out board.
After a contract, the opening leader is declarer's left-hand opponent. The trick
winner leads the next trick. The board ends after thirteen complete tricks, with
a result retained before advancing the dealer and vulnerability schedule.

The backend coordinator must repeatedly inspect the current phase and turn,
rather than iterate over a fixed seat sequence. Stop at a human decision or a
terminal state; bound automatic work. Accepted moves must not be discarded by
rereading persistence before saving their effects.

## Computer opponents

DDS is a mature **perfect-information** solver. It is not a bidding system, and
using the actual hidden deal for live card selection gives the robot information
that human players do not have.

The intended fair-play boundary is:

1. Construct an observation containing only the acting partnership's legitimately
   visible cards, public auction, exposed dummy, completed plays and inferred
   public constraints.
2. Sample possible unseen deals consistent with card conservation, remaining
   hand sizes and demonstrated voids.
3. Evaluate legal candidates against the same samples, with correct trick-leader
   and declaring/defending-side semantics.
4. Apply bounded sample/time budgets. Report degraded solver availability and
   use a deterministic legal fallback rather than fabricate solver success.

Bidding uses explicitly documented partnership agreements and legal auction
validation. Double-dummy par must not select live bids. Seeded no-peeking tests
must produce the same decision when only the real hidden allocation changes.

Sampled double-dummy analysis is a practical baseline, not evidence of expert
strength: strategy fusion, imperfect auction inference and budget limits remain.
Strength claims need duplicate-deal tournaments with paired seats, baseline
opponents, score/IMP metrics, confidence intervals and latency measurements.
See `BridgeLambdas/docs/robot-engine-contract.md`.

## Presentation

Render all seats relative to the viewer, including labels, current trick and
dummy. Concealed hand counts must decrease with play without revealing cards.
Use stable card identities for hand-to-trick transitions. Browser animation
callbacks must not mutate authoritative state or gate server progression, and
reduced-motion preferences must disable unnecessary movement.

Visible hands sort clubs, diamonds, hearts, spades, low to high; a suit contract
moves trump to the right. Selection lifts the existing card without changing fan
order or stacking.

Computer cards use server-owned deadlines (700 ms locally by default).
A completed trick remains visible for 1200 ms, then a separate `trickCleared`
transition occurs. The next computer lead waits another card delay; human leads
are blocked until clearance. Final scoring/results also wait for final-trick
collection. Clients render these deadlines but cannot accelerate them by polling.
Durable AWS tick delivery requires the stream/queue/worker wiring described in
the AWS readiness document; source code alone does not provision it.

The game room should remain usable at narrow mobile widths, with keyboard card
selection, visible focus, readable legal actions and explicit connection/error
states. Multiplayer correctness takes precedence over optimistic animation.

## Deployment boundary

The initial delivery target was **local development first, with no AWS changes**.
AWS connectivity is now a requested follow-up; deployment status must be verified
against the selected account and resources rather than inferred from local
success. Read-only inventory identified gaps in the existing public deployment.
The selected next target is **isolated staging before updating the public site**.
Cloud changes are paused at the user's request until a scoped non-root deployment
identity is available. See `BridgeLambdas/docs/AWS_READINESS.md` for the handoff.
The running local environment remains the known playable target.

A local HTTP/WebSocket adapter must invoke the same production
handlers and isolate AWS SDK calls behind development-only mock resources. It is
not an alternative production deployment. See
`BridgeLambdas/docs/LOCAL_DEVELOPMENT.md` for startup, authentication and the
explicit lifetime of local room state.

Production needs correctly configured WebSocket routes and responses, DynamoDB
key schemas, connection-bound identity, IAM permissions, JWT secrets, HTTPS/WSS
origins and Lambda-compatible native dependencies. Adding a handler file alone
does not add an API Gateway route.

No production deployment or live multi-client session was verified during initial
discovery. Do not distribute credentials or embed backend secrets in Vite
environment variables. Check backend deployment documentation before updating
AWS resources or generated deployment archives.

The completed local feature roadmap, acceptance evidence and remaining hardening
work are in `docs/feature-roadmap.md`. Feature contracts are documented in
`docs/p1-features.md`, `docs/p2-p3-features.md` and the linked backend documents.

## Local feature extensions

Room presence tracks valid connections and a 120-second reconnect reservation;
replacement is explicit, not automatic. Private invitations, locks and
ownership/release controls use authoritative membership and conditional writes.

Board archives are immutable post-completion records with authorization checks.
Match results and frozen bidding agreements belong to the board, not a client's
animation history. Archives and duplicate-event state currently last only for
the local server process.

Solo hints use lawful observations and are denied in multiplayer/events.
Computer policy tiers change play budgets, not access to hidden cards.
Claim proposals freeze gameplay until rejection, cancellation, expiry or
authorized settlement; accepted claims archive a settlement rather than invented
card plays. Duplicate events share server-owned deals across isolated tables,
freeze membership, and withhold full-deal replay until every table finishes the
corresponding board.
