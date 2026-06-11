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

  formatMoney(value) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(parseFloat(value) || 0);
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
      customer,
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
}
