import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  render() {
    if (this.state.crashed) {
      return (
        <div
          style={{
            minHeight: "100vh",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(160deg, #0a0f1e 0%, #0d2240 55%, #0a1a35 100%)",
            fontFamily: "'Outfit', sans-serif",
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 40, margin: "0 0 16px" }}>⚠️</p>
          <p style={{ color: "#f8fafc", fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
            Ocurrió un error inesperado
          </p>
          <p style={{ color: "#cbd5e1", fontSize: 14, margin: "0 0 28px" }}>
            Por favor recargá la página para continuar.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              border: "none",
              borderRadius: 12,
              padding: "13px 28px",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
