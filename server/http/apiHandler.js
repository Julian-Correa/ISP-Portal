import { getCustomerSummaryService, getHealthStatus } from "../app/runtime.js";
import { env, validateIspConfig } from "../config/env.js";
import { IspHttpError } from "../repositories/ispRepository.js";

const rateLimitBuckets = new Map();

class PayloadTooLargeError extends Error {
  constructor() {
    super("payload demasiado grande");
    this.name = "PayloadTooLargeError";
  }
}

function log(level, event, details = {}) {
  const payload = {
    event,
    ...details,
  };
  console[level]?.(safeStringify(payload));
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": env.corsOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Content-Type": "application/json",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers,
    body: safeStringify(body ?? {}),
  };
}

function safeStringify(value) {
  const seen = new WeakSet();

  return JSON.stringify(value, (_key, item) => {
    if (typeof item === "bigint") return item.toString();

    if (item && typeof item === "object") {
      if (seen.has(item)) return "[Circular]";
      seen.add(item);
    }

    return item;
  });
}

function getHeader(headers, name) {
  if (!headers) return undefined;

  const target = name.toLowerCase();
  const match = Object.entries(headers).find(([headerName]) => headerName.toLowerCase() === target);
  if (!match) return undefined;

  const value = match[1];
  return Array.isArray(value) ? value.join(", ") : value;
}

function getClientIp(event) {
  return (
    getHeader(event.headers, "x-nf-client-connection-ip") ||
    getHeader(event.headers, "client-ip") ||
    getHeader(event.headers, "x-forwarded-for")?.split(",")[0]?.trim() ||
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

function getRoutePath(event) {
  const rawPath = String(event.path || "").split("?")[0] || "/";
  const marker = "/.netlify/functions/api";

  if (rawPath.startsWith(marker)) return rawPath.slice(marker.length) || "/";
  if (rawPath.startsWith("/api")) return rawPath.slice(4) || "/";

  return rawPath;
}

function parseBody(event) {
  if (!event.body) return {};

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  if (Buffer.byteLength(rawBody, "utf8") > env.bodyLimitBytes) {
    throw new PayloadTooLargeError();
  }

  return JSON.parse(rawBody);
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

function validateOrigin(event, headers) {
  const origin = getHeader(event.headers, "origin");

  if (origin === env.corsOrigin) return null;

  log("warn", "api_origin_blocked", {
    routePath: getRoutePath(event),
    method: event.httpMethod || "GET",
    origin: origin || null,
  });

  return json(403, { error: "origen no permitido" }, headers);
}

function isTimeoutError(error) {
  return error?.message?.startsWith("Timeout consultando ISPCube");
}

export function createApiHandler({
  getCustomerSummaryService: getService = getCustomerSummaryService,
  getHealthStatus: getHealth = getHealthStatus,
} = {}) {
  return async function handleRequest(event = {}) {
    const startedAt = Date.now();
    const headers = corsHeaders();
    const routePath = getRoutePath(event);
    const method = event.httpMethod || "GET";

    log("info", "api_request", {
      method,
      routePath,
      query: event.queryStringParameters || {},
    });

    try {
      if (method === "OPTIONS") {
        const origin = getHeader(event.headers, "origin");

        if (origin && origin !== env.corsOrigin) {
          return validateOrigin(event, headers);
        }

        return { statusCode: 204, headers, body: "" };
      }

      if (routePath === "/health" && method === "GET") {
        return json(200, await getHealth(), headers);
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

        const customerSummaryService = await getService();
        const result = await customerSummaryService.getSummaryByDni(dni);

        if (result.error) {
          log("warn", "api_customer_summary_error", {
            dni: cleanDni,
            status: result.status,
            error: result.error,
          });
          return json(result.status, { error: result.error }, headers);
        }

        return json(result.status, result.data, {
          ...headers,
          "x-cache": result.cacheStatus,
        });
      }

      const emailMatch = routePath.match(/^\/customers\/([^/]+)\/email$/);
      if (emailMatch && method === "PUT") {
        const originError = validateOrigin(event, headers);
        if (originError) return originError;

        let body;
        try {
          body = parseBody(event);
        } catch (error) {
          if (error instanceof PayloadTooLargeError) {
            return json(413, { error: error.message }, headers);
          }

          log("warn", "api_invalid_json_body", { routePath, message: error.message });
          return json(400, { error: "json invalido" }, headers);
        }

        const configError = validateServerConfig(headers);
        if (configError) return configError;

        const customerSummaryService = await getService();
        const result = await customerSummaryService.updateEmail(emailMatch[1], body.email);

        if (result.error) {
          return json(result.status, { error: result.error }, headers);
        }

        return json(result.status, result.data, headers);
      }

      return json(404, { error: "ruta no encontrada" }, headers);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        return json(413, { error: error.message }, headers);
      }

      if (isTimeoutError(error) || error instanceof IspHttpError) {
        log("error", "api_provider_error", {
          method,
          routePath,
          durationMs: Date.now() - startedAt,
          ispStatus: error instanceof IspHttpError ? error.status : null,
          endpoint: error instanceof IspHttpError ? error.endpoint : null,
          message: error.message,
          stack: error.stack,
        });

        return json(502, { error: "error consultando proveedor" }, headers);
      }

      log("error", "api_unhandled_error", {
        method,
        routePath,
        durationMs: Date.now() - startedAt,
        message: error.message,
        stack: error.stack,
      });

      return json(500, { error: "error interno del servidor" }, headers);
    }
  };
}

export const handleRequest = createApiHandler();
