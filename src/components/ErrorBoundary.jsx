import React from "react";

// ── TOP-LEVEL ERROR BOUNDARY (offline reliability) ──
//
// The systemic backstop the audit found missing: before this, any uncaught throw
// in any effect — e.g. a corrupt/oversized localStorage key parsed without a
// guard — would blank the entire React tree on every launch, offline, with no
// way out. This boundary catches such a throw and renders a calm, NETWORK-FREE
// fallback with a reload action, so a single bad key can never brick the PWA.
// It intentionally shows no technical detail and logs only a short, non-sensitive
// message (never a payload, secret, or progress value).
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // Short, non-sensitive breadcrumb only.
    try {
      console.error("[app] render error:", error?.message || "error");
    } catch {
      /* no-op */
    }
  }

  handleReload = () => {
    try {
      window.location.reload();
    } catch {
      /* nothing safer to do */
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
          background: "#060A07",
          color: "#F3E7C8",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700 }}>Rihlat Al-Hifz</div>
        <div style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 320, opacity: 0.85 }}>
          Something went wrong loading the app on this device. Your memorization
          progress is saved locally and has not been lost.
        </div>
        <button
          onClick={this.handleReload}
          style={{
            padding: "12px 22px",
            borderRadius: 14,
            border: "none",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: ".04em",
            textTransform: "uppercase",
            background: "linear-gradient(180deg,#E0BD78 0%,#CEAA60 100%)",
            color: "#0A1020",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
