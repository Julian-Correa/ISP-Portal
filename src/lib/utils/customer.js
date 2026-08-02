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

export function getCutoffDate(cutDay = 26) {
  const now = new Date();
  const normalizedCutDay = Number.isInteger(cutDay) && cutDay > 0 && cutDay <= 31 ? cutDay : 26;
  const currentMonthLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let target = new Date(now.getFullYear(), now.getMonth(), Math.min(normalizedCutDay, currentMonthLastDay));

  if (now >= target) {
    const nextMonthLastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
    target = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(normalizedCutDay, nextMonthLastDay));
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
