import { CUT_DAY } from "../config/portalConfig.js";
import { formatMoney } from "./format.js";

export function getServiceStatus(status) {
  const normalizedStatus = (status || "").toLowerCase();

  if (["active", "activo", "enabled"].includes(normalizedStatus)) {
    return {
      label: "Activo",
      color: "#10b981",
      bg: "rgba(16,185,129,0.12)",
      suspended: false,
    };
  }

  if (["blocked", "bloqueado", "block", "suspended", "suspendido", "disabled"].includes(normalizedStatus)) {
    return {
      label: "Suspendido",
      color: "#ef4444",
      bg: "rgba(239,68,68,0.12)",
      suspended: true,
    };
  }

  if (["no_service"].includes(normalizedStatus)) {
    return {
      label: "Sin servicio",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.12)",
      suspended: false,
    };
  }

  return {
    label: status || "—",
    color: "#64748b",
    bg: "rgba(100,116,139,0.12)",
    suspended: false,
  };
}

export function getCutoffDate() {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), CUT_DAY);

  if (now >= target) {
    target.setMonth(target.getMonth() + 1);
  }

  return target.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const getConnectionPlanInfo = (connection, plan) => ({
  plan: plan?.name || (connection?.plan_id ? `Plan ${connection.plan_id}` : "No informado"),
  price: plan?.price ? formatMoney(plan.price) : "No informado",
});
