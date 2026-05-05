# Kunstwolff Website

Astro-Projekt für die Kunstwolff-Landingpages mit statischen Stadtseiten, Skill-Seiten und dateibasierter Content-Pflege.

**Ziele:** saubere und professionelle Repräsentation von Kunstwolff, höchstes Page-Ranking in Suchmaschinen durch SEO-Optimierung.

## Schnellstart

Voraussetzungen: Node.js 20+, npm

```bash
npm install
npm run dev
```

Vor `dev` und `build` läuft automatisch `npm run sync:content` – dadurch sind Ordner- und Metadatenstruktur immer aktuell, bevor Seiten gebaut werden.

## Wo finde ich was?

Die Detail-Doku ist nach Zielgruppe getrennt:

| Zielgruppe | Wo |
| :-- | :-- |
| **Endbenutzer** (Inhalte pflegen, ohne Code-Kenntnisse) | [`ANLEITUNGEN/`](ANLEITUNGEN/) – Schritt-für-Schritt-Anleitungen |
| **Entwickler & Claude** (technische Details) | [`memory/index.md`](memory/index.md) – nach Themen sortiert |
| **Claude-spezifische Regeln** | [`CLAUDE.md`](CLAUDE.md) |

### Endbenutzer-Anleitungen (`ANLEITUNGEN/`)

| Datei | Inhalt |
| :-- | :-- |
| [`Wie?_FOTOS_HINZUFÜGEN.md`](ANLEITUNGEN/Wie?_FOTOS_HINZUFÜGEN.md) | Bilder für Slideshow/Titelbild/Why hochladen |
| [`Wie?_LANDINGPAGES.md`](ANLEITUNGEN/Wie?_LANDINGPAGES.md) | Neue Stadt als Landingpage anlegen |
| [`Wie?_NAVIGATION.md`](ANLEITUNGEN/Wie?_NAVIGATION.md) | Navigationseinträge anpassen |
| [`Wie?_REVIEWS.md`](ANLEITUNGEN/Wie?_REVIEWS.md) | Kundenbewertungen hinzufügen oder bearbeiten |
| [`Wie?_WARUM_KUNSTWOLFF.md`](ANLEITUNGEN/Wie?_WARUM_KUNSTWOLFF.md) | Why-Sektion Texte & Bilder pflegen |
| [`UNDEFINED_BEHAVIOR_TIDY_UPS.md`](ANLEITUNGEN/UNDEFINED_BEHAVIOR_TIDY_UPS.md) | Edge Cases & Fallback-Verhalten |

### Technische Memory (`memory/`)

Vollständiger Themen-Index in [`memory/index.md`](memory/index.md). Schnellübersicht:

- **Grundlagen:** [`projekt.md`](memory/projekt.md), [`architektur.md`](memory/architektur.md), [`pfadstruktur.md`](memory/pfadstruktur.md), [`routing.md`](memory/routing.md), [`admin-tool.md`](memory/admin-tool.md)
- **Content-Systeme:** Cities, Skills, Events, Slides, Titelbild, Reviews, FAQs, Why, Erinnerungen, Cinema, Navigation, Referenzlogos
- **Build & Automatisierung:** [`sync-scripts.md`](memory/sync-scripts.md), [`git-hooks.md`](memory/git-hooks.md), [`befehle.md`](memory/befehle.md), [`validierungsreports.md`](memory/validierungsreports.md)
- **Sonstiges:** [`seo.md`](memory/seo.md), [`wip-komponenten.md`](memory/wip-komponenten.md)

## Befehle (Kurzübersicht)

```bash
npm run dev          # Dev-Server (inkl. sync:content)
npm run build        # Production-Build (inkl. sync:content)
npm run preview      # Build lokal prüfen
npm run sync:content # alle Content-Syncs manuell ausführen
npm run optimize:all # alle Bilder zu WebP konvertieren
```

Vollständige Liste: [`memory/befehle.md`](memory/befehle.md).

## Verwandte Repos

Das **Admin-Tool** (separates Preact-Repo unter `/home/sasha/codicus/Kunstwolff-admin/kunstwolff-admin/`) schreibt via GitHub REST API direkt in dieses Repo. Cross-Repo-Details: [`memory/admin-tool.md`](memory/admin-tool.md).
