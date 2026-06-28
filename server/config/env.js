function cleanEnv(value) {
  if (value === undefined || value === null) return value;
  const trimmed = String(value).trim();
  const hasMatchingQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  return hasMatchingQuotes ? trimmed.slice(1, -1) : trimmed;
}

export const env = {
  port: Number(process.env.PORT || 8787),
  corsOrigin: cleanEnv(process.env.CORS_ORIGIN) || "*",
  redisUrl: cleanEnv(process.env.REDIS_URL),
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 120),
  tokenTtlSeconds: Number(process.env.TOKEN_TTL_SECONDS || 600),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 12000),
  bodyLimit: cleanEnv(process.env.BODY_LIMIT) || "25kb",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 30),
  isp: {
    apiBase: cleanEnv(process.env.ISP_API_BASE) || "https://online25.ispcube.com/api",
    apiKey: cleanEnv(process.env.ISP_API_KEY),
    clientId: cleanEnv(process.env.ISP_CLIENT_ID),
    apiUser: cleanEnv(process.env.ISP_API_USER),
    apiPass: cleanEnv(process.env.ISP_API_PASS),
  },
};

export function validateIspConfig() {
  const { apiKey, clientId, apiUser, apiPass } = env.isp;
  return Boolean(apiKey && clientId && apiUser && apiPass);
}
