import { useState } from "react";

import { PortalApiError, updateCustomerEmail } from "../../lib/api/portalApi.js";

export default function EmailCard({ customer, onUpdateCustomer }) {
  const existingEmail = customer.contact_emails?.[0]?.email || "";
  const isEditing = Boolean(existingEmail);

  const [email, setEmail] = useState(existingEmail);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const validate = (value) => {
    if (!value.trim()) return "Ingresá un email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "El email no es válido.";
    return null;
  };

  const handleSave = async () => {
    const validationError = validate(email);

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setErrorMsg("");
    setStatus("saving");

    try {
      const updatedCustomer = await updateCustomerEmail(customer, email.trim());
      setStatus("ok");
      onUpdateCustomer(updatedCustomer);
      setTimeout(() => setStatus(null), 3500);
    } catch (requestError) {
      setStatus("error");

      if (requestError instanceof PortalApiError && requestError.status === 400) {
        setErrorMsg("El email no es valido.");
        return;
      }

      if (requestError instanceof PortalApiError && requestError.code === "NETWORK_ERROR") {
        setErrorMsg("No pudimos conectar con el portal. Revisá tu internet e intentá nuevamente.");
        return;
      }

      setErrorMsg("No se pudo guardar el email. Intentá de nuevo en unos minutos.");
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.04))",
        border: "1px solid rgba(99,102,241,0.22)",
        borderRadius: 20,
        padding: "22px 24px",
        marginBottom: 14,
        animation: "fadeUp 0.5s ease 0.28s both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            flexShrink: 0,
            background: "rgba(99,102,241,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <div>
          <p style={{ margin: 0, color: "#c7d2fe", fontWeight: 700, fontSize: 15 }}>
            📧 {isEditing ? "Editar email de facturación" : "Recibí tu factura por email"}
          </p>
          <p style={{ margin: "3px 0 0", color: "#cbd5e1", fontSize: 12, lineHeight: 1.5 }}>
            {isEditing
              ? `Email actual: ${existingEmail}`
              : "Registrá tu mail y te la enviamos todos los meses automáticamente."}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setErrorMsg("");
            setStatus(null);
          }}
          onKeyDown={(event) => event.key === "Enter" && handleSave()}
          placeholder="tucorreo@ejemplo.com"
          style={{
            flex: 1,
            minWidth: 200,
            boxSizing: "border-box",
            background: "rgba(255,255,255,0.06)",
            border: `1.5px solid ${errorMsg ? "#f87171" : status === "ok" ? "#10b981" : "rgba(99,102,241,0.3)"}`,
            borderRadius: 11,
            padding: "11px 16px",
            fontSize: 14,
            color: "#f8fafc",
            outline: "none",
            fontFamily: "inherit",
            transition: "border 0.2s",
          }}
          onFocus={(event) => {
            if (!errorMsg) {
              event.target.style.borderColor = "#818cf8";
            }
          }}
          onBlur={(event) => {
            if (!errorMsg && status !== "ok") {
              event.target.style.borderColor = "rgba(99,102,241,0.3)";
            }
          }}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          style={{
            flexShrink: 0,
            background: status === "ok"
              ? "linear-gradient(135deg, #10b981, #059669)"
              : "linear-gradient(135deg, #6366f1, #4f46e5)",
            border: "none",
            borderRadius: 11,
            padding: "11px 20px",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: status === "saving" ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: status === "ok" ? "0 4px 16px rgba(16,185,129,0.3)" : "0 4px 16px rgba(99,102,241,0.3)",
            opacity: status === "saving" ? 0.7 : 1,
          }}
        >
          {status === "saving" ? (
            <>
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid #fff",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              Guardando...
            </>
          ) : status === "ok" ? "✓ Guardado" : "Guardar"}
        </button>
      </div>

      {errorMsg && (
        <p style={{ margin: "8px 0 0", color: "#fca5a5", fontSize: 12 }}>⚠ {errorMsg}</p>
      )}
      {status === "ok" && (
        <p style={{ margin: "8px 0 0", color: "#6ee7b7", fontSize: 12 }}>
          ✓ Tu email fue registrado correctamente. A partir del próximo período te llegará la factura.
        </p>
      )}
      {status === "error" && !errorMsg && (
        <p style={{ margin: "8px 0 0", color: "#fca5a5", fontSize: 12 }}>⚠ No se pudo guardar. Intentá de nuevo.</p>
      )}
    </div>
  );
}
