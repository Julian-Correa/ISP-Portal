export const env = {
  port: Number(process.env.PORT || 8787),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  redisUrl: process.env.REDIS_URL,
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 120),
  tokenTtlSeconds: Number(process.env.TOKEN_TTL_SECONDS || 600),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 12000),
  bodyLimit: process.env.BODY_LIMIT || "25kb",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 30),
  isp: {
    apiBase: process.env.ISP_API_BASE || "https://online25.ispcube.com/api",
    apiKey: process.env.ISP_API_KEY,
    clientId: process.env.ISP_CLIENT_ID,
    apiUser: process.env.ISP_API_USER,
    apiPass: process.env.ISP_API_PASS,
  },
};

export function validateIspConfig() {
  const { apiKey, clientId, apiUser, apiPass } = env.isp;
  return Boolean(apiKey && clientId && apiUser && apiPass);
}
