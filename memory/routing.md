# Routing & URL-Generierung

Alle Seiten sind statisch (SSG). URLs entstehen automatisch aus `landings.md`, `skills.json` und `events.json` via `getStaticPaths()`.

## URL-Schema

### Dynamisch generierte Routen

| URL-Muster | Generiert aus | Page-File |
| :-- | :-- | :-- |
| `/` | – | `src/pages/index.astro` |
| `/<stadt>/` | `landings.md` | `src/pages/[landing].astro` |
| `/<skill>/` | `skills.json` | `src/pages/[skill].astro` |
| `/<skill>/<stadt>/` | `skills.json` × `landings.md` | `src/pages/[skill]/[landing].astro` |
| `/<event>/` | `events.json` | `src/pages/[landing].astro` (mit `pageType: 'event'`) |
| `/<skill>/<event>/` | `skills.json` × `events.json` | `src/pages/[skill]/[landing].astro` (mit `pageType: 'event'`) |
| `/fr/<stadt>/` | FR-Overlay (`public/i18n/fr/landings.json`) | `src/pages/fr/[landing].astro` (Mehrsprachen-Fundament, siehe `i18n_foundation.md`) |

### Statische Standalone-Pages

| URL | Page-File |
| :-- | :-- |
| `/partner/` | `src/pages/partner.astro` |
| `/contact/` | `src/pages/contact.astro` |
| `/faq/` | `src/pages/faq.astro` |
| `/datenschutz/` | `src/pages/datenschutz.astro` |
| `/impressum/` | `src/pages/impressum.astro` |
| `/branding/` | `src/pages/branding.astro` |
| `/canvas/` | `src/pages/canvas.astro` |
| `/du-bist-kunst/` | `src/pages/du-bist-kunst.astro` |
| `/referenzen/` | `src/pages/referenzen.astro` |
| `/stimmung-durch-kunst/` | `src/pages/stimmung-durch-kunst.astro` |
| `/404` | `src/pages/404.astro` (Fehlerseite) |

`robots.txt` liegt in `public/robots.txt` (statisch kopiert, nicht als Page geroutet) – siehe `seo.md`.

## Wichtige Detail-Logik

### Events teilen den `[landing]`-Slot mit Städten

`getStaticPaths()` in `[landing].astro` und `[skill]/[landing].astro` differenziert via `pageType: 'event' | 'landing'` Prop. Das heißt:

- `/firmenfeier/` und `/berlin/` laufen durch dieselbe Page-Datei
- Page-Logik muss `pageType` prüfen, um zu wissen ob Stadt- oder Event-Content geladen werden soll

**Konsequenz:** Event-Slug und Stadt-Slug dürfen nicht kollidieren. Es gibt keinen technischen Schutz dagegen.

### Slug-Generierung Skills

Aus dem `title`-Feld in `skills.json` wird automatisch der Slug abgeleitet:
`"Schnellzeichner"` → `/schnellzeichner/`

### Skill-Bilder pro Skill-Seite

Werden automatisch aus `public/img/UnsereFähigkeitenBilder/<Skill-Titel>/` geladen. Erstes Bild alphabetisch.

## Filterketten pro Skill-Seite

Auf Skill-/Skill+Stadt-Seiten werden Slides, Reviews und FAQs nach Skill-Kategorie gefiltert:
- Slides: via `categories` in `slides.meta.json`
- Reviews: via `categories` im Review-Frontmatter
- FAQs: via `categories` im FAQ-Frontmatter

## Sitemap

Wird automatisch beim Build über `@astrojs/sitemap` generiert. Alle statisch generierten Seiten werden erfasst. Output: `dist/sitemap-index.xml` + `dist/sitemap-0.xml`. Host wird zur Build-Zeit aus `process.env.SITE_URL` (Fallback `https://kunstwolff.de`) übernommen – siehe `seo.md` "Stage vs. Production". Cutover-Stand siehe `HEALTH_CHECK_2026-05-05.md`.
