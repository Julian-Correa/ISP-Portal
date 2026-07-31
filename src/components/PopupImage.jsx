import { useEffect, useState } from "react";

export default function PopupImage({ config }) {
  const [visible, setVisible] = useState(Boolean(config.enabled));

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setVisible(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible]);

  if (!visible || !config.enabled || !config.imageSrc) {
    return null;
  }

  return (
    <div
      role="presentation"
      onClick={() => setVisible(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        background: "rgba(3,7,18,0.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={config.alt || "Aviso"}
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          width: "min(560px, 92vw)",
          maxHeight: "86vh",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "#020617",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        }}
      >
        <button
          type="button"
          aria-label="Cerrar popup"
          onClick={() => setVisible(false)}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1,
            width: 34,
            height: 34,
            borderRadius: 6,
            border: "1px solid rgba(248,113,113,0.7)",
            background: "rgba(2,6,23,0.86)",
            color: "#ef4444",
            fontSize: 26,
            lineHeight: "30px",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Arial, sans-serif",
          }}
        >
          ×
        </button>
        <img
          src={config.imageSrc}
          alt={config.alt || ""}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            maxWidth: "100%",
            maxHeight: "86vh",
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
}
