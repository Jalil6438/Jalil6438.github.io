# Al-Hifz backend documentation

Phase-1 durability foundation for protecting reciters' memorization progress.

- [persistence-and-loss-risks.md](./persistence-and-loss-risks.md) — where
  progress lives today, the full browser-storage inventory, the existing
  server/identity model, and the ranked data-loss scenarios (Phase A/B audit).
- [shadow-backup-phase1.md](./shadow-backup-phase1.md) — the Phase-1 snapshot
  contract, feature gate, anonymous identity, storage adapter, write-only
  backup flow, client queue, manual export, observability, privacy,
  limitations, roadmap, rollback plan, and the Preview/Production checklists.
- [recovery-phase2.md](./recovery-phase2.md) — the Phase-2 read-only recovery
  code + recovery preview: token format, entropy, verifier handling, setup
  authorization, rotation, read-only preview, attempt throttling, feature gate,
  namespace, privacy/threat model, read-only guarantees, limitations, and the
  Preview-testing checklist, rollback plan, and Production prerequisites.

**Ground rules (unchanged in Phase 1, upheld in Phase 2):** `localStorage` is
the sole source of truth; backup is shadow-only and recovery is verify-only (no
read-back into progress, no restore, merge, or sync); both features are disabled
by default in every environment and must not be enabled or deployed until
Preview validation is complete and Mark explicitly authorizes Production.
