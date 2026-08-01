# Architektur

## Grundprinzip

**Dateibasiertes "CMS" + statische Generierung.** Inhalte liegen als JSON/MD/Bilder in `public/`. Beim Build:

1. `sync:content` (siehe `sync-scripts.md`) erstellt fehlende Ordner und Metadaten-Stubs in `public/`
2. Astro liest via `src/utils/*.ts` die Inhalte ein und generiert für jede Stadt/Skill/Event-Kombi statische HTML-Seiten

**Folge:** Es gibt keine Datenbank, keinen Backend-Server, kein Runtime-CMS. Alles ist im Repo. Änderungen → committen → Vercel rebuilds.

> **Hosting-Stand 2026-05-05:** Das Astro-Build läuft als Stage unter `https://kunstwolff.vercel.app`. Die Production-Domain `kunstwolff.de` zeigt noch auf die alte Wix-Site – Cutover steht aus. Build-Output bekommt host-spezifisch entweder `index, follow` oder `noindex, nofollow` (siehe `seo.md` "Stage vs. Production"). Status & offene Tickets: `HEALTH_CHECK_2026-05-05.md` im Projekt-Root.

## Drei Inhaltsachsen

| Achse | Quelle | Slug-Beispiel |
| :-- | :-- | :-- |
| Städte (Landings) | `public/landings/landings.md` | `berlin` |
| Skills | `public/skills/skills.json` | `schnellzeichner` |
| Events | `public/events/events.json` | `firmenfeier` |

Aus diesen entstehen automatisch alle Routen – siehe `routing.md`.

## Content-Loader-Schicht

`src/utils/*.ts` ist die Schicht zwischen `public/` und Astro-Pages. Jeder Content-Typ hat seinen eigenen Loader:

| Loader | Liest |
| :-- | :-- |
| `landings.ts` | Städte aus `landings.md` (mit JSON-Fallback im Code + Auto-Discovery aus `slides/`/`reviews/`/`landings/`-Ordnern) |
| `skills.ts` | `skills.json` |
| `events.ts` | `events.json` + per-Event `content.json` |
| `slideImages.ts` | `public/img/slides/` + `slides.meta.json` |
| `titleImages.ts` | `public/img/Titelbild/` + `title.meta.json` |
| `reviews.ts` | `public/reviews/**/*.md` – **den ganzen Baum**, Auswahl über `tags.landings` |
| `faq.ts` | `public/faq/**/*.md` – **den ganzen Baum**, Auswahl über die Tags |
| `why.ts` | `public/why/<key>.json` (mit Priority-Kette) |
| `cinema.ts` | `public/cinema/cinema.json` |
| `erinnerungen.ts` | `public/erinnerungen/<key>.json` |
| `navigation.ts` | `public/navigation/navigation.json` (mit Code-Fallback) |
| `brandLogos.ts` | `public/img/referenzenLogos/` (Auto-Discovery) |
| `heroBg.ts` | `public/img/hero-bg/<key>/` – Kette `{skill}-{landing}` → `{landing}` → `null` |
| `siteTexts.ts` | `public/site-texts/content.json` (landingHeadings + landingIntros) |
| `componentConfig.ts` | `public/config/components.json` – der Sektions-Stack `_order` |
| `pageVisibility.ts` | `public/config/page-visibility.json` – ⚠️ dieselbe Regel steht ein zweites Mal im Sitemap-Filter in `astro.config.mjs` |
| `gallery.ts` | `public/config/tags.json` (Galerie-Filter) |
| `branding.ts` / `canvas.ts` / `duBistKunst.ts` / `stimmungDurchKunst.ts` | je `public/<seite>/content.json` der vier Why-Detailseiten |

Bei strukturellen Änderungen in `public/` immer prüfen, welcher Loader betroffen ist.
Die Tabelle ist dafür die Checkliste – deshalb stehen auch die drei Steuerdateien unter
`public/config/` darin, obwohl sie niemand „Inhalt" nennen würde.

**Slug-Normalisierung in den Loadern:** `landings.ts` und `titleImages.ts` transliterieren deutsche Umlaute (`ä→ae`, `ö→oe`, `ü→ue`, `ß→ss`), entfernen Akzente, lowercasen und ersetzen Nicht-Alphanumerisches durch `-`.

## Layouts und Sektions-Komponenten

Drei Layouts, je eines pro Seitenfamilie:

| Layout | Wofür |
| :-- | :-- |
| `Layout.astro` | Basis – `<head>`, `lang`/`hreflang`, Schema-Slot, Header/Footer, `LangSwitcher` |
| `SkillLayout.astro` | Skill-Seiten |
| `EventLayout.astro` | Event-Seiten |

Die Sektionen selbst sind austauschbare Bausteine; welche davon eine Seite in welcher
Reihenfolge zeigt, steht **nicht** im Code, sondern in `components.json`
(`komponenten-stack.md`). Die IDs dort zeigen auf:

| Sektions-ID | Komponente |
| :-- | :-- |
| `opener` / `skillHero` | `hero/Opener.astro`, `hero/SkillHero.astro` |
| `slideshow` | `slideshows/Slideshow.astro` |
| `landingIntro` / `comboLead` | `LandingIntro.astro` |
| `why` | `Why.astro` |
| `landingsection` | `Landingsection.astro` (Ortsliste) |
| `eventtypes` | `Eventtypes.astro` |
| `homepageReviews` | `HomepageReviews.astro` |
| `cinemaWelcome` | `CinemaWelcome.astro` (⚠️ überall abgeschaltet, `content-cinema.md`) |
| `eventHero` | `events/EventHero.astro` |
| `eventAblauf` | `events/EventAblauf.astro` |
| `eventPakete` | `events/EventPakete.astro` |
| `eventSkills` | `events/EventSkills.astro` |
| `eventReferenzen` | `events/EventReferenzen.astro` |
| `comboBenefits` | `combo/ComboBenefits.astro` – nur auf Kombiseiten |
| `eventTeaser` | `combo/EventTeaser.astro` – nur auf Kombiseiten, ersetzt dort Ablauf/Pakete/Referenzen |
| `faq` | `FAQ.astro` |
| `contact` | `Contact.astro` |

Fest im Layout, also **nicht** Teil des Stacks: `header/Header.astro` +
`header/Navigation.astro` (aus `navigation.json`, `content-navigation.md`) und
`Footer.astro`.

⚠️ `about/Aboutsection.astro` ist ein Sonderfall: `index.astro` **importiert** sie,
rendert sie aber nicht (`//<Aboutsection />`, Zeile 82). Ein Grep nach dem Dateinamen
findet sie deshalb – sie steht trotzdem auf keiner Seite. Fünf weitere Komponenten sind
gar nicht importiert; welche und warum, steht in `wip-komponenten.md`.

## Fallback-Philosophie

Fast jedes Content-System hat eine Fallback-Kette, damit eine Seite nie "leer" ist:

- **Slides:** Stadt → aufgefüllt aus `getDefaultSlides()` (mind. 6). ⚠️ Das ist die
  kuratierte `default-selection.json`, nicht der Ordner `default/` – der wird nur
  gelesen, wenn die Auswahl-Datei leer ist. Skill-Seiten laufen ganz anders: über
  `tags.skills`, ohne Auffüllen (`content-slides.md`).
- **Reviews:** Ort-**Tag** (`tags.landings`) → Reviews **ohne** Ort-Tag („gilt überall",
  `istAllgemein`) → andere Städte zirkulär (mind. 7, `minLandingReviews`). Der zweite
  Schritt ersetzt den `default/`-Ordner, den es unter `public/reviews/` nie gab.
- **Why/Erinnerungen:** `{skill}-{stadt}` → `{stadt}` → `{skill}` → `default.json` →
  hart einkompilierte `fallbackDefault`-Liste in `why.ts` (`content-why.md`)
- **Titelbild:** eigener Ordner **und** `default/` bilden EINEN Pool mit
  Kategorie-Vorrang → System-Fallback (`/img/samples/sample1.webp`). Keine strikte
  Stufenkette (`content-titelbild.md`).
- **FAQs:** **kein Ordner-Fallback mehr.** `getFAQsForContext` wählt allein über die
  Tags (UND je Dimension Skill/Anlass/Ort, leere Dimension = gilt überall); der Ordner
  ist nur noch Ablage. Stadt-eigene FAQs stehen lediglich weiter vorn
  (`trefferGenauigkeit`) – das ist Sortierung, kein Filter.

Jeder Content-File-Memory beschreibt seine eigene Fallback-Logik. Edge Cases zentral in `ANLEITUNGEN/UNDEFINED_BEHAVIOR_TIDY_UPS.md`.

## Slug-Normalisierung

Slugs sind immer **lowercase, ohne Leerzeichen, ohne Sonderzeichen**. Bei Slug-Kollisionen (z.B. `Berlin` und `berlin`) merged der Sync statt zu löschen – siehe `sync-scripts.md` und `content-landings.md`.

## Cross-Repo

Das Admin-Tool (separates Preact-Repo, Frontend auf Vercel) schreibt in dieses Repo über einen eigenen Backend-Stack: einen Cloudflare Worker (hono) + Express-Backend, das den GitHub-PAT server-seitig hält und Sessions per JWT vergibt (Routing über `/api/github`). Nur als Legacy-Fallback läuft ein direkter Call an `api.github.com` mit browser-seitig verschlüsseltem PAT. Pfadänderungen in `public/` können das Admin-Tool brechen. Details: `admin-tool.md`.
