import { useState, useEffect } from "react";

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 600);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 600);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
const CUT_DAY = 26; // fecha de corte fija

function getServiceStatus(status) {
  const s = (status || "").toLowerCase();
  if (["active", "activo", "enabled"].includes(s))
    return { label: "Activo",       color: "#10b981", bg: "rgba(16,185,129,0.12)" };
  if (["blocked", "bloqueado", "block", "suspended", "suspendido", "disabled"].includes(s))
    return { label: "Suspendido",   color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
  if (["no_service"].includes(s))
    return { label: "Sin servicio", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
  return   { label: status || "—",  color: "#64748b", bg: "rgba(100,116,139,0.12)" };
}

function getCutoffDate() {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), CUT_DAY);
  if (now >= target) target.setMonth(target.getMonth() + 1);
  return target.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

// ─── CONFIGURACIÓN GENERAL ─────────────────────────────────────────────────
const WHATSAPP_NUMBER = "541130921454";
const WHATSAPP_URL = (msg = "") =>
  `https://wa.me/${WHATSAPP_NUMBER}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;

// ─── CONFIGURACIÓN DE API ──────────────────────────────────────────────────
// ─── CONFIGURACIÓN DE API ──────────────────────────────────────────────────
const API_BASE   = "https://online25.ispcube.com/api";
const API_KEY    = "a126ac03-e7e0-46c6-8d20-0710ad5fd627";
const CLIENT_ID  = "302";
const API_USER   = "apinew";
const API_PASS   = "G)exba87wTJc{=8VV.h#4Ef]";

// Token en memoria — se reutiliza durante la sesión
let cachedToken = null;

async function getToken() {
  if (cachedToken) return cachedToken;

  const res = await fetch(`${API_BASE}/sanctum/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept":       "application/json",
      "api-key":      API_KEY,
      "client-id":    CLIENT_ID,
      "login-type":   "api",
    },
    body: JSON.stringify({ username: API_USER, password: API_PASS }),
  });

  if (!res.ok) throw new Error(`Error de autenticación con la API (${res.status})`);
  const data = await res.json();
  // ISPCube devuelve { token: "..." } o { access_token: "..." }
  cachedToken = data.token || data.access_token;
  if (!cachedToken) throw new Error("No se recibió token de la API");
  return cachedToken;
}

async function fetchCustomerByDNI(dni) {
  let token;
  try {
    token = await getToken();
  } catch (err) {
    console.error("Error obteniendo token:", err);
    throw new Error("No se pudo conectar con el servidor. Contactá a soporte.");
  }

  let response;
  try {
    response = await fetch(
      `${API_BASE}/customer?doc_number=${dni}&deleted=false&temporary=false`,
      {
        method: "GET",
        headers: {
          "Content-Type":  "application/json",
          "Accept":        "application/json",
          "api-key":       API_KEY,
          "client-id":     CLIENT_ID,
          "login-type":    "api",
          "username":      API_USER,
          "Authorization": `Bearer ${token}`,
        },
      }
    );
  } catch (networkErr) {
    console.error("Error de red:", networkErr);
    throw new Error("No se pudo conectar con el servidor. Verificá tu conexión.");
  }

  // Si el token expiró, limpiamos caché y tiramos error claro
  if (response.status === 401) {
    cachedToken = null;
    throw new Error("Sesión expirada. Recargá la página e intentá de nuevo.");
  }
  if (response.status === 404) throw new Error("DNI no encontrado");
  if (!response.ok) throw new Error(`Error del servidor (${response.status}). Intentá más tarde.`);

  let data;
  try { data = await response.json(); } catch {
    throw new Error("La respuesta del servidor no es válida.");
  }

  if (Array.isArray(data)) {
    if (data.length === 0) throw new Error("No encontramos una cuenta asociada a ese DNI.");
    return data[0];
  }
  if (!data || !data.id) throw new Error("No encontramos una cuenta asociada a ese DNI.");
  return data;
}

// Trae la última factura del cliente usando el endpoint real de ISPCube
async function fetchLastInvoiceUrl(customer) {
  const token = await getToken();
  const headers = {
    "Content-Type":  "application/json",
    "Accept":        "application/json",
    "api-key":       API_KEY,
    "client-id":     CLIENT_ID,
    "login-type":    "api",
    "username":      API_USER,
    "Authorization": `Bearer ${token}`,
  };

  // Sin filtro de tipo — traemos cualquier factura del cliente
  const params = new URLSearchParams({
    customer_id:  customer.id,
    monthly_bill: "true",
    canceled:     "false",
  });

  const url = `${API_BASE}/bills/last_bill_api?${params}`;
  const res = await fetch(url, { method: "GET", headers });

  if (!res.ok) {
    const errText = await res.text();
    console.warn("Error factura:", res.status, errText);
    return null;
  }

  // ISPCube devuelve la URL directamente como texto plano (no JSON)
  const text = await res.text();
  console.log("Respuesta factura (raw):", text);

  // Si es una URL directa
  const trimmed = text.trim().replace(/^["'\[\{]+|["'\]\}]+$/g, "");
  if (trimmed.startsWith("http")) return trimmed;

  // Intentar parsear como JSON por si acaso
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      if (typeof item === "string") return item;
      const values = Object.values(item);
      if (values.length > 0 && typeof values[0] === "string") return values[0];
      const keys = Object.keys(item);
      if (keys.length > 0 && keys[0].startsWith("http")) return keys[0];
    }
    if (data && typeof data === "object") {
      return data.url || data.pdf_url || data.link || null;
    }
  } catch { /* no era JSON, ya manejado arriba */ }

  return null;
}

const formatMoney = (val) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(parseFloat(val) || 0);

const formatName = (name) =>
  name?.split(" ").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ") || "";

// ─── LOGO SVG ORINET ──────────────────────────────────────────────────────
function OriNetLogo({ size = "large" }) {
  const isLarge = size === "large";

  // Versión grande: login — Versión pequeña: header
  const fontSize   = isLarge ? 56 : 30;
  const tagSize    = 13;
  const width      = isLarge ? 220 : 118;
  const textY      = isLarge ? 58 : 32;

  return (
    <svg
      width={width}
      height={isLarge ? textY + (isLarge ? 28 : 0) : textY + 4}
      viewBox={`0 0 ${width} ${isLarge ? textY + 28 : textY + 4}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#a855f7" />
          <stop offset="20%"  stopColor="#ec4899" />
          <stop offset="42%"  stopColor="#f97316" />
          <stop offset="60%"  stopColor="#eab308" />
          <stop offset="82%"  stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="tagGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <filter id="textGlow" x="-5%" y="-20%" width="110%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Texto "OriNet" centrado con gradiente */}
      <text
        x={width / 2}
        y={textY}
        textAnchor="middle"
        fontFamily="'Outfit', 'Segoe UI', sans-serif"
        fontSize={fontSize}
        fontWeight="800"
        fill="url(#textGrad)"
        filter="url(#textGlow)"
        letterSpacing="-1"
      >
        OriNet
      </text>

      {/* Tagline solo en versión grande */}
      {isLarge && (
        <text
          x={width / 2}
          y={textY + 22}
          textAnchor="middle"
          fontFamily="'Outfit', 'Segoe UI', sans-serif"
          fontSize={tagSize}
          fontWeight="400"
          fill="url(#tagGrad)"
          letterSpacing="1"
        >
          Tu Servicio de Internet
        </text>
      )}
    </svg>
  );
}

// ─── ICONOS ────────────────────────────────────────────────────────────────
function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

function WhatsAppIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.882l6.206-1.448A11.934 11.934 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.032-1.384l-.36-.214-3.733.871.942-3.648-.235-.374A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
    </svg>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [dni, setDni] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const clean = dni.trim().replace(/\D/g, "");
    if (clean.length < 7 || clean.length > 8) {
      setError("Ingresá un DNI válido (7 u 8 dígitos, sin puntos ni espacios).");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const customer = await fetchCustomerByDNI(clean);
      onLogin(customer);
    } catch {
      setError("No encontramos una cuenta asociada a ese DNI. Verificá e intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #0a0f1e 0%, #0d2240 55%, #0a1a35 100%)",
      fontFamily: "'Outfit', sans-serif", padding: "16px",
      position: "relative", overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Ambient blobs */}
      <div style={{ position: "absolute", top: -120, right: -100, width: 500, height: 500, borderRadius: "50%", background: "rgba(0,180,120,0.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 360, height: 360, borderRadius: "50%", background: "rgba(120,50,220,0.07)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "40%", left: "10%", width: 200, height: 200, borderRadius: "50%", background: "rgba(30,100,220,0.05)", pointerEvents: "none" }} />

      <div className="login-card" style={{
        background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.09)", borderRadius: 28,
        padding: "48px 40px", width: "100%", maxWidth: 440,
        boxShadow: "0 40px 100px rgba(0,0,0,0.55)",
      }}>
        {/* Logo centrado */}
        <div style={{ textAlign: "center", marginBottom: 36, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="login-logo-wrap">
            <OriNetLogo size="large" />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 28 }} />

        <div>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 700, marginBottom: 8, letterSpacing: "1px", textTransform: "uppercase" }}>
            DNI (sin puntos ni espacios)
          </label>
          <input
            type="text" inputMode="numeric" maxLength={8}
            value={dni}
            onChange={e => { setDni(e.target.value.replace(/\D/g, "")); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Ej: 26281212"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.06)",
              border: `1.5px solid ${error ? "#f87171" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 14, padding: "14px 18px", fontSize: 22,
              color: "#f8fafc", outline: "none", fontFamily: "inherit",
              letterSpacing: "4px", transition: "border 0.2s",
            }}
            onFocus={e => !error && (e.target.style.borderColor = "#10b981")}
            onBlur={e => !error && (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
          />
          {error && <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>⚠ {error}</div>}

          <button
            onClick={handleSubmit} disabled={loading || !dni}
            style={{
              width: "100%", marginTop: 18, padding: "15px",
              background: loading || !dni
                ? "rgba(16,185,129,0.18)"
                : "linear-gradient(135deg, #10b981, #059669)",
              border: "none", borderRadius: 14, color: "#fff",
              fontSize: 16, fontWeight: 700, cursor: loading || !dni ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              boxShadow: loading || !dni ? "none" : "0 6px 24px rgba(16,185,129,0.35)",
              transition: "all 0.2s",
            }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span style={{
                  width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid #fff", borderRadius: "50%",
                  display: "inline-block", animation: "spin 0.7s linear infinite",
                }} />
                Consultando...
              </span>
            ) : "Ingresar →"}
          </button>
        </div>

        <div style={{ marginTop: 28, textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", color: "#334155", fontSize: 12 }}>
            ¿Problemas para ingresar?
          </p>
          <a
            href={WHATSAPP_URL("Hola OriNet, necesito ayuda para acceder al portal de clientes.")}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.25)",
              color: "#4ade80", borderRadius: 99, padding: "9px 20px",
              fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: "inherit",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(37,211,102,0.18)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(37,211,102,0.1)"}
          >
            <WhatsAppIcon size={16} /> Contactar por WhatsApp
          </a>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 480px) {
          .login-card { padding: 28px 20px !important; border-radius: 20px !important; }
          .login-logo-wrap svg { width: 240px !important; height: auto !important; }
        }
      `}</style>
    </div>
  );
}

// ─── PERFIL ────────────────────────────────────────────────────────────────
function ProfileScreen({ customer, onLogout }) {
  const [copied, setCopied] = useState(null);
  const [invoiceUrl, setInvoiceUrl]   = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(true);

  const debt = parseFloat(customer.debt) || 0;
  const dueDebt = parseFloat(customer.duedebt) || 0;
  const hasDebt = debt > 0;

  // Cargar URL de la última factura al montar
  useEffect(() => {
    fetchLastInvoiceUrl(customer)
      .then(url => setInvoiceUrl(url))
      .catch(err => { console.warn("Factura no disponible:", err); setInvoiceUrl(null); })
      .finally(() => setInvoiceLoading(false));
  }, [customer.id]);

  const debtColor = !hasDebt ? "#10b981" : debt > 5000 ? "#ef4444" : "#f59e0b";
  const debtBg    = !hasDebt ? "rgba(16,185,129,0.12)" : debt > 5000 ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)";

  const wpPaymentMsg = `Hola OriNet! Soy ${formatName(customer.name)}, DNI ${customer.doc_number}, código de cliente ${customer.code}. Les envío el comprobante de pago.`;
  const wpHelpMsg    = `Hola OriNet! Soy ${formatName(customer.name)}, DNI ${customer.doc_number}. Necesito ayuda con mi cuenta.`;

  // CBU desde la API + alias fijo
  const cbuList = customer.customer_cbu || [];
  const cbu     = cbuList[0]?.cbu || cbuList[0]?.number || null;
  const ALIAS   = "orinet.isp.internet";

  // Estado del servicio
  const svcStatus = getServiceStatus(customer.status);
  const cutoffDate = getCutoffDate();

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a0f1e 0%, #0d2240 55%, #0a1a35 100%)",
      fontFamily: "'Outfit', sans-serif", paddingBottom: 60,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <OriNetLogo size="small" />
        <button onClick={onLogout} style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, padding: "8px 14px", color: "#64748b",
          fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
          transition: "all 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#f8fafc"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#64748b"; }}
        >
          <LogoutIcon /> Cerrar sesión
        </button>
      </div>

      <div className="profile-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 28px 60px" }}>

        {/* Saludo */}
        <div style={{ marginBottom: 28, animation: "fadeUp 0.4s ease" }}>
          <p style={{ margin: "0 0 2px", color: "#475569", fontSize: 14 }}>Bienvenido/a,</p>
          <h2 style={{ margin: 0, color: "#f8fafc", fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px" }}>
            {formatName(customer.name)}
          </h2>
          <p style={{ margin: "6px 0 0", color: "#334155", fontSize: 13 }}>
            DNI {customer.doc_number} · {customer.city?.name}, {customer.city?.province}
          </p>
        </div>

        {/* ── GRID DOS COLUMNAS EN PC ── */}
        <div className="profile-grid">

          {/* COLUMNA IZQUIERDA */}
          <div className="profile-col">

            {/* ── DEUDA ── */}
            <div style={{
              background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)",
              border: `1px solid ${debtColor}40`, borderRadius: 24,
              padding: "36px 28px", marginBottom: 14, textAlign: "center",
              boxShadow: `0 0 60px ${debtColor}15`,
              animation: "fadeUp 0.5s ease 0.1s both",
            }}>
              <p style={{ margin: "0 0 10px", color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase" }}>
                Saldo a abonar
              </p>
              <div className="debt-amount" style={{
                fontSize: 68, fontWeight: 800, color: debtColor,
                letterSpacing: "-3px", lineHeight: 1,
                textShadow: `0 0 40px ${debtColor}40`,
              }}>
                {formatMoney(debt)}
              </div>
              <div style={{
                display: "inline-block", marginTop: 14,
                background: debtBg, color: debtColor,
                borderRadius: 99, padding: "6px 20px", fontSize: 13, fontWeight: 600,
              }}>
                {!hasDebt ? "✓ ¡Estás al día! Sin deuda pendiente." : "⚠ Tenés un saldo pendiente de pago."}
              </div>
              {dueDebt > 0 && (
                <div style={{
                  marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.07)",
                  display: "flex", justifyContent: "center", gap: 10, alignItems: "center",
                }}>
                  <span style={{ color: "#475569", fontSize: 14 }}>Del cual, deuda vencida:</span>
                  <span style={{ color: "#f87171", fontWeight: 800, fontSize: 16 }}>{formatMoney(dueDebt)}</span>
                </div>
              )}
            </div>

            {/* ── AVISO COMPROBANTE ── */}
            {hasDebt && (
              <div style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))",
                border: "1.5px solid rgba(16,185,129,0.3)",
                borderRadius: 20, padding: "22px", marginBottom: 14,
                animation: "fadeUp 0.5s ease 0.15s both",
              }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                    background: "rgba(16,185,129,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981",
                  }}>
                    <WhatsAppIcon size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 5px", color: "#10b981", fontWeight: 800, fontSize: 15 }}>
                      ⚠️ Una vez pagado, enviá el comprobante
                    </p>
                    <p style={{ margin: "0 0 14px", color: "#6ee7b7", fontSize: 13, lineHeight: 1.6 }}>
                      Después de realizar el pago, <strong>enviá el comprobante a administración por WhatsApp</strong> para que podamos acreditarlo a la brevedad.
                    </p>
                    <a
                      href={WHATSAPP_URL(wpPaymentMsg)}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 9,
                        background: "linear-gradient(135deg, #25d366, #128c7e)",
                        color: "#fff", borderRadius: 11, padding: "11px 20px",
                        fontWeight: 700, fontSize: 14, textDecoration: "none", fontFamily: "inherit",
                        boxShadow: "0 4px 16px rgba(37,211,102,0.3)", transition: "opacity 0.2s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      <WhatsAppIcon size={18} /> Enviar comprobante de pago
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* ── ESTADO DEL SERVICIO ── */}
            <div className="status-card" style={{
              background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)",
              border: `1px solid ${svcStatus.color}30`, borderRadius: 20,
              padding: "20px 24px", marginBottom: 14,
              animation: "fadeUp 0.5s ease 0.18s both",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14,
            }}>
              <div>
                <p style={{ margin: "0 0 4px", color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
                  Estado del servicio
                </p>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: svcStatus.bg, color: svcStatus.color,
                  borderRadius: 99, padding: "5px 14px", fontSize: 14, fontWeight: 700,
                }}>
                  <span style={{ fontSize: 10 }}>●</span> {svcStatus.label}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: "0 0 2px", color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                  Próxima fecha de corte
                </p>
                <p style={{ margin: 0, color: "#cbd5e1", fontSize: 14, fontWeight: 600 }}>
                  📅 {cutoffDate}
                </p>
              </div>
            </div>

          </div>{/* fin columna izquierda */}

          {/* COLUMNA DERECHA */}
          <div className="profile-col">

            {/* ── CBU / ALIAS ── */}
            <div style={{
              background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20,
              padding: "20px 24px", marginBottom: 14,
              animation: "fadeUp 0.5s ease 0.22s both",
            }}>
              <p style={{ margin: "0 0 14px", color: "#f8fafc", fontWeight: 700, fontSize: 15 }}>
                💳 Datos para el pago
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cbu && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <span style={{ color: "#475569", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>CBU</span>
                      <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: 13, fontFamily: "monospace", letterSpacing: "1px" }}>{cbu}</p>
                    </div>
                    <button onClick={() => handleCopy(cbu, "cbu")} style={{
                      display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
                      background: copied === "cbu" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.07)",
                      border: `1px solid ${copied === "cbu" ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.12)"}`,
                      color: copied === "cbu" ? "#10b981" : "#94a3b8",
                      borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                    }}>
                      {copied === "cbu" ? "✓ Copiado" : "📋 Copiar CBU"}
                    </button>
                  </div>
                )}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
                  paddingTop: cbu ? "10px" : 0, borderTop: cbu ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}>
                  <div>
                    <span style={{ color: "#475569", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Alias</span>
                    <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: 13, fontFamily: "monospace", letterSpacing: "1px" }}>{ALIAS}</p>
                  </div>
                  <button onClick={() => handleCopy(ALIAS, "alias")} style={{
                    display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
                    background: copied === "alias" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.07)",
                    border: `1px solid ${copied === "alias" ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.12)"}`,
                    color: copied === "alias" ? "#10b981" : "#94a3b8",
                    borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                  }}>
                    {copied === "alias" ? "✓ Copiado" : "📋 Copiar alias"}
                  </button>
                </div>
              </div>
            </div>

            {/* ── FACTURA ── */}
            <div style={{
              background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20,
              padding: "22px 24px", marginBottom: 14,
              animation: "fadeUp 0.5s ease 0.2s both",
            }}>
              <p style={{ margin: "0 0 3px", color: "#f8fafc", fontWeight: 700, fontSize: 15 }}>📄 Última factura</p>
              <p style={{ margin: "0 0 14px", color: "#334155", fontSize: 13 }}>Nº de cliente: {customer.code}</p>
              {invoiceLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569", fontSize: 14 }}>
                  <span style={{
                    width: 16, height: 16, border: "2px solid rgba(255,255,255,0.15)",
                    borderTop: "2px solid #6366f1", borderRadius: "50%",
                    display: "inline-block", animation: "spin 0.7s linear infinite", flexShrink: 0,
                  }} />
                  Buscando factura...
                </div>
              ) : invoiceUrl ? (
                <a
                  href={invoiceUrl} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                    color: "#fff", borderRadius: 12, padding: "13px 24px",
                    fontWeight: 700, fontSize: 15, textDecoration: "none", fontFamily: "inherit",
                    boxShadow: "0 6px 20px rgba(99,102,241,0.25)", transition: "opacity 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <DownloadIcon /> Descargar factura (PDF)
                </a>
              ) : (
                <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>
                  No hay facturas disponibles por el momento.
                </p>
              )}
            </div>

            {/* ── DATOS ── */}
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16, padding: "18px 22px", marginBottom: 14,
              animation: "fadeUp 0.5s ease 0.3s both",
            }}>
              <p style={{ margin: "0 0 12px", color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
                Datos de la cuenta
              </p>
              {[
                { label: "Domicilio", value: customer.address },
                { label: "Localidad", value: `${customer.city?.name}, ${customer.city?.province}` },
                customer.phones?.[0] && { label: "Teléfono", value: customer.phones[0].number },
                { label: "Código de cliente", value: customer.code, highlight: true },
              ].filter(Boolean).map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: "#475569", fontSize: 14 }}>{row.label}</span>
                  <span style={{ color: row.highlight ? "#10b981" : "#94a3b8", fontSize: 14, fontWeight: row.highlight ? 700 : 500 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* ── CONTACTO ADMIN ── */}
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16, padding: "18px 22px",
              animation: "fadeUp 0.5s ease 0.35s both",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14,
            }}>
              <div>
                <p style={{ margin: "0 0 2px", color: "#cbd5e1", fontWeight: 600, fontSize: 14 }}>¿Necesitás ayuda?</p>
                <p style={{ margin: 0, color: "#334155", fontSize: 13 }}>Contactá a administración OriNet</p>
              </div>
              <a
                href={WHATSAPP_URL(wpHelpMsg)}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "rgba(37,211,102,0.09)", border: "1px solid rgba(37,211,102,0.22)",
                  color: "#4ade80", borderRadius: 10, padding: "10px 18px",
                  fontSize: 14, fontWeight: 600, textDecoration: "none", fontFamily: "inherit",
                  whiteSpace: "nowrap", transition: "all 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(37,211,102,0.16)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(37,211,102,0.09)"}
              >
                <WhatsAppIcon size={17} /> Escribir por WhatsApp
              </a>
            </div>

          </div>{/* fin columna derecha */}
        </div>{/* fin grid */}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .profile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          align-items: start;
        }
        .profile-col {
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 700px) {
          .profile-grid { grid-template-columns: 1fr; }
          .profile-content { padding: 20px 14px 40px !important; }
          .debt-amount { font-size: 44px !important; letter-spacing: -1px !important; }
          .status-card { flex-direction: column !important; align-items: flex-start !important; }
          .status-card > div:last-child { text-align: left !important; }
        }
      `}</style>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [customer, setCustomer] = useState(null);
  return customer
    ? <ProfileScreen customer={customer} onLogout={() => setCustomer(null)} />
    : <LoginScreen onLogin={setCustomer} />;
}
