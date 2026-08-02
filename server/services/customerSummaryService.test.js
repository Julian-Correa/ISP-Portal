import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomerSummaryService } from "./customerSummaryService.js";

function createDependencies() {
  const cache = {
    delete: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  };

  const customer = {
    id: 7,
    code: "CLI-7",
    name: "Ada Lovelace",
    doc_number: "20123456",
    address: "Calle 123",
    debt: "4500",
    duedebt: "1200",
    status: "active",
    city: { name: "Cordoba", province: "Cordoba" },
    phones: [{ number: "3510000000", extra: "ignorar" }],
    customer_cbu: [{ cbu: "0001", number: "0001" }],
    contact_emails: [{ id: 12, email: "ada@example.com", principal: 1 }],
  };

  const ispRepository = {
    findConnectionByCustomer: vi.fn().mockResolvedValue({ plan_id: 99 }),
    findCustomerByDni: vi.fn().mockResolvedValue(customer),
    findLastInvoiceUrl: vi.fn().mockResolvedValue("https://example.com/factura.pdf"),
    findPlanById: vi.fn().mockResolvedValue({ id: 99, name: "300 MB", price: 12345 }),
    getToken: vi.fn().mockResolvedValue("token-1"),
    updateCustomerEmail: vi.fn().mockResolvedValue(true),
  };

  const service = new CustomerSummaryService({
    cache,
    ispRepository,
    cacheTtlSeconds: 120,
    billingRules: {
      cutDay: 26,
      recargoReconexion: 2000,
      recargoSegundoVencimiento: 2000,
    },
  });

  return { cache, customer, ispRepository, service };
}

describe("CustomerSummaryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sanitiza y valida DNI y email", () => {
    const { service } = createDependencies();

    expect(service.sanitizeDni("20.123.456")).toBe("20123456");
    expect(service.isValidDni("1234567")).toBe(true);
    expect(service.isValidDni("123456")).toBe(false);
    expect(service.isValidEmail("user@example.com")).toBe(true);
    expect(service.isValidEmail("user@@example.com")).toBe(false);
    expect(service.formatMoney(12345)).toMatch(/12\.345,00/);
  });

  it("sanitiza el cliente y reduce campos a los usados por el portal", () => {
    const { customer, service } = createDependencies();
    const sanitized = service.sanitizeCustomer(customer);

    expect(sanitized).toEqual({
      address: "Calle 123",
      city: { name: "Cordoba", province: "Cordoba" },
      code: "CLI-7",
      contact_emails: [{ email: "ada@example.com", id: 12, principal: 1 }],
      customer_cbu: [{ cbu: "0001", number: "0001" }],
      debt: "4500",
      doc_number: "20123456",
      duedebt: "1200",
      id: 7,
      name: "Ada Lovelace",
      phones: [{ number: "3510000000" }],
      status: "active",
    });
  });

  it("devuelve HIT desde cache sin consultar el ISP", async () => {
    const { cache, ispRepository, service } = createDependencies();
    const cachedPayload = { customer: { id: 7 } };
    cache.get.mockResolvedValueOnce(cachedPayload);

    const result = await service.getSummaryByDni("20.123.456");

    expect(result).toEqual({ data: cachedPayload, cacheStatus: "HIT", status: 200 });
    expect(ispRepository.getToken).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it("arma el resumen, incluye reglas de negocio y cachea en MISS", async () => {
    const { cache, ispRepository, service } = createDependencies();

    const result = await service.getSummaryByDni("20123456");

    expect(result.status).toBe(200);
    expect(result.cacheStatus).toBe("MISS");
    expect(result.data.customer.id).toBe(7);
    expect(result.data.invoiceUrl).toBe("https://example.com/factura.pdf");
    expect(result.data.planInfo).toEqual({
      plan: "300 MB",
      price: expect.stringMatching(/12\.345,00/),
    });
    expect(result.data.recargoReconexion).toBe(2000);
    expect(result.data.recargoSegundoVencimiento).toBe(2000);
    expect(result.data.cutDay).toBe(26);
    expect(ispRepository.getToken).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith("isp:summary:20123456", result.data, 120);
  });

  it("actualiza email e invalida el cache del resumen", async () => {
    const { cache, ispRepository, service } = createDependencies();

    const result = await service.updateEmail("20.123.456", "NEW@EXAMPLE.COM ");

    expect(result).toEqual({
      data: {
        customer: expect.objectContaining({
          contact_emails: [{ email: "new@example.com", id: 12, principal: 1 }],
          id: 7,
        }),
      },
      status: 200,
    });
    expect(ispRepository.updateCustomerEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      "new@example.com",
      "token-1"
    );
    expect(cache.delete).toHaveBeenCalledWith("isp:summary:20123456");
  });
});
