# Bridge entry page

## Scope and design

The `/` route still renders `RoomManager` in
`src/components/bridge/components/Room.tsx`. Only this entry component, its new
scoped `RoomEntry.css`, entry tests and this document were changed. Existing
worktree changes were preserved; no backend, AWS configuration, game table,
lobby, account page, dependency, routing or global stylesheet was changed.

The entry now shares the table's dark felt, warm ivory, brass accents and serif
headings. A readable hero and small CSS-only ace fan balance the desktop form.
Create/join choice cards expose their selected state without pretending to be
an ARIA tab widget. On small screens the ace illustration and redundant feature
list disappear, the layout stacks, and the form remains full-width. No remote
fonts, images, fabricated player counts, reviews or matchmaking are used.

The account links, guest access and player preferences remain available. Live
activity still comes from the existing connection service, refreshes every
30 seconds, and explicitly says unavailable when the request fails.

## Functional and usability preservation

- Create and join still use the existing `roomService`, trimmed payloads,
  persisted player names, server-assigned seats, room store and join callback.
  Create/join drafts survive switching choices.
- Private rooms still require the existing invitation capability. Copy explains
  that a code alone cannot join a private room; invitation links continue to use
  the unchanged `/room/:roomId` flow.
- “Play with computers” still creates an actual private server room. Its copy
  explains that only a name is needed and the user must press Start game in the
  lobby to populate empty seats. Its pending label now truthfully says
  “Creating computer table...” instead of “Finding...”.
- Explicit labels, required fields, native form/Enter submission, a skip link,
  visible keyboard focus, named account navigation and activity refresh,
  selected-choice semantics, disabled in-flight controls, status feedback and
  inline failure alerts supplement existing error-store feedback.
- No decorative motion is introduced. System reduced motion and the existing
  player preference also suppress transitions within the entry.
- The existing Room test behavior was retained; only the misleading computer
  pending-label assertion changed. Eight focused cases add keyboard/private
  payload, draft retention, pending lockout, inline retry feedback, unavailable
  stats, semantic labels and account navigation coverage.
- Scoped ghost variants avoid Bootstrap's shared `bg-primary` utility overriding
  the felt palette. Browser assertions check the actual rendered selected-card
  and primary-button colors, not just class names.

## Verification

Run from `BridgeGame`, with the existing dependencies/browser already installed:

```sh
npx vitest run --config vitest.config.ts tests/components/Room.test.tsx tests/frontend --reporter=dot
npx tsc --project tsconfig.app.json --noEmit
NX_DAEMON=false npm run build
```

Result: **131 tests across 11 files passed**, including all 39 Room tests and the
existing frontend lifecycle, state, transport, table, P1 and P2/P3 tests.
Application TypeScript and the existing Nx production build passed.

For browser acceptance, first verify that isolated ports 3101/3102/4201 are
free. Start this bounded helper from `BridgeLambdas`:

```sh
PYTHONDONTWRITEBYTECODE=1 venv/bin/python -B scripts/local_server.py --http-port 3101 --ws-port 3102 --origin http://127.0.0.1:4201
```

In `BridgeGame`:

```sh
curl --fail --silent http://127.0.0.1:3101/health
export PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.cache/playwright"
export VITE_API_BASE_URL=http://127.0.0.1:3101
export VITE_WS_ENDPOINT=ws://127.0.0.1:3102
export BRIDGE_LIVE_E2E=1

npx playwright test --config playwright.config.cts tests/browser/entry.e2e.cts --output .browser-artifacts/entry-evidence/browser --reporter=line
npx playwright test --config playwright.config.cts tests/browser/p1-live.e2e.cts tests/browser/p1.e2e.cts tests/browser/table.e2e.cts --output .browser-artifacts/entry-evidence/regressions --reporter=line
npx playwright test --config playwright.p2-p3.config.cts tests/browser/p2-p3-live.e2e.cts --output .browser-artifacts/entry-evidence/p2-p3 --reporter=line
npx playwright test --config playwright.config.cts tests/browser/local-multiplayer.e2e.cts --output .browser-artifacts/entry-evidence/multiplayer --reporter=line
```

Results: **5 entry**, **11 P1/table**, **9 real P2/P3**, and **1 real full-board
multiplayer** Chromium cases passed. The new entry cases cover 360/768/1440 px
containment, skip-link/choice/form keyboard operation and visible focus,
preferences/reduced motion, real guest creation and code join via Enter,
reload/reclaim, a computer room actually starting a game, and visible failed
join feedback. Existing regressions cover private invitation lock/ownership/
release and revoked/expired links; claims, practice and duplicate events;
keyboard dummy/auction/card play; and real two-client reconnect, thirteen
tricks and next board.

The Playwright configurations start and stop their own 4201 frontend. The
3101/3102 helper was health-checked and stopped after acceptance. Parent-owned
4200/3001/3002 services were not stopped or restarted.

### Screenshot evidence

These are ignored local artifacts, not committed assets. Desktop and mobile
create screenshots were visually inspected after the final palette correction.

- `.browser-artifacts/entry-evidence/browser/entry.e2e.cts-entry-layout-8e889-d-and-preferences-at-1440px/entry-create-1440.png`
- `.browser-artifacts/entry-evidence/browser/entry.e2e.cts-entry-layout-8e889-d-and-preferences-at-1440px/entry-join-1440.png`
- `.browser-artifacts/entry-evidence/browser/entry.e2e.cts-entry-layout-keyboard-and-preferences-at-768px/entry-create-768.png`
- `.browser-artifacts/entry-evidence/browser/entry.e2e.cts-entry-layout-keyboard-and-preferences-at-768px/entry-join-768.png`
- `.browser-artifacts/entry-evidence/browser/entry.e2e.cts-entry-layout-keyboard-and-preferences-at-360px/entry-create-360.png`
- `.browser-artifacts/entry-evidence/browser/entry.e2e.cts-entry-layout-keyboard-and-preferences-at-360px/entry-join-360.png`

## Known limits and warnings

- Activity requests were unavailable in this isolated guest session; screenshots
  intentionally show unavailable rather than invented counts. This optional
  service failure does not block actual room creation/join.
- The first diagnostic unit run caught the deliberately changed “Finding...”
  label assertion; it was updated without removing behavioral coverage.
  Final verification has no failures.
- Existing React Router future-flag and legacy test `act` warnings remain.
  The build retains the existing mixed static/dynamic `errorStore` import and
  large-bundle warnings. No dependency or unrelated framework cleanup was made.
- Chromium automation is not a physical touch-device, screen-reader, Safari,
  Firefox, production authentication-renewal or AWS acceptance claim. Account
  navigation was verified; account forms were not redesigned.
- Local backend state is in-memory and is lost when its helper stops. No
  production persistence or hosting change is implied.
