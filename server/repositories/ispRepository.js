export class IspRepository {
  constructor({ ispConfig, cache, tokenTtlSeconds, requestTimeoutMs }) {
    this.isp = ispConfig;
    this.cache = cache;
    this.tokenTtlSeconds = tokenTtlSeconds;
    this.requestTimeoutMs = requestTimeoutMs;
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

    const response = await this.request(`${this.isp.apiBase}/sanctum/token`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ username: this.isp.apiUser, password: this.isp.apiPass }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`No se pudo obtener token ISPCube (${response.status}): ${body}`);
    }

    const data = await response.json();
    const token = data.token || data.access_token;
    if (!token) throw new Error("Respuesta de token inválida en ISPCube");

    await this.cache.set(cacheKey, { token }, this.tokenTtlSeconds);
    return token;
  }

  async findCustomerByDni(dni, token) {
    const url = `${this.isp.apiBase}/customer?doc_number=${dni}&deleted=false&temporary=false`;
    const response = await this.request(url, { headers: this.headers(token) });

    if (response.status === 404) return null;
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Error consultando cliente (${response.status}): ${body}`);
    }

    const data = await response.json();
    if (Array.isArray(data)) return data[0] || null;
    return data?.id ? data : null;
  }

  async findLastInvoiceUrl(customerId, token) {
    const params = new URLSearchParams({
      customer_id: String(customerId),
      monthly_bill: "true",
      canceled: "false",
    });

    const response = await this.request(`${this.isp.apiBase}/bills/last_bill_api?${params}`, {
      headers: this.headers(token),
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
        const candidate = Object.values(first || {}).find(
          (value) => typeof value === "string" && value.startsWith("http")
        );
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

      const response = await this.request(`${this.isp.apiBase}/connection?${params}`, {
        headers: this.headers(token),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const connections = Array.isArray(data) ? data : data?.id ? [data] : [];
      const connection = connections.find((item) => item?.plan_id) || connections[0];
      if (connection) return connection;
    }

    return null;
  }

  async findPlanById(planId, token) {
    if (!planId) return null;

    const response = await this.request(`${this.isp.apiBase}/plans/plans_list`, {
      headers: this.headers(token),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const plans = Array.isArray(data) ? data : [];
    return plans.find((plan) => String(plan.id) === String(planId)) || null;
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

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }
}
