export class IspHttpError extends Error {
  constructor(message, { status, endpoint, body }) {
    super(message);
    this.name = "IspHttpError";
    this.status = status;
    this.endpoint = endpoint;
    this.body = body;
  }
}

export class IspRepository {
  constructor({ ispConfig, cache, tokenTtlSeconds, requestTimeoutMs, logger = console }) {
    this.isp = ispConfig;
    this.cache = cache;
    this.tokenTtlSeconds = tokenTtlSeconds;
    this.requestTimeoutMs = requestTimeoutMs;
    this.logger = logger;
  }

  headers(token) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": this.isp.apiKey,
      "client-id": this.isp.clientId,
      "login-type": "api",
      username: this.isp.apiUser,
    };

    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async getToken() {
    const cacheKey = "isp:token";
    const cached = await this.cache.get(cacheKey);
    if (cached?.token) return cached.token;

    const tokenUrl = `${this.isp.apiBase}/sanctum/token`;
    const response = await this.request(tokenUrl, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ username: this.isp.apiUser, password: this.isp.apiPass }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.error("isp_token_failed", {
        status: response.status,
        bodyPreview: body.slice(0, 300),
        config: this.configDiagnostics(),
      });
      throw new IspHttpError(`No se pudo obtener token ISPCube (${response.status})`, {
        status: response.status,
        endpoint: "sanctum/token",
        body,
      });
    }

    const data = await this.readJson(response, "sanctum/token");
    const token = data?.token || data?.access_token;
    if (!token) throw new Error("Respuesta de token invalida en ISPCube");

    await this.cache.set(cacheKey, { token }, this.tokenTtlSeconds);
    return token;
  }

  async findCustomerByDni(dni, token) {
    const url = `${this.isp.apiBase}/customer?doc_number=${dni}&deleted=false&temporary=false`;
    let response = await this.request(url, { headers: this.headers(token) });

    if (response.status === 401) {
      this.warn("isp_customer_token_rejected_retry", { dni });
      await this.cache.delete("isp:token");
      const freshToken = await this.getToken();
      response = await this.request(url, { headers: this.headers(freshToken) });
    }

    if (response.status === 404) return null;
    if (!response.ok) {
      const body = await response.text();
      throw new IspHttpError(`Error consultando cliente ISPCube (${response.status})`, {
        status: response.status,
        endpoint: "customer",
        body,
      });
    }

    const data = await this.readJson(response, "customer");
    if (Array.isArray(data)) return data[0] || null;
    return data?.id ? data : null;
  }

  async findLastInvoiceUrl(customerId, token) {
    const params = new URLSearchParams({
      customer_id: String(customerId),
      monthly_bill: "true",
      canceled: "false",
    });

    try {
      const response = await this.request(`${this.isp.apiBase}/bills/last_bill_api?${params}`, {
        headers: this.headers(token),
      });

      if (!response.ok) return null;

      const text = (await response.text()).trim();
      const trimmed = text.replace(/^[[{"']+|[\]}"']+$/g, "");
      if (trimmed.startsWith("http")) return trimmed;
      if (!text) return null;

      const json = this.parseJsonText(text, "bills/last_bill_api");
      if (typeof json === "string" && json.startsWith("http")) return json;

      if (Array.isArray(json) && json.length > 0) {
        const first = json[0];
        if (typeof first === "string") return first;
        const candidate = Object.values(first || {}).find(
          (value) => typeof value === "string" && value.startsWith("http")
        );
        if (candidate) return candidate;
      }

      if (json && typeof json === "object") {
        return json.url || json.pdf_url || json.link || null;
      }
    } catch (error) {
      this.warn("isp_optional_invoice_failed", { customerId, message: error.message });
      return null;
    }

    return null;
  }

  async findConnectionByCustomer(customer, token) {
    const searches = [
      { customer_id: String(customer.id) },
      { doc_number: String(customer.doc_number || "") },
      { code: String(customer.code || "") },
      {
        customer_id: String(customer.id),
        doc_number: String(customer.doc_number || ""),
        code: String(customer.code || ""),
      },
    ];

    for (const search of searches) {
      const params = new URLSearchParams(
        Object.entries(search).filter(([, value]) => value)
      );

      try {
        const response = await this.request(`${this.isp.apiBase}/connection?${params}`, {
          headers: this.headers(token),
        });

        if (!response.ok) continue;

        const data = await this.readJson(response, "connection");
        const connections = Array.isArray(data) ? data : data?.id ? [data] : [];
        const connection = connections.find((item) => item?.plan_id) || connections[0];
        if (connection) return connection;
      } catch (error) {
        this.warn("isp_optional_connection_failed", {
          customerId: customer.id,
          search,
          message: error.message,
        });
      }
    }

    return null;
  }

  async findPlanById(planId, token) {
    if (!planId) return null;

    try {
      const response = await this.request(`${this.isp.apiBase}/plans/plans_list`, {
        headers: this.headers(token),
      });

      if (!response.ok) return null;

      const data = await this.readJson(response, "plans/plans_list");
      const plans = Array.isArray(data) ? data : [];
      return plans.find((plan) => String(plan.id) === String(planId)) || null;
    } catch (error) {
      this.warn("isp_optional_plan_failed", { planId, message: error.message });
      return null;
    }
  }

  async updateCustomerEmail(customer, email, token) {
    const id = Number.parseInt(customer.id, 10);
    if (!Number.isInteger(id)) throw new Error("ID de cliente invalido");

    const existingEmail = customer.contact_emails?.[0];
    const emailId = existingEmail?.id ? Number.parseInt(existingEmail.id, 10) : -1;
    const body = {
      id,
      doc_number: customer.doc_number,
      identification_type_id: customer.identification_type_id || 1,
      entity_id: customer.entity_id,
      email: [{ id: Number.isInteger(emailId) ? emailId : -1, email, principal: 1 }],
    };

    const response = await this.request(`${this.isp.apiBase}/customers/${id}`, {
      method: "PUT",
      headers: this.headers(token),
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(responseText || `Error actualizando email (${response.status})`);
    }

    return true;
  }

  async request(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    const startedAt = Date.now();
    const method = options.method || "GET";

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      this.info("isp_request", {
        method,
        url: this.redactUrl(url),
        status: response.status,
        durationMs: Date.now() - startedAt,
      });
      return response;
    } catch (error) {
      this.error("isp_request_failed", {
        method,
        url: this.redactUrl(url),
        durationMs: Date.now() - startedAt,
        message: error.message,
        stack: error.stack,
      });

      if (error.name === "AbortError") {
        throw new Error(`Timeout consultando ISPCube (${method} ${this.redactUrl(url)})`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async readJson(response, context) {
    const text = await response.text();
    return this.parseJsonText(text, context);
  }

  parseJsonText(text, context) {
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Respuesta JSON invalida en ${context}: ${text.slice(0, 180)}`);
    }
  }

  redactUrl(url) {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}${parsed.search}`;
    } catch {
      return url;
    }
  }

  info(event, details) {
    this.logger.info?.(JSON.stringify({ event, ...details }));
  }

  warn(event, details) {
    this.logger.warn?.(JSON.stringify({ event, ...details }));
  }

  error(event, details) {
    this.logger.error?.(JSON.stringify({ event, ...details }));
  }

  configDiagnostics() {
    return {
      apiBase: this.isp.apiBase,
      apiKeyLength: this.isp.apiKey?.length || 0,
      clientId: this.isp.clientId,
      apiUserLength: this.isp.apiUser?.length || 0,
      apiPassLength: this.isp.apiPass?.length || 0,
    };
  }
}
