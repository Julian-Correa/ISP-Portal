/* global process */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "redis";

const {
  PORT = 8787,
  ISP_API_BASE = "https://online25.ispcube.com/api",
  ISP_API_KEY,
  ISP_CLIENT_ID,
  ISP_API_USER,
  ISP_API_PASS,
  REDIS_URL,
  CACHE_TTL_SECONDS = "120",
  TOKEN_TTL_SECONDS = "600",
  CORS_ORIGIN = "*",
} = process.env;

const app = express();
app.use(express.json());
app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN }));

const cacheTtl = Number(CACHE_TTL_SECONDS) || 120;
const tokenTtl = Number(TOKEN_TTL_SECONDS) || 600;

const memoryCache = new Map();
let redisClient = null;

function hasIspConfig() {
  return Boolean(ISP_API_KEY && ISP_CLIENT_ID && ISP_API_USER && ISP_API_PASS);
}

async function initRedis() {
  if (!REDIS_URL) return;

  try {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on("error", (err) => {
      console.warn("Redis no disponible, se usa caché en memoria:", err.message);
    });

    await redisClient.connect();
    console.log("Redis conectado");
  } catch (error) {
    console.warn("No se pudo conectar Redis, se usa caché en memoria:", error.message);
    redisClient = null;
  }
}

function memorySet(key, value, ttlSeconds) {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

function memoryGet(key) {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return cached.value;
}

async function cacheGet(key) {
  if (redisClient) {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }
  return memoryGet(key);
}

async function cacheSet(key, value, ttlSeconds) {
  if (redisClient) {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    return;
  }
  memorySet(key, value, ttlSeconds);
}

function ispHeaders(token) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "api-key": ISP_API_KEY,
    "client-id": ISP_CLIENT_ID,
    "login-type": "api",
    username: ISP_API_USER,
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function getIspToken() {
  const cacheKey = "isp:token";
  const cached = await cacheGet(cacheKey);
  if (cached?.token) return cached.token;

  const response = await fetch(`${ISP_API_BASE}/sanctum/token`, {
    method: "POST",
    headers: ispHeaders(),
    body: JSON.stringify({ username: ISP_API_USER, password: ISP_API_PASS }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`No se pudo obtener token ISPCube (${response.status}): ${body}`);
  }

  const data = await response.json();
  const token = data.token || data.access_token;
  if (!token) throw new Error("Respuesta de token inválida en ISPCube");

  await cacheSet(cacheKey, { token }, tokenTtl);
  return token;
}

async function fetchCustomerByDni(dni, token) {
  const url = `${ISP_API_BASE}/customer?doc_number=${dni}&deleted=false&temporary=false`;
  const response = await fetch(url, { headers: ispHeaders(token) });

  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Error consultando cliente (${response.status}): ${body}`);
  }

  const data = await response.json();
  if (Array.isArray(data)) return data[0] || null;
  return data?.id ? data : null;
}

async function fetchLastInvoice(customerId, token) {
  const params = new URLSearchParams({
    customer_id: String(customerId),
    monthly_bill: "true",
    canceled: "false",
  });

  const response = await fetch(`${ISP_API_BASE}/bills/last_bill_api?${params}`, {
    headers: ispHeaders(token),
  });

  if (!response.ok) return null;

  const text = (await response.text()).trim();
  const trimmed = text.replace(/^[[{"']+|[\]}"']+$/g, "");
  if (trimmed.startsWith("http")) return trimmed;

  try {
    const json = JSON.parse(text);
    if (typeof json === "string" && json.startsWith("http")) return json;
    if (Array.isArray(json) && json.length > 0) {
      const first = json[0];
      if (typeof first === "string") return first;
      const candidate = Object.values(first || {}).find((v) => typeof v === "string" && v.startsWith("http"));
      if (candidate) return candidate;
    }
    if (json && typeof json === "object") {
      return json.url || json.pdf_url || json.link || null;
    }
  } catch {
    return null;
  }

  return null;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, redis: Boolean(redisClient) });
});

app.get("/customer-summary", async (req, res) => {
  if (!hasIspConfig()) {
    return res.status(500).json({
      error: "Faltan variables ISP_API_KEY/ISP_CLIENT_ID/ISP_API_USER/ISP_API_PASS",
    });
  }

  const dni = String(req.query.dni || "").replace(/\D/g, "");
  if (dni.length < 7 || dni.length > 8) {
    return res.status(400).json({ error: "dni inválido" });
  }

  const cacheKey = `isp:summary:${dni}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.set("x-cache", "HIT").json(cached);
    }

    const token = await getIspToken();
    const customer = await fetchCustomerByDni(dni, token);

    if (!customer?.id) {
      return res.status(404).json({ error: "cliente no encontrado" });
    }

    const invoiceUrl = await fetchLastInvoice(customer.id, token);
    const payload = {
      customer,
      invoiceUrl,
      generatedAt: new Date().toISOString(),
    };

    await cacheSet(cacheKey, payload, cacheTtl);

    return res.set("x-cache", "MISS").json(payload);
  } catch (error) {
    console.error("Error en /customer-summary:", error);
    return res.status(502).json({ error: "falló consulta ISP", detail: error.message });
  }
});

await initRedis();
app.listen(PORT, () => {
  console.log(`ISP proxy escuchando en http://localhost:${PORT}`);
});
