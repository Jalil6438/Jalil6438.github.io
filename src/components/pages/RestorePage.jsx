import React from "react";
import AppPage from "./AppPage";
import {
  prepareRestore,
  executeRestore,
  applyRestoredSnapshot,
  classifyConflict,
  conflictNeedsStrongerConfirm,
  conflictIsUnnecessary,
  localProgressInfo,
  CONFLICT,
  RESTORE_REPLACE_WARNING,
  RESTORE_NOT_SYNC_NOTICE,
  RESTORE_PRIVATE_NOTICE,
  RESTORE_STRONGER_WARNING,
} from "../../backup/restoreClient";

// ── CONTROLLED RESTORE (Phase 3) ──
// Two explicit steps on a FRESH installation:
//   1. Prepare — paste the recovery code, verify a backup exists, and mint a
//      short-lived single-use authorization. Shows a sanitized comparison and the
//      replacement warning; the conflict is classified from the preview (no auth
//      is consumed here).
//   2. Restore — only after an explicit confirmation checkbox (and a STRONGER
//      acknowledgement when local progress may be newer / incomparable) does the
//      client execute + atomically apply, with a pre-restore backup and rollback.
// This screen is never shown during a memorization session, has no auto-restore,
// and never persists the recovery token or the authorization.
export default function RestorePage({ dark, onBack, available = false }) {
  const [step, setStep] = React.useState("input"); // input | review | working | done | error
  const [value, setValue] = React.useState("");
  const [preview, setPreview] = React.useState(null);
  const [authorization, setAuthorization] = React.useState(null);
  const [conflict, setConflict] = React.useState(null);
  const [confirmReplace, setConfirmReplace] = React.useState(false);
  const [ackConflict, setAckConflict] = React.useState(false);
  const [receipt, setReceipt] = React.useState(null);
  const [failure, setFailure] = React.useState(null);

  const text = dark ? "rgba(243,231,200,0.82)" : "#3D2E0A";
  const rule = dark ? "rgba(217,177,95,0.15)" : "rgba(0,0,0,0.08)";

  const needsStronger = conflict ? conflictNeedsStrongerConfirm(conflict) : false;
  const unnecessary = conflict ? conflictIsUnnecessary(conflict) : false;

  function reset() {
    setValue(""); setPreview(null); setAuthorization(null); setConflict(null);
    setConfirmReplace(false); setAckConflict(false); setReceipt(null); setFailure(null);
    setStep("input");
  }
  function onCancel() { reset(); onBack && onBack(); }

  async function onPrepare() {
    const token = value;
    setStep("working"); setFailure(null);
    const r = await prepareRestore({ available }, token);
    setValue(""); // clear the sensitive input immediately
    if (r.ok && r.backupFound) {
      const c = classifyConflict(
        localProgressInfo(typeof localStorage !== "undefined" ? localStorage : { getItem: () => null }),
        { revision: r.preview?.latestRevision ?? null, savedAt: r.preview?.savedAt ?? null }
      );
      setPreview(r.preview); setAuthorization(r.authorization); setConflict(c);
      setConfirmReplace(false); setAckConflict(false); setStep("review");
    } else if (r.ok) {
      setFailure("no-backup"); setStep("error");
    } else {
      setFailure(r.error || "prepare-failed"); setStep("error");
    }
  }

  async function onRestore() {
    if (!authorization) { setFailure("expired"); setStep("error"); return; }
    setStep("working"); setFailure(null);
    const ex = await executeRestore({ available }, authorization);
    // The authorization is single-use — drop it from memory whatever happens.
    setAuthorization(null);
    if (!ex.ok) { setFailure(ex.error || "execute-failed"); setStep("error"); return; }
    const applied = applyRestoredSnapshot({}, ex.snapshot, {
      confirmed: true,
      acknowledgeConflict: ackConflict || !needsStronger,
    });
    if (applied.ok) { setReceipt(applied.receipt); setStep("done"); }
    else if (applied.needsConfirmation) { setFailure("confirm-required"); setStep("error"); }
    else { setFailure(applied.error || "apply-failed"); setStep("error"); }
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
  const canRestore = confirmReplace && (!needsStronger || ackConflict);

  return (
    <AppPage dark={dark} title="Restore Backup" subtitle="Replace this device's progress from a backup" onBack={onCancel}>
      {!available && (
        <div style={{ fontSize: 13, color: text, lineHeight: 1.7 }}>
          Restore is not enabled on this version yet. Your local progress is unaffected.
        </div>
      )}

      {available && step === "input" && (
        <>
          <div style={{ fontSize: 13, color: text, lineHeight: 1.7, marginBottom: 14 }}>
            Paste your recovery code to prepare a restore. This first step is a <strong>read-only</strong> check —
            nothing on this device changes until you confirm the restore on the next screen.
          </div>
          <textarea
            value={value} onChange={(e) => setValue(e.target.value)} placeholder="AH1.…" rows={3}
            style={{
              width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: 13,
              padding: "10px 12px", borderRadius: 12, border: `1px solid ${rule}`,
              background: dark ? "rgba(0,0,0,0.25)" : "#fff", color: dark ? "#F3E7C8" : "#2A2008",
              marginBottom: 14, resize: "vertical",
            }}
          />
          <div className="sbtn" onClick={value.trim() === "" ? undefined : onPrepare}
            style={{ ...primaryBtn, opacity: value.trim() === "" ? 0.6 : 1 }}>
            Prepare Restore
          </div>
          <div style={{ fontSize: 12.5, color: text, lineHeight: 1.6, marginTop: 14 }}>{RESTORE_PRIVATE_NOTICE}</div>
          <div className="sbtn" onClick={onCancel} style={{ ...ghostBtn, marginTop: 18 }}>Cancel</div>
        </>
      )}

      {available && step === "working" && (
        <div style={{ fontSize: 13, color: text, lineHeight: 1.7 }}>Working…</div>
      )}

      {available && step === "review" && preview && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: dark ? "#E0BD78" : "#8A6A10", marginBottom: 10 }}>Backup found ✓</div>
          <SummaryRow dark={dark} label="Backup date" value={preview.localDate || "—"} />
          <SummaryRow dark={dark} label="Backup revision" value={preview.latestRevision != null ? `#${preview.latestRevision}` : "—"} />
          <SummaryRow dark={dark} label="Freshness" value={ageLabel(preview.snapshotAge)} />
          <SummaryRow dark={dark} label="Comparison" value={conflictLabel(conflict)} />
          <div style={{ height: 1, margin: "16px 0", background: rule }} />

          {unnecessary && (
            <div style={{ fontSize: 12.5, color: text, lineHeight: 1.6, marginBottom: 12 }}>
              This backup appears to match the progress already on this device. Restoring is not usually necessary.
            </div>
          )}

          <div style={{ fontSize: 12.5, color: dark ? "#E7C98A" : "#8A6A10", lineHeight: 1.6, fontWeight: 600, marginBottom: 10 }}>
            ⚠ {RESTORE_REPLACE_WARNING}
          </div>
          <div style={{ fontSize: 12.5, color: text, lineHeight: 1.6, marginBottom: 4 }}>{RESTORE_NOT_SYNC_NOTICE}</div>
          <div style={{ fontSize: 12.5, color: text, lineHeight: 1.6, marginBottom: 14 }}>{RESTORE_PRIVATE_NOTICE}</div>

          {needsStronger && (
            <div style={{
              fontSize: 12.5, color: dark ? "#F0B8B8" : "#8A2020", lineHeight: 1.6, fontWeight: 600,
              padding: "10px 12px", borderRadius: 10, marginBottom: 12,
              border: `1px solid ${dark ? "rgba(240,120,120,0.35)" : "rgba(160,40,40,0.30)"}`,
            }}>
              ⚠ {RESTORE_STRONGER_WARNING}
            </div>
          )}

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5, color: text, lineHeight: 1.5, marginBottom: needsStronger ? 10 : 16, cursor: "pointer" }}>
            <input type="checkbox" checked={confirmReplace} onChange={(e) => setConfirmReplace(e.target.checked)} style={{ marginTop: 2 }} />
            <span>I understand this will <strong>replace</strong> the progress on this device and cannot be undone.</span>
          </label>
          {needsStronger && (
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5, color: text, lineHeight: 1.5, marginBottom: 16, cursor: "pointer" }}>
              <input type="checkbox" checked={ackConflict} onChange={(e) => setAckConflict(e.target.checked)} style={{ marginTop: 2 }} />
              <span>I understand my current progress may be newer, and I still want to replace it.</span>
            </label>
          )}

          <div className="sbtn" onClick={canRestore ? onRestore : undefined} style={{ ...primaryBtn, opacity: canRestore ? 1 : 0.6 }}>
            Restore This Backup
          </div>
          <div className="sbtn" onClick={onCancel} style={{ ...ghostBtn, marginTop: 14 }}>Cancel</div>
        </>
      )}

      {available && step === "done" && receipt && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: dark ? "#9FE0A0" : "#1E6B22", marginBottom: 10 }}>Restore complete ✓</div>
          <SummaryRow dark={dark} label="Restored revision" value={receipt.revision != null ? `#${receipt.revision}` : "—"} />
          <SummaryRow dark={dark} label="Backup date" value={receipt.localDate || "—"} />
          <div style={{ height: 1, margin: "16px 0", background: rule }} />
          <div style={{ fontSize: 12.5, color: text, lineHeight: 1.6, marginBottom: 16 }}>
            Your progress has been restored and verified on this device. Reload the app to continue.
          </div>
          <div className="sbtn" onClick={() => { try { window.location.reload(); } catch { onCancel(); } }} style={{ ...primaryBtn }}>Reload App</div>
          <div className="sbtn" onClick={onCancel} style={{ ...ghostBtn, marginTop: 14 }}>Close</div>
        </>
      )}

      {available && step === "error" && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: dark ? "#F0B8B8" : "#8A2020", marginBottom: 10 }}>
            {failure === "no-backup" ? "No backup found" : "Restore could not be completed"}
          </div>
          <div style={{ fontSize: 13, color: text, lineHeight: 1.7, marginBottom: 16 }}>
            {failureMessage(failure)}
          </div>
          <div className="sbtn" onClick={reset} style={{ ...primaryBtn }}>Try Again</div>
          <div className="sbtn" onClick={onCancel} style={{ ...ghostBtn, marginTop: 14 }}>Cancel</div>
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

function conflictLabel(conflict) {
  switch (conflict) {
    case CONFLICT.NO_LOCAL: return "No local progress";
    case CONFLICT.REMOTE_NEWER: return "Backup is newer";
    case CONFLICT.LOCAL_NEWER: return "This device is newer";
    case CONFLICT.SAME_REVISION: return "Same as this device";
    case CONFLICT.UNCERTAIN: return "Cannot be compared";
    default: return "—";
  }
}

function failureMessage(failure) {
  switch (failure) {
    case "no-backup":
      return "No backup could be found for that recovery code. Nothing on this device has changed — double-check the code and try again.";
    case "authorization-invalid":
    case "expired":
      return "This restore authorization has expired or was already used. Nothing on this device has changed — please prepare the restore again.";
    case "too-many":
      return "Too many attempts. Please wait a few minutes and try again. Nothing on this device has changed.";
    case "write-failed":
    case "prebackup-failed":
      return "The restore could not be written to this device's storage. Your existing progress was left unchanged.";
    case "verify-failed":
      return "The restored data did not verify, so it was rolled back. Your existing progress was left unchanged.";
    case "invalid-snapshot":
    case "unsupported-version":
      return "The backup could not be validated on this device, so nothing was changed. Your existing progress is safe.";
    default:
      return "The restore could not be completed. Your existing progress on this device was left unchanged — please try again later.";
  }
}
