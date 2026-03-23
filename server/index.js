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
app.use(express.json());
app.use(cors({ origin: env.corsOrigin === "*" ? true : env.corsOrigin }));

const cache = new CacheClient({ redisUrl: env.redisUrl });
await cache.connect();

const ispRepository = new IspRepository({
  ispConfig: env.isp,
  cache,
  tokenTtlSeconds: env.tokenTtlSeconds,
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
