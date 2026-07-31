export const formatMoney = (value) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(parseFloat(value) || 0);

export const formatName = (name) =>
  name?.split(" ").map((word) => word.charAt(0) + word.slice(1).toLowerCase()).join(" ") || "";
