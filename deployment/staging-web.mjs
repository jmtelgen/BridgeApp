import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  lstatSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { pathToFileURL } from 'node:url';
import { stagingBuildSettings } from './staging-build.mjs';

export const ACCOUNT = '851725597758';
export const REGION = 'us-west-2';
export const BUCKET = `bridge-staging-web-${ACCOUNT}-${REGION}`;
export const ROLE = `arn:aws:iam::${ACCOUNT}:role/GitHubBridgeAppStaging`;
export const BACKEND_STACK = 'bridge-staging-application';
const deniedDistribution = 'E1HX0HXMLYUF2Z';
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};

export function validateEnvironment(env) {
  check(
    env.GITHUB_REPOSITORY === 'jmtelgen/BridgeApp' &&
      env.GITHUB_REF === 'refs/heads/main',
    'Only BridgeApp main may deploy'
  );
  check(
    env.AWS_ACCOUNT_ID === ACCOUNT &&
      env.AWS_REGION === REGION &&
      env.AWS_STAGING_ROLE_ARN === ROLE,
    'Unexpected staging account, region or role'
  );
  check(env.STAGING_WEB_BUCKET === BUCKET, 'Unexpected staging bucket');
  check(
    /^[A-Z0-9]+$/.test(env.STAGING_DISTRIBUTION_ID || '') &&
      env.STAGING_DISTRIBUTION_ID !== deniedDistribution,
    'Invalid or public distribution'
  );
  check(
    /^https:\/\/[a-z0-9]+\.cloudfront\.net$/.test(env.STAGING_ORIGIN || ''),
    'Use the new default CloudFront HTTPS origin, without a trailing slash'
  );
  stagingBuildSettings(env);
}

export function validateIdentity(identity, env) {
  check(
    identity.Account === ACCOUNT &&
      identity.Arn ===
        `arn:aws:sts::${ACCOUNT}:assumed-role/GitHubBridgeAppStaging/BridgeApp-staging-${env.GITHUB_RUN_ID}`,
    'Unexpected AWS assumed-role session (root forbidden)'
  );
}

export function validateTags(tags) {
  const map = Object.fromEntries(tags.map(({ Key, Value }) => [Key, Value]));
  check(
    map.Environment === 'staging' && map.Application === 'Bridge',
    'Resource requires Environment=staging and Application=Bridge tags'
  );
}

export function validateBackendStack(result, env) {
  check(
    result?.Stacks?.length === 1,
    `Backend provenance: expected exactly one ${BACKEND_STACK} stack`
  );
  const stack = result.Stacks[0];
  check(
    stack.StackName === BACKEND_STACK &&
      new RegExp(
        `^arn:aws:cloudformation:${REGION}:${ACCOUNT}:stack/${BACKEND_STACK}/[a-zA-Z0-9-]+$`
      ).test(stack.StackId || ''),
    'Backend provenance: unexpected stack identity, account or region'
  );
  check(
    ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE'].includes(
      stack.StackStatus
    ),
    `Backend provenance: stack is not healthy (${
      stack.StackStatus || 'missing status'
    })`
  );
  const outputs = Object.fromEntries(
    (stack.Outputs || []).map(({ OutputKey, OutputValue }) => [
      OutputKey,
      OutputValue,
    ])
  );
  check(
    !!outputs.SourceCommit && outputs.SourceCommit === env.BACKEND_RELEASE_REF,
    'Backend provenance: missing SourceCommit or mismatch with backend_release_ref'
  );
  check(
    !!outputs.StagingOrigin && outputs.StagingOrigin === env.STAGING_ORIGIN,
    'Backend provenance: missing StagingOrigin or mismatch with STAGING_ORIGIN'
  );
  check(
    /^[a-f0-9]{64}$/.test(outputs.ArtifactSha256 || ''),
    'Backend provenance: missing or invalid ArtifactSha256'
  );
  return {
    stackId: stack.StackId,
    status: stack.StackStatus,
    sourceCommit: outputs.SourceCommit,
    stagingOrigin: outputs.StagingOrigin,
    artifactSha256: outputs.ArtifactSha256,
  };
}

const disabledCache = '413f160f-6f7a-4a81-9889-719956cb8466';
const optimizedCache = '658327ea-f89d-4fab-a63d-7e88639e58f6';
function validateCache(id, kind, policies) {
  const config =
    id === disabledCache
      ? { MinTTL: 0, DefaultTTL: 0, MaxTTL: 0 }
      : id === optimizedCache
      ? { MinTTL: 1, DefaultTTL: 86400, MaxTTL: 31536000 }
      : policies[id];
  check(
    config,
    'Unknown cache policy; fetch its configuration before publication'
  );
  if (kind === 'api')
    check(
      config.MinTTL === 0 && config.DefaultTTL === 0 && config.MaxTTL === 0,
      'API cache TTLs must all be zero'
    );
  else
    check(
      config.MinTTL === 0 &&
        config.DefaultTTL === 0 &&
        (config.MaxTTL === 0 || config.MaxTTL >= 31536000),
      'Default cache policy must honor no-cache entry and immutable asset headers'
    );
}

export function validateDistribution(result, env, policies = {}) {
  const dist = result.Distribution;
  const config = dist.DistributionConfig;
  check(
    dist.ARN ===
      `arn:aws:cloudfront::${ACCOUNT}:distribution/${env.STAGING_DISTRIBUTION_ID}`,
    'Distribution ownership mismatch'
  );
  check(
    `https://${dist.DomainName}` === env.STAGING_ORIGIN &&
      dist.Status === 'Deployed' &&
      config.Enabled,
    'Distribution origin mismatch or not ready'
  );
  check(
    config.Aliases.Quantity === 0 &&
      config.ViewerCertificate.CloudFrontDefaultCertificate === true,
    'Custom domains/certificates forbidden'
  );
  check(
    config.DefaultRootObject === 'index.html',
    'Default root must be index.html'
  );
  const origins = config.Origins.Items;
  const web = origins.find(
    (origin) => origin.Id === config.DefaultCacheBehavior.TargetOriginId
  );
  check(
    web?.DomainName === `${BUCKET}.s3.${REGION}.amazonaws.com` &&
      !web.OriginPath &&
      !!web.OriginAccessControlId,
    'Default origin must be the isolated private staging bucket with OAC'
  );
  check(
    config.DefaultCacheBehavior.ViewerProtocolPolicy === 'redirect-to-https',
    'Default behavior requires HTTPS'
  );
  validateCache(config.DefaultCacheBehavior.CachePolicyId, 'static', policies);
  const behaviors = config.CacheBehaviors?.Items || [];
  for (const behavior of behaviors) {
    const api = ['/api/*', 'api/*', '/api', 'api'].includes(
      behavior.PathPattern
    );
    if (!api) {
      check(
        behavior.TargetOriginId === web.Id &&
          ['/assets/*', 'assets/*'].includes(behavior.PathPattern),
        'Unexpected cache behavior'
      );
      check(
        behavior.ViewerProtocolPolicy === 'redirect-to-https' &&
          behavior.CachePolicyId === optimizedCache,
        'Assets require HTTPS and managed CachingOptimized'
      );
      continue;
    }
    const origin = origins.find((item) => item.Id === behavior.TargetOriginId);
    check(
      origin &&
        origin.Id !== web.Id &&
        origin.CustomOriginConfig?.OriginProtocolPolicy === 'https-only',
      'API must use its own HTTPS backend origin'
    );
    check(
      /^[a-z0-9]+\.execute-api\.us-west-2\.amazonaws\.com$/.test(
        origin.DomainName
      ),
      'API origin must be a regional API Gateway origin in us-west-2'
    );
    check(
      origin.OriginPath === '/staging',
      'API origin path must be /staging; backend receives /api unchanged'
    );
    check(
      ['https-only', 'redirect-to-https'].includes(
        behavior.ViewerProtocolPolicy
      ),
      'API requires HTTPS'
    );
    validateCache(behavior.CachePolicyId, 'api', policies);
    check(
      behavior.OriginRequestPolicyId ===
        'b689b0a8-53d0-40ab-baf2-68738e2966ac' &&
        behavior.AllowedMethods.Quantity === 7,
      'API requires AllViewerExceptHostHeader and all seven HTTP methods'
    );
    check(
      !behavior.FunctionAssociations?.Quantity &&
        !behavior.LambdaFunctionAssociations?.Quantity,
      'API behavior must not rewrite signed requests'
    );
  }
  check(
    behaviors.some((item) => ['/api/*', 'api/*'].includes(item.PathPattern)) &&
      behaviors.some((item) => ['/api', 'api'].includes(item.PathPattern)),
    'Both /api and /api/* behaviors are required'
  );
  check(
    origins.every(
      (origin) =>
        origin.Id === web.Id ||
        behaviors.some(
          (item) =>
            ['/api/*', 'api/*', '/api', 'api'].includes(item.PathPattern) &&
            item.TargetOriginId === origin.Id
        )
    ),
    'Unexpected extra origin'
  );
  check(
    !config.CustomErrorResponses?.Quantity,
    'Global SPA error rewrites could mask API errors; use a web-only viewer-request rewrite instead'
  );
}

export function buildManifest(directory) {
  const files = [];
  function walk(prefix = '') {
    for (const name of readdirSync(`${directory}/${prefix}`).sort()) {
      const key = `${prefix}${name}`;
      const stat = lstatSync(`${directory}/${key}`);
      check(!stat.isSymbolicLink(), 'Build may not contain symbolic links');
      if (stat.isDirectory()) walk(`${key}/`);
      else {
        check(
          stat.isFile() &&
            !key.startsWith('releases/') &&
            !key.split('/').some((part) => part.startsWith('.')),
          'Unexpected build file'
        );
        if (key.startsWith('assets/'))
          check(
            /-[A-Za-z0-9_-]{8,}\.[a-z0-9.]+$/.test(key),
            `Unhashed asset: ${key}`
          );
        files.push({
          key,
          sha256: createHash('sha256')
            .update(readFileSync(`${directory}/${key}`))
            .digest('hex'),
        });
      }
    }
  }
  walk();
  check(
    files.some((file) => file.key === 'index.html') &&
      files.some((file) => file.key.startsWith('assets/')),
    'Build missing HTML or hashed assets'
  );
  return files;
}

export function publish(
  env,
  aws = (args, input) =>
    JSON.parse(
      execFileSync('aws', [...args, '--output', 'json'], {
        encoding: 'utf8',
        input,
      }) || '{}'
    ),
  directory = 'dist/TestProject'
) {
  validateEnvironment(env);
  check(
    /^[a-f0-9]{40}$/.test(env.GITHUB_SHA || '') &&
      /^\d+$/.test(env.GITHUB_RUN_ID || '') &&
      /^\d+$/.test(env.GITHUB_RUN_ATTEMPT || ''),
    'Invalid release identity'
  );
  check(
    /^[a-f0-9]{64}$/.test(env.ARTIFACT_DIGEST || ''),
    'Missing GitHub artifact digest'
  );
  check(
    /^[a-f0-9]{40}$/.test(env.BACKEND_RELEASE_REF || ''),
    'Backend release must be its deployed full commit SHA'
  );
  const files = buildManifest(directory);
  validateIdentity(aws(['sts', 'get-caller-identity']), env);
  let backendStack;
  try {
    backendStack = aws([
      'cloudformation',
      'describe-stacks',
      '--stack-name',
      BACKEND_STACK,
      '--region',
      REGION,
    ]);
  } catch (cause) {
    throw new Error(
      `Backend provenance: unable to describe ${BACKEND_STACK}; refusing all web writes`,
      { cause }
    );
  }
  const backendProvenance = validateBackendStack(backendStack, env);
  const owned = ['--bucket', BUCKET, '--expected-bucket-owner', ACCOUNT];
  const location = aws(['s3api', 'get-bucket-location', ...owned]);
  check(
    location.LocationConstraint === REGION,
    'Bucket must be in staging region'
  );
  validateTags(aws(['s3api', 'get-bucket-tagging', ...owned]).TagSet);
  check(
    aws(['s3api', 'get-bucket-versioning', ...owned]).Status === 'Enabled',
    'S3 versioning must be enabled'
  );
  const block = aws([
    's3api',
    'get-public-access-block',
    ...owned,
  ]).PublicAccessBlockConfiguration;
  check(
    [
      'BlockPublicAcls',
      'IgnorePublicAcls',
      'BlockPublicPolicy',
      'RestrictPublicBuckets',
    ].every((key) => block[key] === true),
    'Bucket must block all public access'
  );
  const dist = aws([
    'cloudfront',
    'get-distribution',
    '--id',
    env.STAGING_DISTRIBUTION_ID,
  ]);
  const config = dist.Distribution.DistributionConfig;
  const cacheIds = new Set(
    [config.DefaultCacheBehavior, ...(config.CacheBehaviors?.Items || [])].map(
      (behavior) => behavior.CachePolicyId
    )
  );
  const policies = {};
  for (const id of cacheIds) {
    if (![disabledCache, optimizedCache].includes(id)) {
      policies[id] = aws([
        'cloudfront',
        'get-cache-policy',
        '--id',
        id,
      ]).CachePolicy.CachePolicyConfig;
    }
  }
  validateDistribution(dist, env, policies);
  validateTags(
    aws([
      'cloudfront',
      'list-tags-for-resource',
      '--resource',
      dist.Distribution.ARN,
    ]).Tags.Items
  );
  const release = `${env.GITHUB_SHA}-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`;
  const metadata = {
    release,
    frontendSha: env.GITHUB_SHA,
    backendRelease: backendProvenance.sourceCommit,
    backendProvenance,
    artifactDigest: env.ARTIFACT_DIGEST,
    origin: env.STAGING_ORIGIN,
    websocketUrl: env.STAGING_WEBSOCKET_URL,
    files,
  };
  // Every read/guard above completes before the first write. Never delete old assets.
  const put = (file, cache) =>
    aws([
      's3api',
      'put-object',
      ...owned,
      '--key',
      file.key,
      '--body',
      `${directory}/${file.key}`,
      '--content-type',
      contentType(file.key),
      '--cache-control',
      cache,
    ]);
  for (const file of files.filter((file) => file.key.startsWith('assets/')))
    put(file, 'public,max-age=31536000,immutable');
  for (const file of files.filter(
    (file) => file.key !== 'index.html' && !file.key.startsWith('assets/')
  ))
    put(file, 'no-cache,no-store,must-revalidate');
  const releaseFile = `${directory}.release.json`;
  writeFileSync(releaseFile, JSON.stringify(metadata, null, 2));
  aws([
    's3api',
    'put-object',
    ...owned,
    '--key',
    `releases/${release}.json`,
    '--body',
    releaseFile,
    '--content-type',
    'application/json',
    '--cache-control',
    'no-store',
  ]);
  const entry = put({ key: 'index.html' }, 'no-cache,no-store,must-revalidate');
  const summary = `## Isolated staging frontend\n- Origin: ${env.STAGING_ORIGIN}\n- Frontend SHA: ${env.GITHUB_SHA}\n- Backend release SHA (CloudFormation verified): ${backendProvenance.sourceCommit}\n- Backend artifact SHA-256: ${backendProvenance.artifactSha256}\n- Backend stack: ${backendProvenance.stackId} (${backendProvenance.status})\n- Artifact SHA-256: ${env.ARTIFACT_DIGEST}\n- Release record: s3://${BUCKET}/releases/${release}.json\n- Entry S3 version: ${entry.VersionId}\n`;
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, summary);
  const invalidation = aws([
    'cloudfront',
    'create-invalidation',
    '--distribution-id',
    env.STAGING_DISTRIBUTION_ID,
    '--paths',
    '/*',
  ]);
  aws([
    'cloudfront',
    'wait',
    'invalidation-completed',
    '--distribution-id',
    env.STAGING_DISTRIBUTION_ID,
    '--id',
    invalidation.Invalidation.Id,
  ]);
  if (env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      env.GITHUB_STEP_SUMMARY,
      `- Invalidation: ${invalidation.Invalidation.Id} (completed)\n`
    );
  return metadata;
}

function contentType(key) {
  const extension = key.split('.').pop();
  return (
    {
      html: 'text/html; charset=utf-8',
      js: 'application/javascript',
      css: 'text/css',
      json: 'application/json',
      wasm: 'application/wasm',
      svg: 'image/svg+xml',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      ico: 'image/x-icon',
      woff: 'font/woff',
      woff2: 'font/woff2',
      ttf: 'font/ttf',
    }[extension] || 'application/octet-stream'
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.argv[2] === 'validate') validateEnvironment(process.env);
  else if (process.argv[2] === 'publish') publish(process.env);
  else throw new Error('Expected validate or publish');
}
