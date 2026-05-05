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
| `reviews.ts` | `public/reviews/<key>/*.md` |
| `faq.ts` | `public/faq/<key>/*.md` + `public/faq/default/*.md` |
| `why.ts` | `public/why/<key>.json` (mit Priority-Kette) |
| `cinema.ts` | `public/cinema/cinema.json` |
| `erinnerungen.ts` | `public/erinnerungen/<key>.json` |
| `navigation.ts` | `public/navigation/navigation.json` (mit Code-Fallback) |
| `brandLogos.ts` | `public/img/referenzenLogos/` (Auto-Discovery) |

Bei strukturellen Änderungen in `public/` immer prüfen, welcher Loader betroffen ist.

**Slug-Normalisierung in den Loadern:** `landings.ts` und `titleImages.ts` transliterieren deutsche Umlaute (`ä→ae`, `ö→oe`, `ü→ue`, `ß→ss`), entfernen Akzente, lowercasen und ersetzen Nicht-Alphanumerisches durch `-`.

## Fallback-Philosophie

Fast jedes Content-System hat eine Fallback-Kette, damit eine Seite nie "leer" ist:

- **Slides:** Stadt → `default/` (mind. 6)
- **Reviews:** Stadt → `default/` → andere Städte zirkulär (mind. 7)
- **Why/Erinnerungen:** `{skill}-{stadt}` → `{stadt}` → `{skill}` → `default`
- **Titelbild:** Stadt → `default/` → System-Fallback (`/img/samples/sample1.jpeg`)
- **FAQs:** Stadt-spezifisch bevorzugt, sonst Default

Jeder Content-File-Memory beschreibt seine eigene Fallback-Logik. Edge Cases zentral in `ANLEITUNGEN/UNDEFINED_BEHAVIOR_TIDY_UPS.md`.

## Slug-Normalisierung

Slugs sind immer **lowercase, ohne Leerzeichen, ohne Sonderzeichen**. Bei Slug-Kollisionen (z.B. `Berlin` und `berlin`) merged der Sync statt zu löschen – siehe `sync-scripts.md` und `content-landings.md`.

## Cross-Repo

Das Admin-Tool (separates Preact-Repo) schreibt via GitHub REST API direkt in dieses Repo. Pfadänderungen in `public/` können das Admin-Tool brechen. Details: `admin-tool.md`.
