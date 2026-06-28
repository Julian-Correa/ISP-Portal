export class CustomerSummaryService {
  constructor({ cache, ispRepository, cacheTtlSeconds }) {
    this.cache = cache;
    this.ispRepository = ispRepository;
    this.cacheTtlSeconds = cacheTtlSeconds;
  }

  sanitizeDni(rawDni) {
    return String(rawDni || "").replace(/\D/g, "");
  }

  isValidDni(dni) {
    return dni.length >= 7 && dni.length <= 8;
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  formatMoney(value) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(parseFloat(value) || 0);
  }

  firstArrayItem(value) {
    return Array.isArray(value) ? value[0] : null;
  }

  sanitizeCustomer(customer) {
    const city = customer?.city && typeof customer.city === "object" ? customer.city : {};
    const phone = this.firstArrayItem(customer?.phones);
    const cbu = this.firstArrayItem(customer?.customer_cbu);
    const email = this.firstArrayItem(customer?.contact_emails);

    return {
      id: customer?.id,
      code: customer?.code || "",
      name: customer?.name || "",
      doc_number: customer?.doc_number || "",
      address: customer?.address || "",
      debt: customer?.debt || "0",
      duedebt: customer?.duedebt || "0",
      status: customer?.status || "",
      city: {
        name: city.name || "",
        province: city.province || "",
      },
      phones: phone ? [{ number: phone.number || "" }] : [],
      customer_cbu: cbu ? [{
        cbu: cbu.cbu || "",
        number: cbu.number || "",
      }] : [],
      contact_emails: email ? [{
        id: email.id || -1,
        email: email.email || "",
        principal: email.principal || 1,
      }] : [],
    };
  }

  async getSummaryByDni(rawDni) {
    const dni = this.sanitizeDni(rawDni);
    if (!this.isValidDni(dni)) {
      return { error: "dni inválido", status: 400 };
    }

    const cacheKey = `isp:summary:${dni}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return { data: cached, cacheStatus: "HIT", status: 200 };
    }

    const token = await this.ispRepository.getToken();
    const customer = await this.ispRepository.findCustomerByDni(dni, token);

    if (!customer?.id) {
      return { error: "cliente no encontrado", status: 404 };
    }

    const invoiceUrl = await this.ispRepository.findLastInvoiceUrl(customer.id, token);
    const connection = await this.ispRepository.findConnectionByCustomer(customer, token);
    const plan = await this.ispRepository.findPlanById(connection?.plan_id, token);
    const payload = {
      customer: this.sanitizeCustomer(customer),
      invoiceUrl,
      planInfo: {
        plan: plan?.name || (connection?.plan_id ? `Plan ${connection.plan_id}` : "No informado"),
        price: plan?.price ? this.formatMoney(plan.price) : "No informado",
      },
      generatedAt: new Date().toISOString(),
    };

    await this.cache.set(cacheKey, payload, this.cacheTtlSeconds);

    return { data: payload, cacheStatus: "MISS", status: 200 };
  }

  async updateEmail(rawDni, email) {
    const dni = this.sanitizeDni(rawDni);
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!this.isValidDni(dni)) return { error: "dni invalido", status: 400 };
    if (!this.isValidEmail(cleanEmail)) return { error: "email invalido", status: 400 };

    const token = await this.ispRepository.getToken();
    const customer = await this.ispRepository.findCustomerByDni(dni, token);
    if (!customer?.id) return { error: "cliente no encontrado", status: 404 };

    await this.ispRepository.updateCustomerEmail(customer, cleanEmail, token);

    const existingId = customer.contact_emails?.[0]?.id;
    const updatedCustomer = this.sanitizeCustomer({
      ...customer,
      contact_emails: [{
        id: existingId || -1,
        email: cleanEmail,
        principal: 1,
      }],
    });

    await this.cache.delete(`isp:summary:${dni}`);

    return { data: { customer: updatedCustomer }, status: 200 };
  }
}
