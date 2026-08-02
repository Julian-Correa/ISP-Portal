import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApiHandler } from "./http/apiHandler.js";
import { createServerApp } from "./index.js";

function createApp() {
  const service = {
    getSummaryByDni: vi.fn().mockResolvedValue({
      cacheStatus: "MISS",
      data: {
        customer: { id: 7, doc_number: "20123456" },
        cutDay: 26,
        invoiceUrl: null,
        planInfo: { plan: "300 MB", price: "$ 12.345,00" },
        recargoReconexion: 2000,
        recargoSegundoVencimiento: 2000,
      },
      status: 200,
    }),
    updateEmail: vi.fn().mockResolvedValue({
      data: { customer: { id: 7, contact_emails: [{ email: "ada@example.com" }] } },
      status: 200,
    }),
  };

  const app = createServerApp({
    getHealthStatus: async () => ({ ok: true, redis: false }),
    handleRequest: createApiHandler({
      getCustomerSummaryService: async () => service,
      getHealthStatus: async () => ({ ok: true, redis: false }),
    }),
  });

  return { app, service };
}

describe("Express adapter", () => {
  it("mantiene /health en Express", async () => {
    const { app } = createApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, redis: false });
  });

  it("expone customer-summary con el mismo handler canonico", async () => {
    const { app, service } = createApp();

    const response = await request(app).get("/customer-summary").query({ dni: "20123456" });

    expect(response.status).toBe(200);
    expect(response.headers["x-cache"]).toBe("MISS");
    expect(response.body).toEqual(expect.objectContaining({ cutDay: 26 }));
    expect(service.getSummaryByDni).toHaveBeenCalledWith("20123456");
  });

  it("rechaza update email sin Origin valido", async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .put("/customers/20123456/email")
      .send({ email: "ada@example.com" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "origen no permitido" });
    expect(service.updateEmail).not.toHaveBeenCalled();
  });

  it("permite update email cuando el Origin coincide", async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .put("/customers/20123456/email")
      .set("Origin", "http://localhost:5173")
      .send({ email: "ada@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      customer: { id: 7, contact_emails: [{ email: "ada@example.com" }] },
    });
    expect(service.updateEmail).toHaveBeenCalledWith("20123456", "ada@example.com");
  });
});
