import "dotenv/config";
import { env, validateIspConfig } from "../../server/config/env.js";
import { CacheClient } from "../../server/lib/cache.js";
import { IspRepository } from "../../server/repositories/ispRepository.js";
import { CustomerSummaryService } from "../../server/services/customerSummaryService.js";

const rateLimitBuckets = new Map();
let servicePromise;
let cache;

function log(level, event, details = {}) {
  const payload = {
    event,
    ...details,
  };
  console[level]?.(JSON.stringify(payload));
}

function corsHeaders(origin) {
  const allowedOrigin = env.corsOrigin === "*" ? "*" : env.corsOrigin || origin || "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  };
}

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body ?? {}),
  };
}

function getClientIp(event) {
  const headers = event.headers || {};
  return (
    headers["x-nf-client-connection-ip"] ||
    headers["client-ip"] ||
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function rateLimit(event) {
  const now = Date.now();
  const key = getClientIp(event);
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + env.rateLimitWindowMs });
    for (const [bucketKey, value] of rateLimitBuckets.entries()) {
      if (now > value.resetAt) rateLimitBuckets.delete(bucketKey);
    }
    return false;
  }

  bucket.count += 1;
  return bucket.count > env.rateLimitMax;
}

async function getCustomerSummaryService() {
  if (!servicePromise) {
    servicePromise = (async () => {
      cache = new CacheClient({ redisUrl: env.redisUrl });
      await cache.connect();

      const ispRepository = new IspRepository({
        ispConfig: env.isp,
        cache,
        tokenTtlSeconds: env.tokenTtlSeconds,
        requestTimeoutMs: env.requestTimeoutMs,
        logger: {
          info: (message) => console.info(message),
          warn: (message) => console.warn(message),
          error: (message) => console.error(message),
        },
      });

      return new CustomerSummaryService({
        cache,
        ispRepository,
        cacheTtlSeconds: env.cacheTtlSeconds,
      });
    })();
  }

  return servicePromise;
}

function getRoutePath(event) {
  const rawPath = event.path || "";
  const marker = "/.netlify/functions/api";
  if (rawPath.startsWith(marker)) return rawPath.slice(marker.length) || "/";
  if (rawPath.startsWith("/api")) return rawPath.slice(4) || "/";
  return rawPath || "/";
}

function parseBody(event) {
  if (!event.body) return {};
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  return JSON.parse(rawBody);
}

export async function handler(event = {}) {
  const startedAt = Date.now();
  const requestHeaders = event.headers || {};
  const headers = corsHeaders(requestHeaders.origin);
  const routePath = getRoutePath(event);
  const method = event.httpMethod || "GET";

  log("info", "api_request", {
    method,
    routePath,
    query: event.queryStringParameters || {},
  });

  try {
    if (method === "OPTIONS") {
      return { statusCode: 204, headers, body: "" };
    }

    if (routePath === "/health" && method === "GET") {
      const customerSummaryService = await getCustomerSummaryService();
      return json(200, {
        ok: true,
        redis: customerSummaryService.cache.isRedisEnabled(),
      }, headers);
    }

    if (rateLimit(event)) {
      return json(429, { error: "demasiadas solicitudes" }, headers);
    }

    if (routePath === "/customer-summary" && method === "GET") {
      const dni = event.queryStringParameters?.dni;
      const cleanDni = String(dni || "").replace(/\D/g, "");
      if (cleanDni.length < 7 || cleanDni.length > 8) {
        return json(400, { error: "dni invalido" }, headers);
      }

      const configError = validateServerConfig(headers);
      if (configError) return configError;

      const customerSummaryService = await getCustomerSummaryService();
      const result = await customerSummaryService.getSummaryByDni(dni);

      if (result.error) {
        log("warn", "api_customer_summary_error", {
          dni: cleanDni,
          status: result.status,
          error: result.error,
        });
        return json(result.status, { error: result.error }, headers);
      }

      log("info", "api_customer_summary_ok", {
        dni: cleanDni,
        cacheStatus: result.cacheStatus,
        durationMs: Date.now() - startedAt,
      });

      return json(result.status, result.data, {
        ...headers,
        "x-cache": result.cacheStatus,
      });
    }

    const emailMatch = routePath.match(/^\/customers\/([^/]+)\/email$/);
    if (emailMatch && method === "PUT") {
      let body;
      try {
        body = parseBody(event);
      } catch (error) {
        log("warn", "api_invalid_json_body", { routePath, message: error.message });
        return json(400, { error: "json invalido" }, headers);
      }

      const configError = validateServerConfig(headers);
      if (configError) return configError;

      const customerSummaryService = await getCustomerSummaryService();
      const result = await customerSummaryService.updateEmail(emailMatch[1], body.email);

      if (result.error) {
        return json(result.status, { error: result.error }, headers);
      }

      return json(result.status, result.data, headers);
    }

    return json(404, { error: "ruta no encontrada" }, headers);
  } catch (error) {
    log("error", "api_unhandled_error", {
      method,
      routePath,
      durationMs: Date.now() - startedAt,
      message: error.message,
      stack: error.stack,
    });
    return json(500, { error: "error interno del servidor" }, headers);
  }
}

function validateServerConfig(headers) {
  if (validateIspConfig()) return null;

  log("error", "api_env_missing", {
    hasApiBase: Boolean(env.isp.apiBase),
    hasApiKey: Boolean(env.isp.apiKey),
    hasClientId: Boolean(env.isp.clientId),
    hasApiUser: Boolean(env.isp.apiUser),
    hasApiPass: Boolean(env.isp.apiPass),
  });

  return json(500, { error: "configuracion incompleta del servidor" }, headers);
}
