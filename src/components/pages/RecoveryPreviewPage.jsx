import React from "react";
import AppPage from "./AppPage";
import { previewRecovery, PREVIEW_NO_CHANGE_NOTICE } from "../../backup/recoveryClient";

// ── READ-ONLY RECOVERY PREVIEW (Phase 2) ──
// Used on a FRESH installation: paste a recovery code, verify a server backup
// exists, and view a safe summary. This screen NEVER restores progress, NEVER
// writes localStorage, and has NO Restore button by design. The token is held
// only in the input field and cleared on submit / navigation.
export default function RecoveryPreviewPage({ dark, onBack, available = false }) {
  const [value, setValue] = React.useState("");
  const [status, setStatus] = React.useState("idle"); // idle | working | found | none | error
  const [summary, setSummary] = React.useState(null);

  const text = dark ? "rgba(243,231,200,0.82)" : "#3D2E0A";
  const rule = dark ? "rgba(217,177,95,0.15)" : "rgba(0,0,0,0.08)";

  async function onSubmit() {
    const token = value;
    setStatus("working"); setSummary(null);
    const r = await previewRecovery({ available }, token);
    // Clear the sensitive input immediately after submission.
    setValue("");
    if (r.ok && r.backupFound) { setSummary(r.summary); setStatus("found"); }
    else if (r.ok) { setStatus("none"); }
    else { setStatus("error"); }
  }

  function onCancel() {
    setValue(""); setSummary(null); setStatus("idle");
    onBack && onBack();
  }

  const primaryBtn = {
    width: "100%", padding: "13px 16px", borderRadius: 14, textAlign: "center",
    fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
    background: "linear-gradient(180deg,#E0BD78 0%,#CEAA60 100%)", color: "#0A1020", cursor: "pointer",
  };
  const ghostBtn = {
    width: "100%", padding: "13px 16px", borderRadius: 14, textAlign: "center",
    fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
    background: "transparent", color: dark ? "#E0BD78" : "#8A6A10",
    border: `1px solid ${dark ? "rgba(217,177,95,0.40)" : "rgba(140,100,20,0.35)"}`,
    cursor: "pointer", display: "block", boxSizing: "border-box",
  };

  return (
    <AppPage dark={dark} title="Recovery Preview" subtitle="Check a backup with your recovery code" onBack={onCancel}>
      {!available && (
        <div style={{ fontSize: 13, color: text, lineHeight: 1.7 }}>
          Recovery is not enabled on this version yet.
        </div>
      )}

      {available && (
        <>
          <div style={{ fontSize: 13, color: text, lineHeight: 1.7, marginBottom: 14 }}>
            Paste a recovery code to check whether a server backup exists. This is a <strong>read-only</strong> check —
            it does not change anything on this device.
          </div>

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="AH1.…"
            rows={3}
            style={{
              width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: 13,
              padding: "10px 12px", borderRadius: 12, border: `1px solid ${rule}`,
              background: dark ? "rgba(0,0,0,0.25)" : "#fff", color: dark ? "#F3E7C8" : "#2A2008",
              marginBottom: 14, resize: "vertical",
            }}
          />

          <div className="sbtn" onClick={status === "working" || value.trim() === "" ? undefined : onSubmit}
            style={{ ...primaryBtn, opacity: status === "working" || value.trim() === "" ? 0.6 : 1 }}>
            {status === "working" ? "Checking…" : "Check Backup"}
          </div>

          {status === "found" && summary && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: dark ? "#E0BD78" : "#8A6A10", marginBottom: 10 }}>Backup found ✓</div>
              <SummaryRow dark={dark} label="Last saved" value={summary.localDate || "—"} />
              <SummaryRow dark={dark} label="Revision" value={summary.latestRevision != null ? `#${summary.latestRevision}` : "—"} />
              <SummaryRow dark={dark} label="Freshness" value={ageLabel(summary.snapshotAge)} />
              <div style={{ height: 1, margin: "16px 0", background: rule }} />
              <div style={{ fontSize: 12.5, color: text, lineHeight: 1.6 }}>{PREVIEW_NO_CHANGE_NOTICE}</div>
            </div>
          )}

          {status === "none" && (
            <div style={{ marginTop: 18, fontSize: 13, color: text, lineHeight: 1.7 }}>
              No backup could be found for that recovery code. Please double-check the code and try again.
              {" "}Nothing on this device has changed.
            </div>
          )}

          {status === "error" && (
            <div style={{ marginTop: 18, fontSize: 13, color: text, lineHeight: 1.7 }}>
              Recovery preview is unavailable right now. Nothing on this device has changed — please try again later.
            </div>
          )}

          <div className="sbtn" onClick={onCancel} style={{ ...ghostBtn, marginTop: 18 }}>Cancel</div>
        </>
      )}
    </AppPage>
  );
}

function SummaryRow({ dark, label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13,
      color: dark ? "rgba(243,231,200,0.82)" : "#3D2E0A" }}>
      <span style={{ opacity: 0.75 }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function ageLabel(age) {
  switch (age) {
    case "recent": return "Within a week";
    case "this-month": return "Within a month";
    case "months": return "A few months old";
    case "old": return "Over 6 months old";
    default: return "—";
  }
}
