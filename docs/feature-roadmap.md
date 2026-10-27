# Bridge feature ideas

## Starting point

Local multiplayer, computer opponents, scoring, next boards and reconnect are
implemented. The latest refinements add deliberate robot timing, trick collection,
stable card selection and low-to-high C/D/H/S ordering with trump last.

AWS staging is paused pending an approved non-root deployment identity. All ten
features below are implemented and integrated locally. No cloud changes were
made. This is a local feature-delivery milestone, not a production-readiness or
expert-computer-strength claim.

## Completed implementation waves

1. Presence/private-room lifecycle; completed-board archive, agreement cards and
   match records; P1 interfaces and preferences.
2. Guided solo practice and evidence-backed computer policy levels, with their
   interfaces and expanded match controls.
3. Consent-based claims/concessions and isolated duplicate tables, followed by
   complete local multi-client acceptance.

Approved behavior: disconnected seats are reserved for **120 seconds**, after
which the owner may **explicitly** replace the player with a robot; there is no
automatic replacement. Completed-board archives last for the local server's
lifetime. Hints and adjustable robot speed are available only in solo practice.
Positive claims require all opponents to be human and unanimously accept;
computer opponents reject unproven positive claims. Full concessions remain
available against robots. Rejection must reveal no hands and resume the exact
position.

Duplicate events use 2-4 tables and 1-8 shared boards. Each player participates at
only one table, all tables share deals/dealer/vulnerability, two-table comparisons
use IMPs and three/four-table comparisons use matchpoints. Full-deal replay stays
embargoed until every table finishes that board, and event hints are disabled.

Feature-specific documents record actual implemented contracts and residual work.
The existing local server's rooms/accounts reset when it restarts; do not infer
production persistence from local acceptance.

### Implementation handoff documents

| Area | Backend contract |
| --- | --- |
| Presence, reservations, invitations and locks | `BridgeLambdas/docs/room-lifecycle.md` |
| Archives, replay, agreements, match results and practice pace | `BridgeLambdas/docs/board-records.md` |
| Lawful practice hints and computer policy budgets | `BridgeLambdas/docs/practice-computer-levels.md` |
| Claims, concessions and duplicate events | `BridgeLambdas/docs/claims-duplicate.md` |

Frontend usage, contracts, exact commands and residual limitations are documented
in `docs/p1-features.md` and `docs/p2-p3-features.md`.

### Integrated local acceptance

Independent final verification passed 501 selected backend cases, 123 frontend
cases, TypeScript checking, the Nx production build and 21 Chromium cases.
The browser cases include real signed clients exercising:

- Private invitation revocation/expiry, locking, ownership transfer and release.
- Authorized replay, frozen convention cards, preferences and solo pace.
- Practice hints/policy choices, concessions and cumulative archives.
- Four-human claim rejection, cancellation, unanimous settlement and replay.
- Two- and three-table duplicate events, embargo release, score comparison and
  final-board guards at mobile and desktop widths.
- A full paced 52-card board, refresh, hand privacy, next board, dummy control,
  stable card stacking, keyboard input and reduced motion.

The persistent local app is available at `http://127.0.0.1:4200`, with backend
HTTP/WebSockets on ports 3001/3002. The backend was restarted to load all features,
so older in-memory rooms/accounts were reset. Isolated browser helpers were
stopped without stopping the persistent app.

These are selected feature/regression checks, not a claim that historical suites
with documented stale imports or fixtures all pass.

## Delivered roadmap

| Priority | Feature | Player value | First deliverable and acceptance |
| --- | --- | --- | --- |
| P1 | Room presence and reconnect grace | A dropped connection does not leave partners guessing | Show online/reconnecting status, retain a seat for a documented grace period, then offer an explicit owner-approved replacement. Reconnect reclaims the same seat; two connections cannot claim different identities for one action. |
| P1 | Completed-board replay | Players can understand a result and learn from mistakes | Save the auction, legal play sequence, contract and score; step through thirteen tricks after completion. All four hands and double-dummy analysis become available only after the board is over, never through a live spectator loophole. |
| P1 | Partnership convention card | Human/robot partnerships know their bidding agreements | Display the supported SAYC openings, responses and unsupported conventions before play. Persist one agreement per partnership/board and show explanations from rules, not invented prose or hidden opponent cards. |
| P1 | Player preferences | More comfortable play across desktop and mobile | Add persisted reduced-animation and optional sound settings plus a practice-only robot-speed selector. Shared timing remains server-authoritative and cannot be shortened by one client's local setting; current hand order remains the default. |
| P2 | Private-room controls | Easier and safer games with friends | Add expiring invitations, room lock and explicit seat release. Invalid/expired links fail clearly; revoked invitations cannot join; an active board cannot silently change occupants. |
| P2 | Multi-board match scoreboard | A session feels like a match rather than unrelated hands | Retain board results, dealer/vulnerability rotation and cumulative duplicate scores. A reconnect restores the same match; requesting the next board twice cannot skip a board or score twice. |
| P2 | Guided practice mode | Beginners can learn without disrupting multiplayer | Explain legal calls and follow-suit obligations, with optional hints derived only from the learner's visible information. Disable advice in competitive multiplayer and clearly separate it from post-board full-deal analysis. |
| P2 | Calibrated computer levels | Players can choose an appropriate challenge | Compare heuristic and sampled policies on an expanded seeded corpus, then expose levels backed by legal-action, score and latency measurements. Never label a level expert from a small fixed-contract benchmark. |
| P3 | Consent-based claim and concession | Avoid laboriously playing an obvious ending | Introduce a server-tracked proposal with clear claimed tricks and unanimous required acceptance. Rejection resumes the exact board; no hidden-card reveal occurs before settlement. |
| P3 | Duplicate club tables | Friends can compare results on the same boards | Run isolated tables with matching deals and IMP/matchpoint comparison after all relevant tables finish. Prevent early completed-table replay from leaking cards to a still-live table. |

## Original worker handoff criteria (implemented)

### FEAT-01: Presence and seat lifecycle

**Dependencies:** signed sessions, connection-bound actions, conditional room
updates and the existing reconnect snapshot.

Start in the backend disconnect/connect lifecycle and room snapshot; then add
frontend presence indicators. Specify grace duration and owner/replacement rules
before implementation. Cover refresh, network loss, guest renewal, duplicate tabs,
explicit leave and a reconnect racing seat replacement. Do not silently substitute
a robot while a human still believes they own the seat.

### FEAT-02: Post-board archive and replay

**Dependencies:** stable board IDs, final trick clearance and completed-board
scoring.

Define the archive format and retention policy first. Reuse the authoritative
auction/trick records instead of reconstructing play from animations. Add
round-trip replay tests and authorization tests showing an unfinished board
cannot expose all four hands through an archive endpoint. Delay shared-deal
analysis until every table using that deal has finished.

### FEAT-03: Agreement card

**Dependencies:** documented robot bidding rules and legal-auction helper.

Extract the actual supported agreements into a readable, versioned display.
Do not imply unimplemented conventions are supported. Cover natural notrump
openings/responses, doubles, competitive auctions and explicit limitations.
Version changes must apply to future boards, not alter an auction in progress.

### FEAT-04: Preferences

**Dependencies:** current authoritative timing and accessible card presentation.

Start with optional sound and motion settings; defaults remain silent and respect
system reduced-motion preferences. Any adjustable gameplay pace needs a room-level
agreement, server validation and clear bounds. Cover persistence, mobile controls,
keyboard focus and reconnect without duplicate sounds or replayed animations.

## Boundaries for later planning

- Release infrastructure remains in `BridgeLambdas/docs/AWS_READINESS.md`.
- Computer-strength evaluation remains in the implementation backlog; fair
  sampled play is not a proof of expert strength. Policy tiers describe play
  budgets; the thoughtful-versus-standard benchmark interval included zero.
- Historical test cleanup and bundle size are maintenance tasks, not reasons to
  expand an unrelated feature patch.
- Archives and duplicate events use process-lifetime local storage, not durable
  production storage. Event membership is frozen to protect information access.
- Ownership transfer and explicit release are setup-only. Missing disconnect
  callbacks can retain presence until authentication expiry; heartbeat leases are
  recorded as a separate follow-on hardening task.
- Spectating or future expansions of replay, hints and duplicate events require
  explicit information-access rules before UI work begins.
