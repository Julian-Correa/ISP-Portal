import { getConnectionPlanInfo } from "../utils/customer.js";

const PORTAL_API_BASE = import.meta.env.VITE_PORTAL_API_BASE || "";
const DEFAULT_BILLING_RULES = {
  recargoReconexion: 2000,
  recargoSegundoVencimiento: 2000,
  cutDay: 26,
};

export class PortalApiError extends Error {
  constructor(message, status, code = null) {
    super(message);
    this.name = "PortalApiError";
    this.status = status;
    this.code = code;
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
    throw new PortalApiError(
      data?.error || `Error del servidor (${response.status})`,
      response.status,
      data?.code || null
    );
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
    recargoReconexion: Number(data?.recargoReconexion ?? DEFAULT_BILLING_RULES.recargoReconexion),
    recargoSegundoVencimiento: Number(
      data?.recargoSegundoVencimiento ?? DEFAULT_BILLING_RULES.recargoSegundoVencimiento
    ),
    cutDay: Number(data?.cutDay ?? DEFAULT_BILLING_RULES.cutDay),
  };
}

export async function updateCustomerEmail(customer, email) {
  requirePortalApiBase();

  let response;

  try {
    response = await fetch(`${PORTAL_API_BASE}/customers/${customer.doc_number}/email`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email }),
    });
  } catch {
    throw new PortalApiError(
      "No se pudo conectar con el portal para guardar el email. Revisá tu conexión e intentá nuevamente.",
      500,
      "NETWORK_ERROR"
    );
  }

  const data = await readPortalJson(response);

  if (!data?.customer?.id) {
    throw new PortalApiError("No se pudo actualizar el email.", 500);
  }

  return data.customer;
}
