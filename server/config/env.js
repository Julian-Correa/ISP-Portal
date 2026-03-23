/* global process */

export const env = {
  port: Number(process.env.PORT || 8787),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  redisUrl: process.env.REDIS_URL,
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 120),
  tokenTtlSeconds: Number(process.env.TOKEN_TTL_SECONDS || 600),
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
