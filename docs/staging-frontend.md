# Isolated frontend staging publication

This is a **manual, main-only** release path, not evidence of a deployed service.
Preparing/testing these files performs no AWS operations. Backend infrastructure,
IAM bootstrap, resource creation and real browser acceptance remain separate.
Never run the legacy `deploy.sh` for staging. The existing public distribution
`E1HX0HXMLYUF2Z` and bucket `nextlevelbridgeassetdistributionbucket` are forbidden.

## Infrastructure contract (backend/infrastructure owner)

Use account `851725597758`, region `us-west-2`, and a **new** distribution's
generated `https://d....cloudfront.net` hostname only. Do not configure aliases,
custom certificates, DNS records, or the existing public targets.

- Private bucket: `bridge-staging-web-851725597758-us-west-2`.
  Enable S3 versioning, all four public-access blocks, and SSE-S3 encryption.
  Do not set expiration policies that remove prior release assets or entry
  versions inside the agreed rollback window. No public website endpoint.
- Bucket **and distribution** tags: `Environment=staging`, `Application=Bridge`.
- CloudFront default origin: that bucket's regional REST endpoint
  `bridge-staging-web-851725597758-us-west-2.s3.us-west-2.amazonaws.com`,
  empty origin path, OAC, and a bucket policy granting only this new
  distribution's service principal access. Default root: `index.html`.
- Default behavior: `redirect-to-https`, custom static cache policy with
  **MinTTL=0, DefaultTTL=0, MaxTTL>=31536000**, honoring origin Cache-Control.
  Managed **CachingDisabled** (`413f160f-6f7a-4a81-9889-719956cb8466`) is also
  accepted, but bypasses edge caching. Positive minimum/default TTLs are rejected.
- Optional `/assets/*` behavior: same private bucket, `redirect-to-https`,
  managed **CachingOptimized** (`658327ea-f89d-4fab-a63d-7e88639e58f6`).
  Vite emits content-hashed names; uploads set one-year immutable caching.
- Both `/api` and `/api/*` behaviors: the **isolated staging backend** HTTPS
  origin, origin path **`/staging`**, `https-only` or `redirect-to-https`,
  all seven methods, managed
  **CachingDisabled**, and managed **AllViewerExceptHostHeader**
  (`b689b0a8-53d0-40ab-baf2-68738e2966ac`). Forward authentication headers,
  cookies, query strings, and request bodies. Backend receives `/api/...`
  unchanged after the API Gateway stage prefix; it must support this prefix.
  The infrastructure owner must ensure
  this origin is the staging API, not the public API; the publisher cannot
  prove backend ownership from CloudFront configuration alone.
- For React Router deep links, attach a **web-default-behavior-only**
  viewer-request CloudFront Function rewriting extensionless UI routes to
  `/index.html`. Never rewrite `/api`, `/api/*`, or missing asset paths, and
  do not attach the SPA function to API behaviors. Do not use global custom
  403/404 responses: those can turn real API failures into successful HTML.
- Backend auth must accept the new CloudFront origin, issue appropriate
  Secure/HttpOnly/SameSite cookies, and handle its same-origin `/api` contract.
  WebSocket is the separate staging API Gateway public `wss://` stage URL.

The publisher reads and validates resource ownership, tags, versioning, public
access blocks, default/API routing and cache policies **before any write**.
It does not create, repair or modify infrastructure, tags, policies or IAM.

The backend application stack must be named `bridge-staging-application` in
this account/region and expose `SourceCommit`, `StagingOrigin`, and
`ArtifactSha256`. Before any web write, the publisher describes this exact stack,
verifies its returned stack identity and permits only `CREATE_COMPLETE`,
`UPDATE_COMPLETE`, or `UPDATE_ROLLBACK_COMPLETE`. Its `SourceCommit` must match
the requested `backend_release_ref`, `StagingOrigin` must match `STAGING_ORIGIN`,
and `ArtifactSha256` must be a SHA-256 digest. Missing stacks, missing outputs,
mismatches, failed reads and unhealthy states explicitly abort publication.
The verified stack ID, status and backend artifact digest become release provenance.

## GitHub staging variables

Retain the environment's main-only branch rule, required reviewer where
supported, and reviewed changes to main. OIDC trust remains the exact subject
`repo:jmtelgen/BridgeApp:environment:staging`.

| Variable                  | Required value                                                       |
| ------------------------- | -------------------------------------------------------------------- |
| `AWS_ACCOUNT_ID`          | `851725597758`                                                       |
| `AWS_REGION`              | `us-west-2`                                                          |
| `AWS_STAGING_ROLE_ARN`    | `arn:aws:iam::851725597758:role/GitHubBridgeAppStaging`              |
| `STAGING_WEB_BUCKET`      | `bridge-staging-web-851725597758-us-west-2`                          |
| `STAGING_DISTRIBUTION_ID` | ID of the new isolated distribution                                  |
| `STAGING_ORIGIN`          | Exact new generated HTTPS CloudFront origin, no trailing slash       |
| `STAGING_WEBSOCKET_URL`   | `wss://<staging-api-id>.execute-api.us-west-2.amazonaws.com/<stage>` |

These are public configuration variables, not secrets. Never add long-lived
AWS credentials. Configuration/account/region/role checks run before OIDC.
The deployment uses a 30-minute OIDC role session and verifies the exact STS
assumed-role **run session**, not merely the role/account, before touching S3.
Root, IAM-user, and other role identities fail closed.

## Build and release

After review/merge, backend deployment, and infrastructure/IAM provisioning:

```sh
gh workflow run deploy-staging-web.yml --repo jmtelgen/BridgeApp --ref main \
  -f backend_release_ref=<full-deployed-backend-commit-sha>
```

`.github/workflows/deploy-staging-web.yml` serializes releases (no cancellation),
uses pinned actions, runs deployment guard tests, the selected 210-test frontend
regressions and app TypeScript, then builds using **Vite staging mode**:

```sh
STAGING_WEBSOCKET_URL=wss://exampleid.execute-api.us-west-2.amazonaws.com/staging \
  npx --no-install vite build --mode staging
```

For staging, `vite.config.ts` disables Vite's dotenv loading (`envDir: false`),
does not call `loadEnv`, defines the WS URL from the required staging variable,
forces the API build setting to same-origin, and uses absolute `/` asset paths.
Existing services already request `/api/...`. There is **no fallback** to
`.env`, `.env.production`, `VITE_WS_ENDPOINT`, or public production values.
Local development and existing production build behavior are unchanged.

The exact `dist/TestProject/` build is retained as a GitHub artifact for 30 days.
The release then:

1. Validates the exact assumed identity, deployed backend stack provenance and
   isolated resources without mutation.
2. Writes hashed assets first with `public,max-age=31536000,immutable`.
3. Writes remaining non-entry public files with no-cache/no-store headers.
4. Writes `releases/<frontend-sha>-<run-id>-<attempt>.json` with frontend SHA,
   CloudFormation-verified backend release SHA and artifact SHA-256, backend
   stack ID/status, GitHub artifact SHA-256, endpoint
   configuration, and SHA-256 manifest of individual built files.
5. Writes `index.html` **last** with `no-cache,no-store,must-revalidate`.
6. Invalidates `/*` on the isolated distribution and waits for completion.
   The workflow summary records the origin, SHAs, artifact digest, release
   record, index S3 version ID, and completed invalidation ID.

There is **no deletion**, no `s3 sync`, no resource creation and no production
deployment. A failure before the index write leaves the previous entry active;
new unused hashed assets are harmless. A failure after the index write or
during invalidation may leave a partially propagated release: inspect the
record/entry version and complete invalidation or perform operator rollback.
Artifact provenance and publication are not backend/browser acceptance evidence.

## Least-privilege frontend role permissions

The current identity-only role needs a separately reviewed resource-specific
policy. The publisher requires exactly these AWS IAM actions:

| Resource                                                                                                                                 | Actions                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `arn:aws:s3:::bridge-staging-web-851725597758-us-west-2`                                                                                 | `s3:GetBucketLocation`, `s3:GetBucketTagging`, `s3:GetBucketVersioning`, `s3:GetBucketPublicAccessBlock`                      |
| `arn:aws:s3:::bridge-staging-web-851725597758-us-west-2/*`                                                                               | `s3:PutObject`                                                                                                                |
| `arn:aws:cloudfront::851725597758:distribution/<NEW_ID>`                                                                                 | `cloudfront:GetDistribution`, `cloudfront:ListTagsForResource`, `cloudfront:CreateInvalidation`, `cloudfront:GetInvalidation` |
| `arn:aws:cloudfront::851725597758:cache-policy/<NEW_STATIC_CACHE_POLICY_ID>` (and any other custom policy attached to this distribution) | `cloudfront:GetCachePolicy`                                                                                                   |
| `arn:aws:cloudformation:us-west-2:851725597758:stack/bridge-staging-application/*`                                                       | `cloudformation:DescribeStacks`                                                                                               |

`sts:GetCallerIdentity` requires no identity-policy allowance. The OIDC trust
policy authorizes `sts:AssumeRoleWithWebIdentity` separately. Use SSE-S3:
the publisher requests no KMS operations. No `ListBucket`, object reads/deletes,
bucket policy/configuration changes, CloudFront distribution updates,
`iam:*`, `cloudformation:*`, `s3:*`, or wildcard distribution resources are
needed. Enforce S3 region/account scope where supported. Explicitly deny the
existing public bucket/distribution as defense in depth; do not broaden another
application role. The infrastructure owner manages S3 OAC read access separately.

## Rollback and acceptance

Rollback is an authorized operator action, **not an extra permission silently
added to the frontend role**. Verify the prior release manifest/backend
compatibility, retrieve the desired `index.html` object version, then put it
back as the newest entry with the same no-cache headers. Restore any changed
unhashed public files from their recorded version if needed. Retained hashes
continue to serve the old entry; invalidate the isolated distribution and wait.
An operator needs separately scoped `s3:ListBucketVersions`,
`s3:GetObjectVersion`, `s3:PutObject` and CloudFront invalidation permissions
for this procedure. Do not delete versions or old assets.

Before calling staging healthy, verify its generated domain, deep-link reload,
missing-asset errors, `/api` error semantics, guest and account bootstrap,
Secure cookie login/refresh/logout, signed WS connection/reconnect, rooms and
authoritative game play against the deployed backend. Those live checks are
not run by source validation or this publishing workflow.
