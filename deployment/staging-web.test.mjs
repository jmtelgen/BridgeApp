import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import {
  ACCOUNT,
  BACKEND_STACK,
  BUCKET,
  REGION,
  ROLE,
  buildManifest,
  publish,
  validateBackendStack,
  validateDistribution,
  validateEnvironment,
  validateIdentity,
  validateTags,
} from './staging-web.mjs';
import { stagingBuildSettings } from './staging-build.mjs';

describe('isolated staging publication', () => {
  const env = {
    GITHUB_REPOSITORY: 'jmtelgen/BridgeApp',
    GITHUB_REF: 'refs/heads/main',
    AWS_ACCOUNT_ID: ACCOUNT,
    AWS_REGION: REGION,
    AWS_STAGING_ROLE_ARN: ROLE,
    STAGING_WEB_BUCKET: BUCKET,
    STAGING_DISTRIBUTION_ID: 'ESTAGING123',
    STAGING_ORIGIN: 'https://dstaging123.cloudfront.net',
    STAGING_WEBSOCKET_URL:
      'wss://staging123.execute-api.us-west-2.amazonaws.com/staging',
    GITHUB_SHA: 'a'.repeat(40),
    GITHUB_RUN_ID: '123',
    GITHUB_RUN_ATTEMPT: '1',
    ARTIFACT_DIGEST: 'b'.repeat(64),
    BACKEND_RELEASE_REF: 'c'.repeat(40),
  };
  const tags = [
    { Key: 'Environment', Value: 'staging' },
    { Key: 'Application', Value: 'Bridge' },
  ];
  const identity = {
    Account: ACCOUNT,
    Arn: `arn:aws:sts::${ACCOUNT}:assumed-role/GitHubBridgeAppStaging/BridgeApp-staging-123`,
  };
  const backend = () => ({
    Stacks: [
      {
        StackName: BACKEND_STACK,
        StackId: `arn:aws:cloudformation:${REGION}:${ACCOUNT}:stack/${BACKEND_STACK}/12345678-abcd`,
        StackStatus: 'UPDATE_COMPLETE',
        Outputs: [
          { OutputKey: 'SourceCommit', OutputValue: env.BACKEND_RELEASE_REF },
          { OutputKey: 'StagingOrigin', OutputValue: env.STAGING_ORIGIN },
          { OutputKey: 'ArtifactSha256', OutputValue: 'd'.repeat(64) },
        ],
      },
    ],
  });
  const api = (pattern) => ({
    PathPattern: pattern,
    TargetOriginId: 'staging-api',
    ViewerProtocolPolicy: 'https-only',
    CachePolicyId: '413f160f-6f7a-4a81-9889-719956cb8466',
    OriginRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac',
    AllowedMethods: { Quantity: 7 },
  });
  const distribution = () => ({
    Distribution: {
      ARN: `arn:aws:cloudfront::${ACCOUNT}:distribution/ESTAGING123`,
      DomainName: 'dstaging123.cloudfront.net',
      Status: 'Deployed',
      DistributionConfig: {
        Enabled: true,
        DefaultRootObject: 'index.html',
        Aliases: { Quantity: 0 },
        ViewerCertificate: { CloudFrontDefaultCertificate: true },
        Origins: {
          Items: [
            {
              Id: 'web',
              DomainName: `${BUCKET}.s3.${REGION}.amazonaws.com`,
              OriginPath: '',
              OriginAccessControlId: 'OACSTAGING',
            },
            {
              Id: 'staging-api',
              DomainName: 'stagingapi.execute-api.us-west-2.amazonaws.com',
              OriginPath: '/staging',
              CustomOriginConfig: { OriginProtocolPolicy: 'https-only' },
            },
          ],
        },
        DefaultCacheBehavior: {
          TargetOriginId: 'web',
          ViewerProtocolPolicy: 'redirect-to-https',
          CachePolicyId: '413f160f-6f7a-4a81-9889-719956cb8466',
        },
        CacheBehaviors: { Items: [api('/api'), api('/api/*')] },
      },
    },
  });
  const directory = 'dist/staging-publish-fixture';
  before(() => {
    mkdirSync(`${directory}/assets`, { recursive: true });
    writeFileSync(`${directory}/assets/app-abc12345.js`, 'staging code');
    writeFileSync(
      `${directory}/index.html`,
      '<script src="/assets/app-abc12345.js"></script>'
    );
    writeFileSync(`${directory}/favicon.ico`, 'icon');
  });
  after(() => {
    rmSync(directory, { recursive: true, force: true });
    rmSync(`${directory}.release.json`, { force: true });
  });

  test('only explicit main staging variables pass pre-OIDC checks', () => {
    validateEnvironment(env);
    for (const [key, values] of Object.entries({
      GITHUB_REPOSITORY: ['fork/BridgeApp'],
      GITHUB_REF: ['refs/heads/feature', 'refs/tags/main'],
      AWS_ACCOUNT_ID: ['', '123456789012'],
      AWS_REGION: ['us-east-1'],
      AWS_STAGING_ROLE_ARN: [`arn:aws:iam::${ACCOUNT}:root`, `${ROLE}Other`],
      STAGING_WEB_BUCKET: [
        'nextlevelbridgeassetdistributionbucket',
        `${BUCKET}-other`,
      ],
      STAGING_DISTRIBUTION_ID: ['', 'E1HX0HXMLYUF2Z', 'bad/id'],
      STAGING_ORIGIN: [
        'https://existing.example.com',
        'https://dstaging123.cloudfront.net/',
      ],
      STAGING_WEBSOCKET_URL: [
        '',
        'ws://localhost:3002',
        'wss://example.com/staging',
        'wss://staging.execute-api.us-east-1.amazonaws.com/staging',
      ],
    }))
      for (const value of values)
        assert.throws(
          () => validateEnvironment({ ...env, [key]: value }),
          `${key}=${value}`
        );
  });

  test('staging Vite replacements force same-origin API and explicit websocket URL', () => {
    const settings = stagingBuildSettings({
      ...env,
      VITE_API_BASE_URL: 'https://public.invalid',
      VITE_WS_ENDPOINT: 'wss://public.invalid',
    });
    assert.equal(settings.base, '/');
    assert.equal(settings.define['import.meta.env.VITE_API_BASE_URL'], '""');
    assert.equal(
      settings.define['import.meta.env.VITE_WS_ENDPOINT'],
      JSON.stringify(env.STAGING_WEBSOCKET_URL)
    );
    assert.throws(() =>
      stagingBuildSettings({ VITE_WS_ENDPOINT: 'wss://public.invalid' })
    );
  });

  test('STS must return the exact run-specific assumed role, never root', () => {
    validateIdentity(identity, env);
    for (const Arn of [
      `arn:aws:iam::${ACCOUNT}:root`,
      ROLE,
      `${identity.Arn}-other`,
    ])
      assert.throws(() => validateIdentity({ ...identity, Arn }, env));
    assert.throws(() =>
      validateIdentity({ ...identity, Account: '123456789012' }, env)
    );
  });

  test('resource tags must identify the staging Bridge resources', () => {
    validateTags(tags);
    assert.throws(() =>
      validateTags([
        { Key: 'Environment', Value: 'staging' },
        { Key: 'Project', Value: 'Bridge' },
      ])
    );
    assert.throws(() =>
      validateTags([{ Key: 'Environment', Value: 'production' }])
    );
  });

  test('distribution guards reject public origins, custom aliases, caching API, and broad SPA errors', () => {
    validateDistribution(distribution(), env);
    const mutations = [
      (dist) => {
        dist.ARN = 'arn:aws:cloudfront::123456789012:distribution/ESTAGING123';
      },
      (dist) => {
        dist.DomainName = 'existing.cloudfront.net';
      },
      (dist) => {
        dist.Status = 'InProgress';
      },
      (dist) => {
        dist.DistributionConfig.Aliases.Quantity = 1;
      },
      (dist) => {
        dist.DistributionConfig.Origins.Items[0].DomainName =
          'nextlevelbridgeassetdistributionbucket.s3.us-west-2.amazonaws.com';
      },
      (dist) => {
        dist.DistributionConfig.Origins.Items[0].OriginAccessControlId = '';
      },
      (dist) => {
        dist.DistributionConfig.Origins.Items[1].OriginPath = '';
      },
      (dist) => {
        dist.DistributionConfig.CacheBehaviors.Items[1].CachePolicyId =
          'caching-enabled';
      },
      (dist) => {
        dist.DistributionConfig.CacheBehaviors.Items[1].OriginRequestPolicyId =
          'no-cookies';
      },
      (dist) => {
        dist.DistributionConfig.CacheBehaviors.Items[1].AllowedMethods.Quantity = 2;
      },
      (dist) => {
        dist.DistributionConfig.CacheBehaviors.Items.pop();
      },
      (dist) => {
        dist.DistributionConfig.CustomErrorResponses = { Quantity: 1 };
      },
    ];
    for (const mutate of mutations) {
      const result = distribution();
      mutate(result.Distribution);
      assert.throws(() => validateDistribution(result, env));
    }
  });

  test('bootstrap custom static cache policy must honor entry and immutable asset Cache-Control', () => {
    const result = distribution();
    result.Distribution.DistributionConfig.DefaultCacheBehavior.CachePolicyId =
      'bootstrap-policy';
    assert.throws(() => validateDistribution(result, env));
    validateDistribution(result, env, {
      'bootstrap-policy': { MinTTL: 0, DefaultTTL: 0, MaxTTL: 31536000 },
    });
    for (const config of [
      { MinTTL: 1, DefaultTTL: 0, MaxTTL: 31536000 },
      { MinTTL: 0, DefaultTTL: 86400, MaxTTL: 31536000 },
    ])
      assert.throws(() =>
        validateDistribution(result, env, { 'bootstrap-policy': config })
      );
  });

  function fakeAws(calls, override = {}) {
    return (args) => {
      calls.push(args);
      const command = args.slice(0, 2).join(' ');
      const responses = {
        'sts get-caller-identity': identity,
        'cloudformation describe-stacks': backend(),
        's3api get-bucket-location': { LocationConstraint: REGION },
        's3api get-bucket-tagging': { TagSet: tags },
        's3api get-bucket-versioning': { Status: 'Enabled' },
        's3api get-public-access-block': {
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            IgnorePublicAcls: true,
            BlockPublicPolicy: true,
            RestrictPublicBuckets: true,
          },
        },
        'cloudfront get-distribution': distribution(),
        'cloudfront list-tags-for-resource': { Tags: { Items: tags } },
        's3api put-object': { VersionId: 'entry-version' },
        'cloudfront create-invalidation': { Invalidation: { Id: 'INV123' } },
        'cloudfront wait': {},
        ...override,
      };
      assert.ok(
        Object.hasOwn(responses, command),
        `Unexpected command: ${command}`
      );
      if (responses[command] instanceof Error) throw responses[command];
      return responses[command];
    };
  }

  test('publication retains assets, uploads immutable hashes first and no-cache index last, with provenance', () => {
    const calls = [];
    const metadata = publish(env, fakeAws(calls), directory);
    const writes = calls.filter((args) => args[1] === 'put-object');
    assert.equal(writes.length, 4);
    const key = (args) => args[args.indexOf('--key') + 1];
    assert.equal(key(writes[0]), 'assets/app-abc12345.js');
    assert.ok(writes[0].includes('public,max-age=31536000,immutable'));
    assert.match(key(writes[2]), /^releases\/[a-f0-9]+-123-1.json$/);
    assert.equal(key(writes[3]), 'index.html');
    assert.ok(writes[3].includes('no-cache,no-store,must-revalidate'));
    assert.ok(
      writes.every(
        (args) =>
          args.includes('--expected-bucket-owner') && args.includes(ACCOUNT)
      )
    );
    assert.equal(calls.at(-1)[1], 'wait');
    assert.equal(metadata.artifactDigest, env.ARTIFACT_DIGEST);
    assert.equal(metadata.backendRelease, env.BACKEND_RELEASE_REF);
    assert.equal(metadata.backendProvenance.artifactSha256, 'd'.repeat(64));
    const stackRead = calls.findIndex((args) => args[0] === 'cloudformation');
    const firstWrite = calls.findIndex((args) => args[1] === 'put-object');
    assert.ok(stackRead >= 0 && stackRead < firstWrite);
    assert.deepEqual(calls[stackRead], [
      'cloudformation',
      'describe-stacks',
      '--stack-name',
      BACKEND_STACK,
      '--region',
      REGION,
    ]);
    assert.equal(metadata.files.length, 3);
  });

  test('backend provenance accepts only healthy completed deployment states', () => {
    for (const status of [
      'CREATE_COMPLETE',
      'UPDATE_COMPLETE',
      'UPDATE_ROLLBACK_COMPLETE',
    ]) {
      const result = backend();
      result.Stacks[0].StackStatus = status;
      assert.equal(validateBackendStack(result, env).status, status);
    }
  });

  test('missing, mismatched or unhealthy backend provenance explicitly prevents every web write', () => {
    const mutations = [
      (result) => {
        delete result.Stacks;
      },
      (result) => {
        result.Stacks = [];
      },
      (result) => {
        result.Stacks.push(result.Stacks[0]);
      },
      (result) => {
        result.Stacks[0].StackName = 'other-application';
      },
      (result) => {
        result.Stacks[0].StackId = `arn:aws:cloudformation:us-east-1:${ACCOUNT}:stack/${BACKEND_STACK}/12345678-abcd`;
      },
      (result) => {
        result.Stacks[0].StackId = `arn:aws:cloudformation:${REGION}:123456789012:stack/${BACKEND_STACK}/12345678-abcd`;
      },
      (result) => {
        delete result.Stacks[0].Outputs;
      },
      ...['SourceCommit', 'StagingOrigin', 'ArtifactSha256'].flatMap((key) => [
        (result) => {
          result.Stacks[0].Outputs = result.Stacks[0].Outputs.filter(
            (output) => output.OutputKey !== key
          );
        },
        (result) => {
          result.Stacks[0].Outputs.find(
            (output) => output.OutputKey === key
          ).OutputValue = 'mismatched';
        },
      ]),
      ...[
        'CREATE_IN_PROGRESS',
        'UPDATE_IN_PROGRESS',
        'UPDATE_ROLLBACK_IN_PROGRESS',
        'ROLLBACK_COMPLETE',
        'DELETE_COMPLETE',
        'UPDATE_FAILED',
        undefined,
      ].map((status) => (result) => {
        result.Stacks[0].StackStatus = status;
      }),
    ];
    for (const mutate of mutations) {
      const result = backend();
      mutate(result);
      const calls = [];
      assert.throws(
        () =>
          publish(
            env,
            fakeAws(calls, {
              'cloudformation describe-stacks': result,
            }),
            directory
          ),
        /Backend provenance:/
      );
      assert.ok(
        calls.every(
          (args) => !['put-object', 'create-invalidation'].includes(args[1])
        )
      );
    }
    const calls = [];
    assert.throws(
      () =>
        publish(
          env,
          fakeAws(calls, {
            'cloudformation describe-stacks': new Error('Stack does not exist'),
          }),
          directory
        ),
      /Backend provenance: unable to describe bridge-staging-application; refusing all web writes/
    );
    assert.ok(
      calls.every(
        (args) => !['put-object', 'create-invalidation'].includes(args[1])
      )
    );
  });

  test('failed remote isolation checks perform zero writes', () => {
    for (const override of [
      {
        'sts get-caller-identity': {
          ...identity,
          Arn: `arn:aws:iam::${ACCOUNT}:root`,
        },
      },
      { 's3api get-bucket-location': { LocationConstraint: 'us-east-1' } },
      { 's3api get-bucket-versioning': { Status: 'Suspended' } },
      { 's3api get-bucket-tagging': { TagSet: [] } },
      { 'cloudfront list-tags-for-resource': { Tags: { Items: [] } } },
      {
        's3api get-public-access-block': { PublicAccessBlockConfiguration: {} },
      },
    ]) {
      const calls = [];
      assert.throws(() => publish(env, fakeAws(calls, override), directory));
      assert.ok(
        calls.every(
          (args) => !['put-object', 'create-invalidation'].includes(args[1])
        )
      );
    }
  });

  test('publication inspects the bootstrap custom static cache policy before writing', () => {
    const calls = [];
    const result = distribution();
    result.Distribution.DistributionConfig.DefaultCacheBehavior.CachePolicyId =
      'bootstrap-policy';
    const overrides = {
      'cloudfront get-distribution': result,
      'cloudfront get-cache-policy': {
        CachePolicy: {
          CachePolicyConfig: {
            MinTTL: 0,
            DefaultTTL: 0,
            MaxTTL: 31536000,
          },
        },
      },
    };
    publish(env, fakeAws(calls, overrides), directory);
    const read = calls.findIndex((args) => args[1] === 'get-cache-policy');
    const write = calls.findIndex((args) => args[1] === 'put-object');
    assert.ok(read >= 0 && read < write);
    overrides[
      'cloudfront get-cache-policy'
    ].CachePolicy.CachePolicyConfig.MinTTL = 60;
    const failedCalls = [];
    assert.throws(() =>
      publish(env, fakeAws(failedCalls, overrides), directory)
    );
    assert.ok(failedCalls.every((args) => args[1] !== 'put-object'));
  });

  test('unhashed files cannot accidentally get immutable caching', () => {
    writeFileSync(`${directory}/assets/unhashed.js`, 'bad');
    try {
      assert.throws(() => buildManifest(directory), /Unhashed asset/);
    } finally {
      rmSync(`${directory}/assets/unhashed.js`);
    }
  });
});
