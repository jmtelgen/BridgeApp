export function stagingBuildSettings(env) {
  const endpoint = env.STAGING_WEBSOCKET_URL;
  if (
    !endpoint ||
    !/^wss:\/\/[a-z0-9]+\.execute-api\.us-west-2\.amazonaws\.com\/[a-zA-Z0-9_-]+$/.test(
      endpoint
    )
  ) {
    throw new Error(
      'STAGING_WEBSOCKET_URL must be the staging API Gateway wss URL in us-west-2, including its stage'
    );
  }
  return {
    base: '/',
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(''),
      'import.meta.env.VITE_WS_ENDPOINT': JSON.stringify(endpoint),
    },
  };
}
