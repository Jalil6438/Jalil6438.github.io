# Pilot source assets

Downloaded **source** assets live here, unmodified, one subfolder per type:

- `stories/` — story files (PDF/ePub/text)
- `audio/` — audio clips (keep CC-BY-SA audio here, separate from proprietary content)
- `images/` — alphabet/vocabulary visuals
- `listening/` — matched text+audio listening samples

Rules:
- Keep these **separate** from `../transformed/` (BuddyAR-adapted content).
- Every file here must have a corresponding row in `../licenses/arabic-content-manifest.json`
  with `local_file` set and a `content_hash` recorded.
- Do **not** store secrets, personal/family data, or unrelated curriculum PDFs here.
- Do **not** bulk-ingest. This is a small pilot (see `../licenses/pilot-selection.md`).
