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
| `src/utils/` | Content-Loader (TS): `landings.ts`, `skills.ts`, `why.ts`, `cinema.ts`, `erinnerungen.ts`, … |
| `public/` | Komplettes dateibasiertes "CMS" – siehe `pfadstruktur.md` |
| `scripts/` | Sync-Scripts (Node), siehe `sync-scripts.md` |
| `ANLEITUNGEN/` | Nicht-technische Endbenutzer-Anleitungen (nicht für Claude) |
| `reports/validation/` | Auto-generierte Validierungsreports (siehe `validierungsreports.md`) |
| `removed_landings/` | Archiv entfernter Stadtdaten (siehe `content-landings.md`) |
| `dist/` | Build-Output |
| `.github/workflows/` | GitHub Actions (siehe `sync-scripts.md`) |
| `.githooks/` | Git-Hooks (siehe `git-hooks.md`) |

## Hosting / Deployment-Stand (2026-05-05)

- **Stage:** `https://kunstwolff.vercel.app` – Astro-Build, Vercel deployt automatisch bei Push auf `main` (Auto-Detect, kein `vercel.json` im Repo).
- **Production-Domain:** `https://kunstwolff.de` – zeigt noch auf die alte Wix-Site. Cutover steht aus.
- Build-Output kennt beide Hosts: `astro.config.mjs` liest `site` aus `process.env.SITE_URL` (Fallback `kunstwolff.de`); `Layout.astro` setzt `<meta robots>` per Whitelist (nur `kunstwolff.de`/`www.kunstwolff.de` → `index, follow`). Details: `seo.md`.
- Offene Cutover-/Repo-Tickets siehe `HEALTH_CHECK_2026-05-05.md` im Projekt-Root.
- Schritt-für-Schritt-Plan für den Cutover (URL-Mapping, DNS, Vercel-Settings, Rollback): `CUTOVER_PLAN.md` im Projekt-Root. Kanonischer Host post-Cutover: **`www.kunstwolff.de`** (Apex 301 → www).

## Verwandte Repos

Das **Admin-Tool** (`/home/sasha/codicus/Kunstwolff/kunstwolff-admin/`) ist ein eigenständiges Preact-Projekt, das via GitHub REST API direkt in dieses Repo schreibt. Das Frontend läuft auf **Vercel**; die Auth/Schreib-Vorgänge gehen über ein Backend – Cloudflare **Worker** (hono, `worker/`) + **Express**-Server (`server/`) –, das den `GITHUB_PAT` server-seitig hält und JWT-Sessions ausgibt (Legacy-Fallback: PAT verschlüsselt im Browser gegen `api.github.com`). Kein GitHub Pages/Actions. Details: `admin-tool.md`. Eigene Memory-Struktur: `/home/sasha/codicus/Kunstwolff/kunstwolff-admin/memory/index.md`.
