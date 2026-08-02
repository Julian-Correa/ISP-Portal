import "dotenv/config";
import { pathToFileURL } from "node:url";
import express from "express";
import { env } from "./config/env.js";
import { getHealthStatus as defaultGetHealthStatus } from "./app/runtime.js";
import { handleRequest as defaultHandleRequest } from "./http/apiHandler.js";

function normalizeHeaders(headers) {
  const normalized = {};

  for (const [name, value] of Object.entries(headers || {})) {
    normalized[name] = Array.isArray(value) ? value.join(", ") : String(value);
  }

  return normalized;
}

function toQueryStringParameters(query) {
  const params = {};

  for (const [key, value] of Object.entries(query || {})) {
    if (Array.isArray(value)) {
      params[key] = value[0];
      continue;
    }

    if (value !== undefined) {
      params[key] = String(value);
    }
  }

  return params;
}

async function readRequestBody(req) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return null;
  }

  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      size += Buffer.byteLength(chunk, "utf8");

      if (size > env.bodyLimitBytes) {
        reject(new Error("PAYLOAD_TOO_LARGE"));
        req.destroy();
        return;
      }

      body += chunk;
    });
    req.on("end", () => resolve(body || null));
    req.on("error", reject);
  });
}

function applyHandlerResponse(res, response) {
  if (response.headers) {
    for (const [name, value] of Object.entries(response.headers)) {
      if (value !== undefined) {
        res.set(name, value);
      }
    }
  }

  res.status(response.statusCode);

  if (response.body === "") {
    res.send("");
    return;
  }

  if (response.body === undefined || response.body === null) {
    res.end();
    return;
  }

  res.send(response.body);
}

export function createServerApp({
  handleRequest = defaultHandleRequest,
  getHealthStatus = defaultGetHealthStatus,
} = {}) {
  const app = express();

  app.disable("x-powered-by");

  app.get("/health", async (_req, res, next) => {
    try {
      res.json(await getHealthStatus());
    } catch (error) {
      next(error);
    }
  });

  app.use(async (req, res, next) => {
    try {
      const body = await readRequestBody(req);
      const response = await handleRequest({
        body,
        headers: normalizeHeaders(req.headers),
        httpMethod: req.method,
        isBase64Encoded: false,
        path: req.originalUrl,
        queryStringParameters: toQueryStringParameters(req.query),
      });

      applyHandlerResponse(res, response);
    } catch (error) {
      if (error.message === "PAYLOAD_TOO_LARGE") {
        res.status(413).json({ error: "payload demasiado grande" });
        return;
      }

      next(error);
    }
  });

  app.use((error, _req, res, next) => {
    void next;
    console.error("Error en adaptador Express:", error);

    if (res.headersSent) return;

    res.status(500).json({ error: "error interno del servidor" });
  });

  return app;
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  const app = createServerApp();

  app.listen(env.port, () => {
    console.log(`ISP proxy escuchando en http://localhost:${env.port}`);
  });
}
