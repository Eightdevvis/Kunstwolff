# Routing & URL-Generierung

Alle Seiten sind statisch (SSG). URLs entstehen automatisch aus `landings.md`, `skills.json` und `events.json` via `getStaticPaths()`.

## URL-Schema

### Dynamisch generierte Routen

| URL-Muster | Generiert aus | Page-File |
| :-- | :-- | :-- |
| `/` | – | `src/pages/index.astro` |
| `/<stadt>/` | `landings.md` | `src/pages/[landing].astro` |
| `/<skill>/` | `skills.json` | `src/pages/[skill].astro` |
| `/<stadt>-<skill>/` | `skills.json` × `landings.md` | `src/pages/[...kombi].astro` – **flach** seit 2026-08-01 (`cityComboSlug()` in `src/utils/comboUrls.ts`); die alte Form `/<skill>/<stadt>/` lebt nur noch als 301 in `vercel.json` |
| `/<event>/` | `events.json` | `src/pages/[landing].astro` (mit `pageType: 'event'`) |
| `/<skill>/<event>/` | `skills.json` × `events.json` | `src/pages/[...kombi].astro` (mit `pageType: 'event'`) |
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
| `/galerie/` | `src/pages/galerie.astro` |
| `/team/` | `src/pages/team.astro` |
| `/404` | `src/pages/404.astro` (Fehlerseite) |

`robots.txt` liegt in `public/robots.txt` (statisch kopiert, nicht als Page geroutet) – siehe `seo.md`.

## Weiterleitungen

Die zweite Hälfte des Routings steht **nicht** in `src/pages/`, sondern in
`vercel.json` → `redirects` (aktuell 166 Einträge, alle `permanent: true`):

- **136 Kombi-Weiterleitungen** von der alten hierarchischen Ort-Form auf die
  flache (`/szenenmaler/berlin` → `/berlin-szenenmaler/`), erzeugt vom
  Einmal-Werkzeug `scripts/flache-kombi-urls.mjs` (2026-08-01).
- **Wix-Altlasten** (`/kontakt`, `/about*`, `/portfolio`, `*-galerie` …) aus dem
  Inventar der fünf Wix-Sitemaps – siehe `vercel-headers.md`.
- Drei **Sammelregeln** (`/portfolio-collections/:rest*`, `/template/:rest*`,
  `/schnellzeichner/:rest*`), die jeweils **hinter** den genauen Regeln stehen
  müssen. Vercel nimmt die erste passende – steht die Sammelregel vorn, greift
  keine der genauen mehr. `tests/combo-urls.test.ts` hält Zielform,
  Ketten-Freiheit und diese Reihenfolge fest.

Dazu ein Astro-interner Redirect: `astro.config.mjs` → `redirects: { '/gallerie': '/galerie/' }`
(Fehlschreibung mit doppeltem l).

## Wichtige Detail-Logik

### Events teilen den `[landing]`-Slot mit Städten

`getStaticPaths()` in `[landing].astro` und `[...kombi].astro` differenziert via `pageType: 'event' | 'landing'` Prop. Das heißt:

- `/firmenfeier/` und `/berlin/` laufen durch dieselbe Page-Datei
- Page-Logik muss `pageType` prüfen, um zu wissen ob Stadt- oder Event-Content geladen werden soll

**Konsequenz:** Event-Slug und Stadt-Slug dürfen nicht kollidieren. Es gibt keinen technischen Schutz dagegen.

### Slug-Generierung Skills

Aus dem `title`-Feld in `skills.json` wird der Slug abgeleitet — **es sei denn,
`link` ist gesetzt.** Seit 2026-07-31 ist genau das der Fall:

| Titel | URL | Inhalts-Schlüssel |
| :-- | :-- | :-- |
| Schnellzeichner | `/schnellzeichner-karikaturist/` | `schnellzeichner` |
| Szenenmaler | `/szenenmaler/` | `szenenmaler` |
| Aquarelle | `/aquarelle/` (ausgeblendet) | `aquarelle` |

Die URL ist damit NICHT mehr der Schlüssel für Inhalte. Welche Aufrufe welchen
der beiden brauchen, steht vollständig in `content-skills.md` — die Verwechslung
erzeugt keine Fehlermeldung, sondern eine leere Seite.

### Skill-Bilder pro Skill-Seite

Werden automatisch aus `public/img/UnsereFähigkeitenBilder/<Skill-Titel>/` geladen. Erstes Bild alphabetisch.

## Filterketten pro Skill-Seite

⚠️ **Die reine Skill-Seite und die Kombiseiten filtern verschieden.** Das ist der
Zwischenstand der Tag-Umstellung, kein Versehen:

- **Skill-Seite** (`[skill].astro`): Slides über den **Tag** `tags.skills`
  (`getSkillSlides()` → `getSlidesByTag('skills', skillContentKey(titel))`,
  gedeckelt auf `MAX_SKILL_SLIDES = 24`). Sie übergibt bewusst **kein**
  `filteredCategories` mehr.
- **Skill+Stadt / Skill+Anlass** (`[...kombi].astro`): Slides weiter über
  `categories` (`filteredCategories: [skillData.title]` → `matchesSkill`),
  danach mit Default-Slides aufgefüllt.
- **Reviews:** `categories` **oder** `tags.skills` (`filterBySkill`) – aber nur
  auf den Kombiseiten. Der Filter der Skill-Heros sitzt in `MiniReviews.astro`
  und prüft **nur** `categories`.
- **FAQs:** `tags.skills`, Alt-Feld `categories` zählt mit.

Deshalb muss der `categories`-Spiegel weitergepflegt werden, obwohl die Tags
längst da sind – Details in `tag-system.md`.

## Sitemap

Wird automatisch beim Build über `@astrojs/sitemap` generiert. Erfasst werden alle
statisch generierten Seiten **außer** den in `public/config/page-visibility.json`
ausgeblendeten: die Sitemap-Integration in `astro.config.mjs` filtert sie per
Präfix-Regel heraus (zeichengleich zu `isPageHiddenByPath()` in
`src/utils/pageVisibility.ts`), damit keine `noindex`-Seite widersprüchlich in der
Sitemap steht. Aktuell 129 ausgeblendete Pfade. Output: `dist/sitemap-index.xml` + `dist/sitemap-0.xml`. Host wird zur Build-Zeit aus `process.env.SITE_URL` (Fallback `https://kunstwolff.de`) übernommen – siehe `seo.md` "Stage vs. Production". Cutover-Stand siehe `HEALTH_CHECK_2026-05-05.md`.
