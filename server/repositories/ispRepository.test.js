import { afterEach, describe, expect, it, vi } from "vitest";

import { IspRepository } from "./ispRepository.js";

function createResponse({ ok = true, status = 200, text = "" } = {}) {
  return {
    ok,
    status,
    text: vi.fn().mockResolvedValue(text),
  };
}

function createRepository(cacheOverrides = {}) {
  const cache = {
    delete: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    ...cacheOverrides,
  };

  const repository = new IspRepository({
    ispConfig: {
      apiBase: "https://provider.example/api",
      apiKey: "api-key",
      apiPass: "secret",
      apiUser: "user",
      clientId: "302",
    },
    cache,
    requestTimeoutMs: 50,
    tokenTtlSeconds: 600,
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
  });

  return { cache, repository };
}

describe("IspRepository", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reutiliza token cacheado sin pegarle al proveedor", async () => {
    const { repository } = createRepository({
      get: vi.fn().mockResolvedValue({ token: "cached-token" }),
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const token = await repository.getToken();

    expect(token).toBe("cached-token");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reintenta customer si el token vence con 401", async () => {
    const { cache, repository } = createRepository();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createResponse({ ok: false, status: 401, text: "unauthorized" }))
      .mockResolvedValueOnce(createResponse({ text: JSON.stringify({ token: "fresh-token" }) }))
      .mockResolvedValueOnce(createResponse({ text: JSON.stringify({ id: 99, doc_number: "20123456" }) }));
    vi.stubGlobal("fetch", fetchMock);

    const customer = await repository.findCustomerByDni("20123456", "expired-token");

    expect(customer).toEqual({ id: 99, doc_number: "20123456" });
    expect(cache.delete).toHaveBeenCalledWith("isp:token");
    expect(cache.set).toHaveBeenCalledWith("isp:token", { token: "fresh-token" }, 600);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("convierte aborts del fetch en timeout del proveedor", async () => {
    const { repository } = createRepository();
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    await expect(repository.request("https://provider.example/api/customer")).rejects.toThrow(
      "Timeout consultando ISPCube"
    );
  });

  it("falla con contexto si el proveedor devuelve JSON invalido", () => {
    const { repository } = createRepository();

    expect(() => repository.parseJsonText("{bad-json}", "customer")).toThrow(
      /Respuesta JSON invalida en customer/
    );
  });

  it("preserva path y query al redactar urls", () => {
    const { repository } = createRepository();

    expect(repository.redactUrl("https://provider.example/api/customer?doc_number=20123456")).toBe(
      "https://provider.example/api/customer?doc_number=20123456"
    );
    expect(repository.redactUrl("nota-url")).toBe("nota-url");
  });
});
