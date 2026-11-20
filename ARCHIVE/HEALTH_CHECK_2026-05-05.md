# Kunstwolff Website – Health Check

**Datum:** 2026-05-05
**Geprüft von:** Claude (Opus 4.7) 🎩
**Scope:** Astro-Repo (`Kunstwolffwebsite/`) + Live-Site `kunstwolff.de`
**Pendant:** `BUGS_TODO.md` im Projekt-Root deckt das Admin-Tool ab.

Schwere-Legende: 🔴 kritisch · 🟡 mittel · 🟢 klein · 🔵 Doku-/Lücken-Hinweis · 🟣 SEO

---

## 0) Executive Summary

**Erratum gegenüber dem ersten Pass:** Die Astro-Site ist sehr wohl deployed —
unter `https://kunstwolff.vercel.app` (Header `server: Vercel`,
`<meta generator="Astro v5.17.2">`, `last-modified: 2026-05-03`). Der erste
Pass hatte nur `kunstwolff.de` getestet, das wie geplant noch auf Wix liegt,
weil dort die Domain-Migration noch nicht erfolgt ist. Es gibt also **zwei
Zustände parallel**: Wix unter der echten Domain (Production-Traffic) und
Astro unter der Vercel-Preview-Domain (Stage). Geplanter Cutover steht aus.

Das verschiebt die Schwerpunkte:
- **Echte Tickets:** `vercel.app` und `kunstwolff.de` haben inkompatible
  URL-Schemata (`/contact` vs. `/kontakt`, `/galerie` nur auf Wix etc.).
  Beim Cutover droht ohne 1:1-Redirect-Map ein SEO-Crash.
- **Akut SEO-relevant (auch vor Cutover):** Die Vercel-Site liefert eine
  Sitemap aus, die auf den Apex-Host `kunstwolff.de` zeigt – also auf die
  Wix-Site. Wenn Crawler die Vercel-Sitemap finden, kommen sie auf der
  falschen Site raus. Siehe LIVE-3 / SEO-1.
- **Repo-seitig** ist der Build grün (98 Seiten in 1.79 s), aber
  `tsc --noEmit` wirft **6 TypeScript-Fehler in `src/utils/events.ts`**, weil
  Astro `.astro` nur transpiliert und `.ts` ohne externe Prüfung durchwinkt.

Die im ersten Pass formulierte Sorge "Admin-Edits erreichen niemanden" stimmt
**nicht**, sobald man die Vercel-Stage als Zielsystem akzeptiert. Sie stimmt
nur für die Domain `kunstwolff.de`.

---

## 1) Deployments – Status quo

### ✓ DEPLOY-1: Astro-Site läuft auf Vercel
- `https://kunstwolff.vercel.app` → 200, `server: Vercel`,
  `<meta generator="Astro v5.17.2">`, `last-modified: 2026-05-03`.
- Stichprobe (15 Routen, alle 200):
  `/`, `/contact/`, `/datenschutz/`, `/FAQ/`, `/partner/`, `/messe/`,
  `/hochzeit/`, `/firmenfeier/`, `/private-feier/`, `/schnellzeichner/`,
  `/szenenmaler/`, `/berlin/`, `/schnellzeichner/berlin/`,
  `/sitemap-index.xml`, `/robots.txt`. Sauber.
- HTML-Größe Startseite: **71 kB** vs. **826 kB** der Wix-Variante. Astro
  bringt also einen Performance-Vorsprung um Faktor ~12 in roher
  Payload-Größe schon mit (das wird sich auch in CWV widerspiegeln).

### ⚠ DEPLOY-2: Kein `vercel.json` im Repo
- Vercel-Deploy läuft nur dank Auto-Detect (Astro-Adapter wird vom
  Vercel-Dashboard erkannt). Reproduzierbarkeit/Versionierung der
  Deploy-Settings (Build-Command, Output-Dir, Headers, Redirects, Region)
  ist nicht im Repo. Bei einem Account-/Projekt-Wechsel oder
  Re-Onboarding später ist das ein Wissens-Single-Point-of-Failure.
- Empfehlung: Minimales `vercel.json` ergänzen (selbst wenn nur
  `framework: "astro"` + spätere Redirects).

### 🟡 LIVE-1: Wix bleibt vorerst auf der Production-Domain `kunstwolff.de`
- **Status: bekannt & beabsichtigt.** Die Domain ist noch nicht migriert.
  Astro-Build wartet als Stage auf `vercel.app` auf den Cutover-Termin.
- Damit ist das Repo nicht "tot", sondern Vorbereitung. Trotzdem bleiben
  die Folge-Tickets unten **bis zum Cutover** offen.

### 🔴 LIVE-2: URL-Schema-Mismatch zwischen `kunstwolff.de` (Wix) und Repo/Vercel
Astro generiert (geprüft via `npm run build` und auf `vercel.app` 200 ✓):
| Pfad | `kunstwolff.de` (Wix) | `kunstwolff.vercel.app` (Astro) |
|---|---|---|
| `/contact/` | 404 | 200 |
| `/kontakt` | 200 | (existiert nicht) |
| `/datenschutz/` | 404 | 200 |
| `/FAQ/` | 404 | 200 |
| `/partner/` | 404 | 200 |
| `/messe/`, `/hochzeit/`, `/private-feier/` | 404 | 200 |
| `/schnellzeichner/berlin/` | 404 | 200 |
| `/szenenmaler/` | 404 | 200 |
| `/impressum/` | 200 | 200 |
| `/galerie` | 200 (Wix) | (nicht vorhanden) |
| `/referenzen` | 200 (Wix) | (nicht vorhanden) |
| `/schnellzeichnung-galerie` | 200 (Wix) | (nicht vorhanden) |
| `/kopie-von-schnellzeichnung-galerie` | 200 (Wix) | (nicht vorhanden) |

**Folge beim Cutover:** Ohne 1:1-Redirect-Map gibt es einen massiven
SEO-Crash (alle Wix-Rankings für `/galerie`, `/kontakt`, `/referenzen`
ins Leere). Konkrete Vorbereitung empfohlen:
1. Liste aller in der Google Search Console indizierten Wix-URLs ziehen.
2. Mapping definieren: `/kontakt → /contact`, `/galerie → ?`, alte
   `/kopie-von-…` weg-410-en.
3. Im `vercel.json` als 301-Redirects hinterlegen, **bevor** der DNS
   umgeschaltet wird.

### ✅ LIVE-3 / SEO-1: Crawler-Trap entschärft (Repo-Seite, Vercel-Env steht aus)
- **Repo-seitig erledigt (2026-05-05):**
  - `astro.config.mjs` liest `site` aus `process.env.SITE_URL` mit Fallback
    auf `https://kunstwolff.de`.
  - `src/layouts/Layout.astro` setzt `<meta name="robots">` per Whitelist:
    nur `kunstwolff.de` und `www.kunstwolff.de` bekommen `index, follow`,
    alles andere (vercel.app, dev, preview-deploys) `noindex, nofollow`.
  - Verifiziert mit beiden Build-Varianten (siehe `memory/seo.md` →
    "Stage vs. Production").
- **Offen (manueller Schritt im Vercel-Dashboard):**
  - In **Project Settings → Environment Variables** anlegen:
    `SITE_URL = https://kunstwolff.vercel.app`
  - Erst danach hat das Stage-Deployment den korrigierten Sitemap-Host und
    den noindex aktiv. Beim Cutover entweder den Wert auf den Final-Host
    setzen oder die Variable löschen (Fallback greift).

### 🟡 LIVE-4: `site` ohne `www`
- Live (Wix) redirectet 301 von Apex auf `www.kunstwolff.de`.
- Sobald Astro die Domain übernimmt, muss klar sein: kanonisch ist
  Apex (`kunstwolff.de`) oder `www`? Die Sitemap, Canonical-Tags,
  JSON-LD-`url`, OG-URLs müssen alle auf den gleichen Host zeigen,
  sonst wertet Google das als Duplicate Content.

### 🟣 LIVE-5: Live-`<title>` ist generischer Wix-Default
- `https://www.kunstwolff.de/` liefert
  `<title>Kunstwolff | Schnellzeichner für Ihre Veranstaltung</title>`.
- Astro-Repo hat stadt-/skill-spezifische Titel mit Long-Tail-Wert.
  Bis zum Cutover ist das Astro-SEO-Investment nicht im Markt aktiv.
- Empfehlung: Wix-Side mindestens grob die gleichen Title/Description
  pflegen, sonst geht beim Cutover Ranking verloren weil Google die
  Wix-Titel als "Original" verbucht hat.

### 🟣 LIVE-6: Sitemap-Bestandteile auf der Wix-Live-Site teilweise stale
- `https://www.kunstwolff.de/sitemap.xml` zeigt:
  - `portfolio-projects-sitemap.xml` `lastmod 2025-03-13` (≈ 14 Monate alt)
  - `portfolio-collections-sitemap.xml` `lastmod 2025-03-11`
  - `pages-sitemap.xml` `lastmod 2026-02-16` (≈ 3 Monate alt)
- Mindestens prüfen, ob veraltete Sub-Sitemaps tote URLs enthalten.
  Verbessert die Cutover-Hygiene, macht das URL-Mapping einfacher.

---

## 2) Astro-Code & Build

### ✅ BUG-A1: TypeScript-Fehler in `src/utils/events.ts:285-307` (gefixt 2026-05-05)
- **Ursache:** `EventSlideItem` hatte `priority?` und `title?` optional.
  Das `.map()` produzierte aber `priority: number` (immer) und
  `title: string | undefined`. Mit Astro's strikter `tsconfig`
  (`exactOptionalPropertyTypes`) sind das verschiedene Typen → der
  Type-Guard `(item): item is EventSlideItem` schlug fehl, dadurch
  blieben `null`-Reste im Array, was die TS18047/TS2339-Folgefehler
  erzeugte.
- **Fix:** Internen Hilfstyp `InternalEventSlide` in `getEventSlides`
  eingeführt (priority required, title/categories als `T | undefined`).
  Type-Guard nutzt jetzt diesen internen Typ, am Ende strippt
  `.map(({ priority: _priority, ...slide }) => slide)` priority weg.
  Public-API `EventSlideItem` unverändert → keine Anpassung in
  Aufrufern nötig.
- **Verifikation:** `npx tsc --noEmit` → Exit 0, `npm run build` → 98
  Seiten in 1.34s, grün.
- **Folge-Empfehlung steht weiter:** `npm run typecheck`-Script in
  `package.json` (`astro check`) und im CI vor dem Sync-Commit laufen
  lassen, damit so ein Drift nicht wieder unentdeckt durchs Astro-Build
  rutscht.

### 🟢 BUG-A2: Kein `astro check`/`typecheck`-Script in `package.json`
- Aktuell: kein Lint, kein Typecheck im Workflow. CI-Workflow `sync-landings.yml`
  führt nur den Sync, aber **keinen Build/Check** aus.
- Empfehlung: `"typecheck": "astro check"` (oder `tsc --noEmit`) ergänzen
  und in der GitHub Action laufen lassen, bevor sync-Output committet wird.

### 🟢 CODE-A3: `src/content.config.ts` ist nur ein Pflicht-Leerexport
- README §2 sagt: *"`src/content.config.ts` existiert nur weil Astro den Export
  erwartet, ist aber leer."* → Bewusst, aber Wartungs-Smell. Sobald Content
  Collections doch genutzt werden, dranschreiben.

### 🟢 CODE-A4: Drei tote Components laut README
- `src/components/Eventtypes.astro`
- `src/components/hero/SchnellzeichnerHero.astro`
- `src/components/about/AboutSchnellzeichner.astro`

In keiner Page importiert. Bewusst markiert ("Work in Progress"), aber:
- `SchnellzeichnerHero` importiert `BrandStripe` und `MiniReviews` — falls
  diese sich später ändern, drift wird hier zuerst sichtbar (und niemand merkt's).
- Empfehlung: entweder zeitnah einbinden oder in einen `_wip/`-Ordner
  verschieben, damit Refactorings nicht versehentlich hineingrepen.

### 🟢 CODE-A5: `dist/` im Repo physisch vorhanden, aber gitignored
- `.gitignore` enthält `dist/` ✓
- Trotzdem liegt ein altes Build-Artefakt von **2026-03-20** auf der Disk
  (`Kunstwolffwebsite/dist/`). Kein Repo-Problem, aber Aufräum-Tipp wenn
  jemand mit veralteten Dateien debuggt.

---

## 3) Sync-Scripts & GitHub-Action

### 🔴 SYNC-1: GitHub Action `sync-landings.yml` triggert nicht bei Event-Änderungen
- Trigger:
  ```yaml
  paths:
    - public/landings/landings.md
    - public/skills/skills.json
  ```
- Aber `sync-events.mjs` reagiert auf `public/events/events.json`. Wer einen
  neuen Event in der `events.json` hinterlegt, sieht den Sync **nie**
  automatisch laufen.
- **Fix:** `public/events/events.json` als Trigger-Path ergänzen.

### 🔴 SYNC-2: GitHub Action committet nicht alle Sync-Outputs zurück
- `git add` listet:
  ```
  public/img/slides public/reviews public/img/UnsereFähigkeitenBilder
  public/img/Titelbild public/img/why public/why public/faq
  ```
- **Fehlt:** `public/erinnerungen/` (von `sync-erinnerungen.mjs` erzeugt)
- **Fehlt:** `public/events/` (von `sync-events.mjs` für `events/<slug>/content.json` erzeugt)
- Folge: neu generierte Erinnerungen-Stubs und Event-Content-Defaults
  bleiben im CI-Workspace, werden aber nicht zurück ins Repo gepusht.
  Beim nächsten Push merkt das niemand, weil `sync-content` lokal sie
  immer wieder anlegt — aber ein frischer CI-Run hat sie nie.

### 🟡 SYNC-3: `sync-landings.yml` führt **keinen Build** aus
- Nach dem `chore: sync content folders`-Commit gibt es weder Type-Check noch
  `astro build` als Validierung. Wenn der Sync kaputten JSON erzeugt, fällt
  es erst auf, wenn jemand lokal baut (oder wenn ein Deploy-Hook anspringt –
  den es aktuell aber nicht gibt, siehe LIVE-1).

### 🟢 SYNC-4: Sync-Output-Logs werden nicht erfasst
- `npm run sync:content` läuft im CI ohne `2>&1 | tee sync.log`. Bei `safe`-
  Variante (lokal über `predev`/`prebuild`) werden Teilfehler isoliert –
  unter Umständen verschluckt. Empfehlung: Sync-Logs als Workflow-Artifact
  uploaden (`actions/upload-artifact`), damit Fehler sichtbar bleiben.

---

## 4) Validierungsreport (`reports/validation/landings/2026-05-05T09-59-08.280Z.json`)

### 🟡 VAL-1: 13 unreferenced Bilder – aber teils False Positives
Inhalt:
1. `/img/logo/logo_transparent.webp`
   → Wird in `src/pages/index.astro:42` als
     `localBusinessSchema.image` (JSON-LD) referenziert. Der Image-Crawler
     scannt offenbar nur `<img>`-Tags, nicht structured data. **Echte
     Lücke:** Logo erscheint visuell tatsächlich nirgends als `<img>`.
2. `/img/referenzenLogos/Deutsche_Bank.webp`, `ING_Bank.webp`
   → Dynamisch via `src/utils/brandLogos.ts` → `BrandStripe.astro` geladen
     (und `BrandStripe` ist über `Opener.astro` auf Stadt-, Skill- und
     Homepage-Heroes eingebunden). **False Positive im Report.**
3. 7 weitere Logos in `referenzenLogos/` (`*.svg`) tauchen gar nicht im
   `allImageVisibility`-Index auf, weil das Crawl-Script vermutlich
   `.svg` aus dem Inventar weglässt → eingeschränkte Aussagekraft.
4. `/img/samples/sample{1..4}.webp` und `/img/samples/_ (5..8).webp`
   → Fallback-Bilder, dokumentiert als Systemfallback (z. B. `titleImages.ts`
     fallback `/img/samples/sample1.jpeg` – Endung `.jpeg`, im Repo liegt
     aber `sample1.webp`. → **Mismatch zwischen `fallbackImage`-Konstante
     und tatsächlichem Datei-Inventar prüfen.**
5. `/img/Titelbild/schnellzeichner/IMG_0059.webp` und
   `Titelbild/landings/`/`skills/` → laut README §3.8 explizit als
   "Sync-Artefakt, ignorieren" markiert. Tabu, aber Aufräumkandidat.
6. `/img/Titelbild/trier/gast-sitzt-…trier.webp` → für Trier ist laut
   Index nur dieses eine Titelbild im Ordner. Weshalb es als unreferenced
   gilt, obwohl Trier eine reguläre Landing ist, wäre ein eigener Mini-
   Bug-Hunt wert (vermutlich Encoding/Slug-Hash im Index-Mapping).

**Empfehlung:** unreferenced-Heuristik im Sync-Script erweitern:
- `<img>` + `meta property="og:image"` + JSON-LD `image`-Felder mit erfassen
- `getBrandLogos()` und ähnliche Filesystem-Loaders explizit listen
- SVG-Endung in `allowedExtensions` für den Image-Crawler aufnehmen.

### 🟢 VAL-2: `dropped` und `duplicateMerges` sind leer
Aktuell sauber. Kein Handlungsbedarf.

### 🟢 VAL-3: Sample-Fallback-Pfad-Mismatch (siehe VAL-1.4)
- `fallbackImage`-Konstanten im Repo zeigen u. a. auf
  `/img/samples/sample1.jpeg` (`.jpeg`), aber im Verzeichnis liegt nur
  `sample1.webp`. Bei tatsächlichem Fallback-Trigger → 404-Bild auf
  Stadt-Seiten ohne eigene Slides/Titelbild. Bitte verifizieren:
  ```bash
  grep -rn "samples/sample" src/ public/
  ls public/img/samples/
  ```

---

## 5) Daten-/Inhalts-Konsistenz

### 🔵 DATA-1: `public/img/Titelbild/title.meta.json` ist `{}`
- Pendant zu `slides.meta.json` aber leer. Dokumentiert (siehe README §3.8
  und BUGS_TODO LÜCKE-5), aber Effekt: keine Categories, keine `priority`,
  keine `enabled`-Toggles für Titelbilder ⇒ Skill-Titelbild-Auswahl arbeitet
  ausschließlich auf Verzeichnis-Reihenfolge. Mittel-bis-langfristig würde
  ich hier Daten ergänzen, sonst wird die Auswahl per Skill nie wirksam.

### 🔵 DATA-2: `public/img/Titelbild/landings/` und `Titelbild/skills/`
- Sync-Artefakte aus alter Struktur. Werden ignoriert (README §3.8). Aber
  bei jedem Image-Audit sind sie Rauschen — ggf. einmalig in `ARCHIVE/`
  verschieben mit kurzer README-Notiz, damit sie weg sind.

### 🔵 DATA-3: Reports-Retention dokumentiert (max 7), nichts zu tun
- Aktuell 3 Reports: 2026-03-20T10-10, 2026-03-20T13-58, 2026-05-05T09-59.
  Sauber.

---

## 6) SEO/Meta (Repo-Side)

### 🟣 SEO-2: `public/robots.txt` sieht gut aus, ist aber irrelevant solange Live = Wix
Die unter `kunstwolff.de` ausgespielte robots.txt kommt von Wix
(`Disallow: *?lightbox=`), nicht aus dem Repo. Auf der Vercel-Stage
greift dagegen die Repo-Variante (`Allow: /` + Sitemap-Hinweis auf
`https://kunstwolff.de/sitemap-index.xml`). Beim Cutover muss die Repo-
Version auf der echten Domain gewinnen — passt automatisch, nur dran
denken bei Test.

### 🟣 SEO-3: JSON-LD `LocalBusiness` in `src/pages/index.astro` ist hardcoded
- Telefon `+491736677229`, Adresse `Birkenstr. 3, 66121 Saarbrücken`,
  Bildpfad `https://kunstwolff.de/img/logo/logo_transparent.webp`.
- Wenn diese Daten sich ändern, ist es ein Code-Change. Empfehlung: in
  eine kleine `siteMeta.ts`/`businessProfile.json` ziehen, dann kann auch
  das Admin-Tool sie irgendwann pflegen.

### 🟣 SEO-4: Vercel-Stage gibt `<meta robots>` nicht explizit auf `noindex`
- Die meisten Vercel-`*.vercel.app`-Domains werden von Vercel default
  via `x-robots-tag` weggeschickt, aber wenn das im Repo nicht
  reproduziert ist, ist man von Vercel-Voreinstellungen abhängig. Bei
  Stage-Sites mit echtem SEO-Risiko (siehe LIVE-3) ist eine **explizite**
  `<meta name="robots" content="noindex, nofollow">` für die
  vercel.app-Domain ratsam.

---

## 7) Nicht-Findungen / explizit ok

- **Build:** `npm run build` → 98 Seiten in 1.79 s, keine Errors/Warnings.
- **`landings.md`:** sauberer trailing newline (geprüft mit `xxd`).
- **TODO/FIXME-Marker im `src/`:** keine. Sauber.
- **`.gitignore`:** sinnvoll konfiguriert (`dist/`, `.astro/`, `node_modules/`,
  `.env*`, IDE-Müll).
- **Memory/Doku-Dateien:** sehr ausführliche `memory/`-Sammlung + README +
  CLAUDE.md vorhanden. Pflegezustand insgesamt überdurchschnittlich gut.

---

## 8) Vorgeschlagene Reihenfolge für Fixes

| Prio | Aufgabe |
|---|---|
| 1 | **Crawler-Trap entschärfen (LIVE-3 / SEO-4):** entweder `site` per Env parametrisieren oder Vercel-Sitemap unterdrücken + `<meta robots noindex>` für `vercel.app`. Akut, weil schon **jetzt** SEO-Schaden möglich ist. |
| 2 | TS-Fehler in `events.ts` glätten (BUG-A1) – billig, blockiert sonst CI sobald `astro check` dazukommt. |
| 3 | GitHub Action erweitern: Trigger für `events.json`, `git add` für `public/events/` und `public/erinnerungen/` (SYNC-1, SYNC-2). |
| 4 | `astro check`/`tsc --noEmit` als CI-Schritt vor dem Sync-Commit (BUG-A2 + SYNC-3). |
| 5 | `vercel.json` ins Repo ziehen (DEPLOY-2) – mindestens als Platzhalter für die spätere Redirect-Map. |
| 6 | Validierungs-Crawler so erweitern, dass JSON-LD/OG-/dynamisch-geladene Bilder gezählt werden (VAL-1) – sonst werden False Positives weiter Rauschen erzeugen. |
| 7 | Sample-Fallback-Pfad prüfen (`.jpeg` vs `.webp`, VAL-3). |
| 8 | **Cutover-Vorbereitung (LIVE-2 + LIVE-4 + LIVE-6):** GSC-Export der Wix-URLs ziehen, Redirect-Map definieren (`/kontakt`→`/contact`, `/galerie`→?, `/kopie-von-…` → 410), kanonischen Host (`www` ja/nein) festlegen, Wix-Sitemap-Inventar bereinigen. Frühzeitig anlegen, damit am Cutover-Tag nichts brennt. |

---

**Nicht abgedeckt in diesem Pass:**
Performance-Audit (Lighthouse) der Astro-Builds; Accessibility-Pass
(`axe-core`); manueller Smoke-Test der erzeugten 98 Seiten in `dist/`;
Wix-Inhalts-Inventar (welche Galerien/Texte sind schon in Astro
abgebildet, welche nicht); Datenschutz-Inhalt vs. tatsächlich gesetzte
Cookies bei Wix. Das wären sinnvolle Folge-Pässe.
