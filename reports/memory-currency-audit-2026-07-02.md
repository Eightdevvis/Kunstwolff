# Memory-Aktualitäts-Audit — Vollständiger Report

**Datum:** 2026-07-02  
**Umfang:** alle 56 Memory-Dateien über 3 Orte (Global Auto-Memory, `Kunstwolffwebsite/memory/`, `kunstwolff-admin/memory/`).  
**Methode:** Multi-Agent-Audit (1 read-only Agent pro Datei, verifiziert die konkreten Behauptungen gegen den echten Repo-Stand) + manuelle Nachverifikation der folgenschwersten Funde.  
**Score:** 16 sauber · 37 partially-stale · 3 stale.  
**Nicht filesystem-prüfbar** (überall gleich): Git-Hashes/Branches, Build-Seitenzahlen, „auf master shipped" — dieses Repo ist hier kein Git-Checkout.

---

## 1. Manuell nachverifizierte Kern-Funde (CONFIRMED am Code)

Über das Agent-Ergebnis hinaus direkt am Code geprüft:

### ⚠️ Potenzieller echter Bug (nicht nur Doku): `normalizeSlug`-Divergenz Admin ↔ Website
- **`admin/stadt-auswahl.md`** behauptet: Admin-`normalizeSlug` sei *„identisch zur Website-Logik (Konsistenz kritisch)"*. **Falsch.**
- **Admin** (`src/utils/encoding.ts:66`, genutzt von `CityManager.tsx:69` + `Dashboard.tsx:442`): Umlaute→ae/oe/ue/ss, dann **`[^a-z0-9-]` gelöscht**.
- **Website** (`src/utils/landings.ts:36` + `titleImages.ts:16`): `transliterateGerman` → **`.normalize('NFD')` + Akzente strippen** → **`[^a-z0-9]+ → '-'`**.
- **Folge:** für ASCII- + deutsche-Umlaut-Namen **identisch** (kein aktueller Mismatch, alle vorhandenen Slugs sind ASCII). Divergenz nur bei **nicht-deutschen Akzenten / Sonderzeichen**:
  - `Liège` → Admin `lige` vs Website `liege` — **plausibel** für FR-belgische/Schweizer Städte.
  - `Tom&Jerry` → Admin `tomjerry` vs Website `tom-jerry`.
- `encoding.test.ts:123` („unterscheidet sich BEWUSST … nicht mergen") betrifft Admin-intern `slugify` vs `normalizeSlug`, **nicht** die Website. Der Claim „identisch zur Website" bleibt irreführend + latentes Risiko.
- **Empfehlung:** Code-Frage separat entscheiden (Slugger angleichen ODER Divergenz bewusst dokumentieren); Doku-Zeile so oder so korrigieren.

### ✅ Bestätigt weg: `BUGS_TODO.md` + `human_doc_bugs.md`
`find` über den ganzen Baum: existieren nirgends mehr. In ~7 Memory-Dateien als „Single Source of Truth" referenziert → alle tot.

### ✅ Bestätigt: falsches Admin-Pfad-Casing
Nur **flaches** `…/kunstwolff-admin/` existiert; der dokumentierte Wrapper `Kunstwolff-admin/kunstwolff-admin/` **nicht**.

### ✅ Bestätigt: `Eventtypes.astro` ist live
Importiert in `index.astro`, `[landing].astro`, `fr/[landing].astro` → `wip-komponenten.md`-Claim „nirgendwo importiert" falsch.

### ✅ Bestätigt: Admin-Publish = atomarer Batch-Commit
`github.ts:230 commitFilesBatch` (base_tree → `git/trees` → commit → ref). → `admin/publish-workflow.md`-Kernbeschreibung (sequenzielle PUT/DELETE, ein Commit pro Datei, Teilerfolg-Handling) ist stale.

---

## 2. Die 5 Quer-Muster

| # | Muster | Betroffene Dateien |
|---|--------|--------------------|
| ① | **„Admin kann NICHT X" veraltet** — 6 LÜCKEN gebaut (EventManager, CinemaManager, PartnerManager, Skills, Why-Texte, title.meta.json) | admin-tool, einschraenkungen, content-events, content-cinema, content-why, manager-images |
| ② | **Tote Doku-Refs** BUGS_TODO.md / human_doc_bugs.md | admin-tool, website/index, einschraenkungen, admin/index, manager-reviews, manager-staedte, manager-images |
| ③ | **Falsches Admin-Pfad-Casing** (nested wrapper) | admin-tool, website/projekt, git-hooks, website/index, komponenten-stack, admin/projekt |
| ④ | **Deploy-Drift**: GitHub Pages/Actions→Vercel; „kein Backend"→Worker(hono)+Express+JWT | project_overview, admin-tool, admin/projekt, admin/deployment |
| ⑤ | **Datei-Details**: sample1.jpeg→.webp; Reviews-`default/` fehlt; FAQ „nur default"→21 Stadt-Ordner | architektur, content-titelbild, content-reviews, pfadstruktur, content-faqs, manager-faqs |

---

## 3. Befunde pro Datei

Gruppiert nach Ort, innerhalb nach Schwere (🔴 stale → 🟡 partly → 🟢 current).

### Global Auto-Memory (`~/.claude/…/memory/`)

**`deploy_and_content_systems.md`** — 🟡 partly-stale
> The content-systems, AI-tools, worker-routes and admin-nav claims are overwhelmingly accurate against both repos; only a stale env-var name, a drifted Dashboard line number, and part of the seo-konzept PDF list are off.
- **⚠️ outdated** — Anbieterwechsel = `AI_API_URL` + `AI_DEFAULT_MODEL` in worker/src/index.ts (KI-Assistent section, lines 38-39)
  - *Beleg:* grep for AI_API_URL/AI_DEFAULT_MODEL in kunstwolff-admin/worker/src/ returns zero hits. Actual switching mechanism (worker/src/index.ts:311 aiProvider, lines 19-21 Env) uses secrets GEMINI_API_KEY (preferred) / MISTRAL_API_KEY plus optional AI_MODEL override — exactly as the file's own later 'Provider-Picker' section (lines 44-46) states.
  - *Fix:* Drop the AI_API_URL/AI_DEFAULT_MODEL sentence; the Provider-Picker paragraph already documents the real GEMINI_API_KEY/MISTRAL_API_KEY + AI_MODEL mechanism.
- **⚠️ outdated** — Seitentyp-Menü etc. erscheinen NUR wenn `activeTab === 'interface'` (Dashboard.tsx:445)
  - *Beleg:* In kunstwolff-admin/src/components/Dashboard.tsx the `activeTab === 'interface'` guards are at lines 509 and 714, not 445; line 445 is `if (quickAddType === 'landing')`. The described behavior still holds, only the cited line number drifted.
  - *Fix:* Update the reference to Dashboard.tsx:509 (and 714) or drop the exact line number.
- **⚠️ outdated** — seo-konzept/ enthält PDFs u.a. 'Traumkunde Agentin', 'Wettbewerber/Traffic-Temperatur', 'Angebot/Value-Stack' (lines 74-75)
  - *Beleg:* ls /home/sasha/codicus/Kunstwolff/seo-konzept/ shows: Die Attraktive Persönlichkeit.pdf, Document.pdf, Einzigartigkeit.pdf, Funnel Hacking.pdf, Traumkunde Braut.pdf, Traumkunde Firmenchef(.pdf/-Copy). No 'Agentin', 'Wettbewerber/Traffic-Temperatur' or 'Angebot/Value-Stack' PDF exists (one generic 'Document.pdf' is present). The two .md briefings (Kunstwolff-SEO-Marketing-Konzept.md, Kunstwolff-Linse-Arbeitsplan.md) DO exist in that folder.
  - *Fix:* Reconcile the PDF list with the actual folder contents (remove Agentin/Wettbewerber/Angebot or rename to the real files).

**`project_overview.md`** — 🟡 partly-stale
> Core two-repo/Astro5+Preact/admin-writes-to-public claims hold, but the "Admin has no backend / PAT-in-localStorage" and "admin deployed via GitHub Actions" claims are now contradicted by a real Cloudflare Worker + Express backend and Vercel-based admin hosting.
- **❌ wrong** — Admin hat kein Backend – alles läuft über GitHub REST API + PAT in localStorage.
  - *Beleg:* kunstwolff-admin now has a backend: worker/wrangler.toml (name="kunstwolff-admin-api", hono in package.json deps) and server/index.mjs (express, jsonwebtoken, bcryptjs, @libsql/client). worker/src/index.ts:12 declares GITHUB_PAT held server-side. src/services/auth.ts:17 isServerAuthEnabled() and src/services/github.ts:10 `BASE_URL = isServerAuthEnabled() ? \`${apiBaseUrl()}/api/github\` : 'https://api.github.com'` route through the backend with JWT session tokens (src/services/auth.ts:70). Plain PAT-in-browser is only a legacy fallback, and even then stored in an encrypted vault (src/utils/authVault.ts storeTokenVault), not plain localStorage.
  - *Fix:* Rewrite to: Admin has two auth modes — a server-auth mode via a Cloudflare Worker (hono) + Express backend holding the GITHUB_PAT server-side with JWT sessions, plus a legacy fallback where a PAT is stored encrypted in the browser and calls api.github.com directly.
- **❌ wrong** — kunstwolff-admin/ – Preact + Vite SPA, deployed via GitHub Actions nach admin.kunstwolff.de
  - *Beleg:* No .github/workflows/ directory exists in kunstwolff-admin (ls fails). package.json has no gh-actions deploy; deployment scripts are worker:deploy via wrangler (Cloudflare). worker/wrangler.toml sets ADMIN_ALLOWED_ORIGIN="https://kunstwolff-admin.vercel.app", indicating the admin frontend is hosted on Vercel, consistent with sibling memory deploy_and_content_systems.md (Admin=Vercel), not GitHub Actions to admin.kunstwolff.de. The exact live domain/branch is git-state and not filesystem-verifiable.
  - *Fix:* Change to: admin SPA deployed via Vercel (kunstwolff-admin.vercel.app), backend Worker deployed via wrangler (Cloudflare).
- **⚪ unverif** — Kunstwolffwebsite/ ... deployed via Vercel nach kunstwolff.de
  - *Beleg:* astro.config.mjs:9-19 comments state SITE_URL currently targets the Vercel stage https://kunstwolff.vercel.app and that kunstwolff.de 'solange dort noch Wix läuft' (still runs Wix), with cutover to kunstwolff.de planned but not yet done. Live domain/deploy state is git/hosting state not verifiable from the filesystem; the 'via Vercel' part is supported but 'nach kunstwolff.de' appears aspirational at write time.
  - *Fix:* Clarify: built for/deployed on Vercel (stage kunstwolff.vercel.app), cutover to kunstwolff.de pending (Wix still live at time of writing).

**`why_image_seeding.md`** — 🟡 partly-stale
> All Why-image seeding/data-model claims and admin symbol references are confirmed accurate; only the transient "DEPLOY-GATE-BLOCKER" status claim is now outdated (the guide check passes and Mediathek is documented).
- **⚠️ outdated** — DEPLOY-GATE-BLOCKER: npm run worker:deploy runs check-admin-guide.mjs which currently FAILS because the 'Mediathek' tab is missing from the Worker ADMIN_GUIDE; worker only deployable via direct wrangler deploy until fixed.
  - *Beleg:* Ran `node scripts/check-admin-guide.mjs` in kunstwolff-admin -> exit 0, '✅ Admin-Wissen ist mit der echten UI in Sync. Tabs: 9'. Mediathek is now present: worker/src/index.ts:492 '"Mediathek" – zentrale Bild-Bibliothek...'. The gate now passes, so the blocker is resolved.
  - *Fix:* Remove or mark-resolved the DEPLOY-GATE-BLOCKER paragraph (line 27); check-admin-guide now passes and Mediathek is in ADMIN_GUIDE_SECTIONS.
- **⚪ unverif** — Commit 7a903af (content.json ref fix), commit 6835a0e feat(interface) Live-Vorschau-Panel absorbed batch changes, pushed to origin/master; Website main divergence / git rebase workflow.
  - *Beleg:* Neither repo root is a git checkout accessible for state verification here (task note: cannot verify git branches/commits/remotes from filesystem). SHAs and push/branch claims cannot be confirmed.
  - *Fix:* N/A — historical incident narrative, left as-is; not filesystem-verifiable.

**`MEMORY.md`** — 🟢 current
> Every concrete claim in the memory index (linked files, branch names main/master, components.json _order, i18n FR overlay/route/LangSwitcher, /fr/belgique, sync-why.mjs) verifies against the current repo state.

**`admin_vs_live_resolution_gap.md`** — 🟢 current
> All concrete claims (resolveDefaultTitleImage/resolveEventTitleImage fallback in website events.ts, supplementWithDefaultSlides/MIN_LANDING_SLIDES=6, admin LivePreview.tsx + InterfaceView integration + livePreviewPath + VITE_PREVIEW_BASE + kunstwolff.vercel.app default, EventHeroEditor hero-parity badges) verify against the current repos.

**`component_stack_unification.md`** — 🟢 current
> All concrete claims verified: componentConfig.ts exposes getSectionOrder/resolveSectionOrder, components.json holds _order, all four page types (index, [landing], [skill], [skill]/[landing]) render dynamically via resolveSectionOrder+registry, admin has getPageOrder+PAGE_STACKS, and both doc files exist.

**`event_inline_editing.md`** — 🟢 current
> All concrete claims (inline event editors, pageTypes editorTypes, resolveEditorProps city:subSlug, StripeImagePicker/pageNavRequest nav, setPageOrder per-event _order, website data-gated rendering without enabled flag, branches admin=master/website=main) verified true against the live repos.

**`i18n_foundation.md`** — 🟢 current
> All filesystem-verifiable claims (config.ts symbols, src/pages/fr/[landing].astro, public/i18n/fr overlay, LangSwitcher/Layout hreflang, locale params in utils/components, langAlternates wiring) are confirmed accurate; only the git commit hash and page-count are unverifiable here.
- **⚪ unverif** — commit `41e7126` (Juli 2026)
  - *Beleg:* Repo root /home/sasha/codicus/Kunstwolff/Kunstwolffwebsite is not a git checkout in this environment; cannot confirm commit hash or history.
  - *Fix:* Leave as-is; git state not checkable from filesystem.
- **⚪ unverif** — Build 129 Seiten
  - *Beleg:* Page count requires running an Astro build; cannot verify from static files. Overlay landings.json only lists ["belgique"] as the translated FR slug, which is consistent with the described proof.
  - *Fix:* Leave as-is; build output not checkable without running the build.

**`media_library_and_perf.md`** — 🟢 current
> All concrete claims (admin github.ts 30s cache/clearReadCache, thumb.ts weserv thumbUrl, mediaLibrary.ts POOL_DIR/MAX_DEPTH, ImageManager handleFiles/handlePickFromLibrary, MediaLibraryDrawer anchoring across managers, ImagePathField, Mediathek dashboard tab, and website slideImages.ts getAllSlidesFlat/default-selection.json filtering with getAllCitySlides being unused dead code) verify true against the current repos.

**`phase2_tag_system.md`** — 🟢 current
> All filesystem-verifiable claims (slideImages.ts folder/default-selection rendering, slides.meta.json skill categories via admin mediaLibrary.ts, reviews categories frontmatter + city folders, Anlass dimension absent) hold; only the git-branch/deploy claim is uncheckable here.
- **⚪ unverif** — Der Media-Drawer / Mediathek-Tab ist Phase 1 und fertig (shipped auf `master`).
  - *Beleg:* Names git branch 'master' and deploy/ship state; this repo is not inspectable as a git checkout from the filesystem, so ship-status and branch cannot be confirmed. The mediaLibrary.ts code itself exists at /home/sasha/codicus/Kunstwolff/kunstwolff-admin/src/services/mediaLibrary.ts, but its shipped/branch status is not filesystem-verifiable.
  - *Fix:* Keep as narrative; drop or caveat the specific 'auf master' branch assertion unless confirmed via git.

### `Kunstwolffwebsite/memory/`

**`admin-tool.md`** — 🔴 STALE
> The admin-repo path is wrong and most of the "Lücken im Admin-Tool" list is stale — managers for events, cinema, skills, why-texts, title.meta and partners now exist; referenced BUGS_TODO/human_doc docs are missing and the GitHub-Pages deploy claim is outdated.
- **❌ wrong** — Admin-Tool liegt in /home/sasha/codicus/Kunstwolff/Kunstwolff-admin/kunstwolff-admin/ — äußeres Verzeichnis Kunstwolff-admin/ ist Repo-Wrapper, App eine Ebene tiefer in kunstwolff-admin/ (auch Doku-Pfade Kunstwolff-admin/kunstwolff-admin/README.md, CLAUDE.md)
  - *Beleg:* ls: /home/sasha/codicus/Kunstwolff/Kunstwolff-admin and .../kunstwolff-admin/kunstwolff-admin do NOT exist. The actual repo is /home/sasha/codicus/Kunstwolff/kunstwolff-admin/ (lowercase, single level) with package.json, src/, README.md, CLAUDE.md directly at that root — no nested wrapper directory.
  - *Fix:* Correct path to /home/sasha/codicus/Kunstwolff/kunstwolff-admin/ and drop the 'App liegt eine Ebene tiefer' wrapper description; fix the README.md/CLAUDE.md doc paths accordingly.
- **❌ wrong** — BUGS_TODO.md unter /home/sasha/codicus/Kunstwolff/BUGS_TODO.md und human_doc_bugs.md unter /home/sasha/codicus/Kunstwolff/human_doc_bugs.md sind Single Source of Truth für Bugs/Lücken
  - *Beleg:* find /home/sasha/codicus/Kunstwolff -iname 'BUGS_TODO.md' and -iname 'human_doc_bugs.md' return nothing; neither file exists at the stated absolute paths nor anywhere in the tree.
  - *Fix:* Remove or update these references; the tracked-ticket source no longer exists at these paths.
- **⚠️ outdated** — Deployment des Admin-Tools: GitHub Pages → admin.kunstwolff.de (CNAME im Repo)
  - *Beleg:* No CNAME file anywhere in kunstwolff-admin (find -name CNAME empty), no .github/workflows dir (gh-pages workflow missing). A kunstwolff-admin.vercel.app.har artifact exists in the parent dir and MEMORY index states 'Admin=master/Vercel', indicating the admin now deploys via Vercel, not GitHub Pages.
  - *Fix:* Update deployment description to Vercel (matching the Website deploy path).
- **⚠️ outdated** — Admin-Tool kann NICHT: public/events/events.json + per-Event content.json (LÜCKE-1)
  - *Beleg:* kunstwolff-admin/src/components/EventManager.tsx line 62 EVENTS_PATH='public/events/events.json', line 72 builds 'public/events/${slug}/content.json', line 171/184 commit both — the gap is closed.
  - *Fix:* Remove LÜCKE-1 from the 'kann NICHT' list; note EventManager.tsx as the writer.
- **⚠️ outdated** — Admin-Tool kann NICHT: public/cinema/cinema.json (LÜCKE-2)
  - *Beleg:* kunstwolff-admin/src/components/CinemaManager.tsx line 63 CINEMA_PATH='public/cinema/cinema.json', line 147 commitMessage 'admin: Cinema-Willkommen aktualisiert – cinema.json' — the gap is closed.
  - *Fix:* Remove LÜCKE-2; add CinemaManager.tsx to the writes-table.
- **⚠️ outdated** — Admin-Tool kann NICHT: public/why/{key}.json – Texte der Why-Sektion (LÜCKE-4)
  - *Beleg:* kunstwolff-admin/src/components/ImageManager.tsx saveWhyBenefits() line 368 path=`public/why/${city}.json`, addPendingFile with commitMessage 'admin: Why-Texte aktualisiert (${city})' — why texts are now written by the admin.
  - *Fix:* Remove/adjust LÜCKE-4; ImageManager (why-Modus) writes public/why/{city}.json.
- **⚠️ outdated** — Admin-Tool kann NICHT: public/img/Titelbild/title.meta.json – Categories/Priority (LÜCKE-5)
  - *Beleg:* kunstwolff-admin/src/components/ImageManager.tsx line 21 TITLE_META_PATH='public/img/Titelbild/title.meta.json', line 447 addPendingFile(TITLE_META_PATH, ...) — the admin now writes title.meta.json.
  - *Fix:* Remove/adjust LÜCKE-5; ImageManager writes title.meta.json.
- **⚠️ outdated** — Admin-Tool kann NICHT: public/skills/skills.json – Skills-Liste (LÜCKE-6)
  - *Beleg:* kunstwolff-admin/src/components/Dashboard.tsx line 44 SKILLS_PATH='public/skills/skills.json', line 323 commitMessage 'admin: Skills aktualisiert – skills.json' — the gap is closed.
  - *Fix:* Remove LÜCKE-6; Dashboard.tsx writes skills.json.
- **⚠️ outdated** — public/partners/partners.json — kein eigenes Ticket, manuell (Admin schreibt nicht)
  - *Beleg:* kunstwolff-admin/src/components/PartnerManager.tsx line 23 PARTNERS_PATH='public/partners/partners.json', line 71 commitMessage 'admin: Partner aktualisiert – partners.json' — the admin now manages partners.
  - *Fix:* Move partners.json out of the 'manuell' list; add PartnerManager.tsx to the writes-table.

**`architektur.md`** — 🟡 partly-stale
> The architecture doc is largely accurate (all 12 loaders, source paths, slug-normalization and fallback minimums confirmed), but the Titelbild system-fallback path names the wrong file extension and the dated hosting/cutover status cannot be verified from the filesystem.
- **❌ wrong** — Titelbild fallback chain ends at System-Fallback `/img/samples/sample1.jpeg`
  - *Beleg:* src/utils/titleImages.ts:7 defines `const fallbackImage = '/img/samples/sample1.webp';` and `ls public/img/samples/` shows sample1.webp (no sample1.jpeg exists). The extension is .webp, not .jpeg.
  - *Fix:* Change `/img/samples/sample1.jpeg` to `/img/samples/sample1.webp` in the Fallback-Philosophie section (line 54).
- **⚪ unverif** — Hosting-Stand 2026-05-05: Astro-Build runs as stage at https://kunstwolff.vercel.app; production domain kunstwolff.de still points to old Wix site; cutover pending
  - *Beleg:* This is a deploy/DNS/live-domain status claim that cannot be checked from the repo filesystem (no git or deployment state available here). The referenced files HEALTH_CHECK_2026-05-05.md and ANLEITUNGEN/UNDEFINED_BEHAVIOR_TIDY_UPS.md both exist, but the actual live-domain cutover state is not filesystem-verifiable; the date stamp is also ~2 months stale relative to currentDate 2026-07-02.
  - *Fix:* Re-verify current cutover status against the live domain and update the dated note, or remove the hard date if no longer accurate.

**`befehle.md`** — 🟡 partly-stale
> Script names and workflow are accurate, but the "Vollständige Befehlsübersicht" and the sync:content step list are incomplete — they omit the validate:images / optimize:images / test:unit scripts and the validate:images step now appended to sync:content.
- **⚠️ outdated** — The table is titled 'Vollständige Befehlsübersicht' (complete command overview) and lists the npm scripts.
  - *Beleg:* package.json scripts include validate:images ('node scripts/validate-image-refs.mjs'), optimize:images ('node scripts/optimize-staged-images.mjs'), and test:unit ('vitest run') — none of which appear in the memory table.
  - *Fix:* Add rows for validate:images, optimize:images (staged), and test:unit to the command table.
- **⚠️ outdated** — 'sync:content führt aus' lists 7 steps: sync:landings, sync:skills, sync:title-images, sync:slides, sync:why, sync:events, sync:erinnerungen.
  - *Beleg:* package.json sync:content ends with '&& npm run validate:images', and scripts/sync-content-safe.mjs line 13 adds { name: 'validate:images', script: 'scripts/validate-image-refs.mjs' } as an 8th step. The Automatik-Reihenfolge stops at 7.
  - *Fix:* Add step 8 'validate:images' to the Automatik-Reihenfolge (runs in both sync:content and sync:content:safe).

**`content-cinema.md`** — 🟡 partly-stale
> All technical claims about the website-side CinemaWelcome (files, symbols, JSON structure, composition logic, navigation, sessionStorage keys) are accurate, but the closing claim that the Admin-Tool cannot manage cinema.json is now outdated — a CinemaManager exists.
- **⚠️ outdated** — Admin-Tool: Kann `cinema.json` nicht verwalten (geplant) — Änderungen aktuell manuell.
  - *Beleg:* Admin repo now has /home/sasha/codicus/Kunstwolff/kunstwolff-admin/src/components/CinemaManager.tsx with CINEMA_PATH = 'public/cinema/cinema.json' (line 63) and a save() function (line 141) committing 'admin: Cinema-Willkommen aktualisiert – cinema.json'; documented in admin memory/manager-cinema.md.
  - *Fix:* Update to: Admin-Tool verwaltet cinema.json über CinemaManager.tsx (draft-aware); nicht mehr nur manuell.
- **⚪ unverif** — Browser-getestet via Playwright (Happy Path + Messe-Skip), s. Commit `a6d185c`
  - *Beleg:* `git cat-file -t a6d185c` in the website repo returns 'fatal: Not a valid object name a6d185c'; the referenced commit is not present (may have been rebased/squashed).
  - *Fix:* Drop or update the commit hash reference.

**`content-erinnerungen.md`** — 🟡 partly-stale
> Core structure (files, fallback chain, max-4, sync script, admin-not-editable) all verified correct; only the "Wo angezeigt" claim about standalone Stadt-Landings is wrong.
- **❌ wrong** — Erinnerungen wird auf Stadt-Landings (/<stadt>/) angezeigt
  - *Beleg:* Standalone stadt route is src/pages/[landing].astro; `grep -n rinnerung src/pages/[landing].astro` returns nothing (exit 1) and the component is never imported there. Usage grep shows LandingErinnerungen is imported only in src/pages/[skill]/[landing].astro (line 36, registry line 193). In public/config/components.json the `erinnerungen` section appears only in the `skill-landing` _order block (line 68), not in any standalone landing block. So it renders only on /<skill>/<stadt>/, not on /<stadt>/.
  - *Fix:* Remove the '/<stadt>/' bullet; state that Erinnerungen only appears on Skill+Stadt combos (/<skill>/<stadt>/).

**`content-events.md`** — 🟡 partly-stale
> Core event content/sync/routing docs are accurate, but the "Admin cannot manage events (planned)" claim is now wrong and the events.json schema omits the shipped `image` field.
- **❌ wrong** — Admin-Tool: Kann Events **nicht** verwalten (geplant).
  - *Beleg:* /home/sasha/codicus/Kunstwolff/kunstwolff-admin/src/components/EventManager.tsx exists and fully manages events: EVENTS_PATH = 'public/events/events.json' (line 62), createEvent() (line 176) writes both events.json (addPendingFile EVENTS_PATH, lines 167/1378) and per-event content.json (contentPath(slug), lines 72/180). Admin can create and edit events.
  - *Fix:* Replace with: Admin verwaltet Events via EventManager.tsx (schreibt events.json + <slug>/content.json über pendingFiles).
- **⚠️ outdated** — events.json registry example lists only title/slug/heroTitle/description/categories per event
  - *Beleg:* Actual public/events/events.json entries include an `image` field (e.g. firmenfeier: "image": "/img/slides/events/firmenfeier/...webp"; messe/hochzeit/private-feier likewise). Admin EventManager EventMeta interface also declares `image?: string`. The memory example and Feld-Referenz omit `image` entirely.
  - *Fix:* Add optional `image` field to the events.json example and field reference (used as hero/preview image path, per comment in EventManager.tsx line 451: image = events.json ?? erstes Slide ?? Titelbild).

**`content-faqs.md`** — 🟡 partly-stale
> Format/Schema/Admin/Loader claims still hold, but the central claim that only public/faq/default exists and no city-specific FAQs were created is now wrong — 21 city folders with content exist.
- **❌ wrong** — public/faq/<stadt>/*.md ... (Loader unterstützt es, aktuell NICHT angelegt)
  - *Beleg:* ls public/faq/ shows 21 city subdirs beyond default (belgique, bw, duesseldorf, frankfurt, heidelberg, kaiserslautern, karlsruhe, koblenz, koeln, ludwigshafen, luxembourg, mainz, mannheim, rheinland-pfalz, saarbruecken, saarland, schweiz, trier, wiesbaden, wuppertal); each contains .md files (e.g. frankfurt/spricht-der-schnellzeichner-englisch.md, belgique/{branding,buchung,kosten}.md).
  - *Fix:* Update to state city-specific FAQ folders ARE populated (list current cities), removing 'aktuell NICHT angelegt'.
- **❌ wrong** — public/faq/default/*.md ... (aktuell die einzige genutzte Quelle)
  - *Beleg:* src/utils/faq.ts getFAQsByCity() (lines 158-170) filters FAQs by city and only falls back to default when a city has zero FAQs, so populated city folders are actively used, not just default.
  - *Fix:* Remove 'die einzige genutzte Quelle'; city folders are consumed via getFAQsByCity.
- **⚠️ outdated** — **Stand jetzt:** Nur public/faq/default/ existiert. Stadt-spezifische FAQs ... wurden aber für keine Stadt angelegt.
  - *Beleg:* Filesystem shows city FAQ dirs created 15 Jun / 18 Jun 2025 with markdown content; this 'Stand jetzt' snapshot predates that.
  - *Fix:* Rewrite the status paragraph to reflect that many cities now have FAQ folders.
- **⚠️ outdated** — Frontmatter-Felder table lists only question/answer/categories/city
  - *Beleg:* src/utils/faq.ts FAQItem type and parseFaqFile (lines 11-16, 77-85) also parse a `tags` object with events/skills/landings arrays, used by matchesFAQContext (lines 105-134) for skill/event/landing filtering.
  - *Fix:* Add a `tags` frontmatter field (events/skills/landings) to the table and Filter-Logik section.

**`content-landings.md`** — 🟡 partly-stale
> Core loader/normalization and add-city sync are accurate, but the remove-landing archiving claims and one auto-created directory in the add-city workflow no longer match the current scripts.
- **❌ wrong** — Workflow 'Neue Stadt hinzufügen': npm run sync:content erstellt automatisch public/faq/<stadt>/
  - *Beleg:* No sync script creates faq/<city> dirs. grep 'faq' + mkdir/ensureDir over scripts/*.mjs returns nothing; faqRoot in scripts/sync-landings.mjs:11 is only used inside mergeDuplicateLandingArtifacts (merge, not create). The per-city loop in sync-landings.mjs:970-991 only creates slideDir and reviewDir. Other sync scripts (sync-why, sync-title-images, sync-erinnerungen) create why/Titelbild/erinnerungen but no faq. faq dirs exist in public/faq/ but are not auto-created by sync:content.
  - *Fix:* Remove public/faq/<stadt>/ from the list of auto-created directories (or note it must be created manually).
- **❌ wrong** — Workflow 'Stadt entfernen': public/img/Titelbild/<stadt>/ wird NICHT archiviert (manuell aufräumen)
  - *Beleg:* scripts/remove-landing.mjs:340 includes collectMatchingTitleImageTargets(roots.titleImages, landingSlug) in directoriesToMove, and collectMatchingTitleImageTargets (lines 157-186) collects public/img/Titelbild/<slug> (current structure, line 165) plus legacy structures. These are moved to the archive at lines 353-355. Titelbild IS archived.
  - *Fix:* Move public/img/Titelbild/<stadt>/ into the 'Was archiviert wird' list.
- **❌ wrong** — Workflow 'Stadt entfernen': Einträge in title.meta.json bleiben als verwaiste Metadaten
  - *Beleg:* scripts/remove-landing.mjs:357 calls cleanTitleMetadataForLanding(roots.titleMeta, landingSlug) which deletes matching keys and rewrites title.meta.json (lines 99-155, writeFileSync at 150); the report logs updatedTitleMeta/removedTitleMetaKeys (lines 372-373, console at 395-397). title.meta.json IS cleaned. (The slides.meta.json half of the claim remains true — no script cleans it.)
  - *Fix:* Remove title.meta.json from the 'NICHT archiviert / verwaiste Metadaten' note; keep only slides.meta.json there.

**`content-navigation.md`** — 🟡 partly-stale
> Core navigation format, fields, code fallback, and admin claims are accurate, but the referenced end-user guide file no longer exists.
- **❌ wrong** — Endbenutzer-Anleitung `ANLEITUNGEN/Wie?_NAVIGATION.md` – ausführliche, nicht-technische Anleitung für Endbenutzer.
  - *Beleg:* `ls ANLEITUNGEN/` shows only `UNDEFINED_BEHAVIOR_TIDY_UPS.md`; `ls ANLEITUNGEN/Wie?_NAVIGATION.md` returns 'No such file or directory', and a repo-wide `find -iname '*navigation*'` finds no such guide.
  - *Fix:* Remove the reference to ANLEITUNGEN/Wie?_NAVIGATION.md (the file was deleted) or point to the current guide location.

**`content-referenzlogos.md`** — 🟡 partly-stale
> Folder path, auto-discovery, and Partner section are correct, but the allowed-formats list omits .svg/.gif/.jpeg and the label rule wrongly claims hyphens are preserved.
- **❌ wrong** — Erlaubte Formate: `.webp`, `.png`, `.jpg`, `.avif`
  - *Beleg:* src/utils/brandLogos.ts:9 defines allowedExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']). Memory omits .svg, .gif and .jpeg. The referenzenLogos/ dir actually contains many .svg files (Bulgari.svg, CDU.svg, Diageo.svg, etc.), which the memory's list would exclude.
  - *Fix:* List allowed formats as .avif, .gif, .jpeg, .jpg, .png, .svg, .webp (svg is heavily used).
- **❌ wrong** — Label-Generierung: nur Unterstriche werden zu Leerzeichen; Beispiel `kunde-xyz.png` -> Label "kunde-xyz"
  - *Beleg:* src/utils/brandLogos.ts:31 uses .replace(/[_-]+/g, ' '), which turns BOTH underscores and hyphens into spaces. So `kunde-xyz.png` yields "kunde xyz", not "kunde-xyz", and the prose describing only underscores is incomplete.
  - *Fix:* State that underscores AND hyphens become spaces; fix the table row `kunde-xyz.png` -> "kunde xyz".

**`content-reviews.md`** — 🟡 partly-stale
> The .md format, frontmatter, fallback logic and admin-tool sections are all confirmed, but the entire "Anzeige (MiniReviews.astro)" height-sync description is wrong against the rewritten component, and the documented default/ folder does not exist.
- **❌ wrong** — MiniReviews: alle Slides liegen absolut übereinander im .review-track
  - *Beleg:* src/components/reviews-references/MiniReviews.astro CSS: .review-slide {display:none} / .review-slide.is-active {display:flex} in normal flow; inline comment lines 113-115 & 181-182 explicitly say 'kein Stapeln, kein Messen' – no absolute positioning anywhere.
  - *Fix:* Rewrite: exactly one .review-slide is display:flex (is-active), rest display:none; height flows naturally, no absolute stacking.
- **❌ wrong** — Die Track-Höhe wird per JS auf das aktive Review gesetzt (syncHeight() → track.style.height) und per CSS weich animiert (transition: height)
  - *Beleg:* grep for 'syncHeight', 'track.style', 'style.height', 'transition: height' in MiniReviews.astro returns no matches; .review-track {width:100%} only (line 177-179). No height-measuring JS exists.
  - *Fix:* Remove the syncHeight/track.style.height/transition:height description; height now derives from the single visible slide in normal flow.
- **❌ wrong** — syncHeight läuft initial, bei document.fonts.ready, bei resize und nach jedem Slide-Wechsel
  - *Beleg:* grep for 'fonts.ready' in MiniReviews.astro: no match. The resize listener (line 149-151) only re-runs applyReviewTheme; goTo() (line 126-135) only toggles is-active class, no height sync.
  - *Fix:* Drop this line; only applyReviewTheme runs on init and resize now.
- **⚠️ outdated** — Ablage: public/reviews/default/*.md — generische Reviews (Fallback)
  - *Beleg:* `ls public/reviews/default/` → No such file or directory; `find public/reviews -iname default` → empty; no review .md has `city: default` frontmatter. The 'default' pool is still supported in code (reviews.ts defaultCityKey='default', line 14) but currently contains zero reviews.
  - *Fix:* Note that the default/ folder currently does not exist; 'default' remains a supported city key (folder name or city frontmatter) but is presently empty.

**`content-site-texts.md`** — 🟡 partly-stale
> All paths, util functions, resolution logic, defaults, and admin managers verify correct, but the described visibility gating via show('landingIntro') is outdated — gating now runs through the component-stack registry.
- **⚠️ outdated** — LandingIntro auf den Stadtseiten ist "gegated über show('landingIntro')" (Zeile 31).
  - *Beleg:* grep for show('landingIntro') in src/ returns zero hits. src/pages/[landing].astro (lines 168,186) registers landingIntro in a section registry; visibility is decided by isComponentEnabled/resolveSectionOrder from componentConfig (components.json), not a show() helper.
  - *Fix:* Replace "gegated über show('landingIntro')" with: Sichtbarkeit über den Sektions-Stack (components.json order + isComponentEnabled), Registry-ID `landingIntro`.
- **❌ wrong** — Startseiten-Intro wird gerendert via getHomeIntro() → `{show('landingIntro') && <LandingIntro text={homeIntro} />}` (Zeile 37).
  - *Beleg:* src/pages/index.astro line 21 does `const homeIntro = getHomeIntro()`, and lines 33-56/88-94 render via a registry map (`landingIntro: LandingIntro`, props `{ text: homeIntro }`) gated by `isComponentEnabled(PAGE_TYPE, '', id)`. There is no `show('landingIntro') && ...` expression anywhere.
  - *Fix:* Update to reflect the registry/sectionOrder rendering: landingIntro is a registry entry with props { text: homeIntro }, shown when isComponentEnabled returns true.

**`content-titelbild.md`** — 🟡 partly-stale
> All layout/code/admin claims are confirmed except the documented ".jpeg" fallback-path mismatch, which has since been fixed (the constant now points to sample1.webp, which exists).
- **⚠️ outdated** — Bekannter Pfad-Mismatch (HEALTH_CHECK §VAL-3): die fallbackImage-Konstante in titleImages.ts zeigt auf .jpeg, aber im Verzeichnis liegt nur sample1.webp; bei echtem Fallback ein 404-Bild; Fix nötig.
  - *Beleg:* src/utils/titleImages.ts:7 reads `const fallbackImage = '/img/samples/sample1.webp';` (not .jpeg), and public/img/samples/sample1.webp exists (ls confirms). The mismatch is already resolved; no 404 and no fix pending.
  - *Fix:* Remove the §VAL-3 warning; note the fallback is /img/samples/sample1.webp and the file is present.
- **❌ wrong** — Fallback-Kette Schritt 3: System-Fallback `/img/samples/sample1.jpeg` (wenn auch default/ leer ist).
  - *Beleg:* src/utils/titleImages.ts:7 defines fallbackImage as '/img/samples/sample1.webp'; used at line 206 `src: picked?.src ?? fallbackImage`. The path is .webp, not .jpeg.
  - *Fix:* Change the documented fallback path to /img/samples/sample1.webp.

**`content-why.md`** — 🟡 partly-stale
> Core structure (resolution order, paths, sync-why file generation) is accurate, but two claims are stale: sync no longer writes per-key image paths, and the Admin now DOES manage the Why texts.
- **❌ wrong** — Admin-Tool: 'Texte in public/why/<key>.json werden vom Admin nicht verwaltet – manuell pflegen' (line 62-63)
  - *Beleg:* kunstwolff-admin/src/components/ImageManager.tsx has title/text input fields (lines 770-783 updateWhyBenefit title/text) and saveWhyBenefits() writes to `public/why/${city}.json` with commitMessage 'admin: Why-Texte aktualisiert (${city})' (lines 366-380). pageTypes.ts:72 defines editorType 'why'. public/why/berlin.json already contains admin-authored title/alt overrides.
  - *Fix:* Update to say the Admin Why-editor (ImageManager, editorType 'why') manages both images AND texts (title/text/alt), writing per-field overrides into public/why/<city>.json.
- **⚠️ outdated** — Sync-Script: 'Basis: default.json. Bildpfade werden auf den jeweiligen Key angepasst.' (line 58)
  - *Beleg:* scripts/sync-why.mjs buildBenefitsForTarget() (lines 273-290) now returns all-empty fields {title:'',text:'',image:'',alt:''} per comment 'Alle Felder leer – Website merged komplett aus default.json'. Image paths are NOT rewritten per key anymore; they stay empty and are merged from default.json at runtime in why.ts.
  - *Fix:* Replace 'Bildpfade werden auf den jeweiligen Key angepasst' with: generierte Stadt-/Skill-Dateien enthalten leere Felder (title/text/image/alt); die Website merged fehlende Felder aus default.json. Eigene Bilder/Texte entstehen nur durch Admin-Upload.

**`git-hooks.md`** — 🟡 partly-stale
> Hook mechanics, scripts, and image-optimization details are all accurate; only the admin-repo path casing and the "4 Bild-Manager" consumer count are off.
- **❌ wrong** — Admin-Tool konvertiert browser-seitig via `Kunstwolff-admin/src/utils/imageWebp.ts` (lines 44, 46 reference `Kunstwolff-admin/...`).
  - *Beleg:* `find` locates the file only at lowercase `/home/sasha/codicus/Kunstwolff/kunstwolff-admin/src/utils/imageWebp.ts`; there is no `Kunstwolff-admin` directory (`ls /home/sasha/codicus/Kunstwolff/Kunstwolff-admin` -> No such file or directory). On case-sensitive Linux the written path is broken.
  - *Fix:* Change `Kunstwolff-admin/` to `kunstwolff-admin/` in both references (lines 44 and 46).
- **⚠️ outdated** — `imageWebp.ts` wird von allen 4 Bild-Managern genutzt (line 44).
  - *Beleg:* grep -rl imageWebp over kunstwolff-admin/src returns 5 files: ImageManager.tsx, MediaLibrary.tsx, CinemaManager.tsx, PartnerManager.tsx, BrandStripeManager.tsx. There are now 5 consumers (4 *Manager components plus MediaLibrary.tsx), not 4.
  - *Fix:* Update to note it is used by all image managers plus MediaLibrary (5 consumers), or state '4 Managern + Mediathek'.

**`index.md`** — 🟡 partly-stale
> All 25 subfile references and every content-path/symbol claim are accurate, but three external "Status & offene Punkte" pointers are broken (two bug-log files missing, one wrong admin-memory path).
- **❌ wrong** — `BUGS_TODO.md` (`/home/sasha/codicus/Kunstwolff/BUGS_TODO.md`) – Bug-Log Admin-Tool + Lücken (LÜCKE-1 bis 6). (line 47)
  - *Beleg:* Wide search `find /home/sasha/codicus/Kunstwolff -iname "BUGS_TODO*"` (excluding node_modules) returned no results; file does not exist at the stated path or anywhere in the tree.
  - *Fix:* Remove the BUGS_TODO.md pointer, or update it to the file's real location if it was moved/renamed.
- **❌ wrong** — `human_doc_bugs.md` (`/home/sasha/codicus/Kunstwolff/human_doc_bugs.md`) – User-/Mom-gemeldete UX-Issues. (line 48)
  - *Beleg:* `find /home/sasha/codicus/Kunstwolff -iname "human_doc_bugs*"` returned nothing; file absent at stated path and everywhere else.
  - *Fix:* Remove or correct the human_doc_bugs.md pointer.
- **❌ wrong** — Cross-Repo Admin-Memory liegt unter `Kunstwolff-admin/kunstwolff-admin/memory/index.md` (line 71)
  - *Beleg:* Actual admin memory index is at `/home/sasha/codicus/Kunstwolff/kunstwolff-admin/memory/index.md` (single-level, lowercase). The path `Kunstwolff-admin/kunstwolff-admin/...` (double-nested, capital K) does not exist: `ls /home/sasha/codicus/Kunstwolff/Kunstwolff-admin` fails and there is no nested `kunstwolff-admin/kunstwolff-admin/` dir.
  - *Fix:* Change reference to `kunstwolff-admin/memory/index.md`.

**`komponenten-stack.md`** — 🟡 partly-stale
> All core website claims (components.json categories, componentConfig.ts functions, per-page registry/sectionProps/resolveSectionOrder wiring, cinemaWelcome history) are confirmed accurate; only the cross-repo admin file paths are missing their src/components/ prefix.
- **⚠️ outdated** — Admin-Tool liest/schreibt _order in interface/InterfaceView.tsx und COMP-Eintrag in interface/pageTypes.ts
  - *Beleg:* find in kunstwolff-admin: no such path interface/InterfaceView.tsx; actual files are src/components/interface/InterfaceView.tsx and src/components/interface/pageTypes.ts (both confirmed to exist, contain PAGE_STACKS/COMP/_order drag-reorder logic). Memory omits the src/components/ path prefix.
  - *Fix:* Reference the admin files as src/components/interface/InterfaceView.tsx and src/components/interface/pageTypes.ts

**`pfadstruktur.md`** — 🟡 partly-stale
> Path structure is largely accurate, but the FAQ section wrongly claims only default/ exists (many city FAQ dirs now present) and the Reviews section lists a default/ directory that does not exist.
- **⚠️ outdated** — FAQ: 'public/faq/default/*.md aktuell die einzige genutzte Quelle', '<stadt>/*.md vom Loader unterstützt, aktuell NICHT angelegt', 'Stand jetzt: nur public/faq/default/ existiert.'
  - *Beleg:* ls public/faq shows ~20 city dirs (belgique, bw, duesseldorf, frankfurt, heidelberg, kaiserslautern, karlsruhe, koblenz, koeln, ludwigshafen, luxembourg, mainz, mannheim, rheinland-pfalz, saarbruecken, saarland, schweiz, trier, wiesbaden) each with .md files (e.g. public/faq/mannheim has booking.md, buchung.md, kosten.md), not just default/.
  - *Fix:* Remove the 'NICHT angelegt / nur default existiert' notes; city-specific FAQ dirs are now populated and read by faq.ts.
- **❌ wrong** — Reviews structure lists 'public/reviews/default/' as an existing subdir
  - *Beleg:* ls public/reviews | grep -i default returns nothing (exit 1); top-level listing shows only _vorlage.md plus city dirs, no default/ directory.
  - *Fix:* Drop the default/ entry from the reviews tree (reviews has _vorlage.md + <stadt>/*.md only).

**`projekt.md`** — 🟡 partly-stale
> Tech-stack, layout, hosting and SEO claims all verify against the repo, but the Admin-Tool path is wrong (nested Kunstwolff-admin/kunstwolff-admin does not exist) and the described predev/prebuild command name is inaccurate.
- **❌ wrong** — Das Admin-Tool liegt unter /home/sasha/codicus/Kunstwolff/Kunstwolff-admin/kunstwolff-admin/ und dessen Memory unter Kunstwolff-admin/kunstwolff-admin/memory/index.md (Zeile 65).
  - *Beleg:* `ls -d /home/sasha/codicus/Kunstwolff/Kunstwolff-admin/kunstwolff-admin/` -> No such file or directory. The actual repo is at /home/sasha/codicus/Kunstwolff/kunstwolff-admin/ (single, lowercase segment), and its memory index exists at /home/sasha/codicus/Kunstwolff/kunstwolff-admin/memory/index.md.
  - *Fix:* Replace both path references with /home/sasha/codicus/Kunstwolff/kunstwolff-admin/ and /home/sasha/codicus/Kunstwolff/kunstwolff-admin/memory/index.md.
- **⚠️ outdated** — Vor dev und build laeuft automatisch `npm run sync:content` (Zeile 37).
  - *Beleg:* package.json defines `predev` and `prebuild` as `npm run sync:content:safe`, not `sync:content`. `sync:content` is a separate, manually-invoked script. CLAUDE.md itself states sync:content:safe runs as predev/prebuild.
  - *Fix:* Change to `npm run sync:content:safe` to match the actual predev/prebuild hooks.

**`routing.md`** — 🟡 partly-stale
> Core routing model (dynamic [landing]/[skill] routes, pageType event/landing split, skill-image and categories filtering, sitemap) is accurate, but the standalone-page table is wrong on the FAQ file casing and omits several pages plus the FR route that now exist.
- **❌ wrong** — Static standalone page `/FAQ/` is served by `src/pages/FAQ.astro`.
  - *Beleg:* `ls src/pages/ | grep -i faq` returns only `faq.astro` (lowercase); there is no `FAQ.astro`. Astro derives the route from the filename, so the actual URL is `/faq/`, not `/FAQ/` (routing.md line 24).
  - *Fix:* Change the row to `/faq/` -> `src/pages/faq.astro`.
- **⚠️ outdated** — The complete set of static standalone pages is /partner/, /contact/, /FAQ/, /datenschutz/, /impressum/ (routing.md lines 20-26).
  - *Beleg:* `find src/pages -type f` shows additional standalone pages not in the table: branding.astro, canvas.astro, du-bist-kunst.astro, referenzen.astro, stimmung-durch-kunst.astro, and 404.astro.
  - *Fix:* Add the missing standalone routes (branding, canvas, du-bist-kunst, referenzen, stimmung-durch-kunst, 404) to the table.
- **⚠️ outdated** — The dynamic-route table (lines 9-16) enumerates all generated routes; only [landing], [skill], and [skill]/[landing] page-files exist.
  - *Beleg:* `find src/pages` shows `src/pages/fr/[landing].astro`, a French-overlay dynamic route (confirmed by i18n_foundation memory) that is not listed in routing.md's route tables.
  - *Fix:* Add the /fr/<landing> route (src/pages/fr/[landing].astro) or cross-reference the i18n memory file.

**`seo.md`** — 🟡 partly-stale
> Core SEO claims (SITE_URL fallback, robots whitelist, sitemap, schemas, hardcoded LocalBusiness, robots.txt) all hold; only the homepage example title uses an outdated "20 Jahren" figure.
- **⚠️ outdated** — Homepage Beispiel-Title: `Kunstwolff – Eventkünstler seit über 20 Jahren` (memory line 59)
  - *Beleg:* index.astro line 85 calls `<Layout image={titleImage}>` with no title, so it uses Layout.astro's default title. src/layouts/Layout.astro line 10 now reads `title = "Kunstwolff – Eventkünstler seit über 25 Jahren"` (25, not 20). index.astro line 67 also says "seit über 25 Jahren".
  - *Fix:* Update the example homepage title to "Kunstwolff – Eventkünstler seit über 25 Jahren".
- **⚪ unverif** — Vercel Environment Variables: SITE_URL must be set to `https://kunstwolff.vercel.app` (Stage) / `https://www.kunstwolff.de` after cutover (memory lines 33-37)
  - *Beleg:* This is external Vercel-dashboard config; the code side (`process.env.SITE_URL ?? "https://kunstwolff.de"` at astro.config.mjs line 19) is confirmed, but the actual dashboard value and current cutover state cannot be checked from the filesystem.
  - *Fix:* None needed for code; dashboard state must be verified in Vercel directly.

**`wip-komponenten.md`** — 🟡 partly-stale
> Two of three components are still unreferenced as documented, but Eventtypes.astro is now imported and registered in the component map in index.astro and [landing].astro, so its "nirgendwo importiert" claim is wrong.
- **❌ wrong** — src/components/Eventtypes.astro ist nirgendwo in Pages/Layouts importiert (WIP, noch nicht live).
  - *Beleg:* grep found `import Eventtypes from "../components/Eventtypes.astro"` at src/pages/index.astro:11 (registered `eventtypes: Eventtypes` line 39) and src/pages/[landing].astro:27 (registered line 172). Component is actively wired into the section component map, contradicting the 'nirgendwo importiert' claim.
  - *Fix:* Remove Eventtypes from the WIP/not-imported table; it is now live via index.astro and [landing].astro. Keep only SchnellzeichnerHero and AboutSchnellzeichner (still unreferenced, verified).

**`content-skills.md`** — 🟢 current
> All concrete claims (skills.json path/fields, slug generation, skill/stadt/event page routes, folder-image resolution, category filtering for slides/reviews/FAQs, sync:skills script, admin cannot manage skills.json) are verified true against the current repo.

**`content-slides.md`** — 🟢 current
> All concrete claims in content-slides.md (paths, formats, metadata fields, priority/sort logic, MIN 6-slide fallback, webp dedup, lightbox zoom/keys, pre-push webp conversion) verify against the current website repo.

**`sync-scripts.md`** — 🟢 current
> Every concrete claim (script names/order, predev/prebuild:safe, per-script behaviors, and the sync-landings.yml trigger/git-add gaps) verifies against the current repo.

**`validierungsreports.md`** — 🟢 current
> All claims about the sync:landings validation report (path, content keys slideVisibility/allImageVisibility/unreferencedImages, and 7-report retention) match scripts/sync-landings.mjs exactly.

### `kunstwolff-admin/memory/`

**`einschraenkungen.md`** — 🔴 STALE
> The file's core "Bekannte Lücken" list is largely obsolete — 5 of 6 claimed gaps (Events, Cinema, Why-Texte, title.meta.json, Skills) are now implemented in the admin, and the "Single Source of Truth" BUGS_TODO.md no longer exists.
- **❌ wrong** — Single Source of Truth für offenen Status: /home/sasha/codicus/Kunstwolff/BUGS_TODO.md (referenced again on line 42 as Volltext aller Fixes)
  - *Beleg:* find /home/sasha/codicus/Kunstwolff -iname '*BUGS_TODO*' returns nothing; ls of the path errors 'No such file or directory'. The file referenced 3x (lines 3, 42, and admin CLAUDE.md) does not exist.
  - *Fix:* Remove or repoint the BUGS_TODO.md references; the SSOT file is gone.
- **⚠️ outdated** — LÜCKE-1: Events-Manager nicht implementiert — public/events/events.json + content.json manuell per Git pflegen
  - *Beleg:* src/components/EventManager.tsx exists and writes both files: line 62 EVENTS_PATH='public/events/events.json', line 72 builds public/events/${slug}/content.json, line 171/184 addPendingFile with commitMessage 'admin: Events aktualisiert' / 'Neues Event angelegt'. The Events manager is built.
  - *Fix:* Remove LÜCKE-1; Events are now editable via EventManager.tsx.
- **⚠️ outdated** — LÜCKE-2: CinemaWelcome-Manager nicht implementiert — public/cinema/cinema.json manuell
  - *Beleg:* src/components/CinemaManager.tsx exists; line 63 CINEMA_PATH='public/cinema/cinema.json', line 147 addPendingFile with commitMessage 'admin: Cinema-Willkommen aktualisiert – cinema.json'. Manager is built.
  - *Fix:* Remove LÜCKE-2; Cinema is now editable via CinemaManager.tsx.
- **❌ wrong** — LÜCKE-4: Why-Texte-Manager — Bilder werden vom Admin verwaltet, Texte nicht
  - *Beleg:* src/components/ImageManager.tsx saveWhyBenefits() (line 366) writes public/why/${city}.json with commitMessage 'admin: Why-Texte aktualisiert (${city})'; updateWhyBenefit() patches benefit text. Both images AND texts are now managed.
  - *Fix:* Remove LÜCKE-4 / update note: Why texts are now editable in ImageManager.
- **⚠️ outdated** — LÜCKE-5: title.meta.json nicht implementiert — Pendant zu slides.meta.json manuell pflegen
  - *Beleg:* src/components/ImageManager.tsx line 21 TITLE_META_PATH='public/img/Titelbild/title.meta.json'; line 447 addPendingFile(TITLE_META_PATH, ...) writes focus/frame patches (lines 443-449, 959-961). Admin now reads and writes title.meta.json.
  - *Fix:* Remove LÜCKE-5; title.meta.json (focus/frame) is now editable via ImageManager.
- **⚠️ outdated** — LÜCKE-6: Skills-Manager nicht implementiert — public/skills/skills.json manuell
  - *Beleg:* src/components/Dashboard.tsx line 44 SKILLS_PATH='public/skills/skills.json'; Quick-Add (line ~318) does addPendingFile(SKILLS_PATH, ...) with commitMessage 'admin: Skills aktualisiert – skills.json', appending new skills. Admin can now create/write skills.json (at least via Quick Add).
  - *Fix:* Update LÜCKE-6: skills.json is now writable via Dashboard Quick-Add (note remaining limits if full editor still absent).

**`publish-workflow.md`** — 🔴 STALE
> The peripheral sections (Draft-State, SHA-Refresh, WebP-Konvertierung, Bugs) still hold, but the file's central description of HOW publishing works is now wrong: publishing is a single atomic Git-Data-API batch commit, not per-file sequential Contents PUT/DELETE with partial-success handling.
- **❌ wrong** — Veröffentlichen-Button: 'Klick → sequenzielle Abarbeitung der Drafts' with per-draft-type table: Neue Datei = PUT /contents ohne SHA, Geänderte = PUT /contents mit SHA, Gelöschte = DELETE /contents mit SHA (lines 9-17).
  - *Beleg:* src/services/publish.ts:8-9 comment 'Seit dem Batch-Commit gibt es nur noch EINE Operation: alle Draft-Änderungen als ein einziger Commit (Git-Data-API) statt ein Contents-PUT pro Datei.' publishPending() (line 84) builds a single BatchCommitEntry[] and calls commitBatch/commitFilesBatch (github.ts:230), which uses git/trees + git/commits + git/refs (github.ts:264-278), not the Contents API per file. No per-file SHA is sent (tree merges on base_tree).
  - *Fix:* Replace the table with: publish serializes all drafts into one atomic Git-Data-API commit (github.commitFilesBatch: create tree on base_tree, create commit, update ref). Deletes use {path, delete:true}; new/changed use {path, content, encoding}. No per-file SHA.
- **❌ wrong** — Teilerfolg-Handling: 'Wenn N Dateien verarbeitet werden und ein Teil fehlschlägt' → erfolgreiche raus, fehlgeschlagene bleiben, erneuter Klick versucht nur die verbliebenen; 'kein SHA-Mismatch durch Doppel-Commit' (lines 19-26).
  - *Beleg:* publish.ts:74-78 docblock states the batch is atomic ('alles oder nichts') and 'Fehler: nichts wird entfernt (Draft bleibt)'. On failure (catch at line 130) no batchPaths are removed; there is no per-file partial success anymore. Partial-success semantics no longer exist.
  - *Fix:* Rewrite: publish is atomic (all-or-nothing). On any error nothing is removed from pendingFiles; a per-file PublishFailure is still emitted for UI classification, but the retry re-commits the whole batch.
- **❌ wrong** — Mehrere Commits pro Klick: 'Aktuell erzeugt jede Datei einen eigenen Commit (sequenzielle PUT/DELETE-Calls)' und 'Bekannte Limitierung (akzeptiert): Kein Batch-Commit (das würde GraphQL-API + Tree-Manipulation erfordern)' (lines 34-38).
  - *Beleg:* Batch-commit IS implemented: github.ts:230 commitFilesBatch produces exactly ONE commit per publish via git/trees + git/commits + git/refs (REST Git-Data-API, not GraphQL). publish.ts:70-75 explicitly documents the switch away from 'ein Commit pro Datei'. The 'accepted limitation' no longer applies.
  - *Fix:* Delete this section or invert it: publish now produces a single commit per click via the Git-Data-API (Tree-Manipulation, REST not GraphQL).
- **⚠️ outdated** — WebP-Konvertierung 'Genutzt von allen 4 Bild-Upload-Managern: ImageManager, CinemaManager, BrandStripeManager, PartnerManager' (lines 57-58).
  - *Beleg:* grep -rln imageToWebpUpload src/components returns 5 files: ImageManager, CinemaManager, PartnerManager, BrandStripeManager AND MediaLibrary.tsx. The count '4' and the enumeration omit MediaLibrary.
  - *Fix:* Change to '5 Bild-Upload-Managern' and add MediaLibrary to the list.
- **⚠️ outdated** — SHA-Refresh: 'Alle Manager (ImageManager, ReviewManager, FaqManager, CityManager, CleanupManager, CalendarView) lesen den refreshCounter-Signal' (line 32).
  - *Beleg:* grep -rln 'refreshCounter|triggerRefresh' src/components returns 18 components, far beyond the 6 listed (also CanvasPageManager, PartnerManager, IntroManager, StimmungDurchKunstManager, BrandingPageManager, SiteTextsManager, EventManager, CinemaManager, BrandStripeManager, DuBistKunstManager, SiteGraphView, MediaLibrary). The 6 named ones still read it, but the enumeration is presented as complete and is now a stale subset.
  - *Fix:* Say all data-loading managers consume refreshCounter (18+ components) rather than listing a fixed 6.

**`architektur.md`** — 🟡 partly-stale
> Core mechanics (Draft-State, refreshCounter, normalizeSlug, github service functions) all still hold, but the Code-Struktur/Hierarchie diagram and the github.ts signature table are significantly out of date.
- **⚠️ outdated** — Code-Struktur / Komponenten-Hierarchie lists only 8 components (Auth, Dashboard, ImageManager, ReviewManager, CityManager, FaqManager, CalendarView, EventModal, CleanupManager), 3 services (github, state, calendar) and 2 utils (encoding, markdown).
  - *Beleg:* ls src/components shows ~28 components — new ones incl. EventManager.tsx, MediaLibrary.tsx, MediaLibraryDrawer.tsx, SiteTextsManager.tsx, AiChat.tsx, BrandingPageManager.tsx, BrandStripeManager.tsx, CinemaManager.tsx, CanvasPageManager.tsx, DuBistKunstManager.tsx, IntroManager.tsx, PartnerManager.tsx, StimmungDurchKunstManager.tsx, GlobalComponentsView.tsx, SiteGraphView.tsx, SeoHelper.tsx, AdminUserInvite.tsx, ImagePathField.tsx. src/services also has ai.ts, auth.ts, publish.ts, mediaLibrary.ts, github-errors.ts; src/utils also has authVault.ts, cities.ts, imageWebp.ts, loadCache.ts, thumb.ts, whyBenefits.ts. None of these appear in the diagram.
  - *Fix:* Regenerate the structure/hierarchy diagram to include the section managers, MediaLibrary, EventManager, and the new services/utils.
- **⚠️ outdated** — github.ts write ops table: putFile(path, content, sha?) and deleteFile(path, sha).
  - *Beleg:* src/services/github.ts:155 putFile(path: string, content: string, sha: string | null, message: string) — sha is a required positional arg (not optional sha?) and a required message param exists; src/services/github.ts:201 deleteFile(path: string, sha: string, message: string) — also takes message. The table omits the message parameter and mislabels sha as optional. New unlisted exports: getFileRespectingDraft (125), putBinaryFile (178), commitFilesBatch (230), testConnection, isAuthError, clearReadCache, rawUrl.
  - *Fix:* Update signatures to putFile(path, content, sha, message) and deleteFile(path, sha, message); add putBinaryFile/commitFilesBatch/getFileRespectingDraft to the table.
- **⚪ unverif** — Im master-Branch gibt's einen server/ + worker/ für WIP-Features.
  - *Beleg:* server/ and worker/ directories exist on disk (ls -d server worker succeeds), but this repo is not a git checkout in this environment so the branch association (master) cannot be verified.
  - *Fix:* Leave as-is if branch is correct; cannot confirm from filesystem.

**`cross-repo.md`** — 🟡 partly-stale
> Most cross-repo structural claims (paths, github.ts functions, sync pipeline, manager/path table) still hold, but the WebP-upload reibungspunkt and the "EventManager later" framing are outdated.
- **⚠️ outdated** — WebP-Konvertierung: Admin-Uploads umgehen den Hook und landen unkomprimiert (Zeile 61)
  - *Beleg:* kunstwolff-admin/src/components/ImageManager.tsx:5 imports imageToWebpUpload and line 528 calls it on every upload; src/utils/imageWebp.ts:21-65 now converts jpg/jpeg/png browser-side to WebP (maxWidth 1600, quality 0.75) before the API-PUT. Its own header comment (lines 3-6) states this exists specifically to stop Admin uploads landing as jpg/png. So Admin uploads are no longer 'unkomprimiert'.
  - *Fix:* Update to: Admin uploads are now converted to WebP client-side via imageToWebpUpload (max 1600px, q0.75), mirroring the pre-push hook; only gif/svg/avif/webp pass through unchanged.
- **⚠️ outdated** — GitHub Action triggert nicht fuer events.json: 'Wenn Admin spaeter einen EventManager bekommt' (Zeile 62)
  - *Beleg:* The EventManager already exists: kunstwolff-admin/src/components/EventManager.tsx:62 defines EVENTS_PATH='public/events/events.json' and writes it (addPendingFile at line 167). The conditional 'wenn Admin spaeter einen EventManager bekommt' precondition is already met. The underlying gap partly persists: Kunstwolffwebsite/.github/workflows/sync-landings.yml only lists trigger paths public/landings/landings.md and public/skills/skills.json, not public/events/events.json.
  - *Fix:* Rephrase to present tense: EventManager exists and writes public/events/events.json, but sync-landings.yml still lacks events.json as a trigger path -> add it.

**`deployment.md`** — 🟡 partly-stale
> Core deploy/branch structure (master live, main verwaist with 5 Managers + deploy.yml) is confirmed, but the Manager count, the repo-name/redirect section, the CORS pattern, and the worker:deploy command are outdated versus current code.
- **⚠️ outdated** — Code unter src/, 13 Manager + server//worker/ (line 7)
  - *Beleg:* ls src/components/*Manager*.tsx on master returns 15 files (BrandingPageManager, BrandStripeManager, CanvasPageManager, CinemaManager, CityManager, CleanupManager, DuBistKunstManager, EventManager, FaqManager, ImageManager, IntroManager, PartnerManager, ReviewManager, SiteTextsManager, StimmungDurchKunstManager), not 13.
  - *Fix:* Change '13 Manager' to '15 Manager'.
- **⚠️ outdated** — Website-Repo-Name section: Admin VITE_REPO_NAME zeigt noch auf den alten Namen (Kunstwolffwebsite) und funktioniert via GitHub-Redirect, sollte irgendwann auf Kunstwolff gezogen werden (lines 17-21)
  - *Beleg:* src/services/github.ts:14 has `repo: import.meta.env.VITE_REPO_NAME ?? 'Kunstwolff'` — default is already the canonical name. CLAUDE.md states 'nutzen seit P5-2 den kanonischen Namen Kunstwolff direkt (kein 301-Redirect mehr)'. The migration this section calls a future TODO is already done.
  - *Fix:* Remove or rewrite: code default already uses 'Kunstwolff'; no redirect dependency remains.
- **⚠️ outdated** — CORS-Origin-Policy in worker/src/index.ts (erste app.use('*')): erlaubt wenn Origin auf .vercel.app endet UND kunstwolff-admin enthält (lines 44-47)
  - *Beleg:* worker/src/index.ts:139 now delegates to `resolveCorsOrigin(o, allowedOrigins)` in worker/src/security.ts. security.ts:64-71 explicitly documents replacing the old `includes('kunstwolff-admin')` substring check with an anchored regex PROJECT_VERCEL_RE = /^https:\/\/kunstwolff-admin(-[a-z0-9-]+)?\.vercel\.app$/. The 'endet auf .vercel.app UND enthält kunstwolff-admin' substring description no longer matches.
  - *Fix:* Update to: matching logic lives in security.ts resolveCorsOrigin via anchored regex PROJECT_VERCEL_RE (not a substring-contains check).
- **⚠️ outdated** — npm run worker:deploy (= wrangler deploy --config worker/wrangler.toml) (line 48-49)
  - *Beleg:* package.json:15 defines worker:deploy as `node scripts/check-admin-guide.mjs && wrangler deploy --config worker/wrangler.toml` — a check-admin-guide pre-step now runs before the wrangler deploy.
  - *Fix:* Note the prepended `node scripts/check-admin-guide.mjs &&` guard step in the worker:deploy script.

**`index.md`** — 🟡 partly-stale
> The navigation/subfile map, helper-file references, and test-infra claims all verify correctly, but the two "Single Source of Truth" status files (BUGS_TODO.md, human_doc_bugs.md) referenced repeatedly no longer exist anywhere in the tree.
- **❌ wrong** — Offene Bugs/Status liegen in `../../BUGS_TODO.md` und die absolute Referenz `/home/sasha/codicus/Kunstwolff/BUGS_TODO.md` ist die "Single Source of Truth für offene Bugs/Lücken" (index.md lines 8, 10, 46, 72; deployment-section verweist auf Abschnitt "Branch-/Deploy-Korrektur").
  - *Beleg:* `ls /home/sasha/codicus/Kunstwolff/BUGS_TODO.md` -> No such file or directory; `find /home/sasha/codicus/Kunstwolff -iname '*BUGS_TODO*' -not -path '*/node_modules/*'` returns nothing. File does not exist anywhere in the tree.
  - *Fix:* Remove or update the BUGS_TODO.md references; if the tracking moved to another file, point to the current location, otherwise drop the "Single Source of Truth" claim.
- **❌ wrong** — `/home/sasha/codicus/Kunstwolff/human_doc_bugs.md` – User-/Endnutzer-Feedback, anekdotisch (index.md line 47).
  - *Beleg:* `ls` of that path -> No such file or directory; `find /home/sasha/codicus/Kunstwolff -iname '*human_doc*' -not -path '*/node_modules/*'` returns nothing.
  - *Fix:* Remove the human_doc_bugs.md entry or repoint to the current feedback file if one exists.
- **⚪ unverif** — "Live ist `master`" (Vercel kunstwolff-admin.vercel.app), Branch `main` verwaist; Branches main/master deploy targets (index.md lines 5, 19).
  - *Beleg:* kunstwolff-admin is not a git checkout in this environment (no .git accessible for branch inspection); branch/deploy state cannot be verified from the filesystem. Note: admin CLAUDE.md corroborates master-as-live, but that is not independent git evidence.
  - *Fix:* No change unless git/Vercel state can be confirmed; flagged only because it is an unverifiable deploy/branch claim.

**`manager-bereinigung.md`** — 🟡 partly-stale
> CleanupManager still exists and works as described, but the doc says "zwei Kategorien" while the code now has three (WebP-Duplikate, inhaltliche/SHA-Duplikate, Kaputte), and two button labels are outdated.
- **⚠️ outdated** — CleanupManager erkennt 'zwei Kategorien von Problemen' (Duplikate + Kaputte Bilder)
  - *Beleg:* CleanupManager.tsx now renders THREE sections: WebP-Duplikate (line 391-444), Inhaltliche/SHA-Duplikate (line 446-527, const shaGroups/shaDuplicates line 186-226), and Kaputte Bilder (line 529-585). confirmDelete union type has three IDs: 'webp-dupes' | 'sha-dupes' | 'broken' (line 62). The SHA/inhaltliche-Duplikate category is entirely undocumented in the memory file.
  - *Fix:* Update to 'drei Kategorien': WebP-Basename-Duplikate, inhaltliche SHA-Duplikate (byte-identisch, gleicher Git-Blob-SHA), und Kaputte Bilder.
- **❌ wrong** — Button-Label für Duplikat-Bereinigung heißt 'Duplikate bereinigen'
  - *Beleg:* CleanupManager.tsx line 412 label="WebP-Duplikate bereinigen" (and a separate 'Inhaltliche Duplikate bereinigen' at line 467). No button labelled just 'Duplikate bereinigen' exists.
  - *Fix:* Rename to 'WebP-Duplikate bereinigen' (plus separate 'Inhaltliche Duplikate bereinigen').
- **❌ wrong** — Button-Label für kaputte Bilder heißt 'Alle löschen'
  - *Beleg:* CleanupManager.tsx line 550 label="Alle kaputten löschen" — not 'Alle löschen'.
  - *Fix:* Rename to 'Alle kaputten löschen'.

**`manager-events.md`** — 🟡 partly-stale
> Core EventManager/EventModal/StripeImagePicker/BUG-9/events.json/content.json/Eventtypes.astro:27 claims all verify correctly; only the "Bezug Interface" description is outdated on how event sub-sections are opened.
- **⚠️ outdated** — Im InterfaceView oeffnet die Komponente eventtypes/eventAblauf/eventPakete/eventReferenzen den EventManager mit passender Sektion.
  - *Beleg:* src/components/interface/InterfaceView.tsx lines 137-149: only case 'events' renders <EventManager initialSection={null}>; the sub-sections are handled by dedicated components via kebab-case editor cases 'event-hero'->EventHeroEditor, 'event-ablauf'/'event-pakete'/'event-skills'/'event-referenzen'->EventSectionEditor(section=...), NOT EventManager. Also omits the 'skills'/event-skills section which exists (EventManager.tsx:765, InterfaceView.tsx:146-147, SiteGraphView.tsx:1300 lists eventSkills). InterfaceView also moved into src/components/interface/ subfolder.
  - *Fix:* Rephrase: eventtypes opens the full EventManager; event-hero/event-ablauf/event-pakete/event-skills/event-referenzen open dedicated EventHeroEditor/EventSectionEditor components (each wraps EventTextEditor via initialSection).
- **⚠️ outdated** — content.json sections listed as pakete:{enabled, items[]} and referenzen:{enabled, logos[]}
  - *Beleg:* public/events/firmenfeier/content.json: pakete keys are ['enabled','title','items'] and referenzen keys are ['enabled','title','text','logos'] — the memory sketch omits the 'title' (pakete) and 'title'/'text' (referenzen) fields now present.
  - *Fix:* Add title to pakete and title/text to referenzen in the format sketch (all described fields still exist, only incompleteness).

**`manager-faqs.md`** — 🟡 partly-stale
> Core structure (paths, component, tabs, override-no-merge, categories, city field) is accurate, but the "only default has content" status is now outdated and the documented field list/markdown format omits the tags system the manager now writes.
- **⚠️ outdated** — Realer Stand: Aktuell hat nur public/faq/default/ Inhalte – stadtspezifische FAQs sind technisch unterstützt aber praktisch für keine Stadt angelegt.
  - *Beleg:* ls /home/sasha/codicus/Kunstwolff/Kunstwolffwebsite/public/faq/ shows 20 city dirs beyond default, each with 1-4 .md files (e.g. belgique/=3, kaiserslautern/=4, karlsruhe/=4, koeln/=2, mannheim/=3). Many cities now have their own FAQs, contradicting 'für keine Stadt angelegt'.
  - *Fix:* Update to note ~20 cities now have stadtspezifische FAQs (belgique, bw, duesseldorf, frankfurt, heidelberg, kaiserslautern, karlsruhe, koblenz, koeln, ludwigshafen, luxembourg, mainz, mannheim, rheinland-pfalz, saarbruecken, saarland, schweiz, trier, wiesbaden, wuppertal); default has 14.
- **⚠️ outdated** — Felder-Tabelle (question/answer/categories/city) und Markdown-Format-Beispiel als vollständige Feldliste des FAQ-Frontmatters.
  - *Beleg:* FaqManager.tsx now reads/writes a `tags` frontmatter object with events/skills/landings sub-lists: type FaqTags (line 9), parseTags (line 123-130), saveFaq writes `frontmatter.tags = faq.tags` when non-empty (line 179), and the FaqTagInputs UI (line 477-620) manages Skills/Events/Landings tags. The documented Felder table and Markdown-Format example omit this entirely.
  - *Fix:* Add a `tags` field (events/skills/landings string-arrays, optional) to the Felder table and markdown format example; note it drives filtered website components.

**`manager-images.md`** — 🟡 partly-stale
> Core ImageManager paths, modes, focus/frame Titelbild logic and slides.meta format are all confirmed; but the Why-Texte "not managed by admin (LÜCKE-4)" claim is now wrong (admin writes public/why/{city}.json), and two dangling references (BUGS_TODO.md, title.meta.json "ungenutzt") are stale.
- **❌ wrong** — Why: Texte (public/why/{city}.json) werden nicht vom Admin verwaltet (LÜCKE-4) – manuell pflegen
  - *Beleg:* ImageManager.tsx line 368 saveWhyBenefits writes path=`public/why/${city}.json` via addPendingFile with commitMessage 'admin: Why-Texte aktualisiert', backed by src/utils/whyBenefits.ts (buildWhyPayload) and UI functions updateWhyBenefit/saveWhyBenefits (lines 366-412). Admin now fully manages Why texts.
  - *Fix:* Remove LÜCKE-4/'nicht vom Admin verwaltet – manuell pflegen'; document that Why texts are now editable per benefit and written to public/why/{city}.json (merged with default.json).
- **❌ wrong** — Titelbild metadata: public/img/Titelbild/title.meta.json (aktuell ungenutzt – LÜCKE-5)
  - *Beleg:* title.meta.json IS used: ImageManager.tsx line 21 TITLE_META_PATH, line 205 parses it, patchTitleMeta/setTitleFocus/setTitleFrame (lines 441-464) write focus & frame; the live file public/img/Titelbild/title.meta.json contains real focus/frame entries. The table parenthetical contradicts line 26 of the same memory.
  - *Fix:* Change table cell to note title.meta.json now stores focus/frame; only categories/priority/enabled remain unused (Rest-LÜCKE-5).
- **⚠️ outdated** — Volltext: BUGS_TODO.md (referenced for bug history and Titelbild path notes)
  - *Beleg:* find /home/sasha/codicus/Kunstwolff -iname 'BUGS_TODO*' returns no results; file does not exist in admin repo root, Kunstwolff parent, or website repo.
  - *Fix:* Remove or repoint the BUGS_TODO.md reference (line 73); cross-referenced website memory files content-slides.md/content-titelbild.md/git-hooks.md/pfadstruktur.md do exist under Kunstwolffwebsite/memory/.

**`manager-kalender.md`** — 🟡 partly-stale
> Core structure (paths, components, service, per-month granularity, website-has-no-loader) is all confirmed; only minor field-detail inaccuracies remain (actors is a constrained union, categoryId example is fabricated).
- **❌ wrong** — actors | string[] | ... Künstler-Namen — with JSON examples only showing ["Jenny", "Gaby"]
  - *Beleg:* src/services/calendar.ts:17,20-21 types actors as `Actor[]` where `Actor = 'Jenny' | 'Gaby' | 'Papa'` and `ALL_ACTORS = ['Jenny','Gaby','Papa']`; it is a constrained 3-value union, not free-form string[], and the memory omits the valid 'Papa' actor.
  - *Fix:* Document actors as a constrained union Actor = 'Jenny' | 'Gaby' | 'Papa' (not arbitrary string[]) and include 'Papa'.
- **❌ wrong** — categoryId ... z.B. `auftrag`, `anfrage`
  - *Beleg:* No `anfrage` category exists. src/services/calendar.ts:29-33 DEFAULT_CATEGORIES = auftrag/babysitter/turnier; website public/calendar/categories.json contains auftrag, babysitter, turnier, volksfest. 'anfrage' appears nowhere.
  - *Fix:* Use real category examples, e.g. `auftrag`, `babysitter`, `turnier` (defaults) / `volksfest`.
- **⚠️ outdated** — location | string | Pflicht: ja
  - *Beleg:* Data type is optional: src/services/calendar.ts:15 `location?: string`, and EventModal.tsx:59 persists `location.trim() || undefined`. It is only UI-required (EventModal.tsx:41 validation), so an event can persist without a location; 'Pflicht: ja' is true only at the form level, not in the stored data model.
  - *Fix:* Note location is optional in the persisted type (UI-required at entry but may be undefined).

**`manager-reviews.md`** — 🟡 partly-stale
> All ReviewManager and frontmatter/fallback claims are confirmed against current code; only the referenced feedback file human_doc_bugs.md no longer exists.
- **❌ wrong** — `human_doc_bugs.md` listet Wünsche, z.B. ... (Endbenutzer-Feedback offen)
  - *Beleg:* `find /home/sasha/codicus/Kunstwolff -iname 'human_doc*'` returns nothing; the referenced path in memory/index.md L47 (`/home/sasha/codicus/Kunstwolff/human_doc_bugs.md`) does not exist (`ls` → No such file or directory). Only occurrences of the string 'human_doc_bugs' are inside the memory files themselves.
  - *Fix:* Remove or re-point the 'Endbenutzer-Feedback (offen)' reference; the human_doc_bugs.md file is gone from the repo tree.

**`manager-staedte.md`** — 🟡 partly-stale
> All technical claims about CityManager, landings.md parsing, and the sync-landings.yml gaps are confirmed; only the pointer to a non-existent BUGS_TODO.md for BUG-1/BUG-5 details is stale.
- **⚠️ outdated** — BUG-1 (and BUG-5) full text and test status are documented in `BUGS_TODO.md` (line 58: "Volltext + Test-Status: BUGS_TODO.md").
  - *Beleg:* `find /home/sasha ... -name BUGS_TODO.md` returns nothing outside .claude worktrees; also missing at admin root and `../BUGS_TODO.md`. BUG-1/BUG-5 text now lives in memory/*.md files (einschraenkungen.md, publish-workflow.md, manager-faqs.md, architektur.md, manager-reviews.md, manager-staedte.md). TESTING.md only contains BUG-11 (BrandStripe), not BUG-1/BUG-5.
  - *Fix:* Repoint the BUG-1/BUG-5 reference to the current memory files (e.g. einschraenkungen.md / publish-workflow.md) or drop the BUGS_TODO.md citation.

**`projekt.md`** — 🟡 partly-stale
> Core structure (managers, InterfaceView/SiteGraph, auth, draft-state) still holds, but the deployment facts (GitHub Pages), the repo name (Kunstwolffwebsite), and the local worktree paths are outdated/wrong.
- **❌ wrong** — master deploys via 'GitHub Actions … → GitHub Pages → admin.kunstwolff.de' (line 69) and branch table marks master 'Live-Deploy? ✅ ja, GitHub Pages' (line 60).
  - *Beleg:* No .github/workflows exists on the checked-out master branch (`ls .github/workflows` → not found). No vercel.json/CNAME found. The repo's own CLAUDE.md and README state 'Vercel baut vom Branch master' → kunstwolff-admin.vercel.app, and projekt.md line 10 itself says 'Vercel baut Branch master'. Live deploy is Vercel, not GitHub Pages.
  - *Fix:* Replace the GitHub Pages / GitHub Actions deploy claim with: master is built by Vercel → kunstwolff-admin.vercel.app. The deploy.yml/GitHub Pages workflow only lives on the verwaist main branch.
- **⚠️ outdated** — VITE_REPO_NAME=Kunstwolffwebsite (line 47) is the repo name, and REPO_CONFIG in src/services/github.ts uses it (line 52).
  - *Beleg:* src/services/github.ts:14 default is `repo: import.meta.env.VITE_REPO_NAME ?? 'Kunstwolff'` — canonical name is now 'Kunstwolff' (repo renamed from Kunstwolffwebsite per CLAUDE.md P5-2, no 301 redirect). The 'Kunstwolffwebsite' value is stale.
  - *Fix:* Update the ENV example/default to VITE_REPO_NAME=Kunstwolff (canonical repo name Eightdevvis/Kunstwolff).
- **❌ wrong** — Local layout: 'Kunstwolff-admin/kunstwolff-admin/ ist meist auf main, Kunstwolff-admin-master/ ist ein git-Worktree für master.' (line 65)
  - *Beleg:* No such directories exist: `ls -d /home/sasha/codicus/Kunstwolff/Kunstwolff-admin*` → none. The repo is a single checkout at /home/sasha/codicus/Kunstwolff/kunstwolff-admin currently on branch master (git rev-parse --abbrev-ref HEAD → master); no separate -master worktree dir.
  - *Fix:* Remove/rewrite the worktree-path note; the working copy is /home/sasha/codicus/Kunstwolff/kunstwolff-admin on master.
- **⚠️ outdated** — master hat 13 Manager (header, line 3).
  - *Beleg:* `ls src/components/*Manager.tsx | wc -l` → 15 (adds IntroManager.tsx and SiteTextsManager.tsx beyond the 8 listed extras + 5 originals).
  - *Fix:* Update count to 15 managers (add Intro and SiteTexts to the enumerated list).

**`stadt-auswahl.md`** — 🟡 partly-stale
> The header dropdown, default-fallback hint text, and CityManager→normalizeSlug wiring are confirmed, but the file's normalizeSlug rule table and its "identical to the website logic" claim no longer match the actual admin implementation, which deletes non-ASCII chars instead of NFD-transliterating them.
- **❌ wrong** — normalizeSlug ist 'Identisch zur Website-Logik (Kunstwolffwebsite/src/utils/landings.ts, titleImages.ts)' – Konsistenz ist kritisch.
  - *Beleg:* Admin src/utils/encoding.ts:66-76 does NOT call .normalize('NFD') and ends with .replace(/[^a-z0-9-]/g,'') (deletes remaining non-ASCII). Website src/utils/landings.ts:36-43 and titleImages.ts:16-23 DO use .normalize('NFD').replace(/[̀-ͯ]/g,'') and .replace(/[^a-z0-9]+/g,'-'). The two functions diverge (e.g. 'Tom&Jerry' → admin 'tomjerry' vs website 'tom-jerry'); the encoding.ts P5-5 comment (lines 47-51) explicitly documents intentional non-identical behavior.
  - *Fix:* State that admin normalizeSlug differs from the website slugger: admin strips remaining non-ASCII, website NFD-transliterates and maps non-alphanumerics to '-'.
- **❌ wrong** — normalizeSlug example table: 'Berlín' → 'berlin'.
  - *Beleg:* encoding.ts:66-76: no NFD step; final .replace(/[^a-z0-9-]/g,'') deletes the accented 'í' rather than folding it to 'i', so admin normalizeSlug('Berlín') yields 'berln', not 'berlin'.
  - *Fix:* Correct the row to 'Berlín' → 'berln' (or note the accented char is dropped).
- **❌ wrong** — normalizeSlug Regel 2: 'Akzente per Unicode-NFD entfernen'.
  - *Beleg:* encoding.ts:66-76 contains no .normalize('NFD') / combining-mark strip; accents are simply removed by the final .replace(/[^a-z0-9-]/g,'') on line 75. NFD is only in the website functions (landings.ts:38, titleImages.ts:18).
  - *Fix:* Remove the NFD rule for the admin function; accents/non-ASCII are deleted, not decomposed.
- **❌ wrong** — normalizeSlug Regel 4: 'Nicht-Alphanumerisches → -'.
  - *Beleg:* encoding.ts:74-75 only maps whitespace to '-' (.replace(/\s+/g,'-')) and then DELETES all other non-[a-z0-9-] chars (.replace(/[^a-z0-9-]/g,'')). The P5-5 comment (lines 50-51) confirms normalizeSlug deletes leftover special chars ('Tom&Jerry' → 'tomjerry'). Converting all non-alphanumerics to '-' is the behavior of slugify (encoding.ts:58-64), not normalizeSlug.
  - *Fix:* Rule 4 should say: whitespace → '-', all other non-alphanumeric characters are removed.
- **⚠️ outdated** — 'default' steht immer ganz oben im Dropdown (als sichtbarer Sonder-Slot).
  - *Beleg:* Dashboard.tsx:225 builds cityOptions as [{ value: '', label: '(Standard)' }, ...cities]; the top entry is labeled '(Standard)' with an empty value, not the literal string 'default'. The fallback slug 'default' is resolved downstream, but it is not the dropdown label.
  - *Fix:* Say the top slot is the empty value labeled '(Standard)', which resolves to the 'default' fallback content.

**`interface-system.md`** — 🟢 current
> Every concrete claim in interface-system.md matches the current admin repo code (InterfaceView, pageTypes, SiteGraphView, GlobalComponentsView, loadCache, state, github-errors) and the referenced website-repo symbols.

**`manager-cinema.md`** — 🟢 current
> All claims (CinemaManager component, draft-aware loading via getFileRespectingDraft, path constants, cinema.json structure, cinemaWelcome→cinema editor linkage, BUG-10 fix) verified accurate against current admin and website repos.

**`manager-intro.md`** — 🟢 current
> All concrete claims in manager-intro.md verified against both admin and website repos and hold true.

**`manager-partner-brandstripe.md`** — 🟢 current
> All concrete claims (file paths, symbol names, partners.json schema, BrandStripe allowed extensions, pending/removePendingFile behavior, GlobalComponentsView tab hosting) verified true against the current admin and website repos.

**`manager-whypages.md`** — 🟢 current
> All concrete claims (four manager files, content.json paths, data formats, other-why category, component names, auto-save UX, refreshCounter deps, whyBenefits.ts/manager-images.md references) verified accurate against the current admin repo.

---

## 4. Empfohlene Fix-Reihenfolge
1. **Quer-Muster ①–④ als Sweep** — größter Hebel, betrifft ~7 Dateien mehrfach, mechanisch ersetzbar.
2. **3 stale-Dateien** neu schreiben: `admin-tool.md`, `admin/einschraenkungen.md`, `admin/publish-workflow.md` (letzteres inhaltlich am wichtigsten).
3. **`normalizeSlug`-Divergenz** erst als Code-Frage klären, dann `stadt-auswahl.md` korrigieren.
4. Restliche punktuelle 🟡-Fixes (Zeilennummern, Feld-Listen, Button-Labels).

---

## 5. ✅ ERLEDIGT — Fix-Sweep eingearbeitet (2026-07-03)

Alle 40 betroffenen Dateien korrigiert (Multi-Agent-Sweep: Fix-Agent pro Datei → test-gestützter Verify-Agent → Suite-Backstop).

- **104 Edits** über 40 Dateien; **40/40 verify-clean**, 0 beanstandet.
- **Verifikation test-gestützt:** 36 gezielte vitest/Skript-Läufe (alle grün), 7 Dateien read-only geprüft (kein Test anwendbar).
- **Suite-Backstop grün:** Website `vitest run` 58/58 · Admin `vitest run` 106/106 + `check:admin-guide` exit 0.
- **Kern-Rewrites:** `admin/publish-workflow.md` (→ atomarer `commitFilesBatch`), `admin/einschraenkungen.md` (5/6 LÜCKEN geschlossen), `website/admin-tool.md` (Pfad/Deploy/LÜCKEN), Deploy-Fakten (Vercel + Worker/Express), tote Doku-Refs entfernt, `stadt-auswahl.md`/`admin/architektur.md` normalizeSlug-Divergenz korrekt dokumentiert (per `encoding.test.ts` bestätigt).
- **✅ `normalizeSlug`-Divergenz geschlossen (2026-07-03):** Admin-`normalizeSlug` (`kunstwolff-admin/src/utils/encoding.ts`) um einen `.normalize('NFD')`-Akzent-Faltungsschritt erweitert → `Liège`→`liege`, `Berlín`→`berlin` (statt `lige`/`berln`), deckungsgleich mit dem Website-Slugger. Ändert keinen bestehenden ASCII-Slug. Neuer Test `encoding.test.ts` grün, Admin-Suite 107/107. Der bewusste `slugify`↔`normalizeSlug`-Unterschied bei bloßen Sonderzeichen (P5-5) bleibt unangetastet. Doku (`stadt-auswahl.md`, `admin/architektur.md`) nachgezogen.