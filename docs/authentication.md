# Account authentication

## Browser behavior

- `/create-account` requires a username (at least three characters), email,
  password and matching confirmation. Passwords must meet the existing
  `BridgeLambdas/lambdas/shared/security/password_utils.py` policy: **8–128
  characters**, lowercase, uppercase, digit and a symbol from
  `!@#$%^&*()_+-=[]{}|;:,.<>?`. Fields have autocomplete, maximum password
  lengths, an accessible policy hint and associated validation messages.
  The backend remains authoritative; duplicate and invalid responses show
  errors, not success. Confirmed creation redirects to `/login`.
- Login sends cookies and validates the server response's token expiry and
  identity before storing it. Token decoding is a response sanity check,
  **not** client-side signature verification. The backend verifies signatures.
  Plain JSON and Lambda envelopes (including errors with HTTP 200) are supported.
  Raw error bodies and authentication requests are not logged.
- The access token stays in memory. Persisted user metadata and a
  `wasAuthenticated` flag allow reload to restore the account using its
  HttpOnly refresh cookie. Concurrent refreshes share one request.
- The home header shows the signed-in account and **Log out**. Logout calls
  `POST /api/logout` with cookies, immediately stops monitoring and clears
  identity, guest credentials, room cache and game state, disconnecting the
  socket. A network/server failure explicitly says that only local sign-out
  completed and offers **Retry logout**; it does not claim cookie removal.
- Late account refreshes cannot revive logout or overwrite a newer login.
  Late guest bootstraps cannot replace a newly logged-in account.
- Guest-to-account changes discard the guest socket and credentials; the next
  connection uses the account's signed identity. Existing guest seats are not
  transferred. Rejoin explicitly with the account or create a new table.
  Legacy create-room replies containing display names are resolved using an
  authorized `getGameState` snapshot, never by matching names to account IDs.
  A reload of the same account preserves its room and restores from the server.

## Server integration and limits

Use the same-origin `/api` proxy for `/account`, `/account/login`,
`/auth/refresh`, `/auth/guest` and `/logout`, plus the authenticated WebSocket
endpoint. The backend logout handler is `api/auth/account_logout.py`.
Production must wire **POST /logout** and forward its `multiValueHeaders`
cookie expiry. See the backend authentication document for configuration.

Logout expires this browser's refresh cookie; **it does not revoke stateless
JWTs**, log out other devices or cancel stolen/copied tokens. Existing access
tokens remain valid until expiry (15 minutes), and copied refresh tokens until
their seven-day expiry. The browser disconnects its live socket, but there is
no global server-session revocation database. Refresh responses no longer
reissue cookies, avoiding a late refresh response undoing logout's expiry.
No AWS deployment or staging verification was performed.

## Focused verification

From `BridgeGame`:

```sh
npx vitest run tests/frontend/auth.test.tsx tests/frontend/session.test.ts tests/frontend/websocket.test.ts tests/frontend/p1-room-service.test.ts tests/frontend/lifecycle.test.tsx tests/frontend/state.test.ts tests/components/userStore.test.ts tests/components/Room.test.tsx tests/components/gameStore.test.ts --reporter=dot
npx tsc --noEmit -p tsconfig.app.json
NX_DAEMON=false npx nx build
```

For real Chromium validation, run the backend in an attached terminal from
`BridgeLambdas` (fresh process = fresh in-memory accounts):

```sh
PYTHONDONTWRITEBYTECODE=1 venv/bin/python scripts/local_server.py --http-port 3101 --ws-port 3102 --origin http://127.0.0.1:4201
```

From `BridgeGame`, with the existing local browser installation:

```sh
mkdir -p .browser-artifacts/auth-runtime
TMPDIR="$PWD/.browser-artifacts/auth-runtime" PLAYWRIGHT_BROWSERS_PATH="$PWD/.browser-artifacts/browsers" VITE_API_BASE_URL=http://127.0.0.1:3101 VITE_WS_ENDPOINT=ws://127.0.0.1:3102 npx playwright test tests/browser/auth.e2e.cts tests/browser/entry.e2e.cts --config=playwright.config.cts --reporter=line
```

Playwright owns and stops Vite on 4201. Stop the attached backend after tests.
These commands do not start the user's persistent servers on 4200/3001/3002.
Browser tests cover signup/weak password/confirmation/duplicate, bad and good
login, account room creation, reload refresh, logout cookie expiry/rejected
refresh, guest-to-account switching, and rejected access to the guest's seat.

Verification results: **146** focused frontend tests, **74** backend tests and
**7** Chromium scenarios passed; TypeScript and the Nx production build passed.
Build output retains its existing chunk-size/mixed-import warnings.
An additional run of `tests/components/roomDataStore.test.ts` has **23 passing
and 5 pre-existing failing tests**: ID truncation, east/west name lookup,
display-position labels and legacy robot-name recognition. Those underlying
display/rotation routines and their assertions were not changed for auth.
