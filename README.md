# Kunstwolff Website

Astro-Projekt für die Kunstwolff-Landingpages mit statischen Stadtseiten, Skill-Seiten und dateibasierter Content-Pflege.

## Inhaltsverzeichnis

- [1) Schnellstart](#1-schnellstart)
- [2) Aktuelle Funktionsweise (kurz)](#2-aktuelle-funktionsweise-kurz)
- [3) Content-Pflege](#3-content-pflege)
   - [3.1 Städte pflegen](#31-städte-pflegen)
   - [3.2 Slides pflegen](#32-slides-pflegen)
   - [3.3 Slide-Metadaten](#33-slide-metadaten)
   - [3.4 Kategorie-Matching für neue Slides](#34-kategorie-matching-für-neue-slides)
   - [3.5 Reviews pflegen](#35-reviews-pflegen)
   - [3.6 Skills pflegen](#36-skills-pflegen)
- [4) Seite bauen und prüfen](#4-seite-bauen-und-prüfen)
- [5) Automatisierung](#5-automatisierung)
- [6) Befehle](#6-befehle)

## 1) Schnellstart

Voraussetzungen:
- Node.js 20+
- npm

Setup:

```bash
npm install
npm run dev
```

Wichtig:
- Vor `dev` und `build` läuft automatisch `npm run sync:content`.
- Dadurch sind Ordner- und Metadatenstruktur immer aktuell, bevor Seiten gebaut werden.

## 2) Aktuelle Funktionsweise (kurz)

- Städte werden über `public/landings/landings.md` gesteuert.
- Für jede Stadt entstehen (falls fehlend) Ordner in:
   - `public/img/slides/<stadt>/`
   - `public/reviews/<stadt>/`
- Landingseiten werden statisch generiert für:
   - `/<stadt>/`
   - `/schnellzeichner/<stadt>/`
- Slides kommen aus Stadtordnern + Fallback aus `default`.
- Reviews kommen zuerst aus der Stadt, dann aus `default`, dann aus anderen Städten (bis Mindestanzahl erreicht ist).
- Skills kommen aus `public/skills/skills.json`; Skill-Bilder werden aus Skill-Ordnern geladen.

## 3) Content-Pflege

### 3.1 Städte pflegen

Datei: `public/landings/landings.md`

```md
---
cities:
   - berlin
   - frankfurt
   - hamburg
---
```

Regeln:
- Nur Slugs eintragen (klein, z. B. `koeln`).
- Nach Änderung `npm run sync:landings` oder direkt `npm run dev`/`npm run build` ausführen.

### 3.2 Slides pflegen

Ablage:
- `public/img/slides/default/` für generische Slides
- `public/img/slides/<stadt>/` für stadtspezifische Slides

Erlaubte Formate:
- `.avif`, `.gif`, `.jpeg`, `.jpg`, `.png`, `.webp`

Sortierung & Priorität:
- Dateiname mit Prefix steuert Priorität, z. B. `120_event.jpg`.
- Höhere Priorität wird zuerst angezeigt.
- Fehlt Prefix, vergibt `sync:slides` automatisch einen.
- Lücken in Prefix-Reihen werden automatisch geglättet.

### 3.3 Slide-Metadaten

Datei: `public/img/slides/slides.meta.json`

Format:

```json
{
   "berlin/120_event.jpg": {
      "categories": ["Schnellzeichner"],
      "altOverride": "Live-Karikaturen in Berlin",
      "priority": 120,
      "enabled": true
   }
}
```

Felder:
- `categories` (Array): Skill-Filter, z. B. für Schnellzeichner-Slideshow.
- `altOverride` (optional): eigener Alt-Text.
- `priority` (Zahl): wird durch `sync:slides` aus Prefix gepflegt.
- `enabled` (optional, `false`): Bild ausblenden.

Automatik:
- Neue Bilder bekommen automatisch einen Metadaten-Eintrag.
- Kategorien werden beim ersten Anlegen via Dateiname-Regeln vorbelegt.
- Bei klarer Umbenennung werden Metadaten auf den neuen Dateinamen migriert.

### 3.4 Kategorie-Matching für neue Slides

Datei: `public/img/slides/category-matching.md`

Format der Regeln:

```md
Regeln:
- Schnellzeichner: schnellzeichner, karikatur, caricature
- Szenenmaler: szenenmaler, speedpainting
```

Hinweis:
- Diese Zuordnung greift nur beim ersten Erstellen eines Metadaten-Eintrags.

### 3.5 Reviews pflegen

Ablage:
- `public/reviews/<stadt>/*.md`
- Vorlage: `public/reviews/_vorlage.md`

Beispiel:

```md
---
author: "Max Mustermann"
categories:
   - Schnellzeichner
rating: 5
---
Das war ein großartiges Event.
```

Pflicht:
- `author`
- Review-Text im Body

Optional:
- `categories` (für Skill-Filter)
- `rating`
- `city` (überschreibt Ordnernamen)

### 3.6 Skills pflegen

Datei: `public/skills/skills.json`

Beispiel:

```json
{
   "skills": [
      {
         "title": "Schnellzeichner",
         "link": "/schnellzeichner/",
         "alt": "Live Schnellzeichner"
      }
   ]
}
```

Wichtig:
- `title` und `link` sind erforderlich.
- Für jeden Skill wird ein Bildordner erwartet:
   `public/img/UnsereFähigkeitenBilder/<Skill-Titel>/`
- Das erste Bild alphabetisch im Ordner wird verwendet.
- `image` in `skills.json` ist optional; Ordnerbild hat Vorrang.

## 4) Seite bauen und prüfen

```bash
npm run build
npm run preview
```

## 5) Automatisierung

- `npm run dev` und `npm run build` starten automatisch `sync:content`.
- `sync:content` führt aus:
   - `sync:landings`
   - `sync:skills`
   - `sync:slides`
- GitHub Action: `.github/workflows/sync-landings.yml`
   - Triggert bei Änderungen an `public/landings/landings.md` und `public/skills/skills.json`
   - Führt `npm run sync:content` aus
   - Committet neu erzeugte Content-Ordner zurück

Optional lokal:

```bash
npm run setup:hooks
```

Danach läuft bei jedem Commit der Pre-Commit-Hook aus `.githooks/pre-commit`.

## 6) Befehle

| Befehl | Zweck |
| :-- | :-- |
| `npm install` | Abhängigkeiten installieren |
| `npm run sync:landings` | Stadtordner für Slides und Reviews anlegen |
| `npm run sync:skills` | Skill-Bildordner anlegen |
| `npm run sync:slides` | Slide-Dateien und `slides.meta.json` synchronisieren |
| `npm run sync:content` | Alle Content-Syncs nacheinander ausführen |
| `npm run dev` | Entwicklungsserver starten (inkl. Sync) |
| `npm run build` | Produktionsbuild (inkl. Sync) |
| `npm run preview` | Build lokal prüfen |
