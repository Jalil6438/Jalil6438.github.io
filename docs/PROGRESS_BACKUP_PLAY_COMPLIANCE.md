# Al-Hifz — Progress Backup: Google Play Compliance Gate

**Status:** Compliance analysis for the backup foundation packet. **This is an acceptance
gate, not a later cleanup task.**
**Companion:** `docs/PROGRESS_BACKUP_ARCHITECTURE.md`
**Policy sources verified live (2026-07-14)** against official Google documentation — not
from memory. URLs cited inline; quotes are verbatim where the wording is load-bearing.

> **Scope note.** This covers what shipping a cloud backup *would* require. The foundation
> packet itself collects nothing: no UI calls these endpoints and the store refuses to run in
> Production. Nothing here is currently owed to Google. Everything here is owed **before the
> first byte of real user data is uploaded.**

---

## 1. The threshold question: is this "collected" data?

**Yes, unambiguously.** Play defines "collect" as *"transmitting data from your app off a
user's device."* Both exemptions fail:

- *On-device* exemption — N/A, we send it off device.
- *Ephemeral* exemption — *"retained for no longer than necessary to service the specific
  request in real-time"* — N/A, a backup is persisted **by definition**.

And pseudonymity is explicitly **not** an escape hatch:

> *"User data collected pseudonymously must be disclosed. For example, data that can
> reasonably be re-associated with a user must be declared."*
> — [Data safety form guidance](https://support.google.com/googleplay/android-developer/answer/10787469)

**Therefore: declaring "No data collected" while running a live backup server would be a
false declaration**, which Play enforces with *"blocked updates or removal from Google Play."*
This is the single most expensive mistake available here, and it is made by omission.

**Collected, not Shared.** "Shared" means transfer to a *third party*. Play carves out
**service providers** processing data on the developer's behalf — our host and datastore
(Vercel / Upstash or successor) are service providers. So: **Collected = yes, Shared = no**,
provided we never route backup data to an analytics or advertising destination. This packet
contains no analytics of any kind, by design.

## 2. Data Safety disclosure mapping (draft)

| Data type | Declare? | What it maps to | Notes |
|---|---|---|---|
| **App activity → Other actions** | **YES — Collected** | The progress payload (ayah completion, sessions, reps, revision, streaks, badges, milestones) | Best-supported fit. Definition: *"Any other user activity or actions in-app not listed here."* |
| **Device or other IDs** | **YES — Collected** | The capability token + `writerId` | Play's definition covers identifiers relating to *"an individual device, browser or **app**"*, and gives **Firebase installation ID** — an app-generated random app-scoped ID — as an example. Our token is the same species. |
| **App activity → Other user-generated content** | **NO** — *now truthfully* | — | See the correction below. Holds **only** because we exclude `rihlat-reflections`, `rihlat-username`, **and the `notes` field inside `jalil-quran-v8`**. If any of the three is ever added to the cloud boundary, this type activates and the declaration must change. |
| **Personal info → Name** | **NO** | — | `rihlat-username` is excluded. Same conditional as above. |
| **Personal info → User IDs** | **Judgment** | — | See Ambiguity A2. Defensible to declare *in addition* to Device IDs. Over-declaring is not penalized; under-declaring is. |
| **Personal info → Political or religious beliefs** | **UNRESOLVED — see D1 / A1** | Possibly the entire payload | The decision that matters most. |
| **App info and performance** (crash/diagnostics) | **NO** | — | We transmit none. |
| **Location / country** | **NO** | — | Deliberately not collected on this path. |
| **Security: encrypted in transit** | **YES** | HTTPS/TLS | Vercel is HTTPS-only. Truthfully declarable. |
| **Security: users can request deletion** | **YES** | `DELETE /api/backup` + a web deletion page | See §4. |

## 2a. CORRECTION — the previous draft of this table was FALSE

The first revision of this document declared **"User-generated content: NO"**. That was
**wrong**, and it is worth stating plainly rather than quietly fixing, because it is the exact
failure this document warns about in §1.

The `notes` field — the user's own free-form written per-juz notes — lives **inside** the
`jalil-quran-v8` blob, which was on the backup allowlist as a single key. Key-level
allowlisting said "yes" to the whole blob. So the implementation *was* transmitting user-
generated content to our server while this document declared that it did not.

> **A Data safety declaration is only as true as the field-level boundary underneath it.**
> An allowlist of *keys* tells you nothing about what is *inside* those keys. Had this shipped,
> we would have filed an inaccurate declaration — the precise thing Google enforces with
> *"blocked updates or removal from Google Play"* — and we would have done it while believing
> the paperwork was correct.

**Fixed** (Architecture §5.2): `jalil-quran-v8` now has a field-level allowlist. `notes`,
`dark`, `reciter`, and `showTrans` are refused by name; the client strips them **before the
payload is built**; the server independently rejects any blob carrying them; and a tripwire
test over the app's real 21-field blob fails if a new field is ever added without being
classified.

The mapping in §2 is now true of the implementation, and is pinned by tests
(`no excluded key, and no v8 note or preference, ever reaches storage`).

## 3. THE BLOCKING DECISION — is memorization progress a "religious belief"? (D1 / A1)

Play's taxonomy has *Personal info → Political or religious beliefs*, defined in full as:

> *"Information about a user's political or religious beliefs."*

That is the **entire** official definition. No further guidance exists. And a record of which
verses of the Qur'an a person has memorized is, at minimum, strongly indicative of religious
practice.

**Why this cannot be resolved here:**

- If **yes**: it is a *special category* of data under **GDPR Art. 9**. The bar rises from
  "legitimate interest / consent" to **explicit consent**, and the case for **end-to-end
  encryption becomes very strong** (an E2E-encrypted payload the server cannot read materially
  changes the analysis). It also becomes a conspicuous line in the Play Data safety card,
  which affects how the app is perceived.
- If **no**: the current design is proportionate as-is.

**This is a legal and product judgment with real consequences, and it must not be made by an
engineer or by an AI.** It is escalated to Jalil, unresolved, deliberately.

**What changed since the last revision:** excluding the `notes` field (§2a) materially
*reduces* the exposure. A user's free-form written reflections on a passage of the Qur'an are a
far stronger Art. 9 trigger than a completion count — the first is religious expression, the
second is arguably just an activity log. Removing notes from the wire moves the question from
"we are storing religious writing" to "we are storing which verses someone has memorized",
which is a materially easier call. **It does not settle it.**

**Engineering note (not a decision):** adopting E2E encryption (Architecture D3) would make
the server structurally unable to read the payload, which is the most robust answer to this
question regardless of how it is decided — at the cost of making token loss unrecoverable.
The envelope is already shaped to accept it without a breaking change.

## 4. Data deletion — and the "is a token an account?" trap (A1)

Play's **account deletion policy** binds apps *"if your app allows users to create an account
from within your app"*
([13327111](https://support.google.com/googleplay/android-developer/answer/13327111)). It then
requires **both** an in-app deletion path **and** a public **web link** where deletion can be
requested.

**Textually, Al-Hifz is out of scope:** there is no account creation flow — no credentials, no
sign-up, nothing the user "completes". Google's own user-facing page confirms the no-account
case is a recognized state, handled by the Data safety deletion question rather than the
account mandate.

**But this is the largest residual risk in the packet.** No official source addresses a
server-side record keyed by a client-generated capability token. A human reviewer could
reasonably read a restorable, server-persisted, token-addressed record as a de-facto account —
*especially* if the UI ever calls it one, or if restore requires entering a code (which looks
exactly like a credential).

**Mitigation — cheap, and satisfies both readings. Recommended unconditionally:**

1. **In-app "Delete my cloud backup"** → hard-deletes the server record and every restore
   point. *The backend half already exists and is tested:* `DELETE /api/backup`.
2. **A public web deletion page** where a user can submit their token to request deletion,
   referencing the app and developer name. **Not yet built — this is the one deliverable
   gap.**
3. Declare the deletion mechanism in the Data safety form.

Play does not prescribe the mechanism: *"There is no prescribed mechanism, however as best
practice the request mechanism should be easily discoverable and accessible by users."*

## 5. Consent & prominent disclosure

Play's strict **Prominent Disclosure & Consent** ritual (in-app disclosure, not buried in
settings, affirmative action required *before* collection) is triggered when collection *"may
not be within the reasonable expectation of the user."*

A user tapping **"Back up my progress"** is squarely within reasonable expectation, so the
strict ritual is likely **not** triggered — **but that holds only while the feature is
strictly opt-in.**

> **This is a design constraint, not a preference.** If cloud backup ever becomes automatic,
> default-on, or fires at install, **Prominent Disclosure & Consent is triggered and becomes a
> blocker.** The architecture's "no automatic cloud backup" rule is therefore load-bearing for
> compliance, not just for safety.

**Recommendation:** ship an explicit one-time consent screen before the first upload anyway.
It costs one screen, removes all doubt, and is independently required to have a clean GDPR
lawful basis.

## 6. Data minimization

Play: *"Limit the access, collection, use and sharing of personal and sensitive user data
acquired through the app to app and service functionality."*

The boundary in Architecture §5 **is** the minimization argument, and it is enforced by tests
rather than by good intentions:

- 13 keys transmitted, each with a documented "why it is necessary" and "what is lost without it".
- 20 keys refused **by name**, including the user's name, their private reflections, the
  activity feed, all cosmetic preferences, and every analytics/identity key.
- **Field-level** minimization inside `jalil-quran-v8`: 17 progress fields retained, 4 refused
  by name (`notes`, `dark`, `reciter`, `showTrans`). Minimization that stops at the key
  boundary is not minimization — see §2a.
- Unknown and excluded keys **and fields** are **rejected**, not silently dropped, and a
  validated envelope is **rebuilt from the allowlist** before storage.
- **No analytics riders. No IP-derived geolocation. No device fingerprinting. No crash data.
  No free-form user text of any kind.** The backup path collects nothing beyond the progress
  payload.
- `writerId ≠ alhifz_did`, so the backup set cannot be joined to the analytics device set.

### 6a. Identifiers collected, and why

| Identifier | Collected? | Purpose | Retention |
|---|---|---|---|
| **Capability token** (client-generated, random) | Yes — but the server stores only `sha256(domain:token)` | The *only* way to address a backup. There are no accounts. | For the life of the backup (400 days from last touch) |
| **`writerId`** (random, backup-only) | Yes, in the envelope | Identifies which device wrote a given restore point, so a user can tell two devices apart in a restore-point list | With the backup |
| **`alhifz_did`** (analytics install id) | **NEVER on this path** | — | — |
| **IP address** | **Not stored.** HMAC-SHA256 under a server-side pepper; only the digest is used, as a rate-limit bucket key | Abuse limiting only | **≤ 1 hour** (counter TTL). Never attached to a backup record; never logged |

**On the IP:** a bare `sha256(ip)` would *not* be pseudonymization — the IPv4 space is 2³², so
the digests can simply be enumerated back to addresses. The pepper is what makes the digest
unreproducible without server-side knowledge, and it never leaves the server. Declared here
because a rate-limit key is exactly the kind of place an identifier gets left lying around and
then forgotten at declaration time.

## 7. Retention

**Play mandates no maximum retention period.** (Searched; none exists. Any claim otherwise is
invented policy.) What Play *does* require is that the **privacy policy state** the retention
and deletion policy.

- **Ours: 400 days from last touch**, justified in Architecture §13.
- **Rate-limit counters: ≤ 1 hour** (TTL), holding a pseudonymized IP bucket and no backup
  content.
- **The 90-day auto-deletion option is deliberately NOT adopted.** Play offers a deletion
  badge for auto-deleting within 90 days; for a *backup* feature that is actively
  user-hostile — it would silently destroy the very thing the user asked us to keep. We take
  the request-mechanism route instead (§4).

## 8. Encryption

- **In transit — REQUIRED and satisfied.** *"Handle all personal and sensitive user data
  securely, including transmitting it using modern cryptography (for example, over HTTPS)."*
  Vercel is HTTPS-only.
- **At rest — no explicit Play requirement exists.** The Data safety form does not ask about
  it, and no Play policy mandates it. **Stated explicitly because the absence is itself the
  finding:** anyone asserting Play requires at-rest encryption is mistaken. (GDPR risk posture
  is a separate matter, and is what D1/D3 turn on.)

## 9. Families / children

Trigger is the **declared target audience** in Play Console, not vibes. A Qur'an memorization
app plausibly appeals to children, which is a **review-risk flag**.

- **Recommendation: declare target audience 13+/adults**, and keep store-listing assets free of
  child-directed styling. This keeps the Families Policy — and COPPA — entirely out of scope.
- **If Families ever applied:** the prohibited-identifier list (AAID, IMEI, IMSI, MAC, SSID,
  serials) is **hardware/advertising** identifiers. Our random app-scoped token is **not** on
  it — Google recommends App Set ID, the same species — so the backup design would remain
  viable. The hard part would be COPPA/GDPR verifiable parental consent for the stored data.
- **Terminology correction:** there is no app-level "Play Families self-certification". The
  self-certification program governs **ads SDKs** and is irrelevant to an app with no ads. Do
  not cite it.

## 10. Privacy policy — a HARD blocker

> *"All apps must post a privacy policy link in the designated field within Play Console, and a
> privacy policy link or text within the app itself."*

Mandatory for **every** app, with no data-collection threshold. It must contain: developer
information and a privacy point of contact; the types of data accessed/collected/used/shared
and any parties it is shared with; secure data-handling procedures; and **the retention and
deletion policy**.

**Two specific, current hazards:**

1. **`docs/PRIVACY.md` and `src/components/pages/TermsPage.jsx` currently state that all
   memorization data is device-local** (*"only anonymous usage counts and (opt-in) reminder
   subscriptions leave the device"*). **Shipping cloud backup makes that statement false.** An
   inaccurate privacy disclosure is an enforcement matter, not a documentation chore. Updating
   both is a **hard shipping dependency**, tracked in Architecture §12.
2. Per existing project notes, the TermsPage privacy-policy content is **already flagged as a
   store risk / quarantined**. That pre-existing blocker must be closed regardless of this
   feature, and this feature *raises its stakes*.

## 11. Store blockers — the checklist

Nothing below is owed today (the packet collects nothing). All are owed **before the first
real upload**.

| # | Blocker | Status |
|---|---|---|
| **B1** | Privacy policy live in Play Console **and** in-app; accurately describing server-stored backup data, the service providers holding it, retention, and deletion. | ❌ **BLOCKED** — TermsPage quarantined; PRIVACY.md contradicts the feature |
| **B2** | Data safety form declares the backup as **Collected**: *App activity → Other actions* + *Device or other IDs*. | ⬜ Drafted (§2), needs Console entry |
| **B3** | **D1 resolved** — is progress a "religious belief"? Drives Art. 9 / E2E / the Data safety card. | 🛑 **NEEDS JALIL** |
| **B4** | HTTPS on the backup endpoint + truthful encryption-in-transit declaration. | ✅ Satisfied (Vercel) |
| **B5** | Deletion: in-app delete **+ public web deletion page**. | ⚠️ **Backend done & tested** (`DELETE /api/backup`); **web page NOT built**; UI not built |
| **B6** | Target audience declared 13+/adults; listing assets not child-directed. | ⬜ Product decision |
| **B7** | Opt-in only. If backup ever becomes automatic/default-on, **Prominent Disclosure & Consent triggers** and this becomes a blocker. | ✅ Satisfied by design — **must stay that way** |
| **B8** | Durable adapter + subprocessor named and disclosed in the privacy policy. Must honour the CAS contract and set `BACKUP_IP_PEPPER`. | ⬜ Next packet (Architecture D4, D5) |
| **B9** | **No free-form user content on the wire** — required for the *User-generated content: NO* declaration in §2 to be true. | ✅ **Fixed this revision** (§2a); pinned by tests |

## 12. Unresolved ambiguities (no official source settles these)

- **A1 — Is a token-keyed server record an "app account"?** Policy binds on *account creation*;
  nothing addresses capability tokens. **Highest residual risk.** Mitigation (ship deletion both
  ways) is cheap and closes it under either reading.
- **A2 — "User IDs" vs "Device or other IDs"** for the token. The Firebase-installation-ID
  precedent favours *Device or other IDs*. Declaring both is defensible.
- **A3 — "Political or religious beliefs"** — see §3. **The one that actually matters.**
- **A4 — "Data can't be deleted"** could not be verified as official Play wording in any Google
  documentation. Answering "No" to the deletion question is permitted, but **do not use that
  phrase as if it were a policy term.**

---

## Sources

- [Data safety form guidance](https://support.google.com/googleplay/android-developer/answer/10787469)
- [App account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Developer Program Policy — consolidated, effective 2026-05-27](https://support.google.com/googleplay/android-developer/answer/16944162)
- [Data safety, user-facing](https://support.google.com/googleplay/answer/11416267)
- [Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335) ·
  [Data practices in Families apps](https://support.google.com/googleplay/android-developer/answer/11043825) ·
  [Target audience & content](https://support.google.com/googleplay/android-developer/answer/9285070)
