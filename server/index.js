import "dotenv/config";
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { CacheClient } from "./lib/cache.js";
import { IspRepository } from "./repositories/ispRepository.js";
import { CustomerSummaryService } from "./services/customerSummaryService.js";
import { createCustomerController } from "./controllers/customerController.js";
import { createHealthController } from "./controllers/healthController.js";
import { createRoutes } from "./routes/index.js";

const app = express();
const rateLimitBuckets = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + env.rateLimitWindowMs });
    for (const [bucketKey, value] of rateLimitBuckets.entries()) {
      if (now > value.resetAt) rateLimitBuckets.delete(bucketKey);
    }
    return next();
  }

  bucket.count += 1;
  if (bucket.count > env.rateLimitMax) {
    return res.status(429).json({ error: "demasiadas solicitudes" });
  }

  return next();
}

app.disable("x-powered-by");
app.use(express.json({ limit: env.bodyLimit }));
app.use(cors({ origin: env.corsOrigin === "*" ? true : env.corsOrigin }));
app.use((_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  });
  next();
});
app.use(["/customer-summary", "/customers"], rateLimit);

const cache = new CacheClient({ redisUrl: env.redisUrl });
await cache.connect();

const ispRepository = new IspRepository({
  ispConfig: env.isp,
  cache,
  tokenTtlSeconds: env.tokenTtlSeconds,
  requestTimeoutMs: env.requestTimeoutMs,
});

const customerSummaryService = new CustomerSummaryService({
  cache,
  ispRepository,
  cacheTtlSeconds: env.cacheTtlSeconds,
});

const customerController = createCustomerController({ customerSummaryService });
const healthController = createHealthController({ cache });

app.use(createRoutes({ customerController, healthController }));

app.listen(env.port, () => {
  console.log(`ISP proxy escuchando en http://localhost:${env.port}`);
});
