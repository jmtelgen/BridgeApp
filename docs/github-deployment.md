# GitHub frontend CI and manual AWS staging access check

## What this enables (and does not)

This is a publishing/bootstrap step, **not an application deployment**.

- `.github/workflows/ci.yml` runs frontend validation for pull requests, pushes
  to `main`, and manual dispatch. It uses Node.js 22, `npm ci`, selected Vitest
  regressions, application TypeScript checking, and the Nx production build.
- The selected test scope is `tests/frontend`, `tests/components/Room.test.tsx`,
  `tests/components/userStore.test.ts`, and `tests/components/gameStore.test.ts`.
  Historical tests outside this scope have known failures. A green check does
  **not** mean the entire historical suite, lint, backend integration, browser
  E2E, or real AWS behavior passed.
- CI uploads `dist/TestProject/` as `frontend-<github.sha>` for seven days.
  For PRs, this SHA identifies GitHub's tested merge commit, not necessarily
  the contributor's head commit. The artifact is build evidence, not a release
  or a production-ready environment configuration.
- `.github/workflows/aws-staging-access-check.yml` is **manual only**, uses the
  `staging` GitHub environment, assumes a dedicated AWS role using OIDC, and
  calls only `sts:GetCallerIdentity`. It does not check out or execute app code,
  download an artifact, provision resources, or deploy anything.

PR CI has only `contents: read`, does not persist checkout credentials, and has
no AWS OIDC token permission or environment/deployment credentials.
There is no `pull_request_target` workflow. Only the access-check job has
`id-token: write`; it has no repository permissions.

## AWS console setup: a dedicated role, not root

An operator should perform these steps in the AWS console using an appropriately
authorized administrative identity. **Do not use AWS root credentials for the
workflow, generate root keys, or change the unrelated GameSignal role.**
No AWS resources or IAM settings were changed while preparing these files.

1. Select AWS account **851725597758**. The intended application region is
   **us-west-2** (IAM roles/providers are account-wide).
2. IAM already has the provider
   `arn:aws:iam::851725597758:oidc-provider/token.actions.githubusercontent.com`.
   Verify its issuer is `https://token.actions.githubusercontent.com` and its
   audience/client ID includes `sts.amazonaws.com`. Reuse it; do not create a
   duplicate provider or broaden the existing GameSignal role trust.
3. In IAM **Roles → Create role → Custom trust policy**, paste the complete JSON
   from [`deployment/github-oidc-trust.json`](../deployment/github-oidc-trust.json).
   Name the new role **GitHubBridgeAppStaging** with no custom path.
   The exact resulting ARN must be:
   `arn:aws:iam::851725597758:role/GitHubBridgeAppStaging`.
4. **Attach no permissions policies** and add no inline identity policy.
   `sts:GetCallerIdentity` requires no identity-policy permission.
   The trust policy allows GitHub to assume the role; it does not grant S3,
   CloudFront, database, or deployment access. Do not attach
   `AdministratorAccess` or reuse an application administrator role.
5. Review the saved trust policy and verify there are no additional principals,
   wildcard subjects, or other attached/inline policies. Leave the unrelated
   provider/roles unchanged.

The trust requires both audience `sts.amazonaws.com` and the exact subject:

```text
repo:jmtelgen/BridgeApp:environment:staging
```

Read-only GitHub metadata checked during bootstrap reported repository ID
`1031606887`, owner ID `96450410`, and:

```json
{
  "use_default": true,
  "use_immutable_subject": false,
  "sub_claim_prefix": "repo:jmtelgen/BridgeApp"
}
```

Therefore the policy intentionally accepts **only the actual legacy subject**
above, not a guessed immutable-ID variant. If the repository is renamed,
transferred, or its OIDC subject settings change, re-read the metadata and
deliberately update trust. Never print an OIDC token to discover its claims.
An environment-based subject does not include a branch: branch authorization
must be enforced by GitHub environment rules, not an imaginary branch suffix in
this trust policy.

## GitHub environment setup

In `jmtelgen/BridgeApp` → **Settings → Environments → staging**:

1. Restrict deployment branches/tags to selected **branches** `main` and
   `deployment/github-staging-bootstrap` (bootstrap only), not arbitrary
   branches or tags. Add a required reviewer where the repository plan supports
   it. Keep branch protection/review on these workflow changes.
2. Set environment **variables**, not access-key secrets:

   | Variable | Exact value |
   | --- | --- |
   | `AWS_ACCOUNT_ID` | `851725597758` |
   | `AWS_REGION` | `us-west-2` |
   | `AWS_STAGING_ROLE_ARN` | `arn:aws:iam::851725597758:role/GitHubBridgeAppStaging` |

   Leave `AWS_STAGING_ROLE_ARN` unset until the operator creates and reviews the
   role. A manual run before then must fail at the configuration check.
3. Do not add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, or root credentials.
   The workflow clears ambient AWS credentials before obtaining its short-lived
   OIDC role session. It requests a 15-minute role session.
4. After bootstrap, remove `deployment/github-staging-bootstrap` from the
   environment branch rules and remove its allowance in the workflow job
   condition, leaving only `main`.

The workflow rejects missing variables, any unexpected account/region/role ARN,
root identity, or an unexpected STS account/assumed-role identity. STS output is
used to check the stored account variable against the hard-coded account,
not merely to display a successful authentication message.

## Running and reviewing

GitHub requires a `workflow_dispatch` workflow file to exist on the **default
branch** before it can be manually dispatched. Merge the reviewed workflow
change into `main` first; simply pushing a new workflow on the bootstrap branch
does not make it dispatchable. Then choose **Actions → Manual AWS staging access
check (no deployment) → Run workflow → main**, approve the environment gate if
configured, and inspect the identity-only summary.

The equivalent operator command, **after** merge, role setup and environment
configuration, is:

```sh
gh workflow run aws-staging-access-check.yml --repo jmtelgen/BridgeApp --ref main
gh run list --repo jmtelgen/BridgeApp --workflow aws-staging-access-check.yml --limit 5
```

These are instructions, not evidence that a remote run or role setup succeeded.
No live AWS access check was run during preparation.

Frontend commands used by CI:

```sh
CYPRESS_INSTALL_BINARY=0 npm ci --no-audit --no-fund
npx --no-install vitest run --config vitest.config.ts tests/frontend tests/components/Room.test.tsx tests/components/userStore.test.ts tests/components/gameStore.test.ts
npx --no-install tsc --noEmit -p tsconfig.app.json
NX_DAEMON=false NX_NO_CLOUD=true npx --no-install nx build TestProject --skip-nx-cache
```

Cypress's binary installation is skipped because CI does not run browser E2E.
No backend dependency installation or server is required for this selected
mocked frontend scope.

Local bootstrap validation passed all **210 tests in 14 selected files**,
`tsc --noEmit -p tsconfig.app.json`, and the Nx build using existing dependencies
on Node.js 18.15.0. This does not substitute for the first clean Node.js 22
`npm ci` GitHub run. Workflow YAML, pinned-action syntax, trust JSON, and embedded
Bash syntax were checked locally; six configuration cases and five STS identity
cases were exercised with a mocked `aws` function, without AWS calls.
`actionlint` was not installed, so no actionlint result is claimed.

## Action pins

The official upstream action refs were resolved using read-only GitHub API calls
on 2026-10-26; workflows use immutable commit SHAs rather than mutable tags:

| Action | Resolved ref | Commit |
| --- | --- | --- |
| `actions/checkout` | `v4` | `11d5960a326750d5838078e36cf38b85af677262` |
| `actions/setup-node` | `v4` | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| `actions/upload-artifact` | `v4` | `ea165f8d65b6e75b540449e92b4886f43607fa02` |
| `aws-actions/configure-aws-credentials` | `v4` / release `4.3.1` | `7474bc4690e29a8392af63c5b98e7449536d5c3a` |

Review upstream changes before updating pins. Resolution example:

```sh
gh api repos/aws-actions/configure-aws-credentials/commits/v4 --jq .sha
gh api repos/jmtelgen/BridgeApp/actions/oidc/customization/sub
```

## Before any actual staging release

There is no new staging application stack in this bootstrap. A separate
infrastructure/durability phase must define the backend hosting, persistent room
and game state, reconnect/session behavior, API/WebSocket endpoints and auth,
frontend bucket/CDN and runtime/build configuration, secrets handling,
observability, backups, rollback, and real integration/browser acceptance tests.
Resolve the existing historical test failures and establish the additional
release gates explicitly.

Only then design a separately reviewed deployment workflow and narrowly scoped
resource-specific deployment permissions for the appropriate roles. The current
role intentionally cannot deploy. **Do not invoke the existing `deploy.sh`: it
contains a hard-coded production S3 sync with `--delete`.** Do not reuse its
production target for this staging check.
