# Al-Hifz backend documentation

Phase-1 durability foundation for protecting reciters' memorization progress.

- [persistence-and-loss-risks.md](./persistence-and-loss-risks.md) — where
  progress lives today, the full browser-storage inventory, the existing
  server/identity model, and the ranked data-loss scenarios (Phase A/B audit).
- [shadow-backup-phase1.md](./shadow-backup-phase1.md) — the Phase-1 snapshot
  contract, feature gate, anonymous identity, storage adapter, write-only
  backup flow, client queue, manual export, observability, privacy,
  limitations, roadmap, rollback plan, and the Preview/Production checklists.

**Ground rules (unchanged in Phase 1):** `localStorage` is the sole source of
truth; the backup is shadow-only (no read-back, restore, merge, or sync); the
feature is disabled by default in every environment and must not be enabled or
deployed until Preview validation is complete.
