export class IspRepository {
  constructor({ ispConfig, cache, tokenTtlSeconds }) {
    this.isp = ispConfig;
    this.cache = cache;
    this.tokenTtlSeconds = tokenTtlSeconds;
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

    const response = await fetch(`${this.isp.apiBase}/sanctum/token`, {
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
    const response = await fetch(url, { headers: this.headers(token) });

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

    const response = await fetch(`${this.isp.apiBase}/bills/last_bill_api?${params}`, {
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
}
