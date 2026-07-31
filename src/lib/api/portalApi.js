import { getConnectionPlanInfo } from "../utils/customer.js";

const PORTAL_API_BASE = import.meta.env.VITE_PORTAL_API_BASE || "";

export class PortalApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "PortalApiError";
    this.status = status;
  }
}

function requirePortalApiBase() {
  if (!PORTAL_API_BASE) {
    throw new Error("Falta configurar VITE_PORTAL_API_BASE.");
  }
}

async function readPortalJson(response) {
  let data = null;

  try {
    data = await response.json();
  } catch {
    // El backend debe responder JSON, pero la UI no debe exponer errores crudos.
  }

  if (!response.ok) {
    throw new PortalApiError(data?.error || `Error del servidor (${response.status})`, response.status);
  }

  return data;
}

export async function fetchCustomerSummaryByDNI(dni) {
  requirePortalApiBase();

  let response;

  try {
    response = await fetch(`${PORTAL_API_BASE}/customer-summary?dni=${dni}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new PortalApiError("No se pudo conectar con el portal. Intentá nuevamente en unos minutos.", 500);
  }

  const data = await readPortalJson(response);

  if (!data?.customer?.id) {
    throw new PortalApiError("No encontramos una cuenta asociada a ese DNI.", 404);
  }

  return {
    customer: data.customer,
    invoiceUrl: data.invoiceUrl || null,
    planInfo: data.planInfo || getConnectionPlanInfo(null),
  };
}

export async function updateCustomerEmail(customer, email) {
  requirePortalApiBase();

  const response = await fetch(`${PORTAL_API_BASE}/customers/${customer.doc_number}/email`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await readPortalJson(response);

  if (!data?.customer?.id) {
    throw new PortalApiError("No se pudo actualizar el email.", 500);
  }

  return data.customer;
}
