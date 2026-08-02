import { describe, expect, it, vi } from "vitest";

import { createApiHandler } from "./apiHandler.js";

function createService() {
  return {
    getSummaryByDni: vi.fn().mockResolvedValue({
      cacheStatus: "MISS",
      data: {
        customer: { id: 7 },
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
}

describe("apiHandler", () => {
  it("resuelve el path canonico de Netlify", async () => {
    const service = createService();
    const handler = createApiHandler({
      getCustomerSummaryService: async () => service,
      getHealthStatus: async () => ({ ok: true, redis: false }),
    });

    const response = await handler({
      headers: {},
      httpMethod: "GET",
      path: "/.netlify/functions/api/customer-summary",
      queryStringParameters: { dni: "20123456" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-cache"]).toBe("MISS");
    expect(JSON.parse(response.body)).toEqual(expect.objectContaining({ cutDay: 26 }));
    expect(service.getSummaryByDni).toHaveBeenCalledWith("20123456");
  });

  it("bloquea el PUT sin Origin permitido", async () => {
    const service = createService();
    const handler = createApiHandler({
      getCustomerSummaryService: async () => service,
      getHealthStatus: async () => ({ ok: true, redis: false }),
    });

    const response = await handler({
      body: JSON.stringify({ email: "ada@example.com" }),
      headers: {},
      httpMethod: "PUT",
      isBase64Encoded: false,
      path: "/customers/20123456/email",
    });

    expect(response.statusCode).toBe(403);
    expect(service.updateEmail).not.toHaveBeenCalled();
  });
});
