import { useEffect, useMemo, useState } from "react";
import AppPage from "./AppPage";
import {
  RECOVERY_MARKER_KEY,
  applyPreparedRecovery,
  checksumCurrentProgress,
  clearRecoveryMarker,
  decisionForPlan,
  markRecoveryReloaded,
  operationId,
  readRecoveryMarker,
  summarizeProgress,
  writeRecoveryMarker,
} from "../../recovery/recoveryFlow.js";
import {
  RECOVERY_UI_ENABLED,
  browserSha256Hex,
  buildLocalRecoveryEnvelope,
  createRecoveryApi,
  getOrCreateRecoveryIdentity,
  recoveryErrorMessage,
} from "../../recovery/recoveryClient.js";

const safeDate = (value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Unknown";
};

function ActionButton({ children, onClick, disabled, secondary = false, danger = false }) {
  return (
    <button type="button" className="sbtn" onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "12px 14px", borderRadius: 8, border: secondary ? "1px solid rgba(217,177,95,0.35)" : "1px solid transparent",
      background: danger ? "#B9433D" : secondary ? "transparent" : "#D4AF37",
      color: secondary ? "inherit" : "#0A1020", fontSize: 12, fontWeight: 700,
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1,
    }}>{children}</button>
  );
}

function Metric({ label, current, snapshot }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(217,177,95,0.12)", fontSize: 12 }}>
      <span>{label}</span><span aria-label={`Current ${label}`}>{current}</span><strong aria-label={`Snapshot ${label}`}>{snapshot}</strong>
    </div>
  );
}

export default function RecoveryPage({ dark, onBack }) {
  const [phase, setPhase] = useState("loading");
  const [health, setHealth] = useState(null);
  const [plan, setPlan] = useState(null);
  const [localEnvelope, setLocalEnvelope] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const identity = useMemo(() => RECOVERY_UI_ENABLED ? getOrCreateRecoveryIdentity(localStorage) : null, []);
  const api = useMemo(() => identity ? createRecoveryApi({ token: identity.token }) : null, [identity]);
  const colors = {
    text: dark ? "#F3E7C8" : "#2D2A26",
    muted: dark ? "rgba(243,231,200,0.62)" : "#6B645A",
    panel: dark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.45)",
    border: dark ? "rgba(217,177,95,0.18)" : "rgba(140,100,20,0.18)",
  };

  async function envelopeNow() {
    return buildLocalRecoveryEnvelope(localStorage, identity);
  }

  async function refresh() {
    const result = await api.health();
    setHealth(result.health);
    setPhase(result.health.latestSnapshot ? "available" : "empty");
  }

  async function confirmApplied(marker) {
    const checksum = await checksumCurrentProgress(localStorage, browserSha256Hex);
    await api.confirm(marker.operationId, checksum);
    clearRecoveryMarker(localStorage, marker.operationId);
    setMessage("Recovery completed and verified on this device.");
    setPhase("success");
  }

  async function finishPrepared(marker, envelope) {
    const result = await api.begin({
      operationId: marker.operationId,
      localEnvelope: envelope,
      snapshotId: marker.snapshotId,
      planProof: marker.planProof,
      decision: marker.decision,
    });
    const applied = applyPreparedRecovery(localStorage, marker, result.operation.resultEnvelope);
    let reload = false;
    try { reload = markRecoveryReloaded(localStorage, applied); }
    catch { reload = false; }
    if (reload) window.location.reload();
    else await confirmApplied(applied);
  }

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!RECOVERY_UI_ENABLED) { setPhase("disabled"); return; }
      try {
        const marker = readRecoveryMarker(localStorage);
        if (marker?.phase === "applied") {
          await confirmApplied(marker);
          return;
        }
        if (marker?.phase === "preparing") {
          await finishPrepared(marker, await envelopeNow());
          return;
        }
        await refresh();
      } catch (error) {
        if (!cancelled) { setMessage(recoveryErrorMessage(error.code)); setPhase("error"); }
      }
    }
    start();
    return () => { cancelled = true; };
  // The identity and API are intentionally stable for this page lifetime.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createSnapshot() {
    setBusy(true); setMessage("");
    try {
      await api.backup(await envelopeNow());
      await refresh();
      setMessage("A recovery snapshot was created from this device.");
    } catch (error) { setMessage(recoveryErrorMessage(error.code)); setPhase("error"); }
    finally { setBusy(false); }
  }

  async function previewRecovery() {
    setBusy(true); setMessage("");
    try {
      const envelope = await envelopeNow();
      const result = await api.plan(envelope, health.latestSnapshot.snapshotId);
      setLocalEnvelope(envelope);
      setPlan(result.plan);
      setPhase("preview");
    } catch (error) { setMessage(recoveryErrorMessage(error.code)); setPhase(error.code === "RESTORE_PLAN_STALE" ? "conflict" : "error"); }
    finally { setBusy(false); }
  }

  async function applyRecovery() {
    if (busy || !plan?.proof || !localEnvelope) return;
    const decision = decisionForPlan(plan);
    if (!decision) { setMessage("This snapshot cannot be safely applied."); return; }
    setBusy(true); setMessage("");
    const marker = writeRecoveryMarker(localStorage, {
      phase: "preparing",
      operationId: operationId(),
      snapshotId: plan.snapshotId,
      planProof: plan.proof,
      decision,
    });
    try {
      await finishPrepared(marker, localEnvelope);
    } catch (error) {
      try { await api.rollback(marker.operationId); } catch { /* prepared state remains recoverable */ }
      localStorage.removeItem(RECOVERY_MARKER_KEY);
      setMessage(recoveryErrorMessage(error.code));
      setPhase(error.code === "RESTORE_PLAN_STALE" || error.code === "RECOVERY_CONFLICT" ? "conflict" : "error");
      setBusy(false);
    }
  }

  async function retryRecovery() {
    setBusy(true); setMessage("");
    try {
      const marker = readRecoveryMarker(localStorage);
      if (marker?.phase === "applied") await confirmApplied(marker);
      else if (marker?.phase === "preparing") await finishPrepared(marker, await envelopeNow());
      else await refresh();
    } catch (error) { setMessage(recoveryErrorMessage(error.code)); setPhase("error"); }
    finally { setBusy(false); }
  }

  const current = localEnvelope ? summarizeProgress(localEnvelope.payload) : null;
  const snapshot = health?.latestSnapshot?.summary?.progress;
  const panel = { background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 16, color: colors.text };

  return (
    <AppPage dark={dark} title="Progress Recovery" subtitle="Restore a verified progress snapshot" onBack={onBack}>
      <div style={{ ...panel, fontSize: 12, lineHeight: 1.65 }}>
        {phase === "disabled" && <p>Progress recovery is not enabled in this environment.</p>}
        {phase === "loading" && <p>Checking for recoverable progress...</p>}
        {phase === "empty" && <>
          <p style={{ color: colors.muted }}>No recovery snapshot is available yet. Current progress stays on this device until you create one.</p>
          <ActionButton onClick={createSnapshot} disabled={busy}>Create recovery snapshot</ActionButton>
        </>}
        {phase === "available" && <>
          <p><strong>Recovery available</strong></p>
          <p style={{ color: colors.muted }}>Snapshot created {safeDate(health.latestSnapshot.createdAt)}. Review the changes before anything is applied.</p>
          <div style={{ display: "grid", gap: 8 }}>
            <ActionButton onClick={previewRecovery} disabled={busy}>View recovery</ActionButton>
            <ActionButton onClick={createSnapshot} disabled={busy} secondary>Update snapshot from this device</ActionButton>
          </div>
        </>}
        {phase === "preview" && current && snapshot && <>
          <p><strong>Preview changes</strong></p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, color: colors.muted, fontSize: 10 }}><span></span><span>Current</span><span>Snapshot</span></div>
          <Metric label="Memorized ayahs" current={current.completedAyahs} snapshot={snapshot.completedAyahs} />
          <Metric label="Reviewed juz" current={current.reviewedJuz} snapshot={snapshot.reviewedJuz} />
          <Metric label="Session days" current={current.sessionDays} snapshot={snapshot.sessionDays} />
          <Metric label="Streak" current={current.streak} snapshot={snapshot.streak} />
          <p style={{ color: colors.muted }}>{plan.kind === "LOCAL_NEWER" ? "Current progress is newer. Continuing will restore the selected snapshot." : plan.conflicts?.length ? "Conflicts were detected and require this explicit choice." : "The selected snapshot passed integrity checks."}</p>
          <div style={{ display: "grid", gap: 8 }}>
            <ActionButton onClick={() => setPhase("confirm")} disabled={!decisionForPlan(plan)}>Continue</ActionButton>
            <ActionButton onClick={() => setPhase("available")} secondary>Cancel</ActionButton>
          </div>
        </>}
        {phase === "confirm" && <>
          <p><strong>Confirm progress recovery</strong></p>
          <p style={{ color: colors.muted }}>This will change memorization, review, session, and streak progress on this device. Reminder preferences will not change.</p>
          <div style={{ display: "grid", gap: 8 }}>
            <ActionButton onClick={applyRecovery} disabled={busy} danger>{busy ? "Applying..." : "Apply recovery"}</ActionButton>
            <ActionButton onClick={() => setPhase("preview")} disabled={busy} secondary>Cancel</ActionButton>
          </div>
        </>}
        {phase === "success" && <>
          <p><strong>Recovery complete</strong></p>
          <p style={{ color: colors.muted }}>{message}</p>
          <ActionButton onClick={onBack}>Return to settings</ActionButton>
        </>}
        {(phase === "error" || phase === "conflict") && <>
          <p><strong>{phase === "conflict" ? "Progress changed" : "Recovery unavailable"}</strong></p>
          <p style={{ color: colors.muted }}>{message}</p>
          <ActionButton onClick={retryRecovery} disabled={busy} secondary>Check again</ActionButton>
        </>}
        {message && !["success", "error", "conflict"].includes(phase) && <p role="status" style={{ color: colors.muted, marginBottom: 0 }}>{message}</p>}
      </div>
    </AppPage>
  );
}
