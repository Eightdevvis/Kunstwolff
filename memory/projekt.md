# Projekt-Übersicht – Kunstwolff Website

## Was ist das?

Astro 5 + Preact SSG-Website für **kunstwolff.de** (Eventkünstler). Statisch generierte Landingpages mit Stadt-, Skill- und Event-Kombinationen. Kein klassisches CMS – alle Inhalte liegen dateibasiert im `public/`-Ordner.

## Ziele

1. Saubere und professionelle Repräsentation von Kunstwolff
2. Maximales Page-Ranking in Suchmaschinen / organischer Marketing-Sichtbarkeit (SEO-fokussiert, siehe `seo.md`)

## Tech-Stack

- **Astro 5** – Static Site Generator, dynamische Routen via `getStaticPaths()`
- **Preact 10** – für die wenigen interaktiven Komponenten
- **TypeScript** – in `src/utils/`
- **swiper 12** – Slideshow-Komponenten
- **sharp** – Bildoptimierung (Pre-Push-Hook konvertiert zu WebP)
- **gray-matter** – YAML-Frontmatter aus Reviews/FAQs lesen
- **markdown-it** – Markdown-Rendering für Review-Bodies
- **@astrojs/sitemap** – Sitemap-Generierung beim Build
- Custom-Font **Mayonice** in `public/fonts/mayonice/`, eingebunden via `global.css`
- **Keine** Astro Content Collections – Content kommt direkt aus `public/` via Utils in `src/utils/`. (`src/content.config.ts` existiert nur weil Astro den Export erwartet, ist aber leer.)

## Voraussetzungen

- Node.js 20+
- npm

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
  `https://www.kunstwolff.de`; Fallback im Code `kunstwolff.de`); `Layout.astro` setzt
  `<meta robots>` per Whitelist auf den Host von `site`. Details: `seo.md`.
- `HEALTH_CHECK_2026-05-05.md` und `CUTOVER_PLAN.md` im Projekt-Root sind **historisch**
  (Stand vor dem Umzug) – nicht mehr als offene To-do-Liste lesen.

## Verwandte Repos

Das **Admin-Tool** (`/home/sasha/codicus/Kunstwolff/kunstwolff-admin/`) ist ein eigenständiges Preact-Projekt, das via GitHub REST API direkt in dieses Repo schreibt. Das Frontend läuft auf **Vercel**; die Auth/Schreib-Vorgänge gehen über ein Backend – Cloudflare **Worker** (hono, `worker/`) + **Express**-Server (`server/`) –, das den `GITHUB_PAT` server-seitig hält und JWT-Sessions ausgibt (Legacy-Fallback: PAT verschlüsselt im Browser gegen `api.github.com`). Kein GitHub Pages/Actions. Details: `admin-tool.md`. Eigene Memory-Struktur: `/home/sasha/codicus/Kunstwolff/kunstwolff-admin/memory/index.md`.
