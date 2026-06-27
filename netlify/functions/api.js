import "dotenv/config";
import { env, validateIspConfig } from "../../server/config/env.js";
import { CacheClient } from "../../server/lib/cache.js";
import { IspRepository } from "../../server/repositories/ispRepository.js";
import { CustomerSummaryService } from "../../server/services/customerSummaryService.js";

const rateLimitBuckets = new Map();
let servicePromise;
let cache;

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
    body: JSON.stringify(body),
  };
}

function getClientIp(event) {
  return (
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["client-ip"] ||
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
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

export async function handler(event) {
  const headers = corsHeaders(event.headers.origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const routePath = getRoutePath(event);

  if (routePath === "/health" && event.httpMethod === "GET") {
    const customerSummaryService = await getCustomerSummaryService();
    return json(200, {
      ok: true,
      redis: customerSummaryService.cache.isRedisEnabled(),
    }, headers);
  }

  if (!validateIspConfig()) {
    return json(500, {
      error: "Faltan variables ISP_API_KEY/ISP_CLIENT_ID/ISP_API_USER/ISP_API_PASS",
    }, headers);
  }

  if (rateLimit(event)) {
    return json(429, { error: "demasiadas solicitudes" }, headers);
  }

  try {
    const customerSummaryService = await getCustomerSummaryService();

    if (routePath === "/customer-summary" && event.httpMethod === "GET") {
      const result = await customerSummaryService.getSummaryByDni(
        event.queryStringParameters?.dni
      );

      if (result.error) return json(result.status, { error: result.error }, headers);

      return json(result.status, result.data, {
        ...headers,
        "x-cache": result.cacheStatus,
      });
    }

    const emailMatch = routePath.match(/^\/customers\/([^/]+)\/email$/);
    if (emailMatch && event.httpMethod === "PUT") {
      let body;
      try {
        body = parseBody(event);
      } catch {
        return json(400, { error: "json invalido" }, headers);
      }
      const result = await customerSummaryService.updateEmail(emailMatch[1], body.email);

      if (result.error) return json(result.status, { error: result.error }, headers);

      return json(result.status, result.data, headers);
    }

    return json(404, { error: "ruta no encontrada" }, headers);
  } catch (error) {
    console.error("Error en Netlify Function api:", error);
    return json(502, { error: "fallo consulta ISP" }, headers);
  }
}
