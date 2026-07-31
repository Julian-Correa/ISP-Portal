import { useState } from "react";

import WhatsAppIcon from "../icons/WhatsAppIcon.jsx";
import OriNetLogo from "../layout/OriNetLogo.jsx";
import { PortalApiError, fetchCustomerSummaryByDNI } from "../../lib/api/portalApi.js";
import { LINKEDIN_URL, WHATSAPP_URL } from "../../lib/config/portalConfig.js";

export default function LoginScreen({ onLogin }) {
  const [dni, setDni] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const cleanDni = dni.trim().replace(/\D/g, "");

    if (cleanDni.length < 7 || cleanDni.length > 8) {
      setError("Ingresá un DNI válido (7 u 8 dígitos, sin puntos ni espacios).");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const summary = await fetchCustomerSummaryByDNI(cleanDni);
      onLogin(summary);
    } catch (requestError) {
      if (requestError instanceof PortalApiError && requestError.status === 400) {
        setError("Ingresa un DNI valido (7 u 8 digitos, sin puntos ni espacios).");
      } else if (requestError instanceof PortalApiError && requestError.status === 404) {
        setError("No encontramos una cuenta asociada a ese DNI. Verifica e intenta nuevamente.");
      } else if (
        requestError instanceof PortalApiError
        && (requestError.status === 504 || requestError.code === "ISP_TIMEOUT")
      ) {
        setError("El sistema de facturacion esta demorando mas de lo normal. Intenta nuevamente en unos minutos.");
      } else {
        setError("No pudimos consultar tu cuenta en este momento. Intenta nuevamente en unos minutos.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #0a0f1e 0%, #0d2240 55%, #0a1a35 100%)",
        fontFamily: "'Outfit', sans-serif",
        padding: "16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ position: "absolute", top: -120, right: -100, width: 500, height: 500, borderRadius: "50%", background: "rgba(0,180,120,0.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 360, height: 360, borderRadius: "50%", background: "rgba(120,50,220,0.07)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "40%", left: "10%", width: 200, height: 200, borderRadius: "50%", background: "rgba(30,100,220,0.05)", pointerEvents: "none" }} />

      <div
        className="login-card"
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 28,
          padding: "48px 40px",
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 40px 100px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 36, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="login-logo-wrap">
            <OriNetLogo size="large" />
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 28 }} />

        <div>
          <label style={{ display: "block", color: "#cbd5e1", fontSize: 12, fontWeight: 700, marginBottom: 8, letterSpacing: "1px", textTransform: "uppercase" }}>
            DNI (sin puntos ni espacios)
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={dni}
            onChange={(event) => {
              setDni(event.target.value.replace(/\D/g, ""));
              setError("");
            }}
            onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
            placeholder="Ej: 26281212"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "rgba(255,255,255,0.06)",
              border: `1.5px solid ${error ? "#f87171" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 14,
              padding: "14px 18px",
              fontSize: 22,
              color: "#f8fafc",
              outline: "none",
              fontFamily: "inherit",
              letterSpacing: "4px",
              transition: "border 0.2s",
            }}
            onFocus={(event) => {
              if (!error) {
                event.target.style.borderColor = "#10b981";
              }
            }}
            onBlur={(event) => {
              if (!error) {
                event.target.style.borderColor = "rgba(255,255,255,0.12)";
              }
            }}
          />
          {error && <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>⚠ {error}</div>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !dni}
            style={{
              width: "100%",
              marginTop: 18,
              padding: "15px",
              background: loading || !dni
                ? "rgba(16,185,129,0.18)"
                : "linear-gradient(135deg, #10b981, #059669)",
              border: "none",
              borderRadius: 14,
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: loading || !dni ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              boxShadow: loading || !dni ? "none" : "0 6px 24px rgba(16,185,129,0.35)",
              transition: "all 0.2s",
            }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTop: "2px solid #fff",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                Consultando...
              </span>
            ) : "Ingresar →"}
          </button>
        </div>

        <div style={{ marginTop: 28, textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", color: "#64748b", fontSize: 12 }}>
            ¿Problemas para ingresar?
          </p>
          <a
            href={WHATSAPP_URL("Hola OriNet, necesito ayuda para acceder al portal de clientes.")}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(37,211,102,0.1)",
              border: "1px solid rgba(37,211,102,0.25)",
              color: "#4ade80",
              borderRadius: 99,
              padding: "9px 20px",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "rgba(37,211,102,0.18)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "rgba(37,211,102,0.1)";
            }}
          >
            <WhatsAppIcon size={16} /> Contactar por WhatsApp
          </a>
          <p style={{ margin: "10px 0px 0px 10px", color: "#64748b", fontSize: 12 }}>
            Desarrollado por{" "}
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#cbd5e1", fontWeight: 700, textDecoration: "none" }}
            >
              Correa Julián
            </a>
            .
          </p>
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
