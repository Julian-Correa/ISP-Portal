function cleanEnv(value) {
  if (value === undefined || value === null) return value;
  const trimmed = String(value).trim();
  const hasMatchingQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  return hasMatchingQuotes ? trimmed.slice(1, -1) : trimmed;
}

function requireEnv(name) {
  const value = cleanEnv(process.env[name]);

  if (!value) {
    throw new Error(`Falta configurar ${name}. Definilo antes de iniciar el servidor.`);
  }

  return value;
}

function numberEnv(name, fallback) {
  const value = cleanEnv(process.env[name]);
  if (!value) return fallback;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} debe ser numerico.`);
  }

  return parsed;
}

function dayOfMonthEnv(name, fallback) {
  const value = numberEnv(name, fallback);

  if (!Number.isInteger(value) || value < 1 || value > 31) {
    throw new Error(`${name} debe estar entre 1 y 31.`);
  }

  return value;
}

function parseBodyLimit(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const match = normalized.match(/^(\d+)(b|kb|mb)?$/);

  if (!match) {
    throw new Error("BODY_LIMIT debe usar un formato como 25kb, 100b o 1mb.");
  }

  const size = Number(match[1]);
  const unit = match[2] || "b";
  const multipliers = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
  };

  return size * multipliers[unit];
}

const bodyLimit = cleanEnv(process.env.BODY_LIMIT) || "25kb";

export const env = {
  port: numberEnv("PORT", 8787),
  corsOrigin: requireEnv("CORS_ORIGIN"),
  redisUrl: cleanEnv(process.env.REDIS_URL),
  cacheTtlSeconds: numberEnv("CACHE_TTL_SECONDS", 120),
  tokenTtlSeconds: numberEnv("TOKEN_TTL_SECONDS", 600),
  requestTimeoutMs: numberEnv("REQUEST_TIMEOUT_MS", 12000),
  bodyLimit,
  bodyLimitBytes: parseBodyLimit(bodyLimit),
  rateLimitWindowMs: numberEnv("RATE_LIMIT_WINDOW_MS", 60000),
  rateLimitMax: numberEnv("RATE_LIMIT_MAX", 30),
  recargoReconexion: numberEnv("RECARGO_RECONEXION", 2000),
  recargoSegundoVencimiento: numberEnv("RECARGO_SEGUNDO_VENCIMIENTO", 2000),
  cutDay: dayOfMonthEnv("CUT_DAY", 26),
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
