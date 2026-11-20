# Projekt-Übersicht – Kunstwolff Website

## Was ist das?

Astro 7 + Preact SSG-Website für **kunstwolff.de** (Eventkünstler). Statisch generierte Landingpages mit Stadt-, Skill- und Event-Kombinationen. Kein klassisches CMS – alle Inhalte liegen dateibasiert im `public/`-Ordner.

## Ziele

1. Saubere und professionelle Repräsentation von Kunstwolff
2. Maximales Page-Ranking in Suchmaschinen / organischer Marketing-Sichtbarkeit (SEO-fokussiert, siehe `seo.md`)

## Tech-Stack

- **Astro 7** (seit 2026-11-20, vorher 5; Vite 8, Rust-Compiler) – Static Site Generator, dynamische Routen via `getStaticPaths()`. Upgrade-Besonderheiten siehe unten „Astro 7“
- **Preact 10** – für die wenigen interaktiven Komponenten
- **TypeScript** – in `src/utils/`
- **swiper 12** – Slideshow-Komponenten
- **sharp 0.35** – Bildoptimierung (Pre-Push-Hook konvertiert zu WebP)
- **gray-matter** – YAML-Frontmatter aus Reviews/FAQs lesen
- **@astrojs/sitemap** – Sitemap-Generierung beim Build
- Custom-Font **Mayonice** in `public/fonts/mayonice/`, eingebunden via `global.css`
- **Keine** Astro Content Collections – Content kommt direkt aus `public/` via Utils in `src/utils/`. (`src/content.config.ts` existiert nur weil Astro den Export erwartet, ist aber leer.)

## Voraussetzungen

- **Node.js 24** (`engines.node: "24.x"` in `package.json`). Astro 7.4 verlangt
  **≥ 22.23.4** und prüft das beim Start hart („Node.js … is not supported by
  Astro!“ → Build bricht ab). Weil Vercel bei „22.x“ den Patch-Stand selbst wählt,
  legt `engines` die Hauptversion auf 24 fest – das überstimmt die
  Vercel-Projekteinstellung „Node.js Version“. GitHub Action ebenfalls 24.
- npm

## Astro 7 – was beim Upgrade (2026-11-20) zu beachten war

- **`compressHTML: true`** steht bewusst in `astro.config.mjs`. Der neue Standard
  `'jsx'` streicht Leerraum zwischen Inline-Elementen – sichtbar z. B. im Menü
  („Home | Services“ → „Home|Services“). Nicht entfernen.
- **CSS-Minifizierung bleibt esbuild** (`vite.build.cssMinify: 'esbuild'`,
  `esbuild` als dependency, weil der Build es braucht). Vite 8 nähme sonst Lightning CSS – das wirft
  `backdrop-filter` weg, wenn danach `-webkit-backdrop-filter` steht (gilt ihm als
  dieselbe Eigenschaft, die letzte gewinnt). Gemessen: in Chrome fehlte die
  Unschärfe unten im Event-Titelbild. Wer auf Lightning CSS wechseln will, muss
  vorher überall die `-webkit-`-Zeile **vor** die unpräfixierte setzen und die
  berechneten Stile aller Seiten vergleichen.
- **JS-Minifizierung jetzt oxc** (Vite-8-Standard): andere Variablennamen und
  Schreibweise in den eingebetteten `<script type="module">`, gleiches Verhalten
  (Laufzeittest: Slideshow, Lightbox, Burger, 0 Konsolenfehler).
- **Rust-Compiler** korrigiert ungültige Verschachtelung (`<div>` in `<p>`) nicht
  mehr und lehnt nicht geschlossene Tags ab. Der Build ist damit strenger.
- `data-astro-cid-…` und `/_astro/`-Dateinamen haben neue Hashes – egal, solange
  niemand sie von außen hart verdrahtet.
- `sitemap-index.xml` trägt seit `@astrojs/sitemap` 3.7.6 ein `<lastmod>`.
- Vergleichsverfahren (normalisiertes HTML, CSS in Kaskadenreihenfolge, sichtbarer
  Text, berechnete Stile, Pixel): Werkzeuge lagen nur temporär auf dem PC; die
  Methode steht im Commit `build: upgrade to Astro 7`.
- Ergebnis gegen Astro 5 (277 Seiten, 390×844 und 1440×900): berechnete Stile
  aller Elemente gleich bis auf zwei gleichwertige Schreibweisen (Verlaufs-Stopp
  `50%` weggelassen, liegt ohnehin mittig zwischen 45 % und 55 %; `0%` → `0px`
  in einer Kreisverlauf-Position). Pixelvergleich auf 6 Seiten × 2 Breiten: 0 Pixel.
- Fallen bei solchen Vergleichen (gelten für jeden Stand, nicht Astro 7):
  Slide-Breite `374.875px` statt `375px` taucht auch beim Vergleich eines Builds
  mit sich selbst auf (Ladezeitpunkt); ganzseitige Screenshots von `/galerie/`
  und Slideshow-Seiten weichen ab, solange nicht alle Bilder `complete` und
  dekodiert sind; ein langsamer Test-Wisch (> 300 ms) zählt bei Swiper als
  „langer Wisch“ und braucht > 50 % Slide-Breite – breite Slides bleiben dann
  stehen, ein schneller Wisch wie mit dem Finger läuft durch alle Slides.

## Setup

```bash
npm install
npm run dev
```

Vor `dev` und `build` läuft automatisch `npm run sync:content:safe` (als `predev`/`prebuild`, siehe `sync-scripts.md`).

## Projekt-Layout (Top-Level)

| Ordner / Datei | Zweck |
| :-- | :-- |
| `src/pages/` | Astro-Seiten + dynamische Routen (`[landing].astro`, `[...kombi].astro`, …) |
| `src/components/` | Preact + Astro Components |
| `src/utils/` | Content-Loader (TS): `landings.ts`, `skills.ts`, `why.ts`, `cinema.ts`, `erinnerungen.ts`, … – vollständige Tabelle in `architektur.md` |
| `src/i18n/` | Locale-Registry + Overlay-Auflösung (`config.ts`), siehe unten |
| `public/` | Komplettes dateibasiertes "CMS" – siehe `pfadstruktur.md` |
| `scripts/` | Sync-Scripts (Node), siehe `sync-scripts.md` |
| `tests/` | 41 Vitest-Dateien (Stand 2026-10-22) (`npm run test:unit`), Konfiguration in `vitest.config.ts` (Testdateien laufen bewusst nacheinander, siehe dort) |
| `ANLEITUNGEN/` | Nicht-technische Endbenutzer-Anleitungen (nicht für Claude) |
| `zettel/` | Bug-Zettel: `bugs.json` (schreibt der Admin, bewusst nicht unter `public/`) + `LIESMICH.md` (Regeln für den, der fixt) |
| `mom-requests.md` | Wünsche aus dem Admin-KI-Chat (`log_feature_request`, committet ohne Rückfrage) |
| `reports/validation/` | Auto-generierte Validierungsreports (siehe `validierungsreports.md`) |
| `removed_landings/` | Archiv entfernter Stadtdaten (siehe `content-landings.md`) |
| `dist/` | Build-Output |
| `.github/workflows/` | GitHub Actions (siehe `sync-scripts.md`) |
| `.githooks/` | Git-Hooks (siehe `git-hooks.md`) |

## Hosting / Deployment-Stand (geprüft 2026-10-22)

- **Live:** `https://www.kunstwolff.de` – der Cutover von Wix ist **seit Anfang August 2026
  durch** (Nachmessung in `seo.md`, „Nach dem Cutover gerichtet (2026-08-06)"). Der Apex
  `kunstwolff.de` leitet per 308 auf `www`, Vercel liefert aus, Canonical/`og:url` stehen
  auf `www`. Vercel deployt automatisch bei jedem Push auf `main` – also auch bei jedem
  Admin-Veröffentlichen. Es gibt keine Stage mehr: was auf `main` landet, ist live.
- `https://kunstwolff.vercel.app` liefert denselben Build aus (Canonical zeigt auf `www`).
- Die Auslieferung steuert `vercel.json` im Repo-Root: Cache-Control für `/img/*` und die
  Weiterleitungen (Wix-Altlasten, flache Ort-Kombis, SEO-Aliase wie `/hochzeitsmaler`).
  Details: `vercel-headers.md`, `routing.md`.
- `astro.config.mjs` liest `site` aus `process.env.SITE_URL` (in Vercel auf
  `https://www.kunstwolff.de`; Fallback im Code `SITE_ORIGIN` = `www`, `src/utils/siteOrigin.mjs`); `Layout.astro` setzt
  `<meta robots>` per Whitelist auf den Host von `site`. Details: `seo.md`.
- `ARCHIVE/HEALTH_CHECK_2026-05-05.md` und `ARCHIVE/CUTOVER_PLAN.md` sind **historisch**
  (Stand vor dem Umzug) – nicht mehr als offene To-do-Liste lesen.

## Verwandte Repos

Das **Admin-Tool** (`/home/sasha/codicus/Kunstwolff/kunstwolff-admin/`) ist ein eigenständiges Preact-Projekt, das via GitHub REST API direkt in dieses Repo schreibt. Das Frontend läuft auf **Vercel**; die Auth/Schreib-Vorgänge gehen über ein Backend – Cloudflare **Worker** (hono, `worker/`) + **Express**-Server (`server/`) –, das den `GITHUB_PAT` server-seitig hält und JWT-Sessions ausgibt (Legacy-Fallback: PAT verschlüsselt im Browser gegen `api.github.com`). Kein GitHub Pages/Actions. Details: `admin-tool.md`. Eigene Memory-Struktur: `/home/sasha/codicus/Kunstwolff/kunstwolff-admin/memory/index.md`.
