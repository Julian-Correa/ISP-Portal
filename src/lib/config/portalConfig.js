export const WHATSAPP_NUMBER = "541130921454";
export const WHATSAPP_SOPORTE = "541171812782";
export const LINKEDIN_URL = "https://www.linkedin.com/in/correa-julian/";

export const WHATSAPP_URL = (msg = "") =>
  `https://wa.me/${WHATSAPP_NUMBER}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;

export const WHATSAPP_SOPORTE_URL = (msg = "") =>
  `https://wa.me/${WHATSAPP_SOPORTE}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;

export const POPUP_CONFIG = {
  enabled: false,
  imageSrc: "/popups/planes.jpeg",
  alt: "Nuevos precios OriNet Julio 2026",
};
