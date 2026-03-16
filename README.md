# Kunstwolff Website

Astro-Projekt für die Kunstwolff-Landingpages mit statischen Stadtseiten, Skill-Seiten und dateibasierter Content-Pflege. 

Ziele des Projekts: saubere und professionelle Representation von Kunstwolff, Erzielung des höchsten Page-Ranking das möglich ist in Suchmaschinen und anderen digitalen organischen Marketingbereichen durch SEO-Optimierung usw.

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
   - [3.7 FAQs pflegen](#37-faqs-pflegen)
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
- Skills werden über `public/skills/skills.json` gesteuert und automatisch als Seiten generiert.
- Für jede Stadt entstehen (falls fehlend) Ordner in:
   - `public/img/slides/<stadt>/`
   - `public/reviews/<stadt>/`
- Wenn mehrere Schreibweisen auf denselben Slug normalisieren (z. B. `Berlin` und `berlin`), werden bestehende City-Ordner zusammengeführt statt gelöscht (kollisionssicher).
   - `public/faq/<stadt>/`
- Landingseiten werden automatisch statisch generiert für:
   - `/<stadt>/` (allgemeine Stadt-Landing)
   - `/<skill>/` (Skill-Hauptseite, z.B. `/schnellzeichner/`)
   - `/<skill>/<stadt>/` (Skill + Stadt Kombination, z.B. `/schnellzeichner/berlin/`)
- Slides kommen aus Stadtordnern + Fallback aus `default`.
- Reviews kommen zuerst aus der Stadt, dann aus `default`, dann aus anderen Städten (bis Mindestanzahl erreicht ist).
- FAQs werden aus `public/faq/` geladen und nach Stadt und Skill-Kategorie gefiltert.
- Skill-Bilder werden automatisch aus `public/img/UnsereFähigkeitenBilder/<Skill-Titel>/` geladen.

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

Bilder hinzufügen:
- Einfach Bild in den richtigen Ordner legen, committen und pushen.
- Beim Push läuft automatisch die Bildoptimierung (siehe [Abschnitt 5](#5-automatisierung)).

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

Automatische Basis:
- Keywords werden automatisch aus den vorhandenen Skills in `public/skills/` erzeugt.
- Pro Skill werden Skill-Name und Skill-Slug als Keywords genutzt.

Format optionaler Zusatzregeln:

```md
Regeln:
- Schnellzeichner: karikatur, caricature
- Szenenmaler: speedpainting, eventmaler
```

Hinweis:
- Diese Regeln ergänzen nur die automatisch erzeugten Skill-Keywords.
- Bei inhaltlicher Umbenennung (anderer Dateiname/Keywords) kann neu zugeordnet werden.
- Bei reiner Prefix-/Nummern-Änderung bleibt die Zuordnung erhalten.

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
         "heroTitle": "Live Schnellzeichner für Events",
         "description": "Schnellzeichner für Firmenfeiern, Messen & Hochzeiten..."
      },
      {
         "title": "Szenenmaler"
      }
   ]
}
```

Felder:
- `title` (erforderlich): Skill-Name, wird auch für Kategorisierung verwendet
- `heroTitle` (optional): Angepasster Titel für die Hero-Sektion
- `description` (optional): Meta-Description für SEO

Automatik:
- Der Link wird automatisch aus dem Titel generiert: `"Schnellzeichner"` → `/schnellzeichner/`
- Für jeden Skill werden automatisch Seiten generiert:
   - `/<skill>/` (Hauptseite)
   - `/<skill>/<stadt>/` (für jede Stadt aus `landings.md`)
- Skill-Bilder werden automatisch aus `public/img/UnsereFähigkeitenBilder/<Skill-Titel>/` geladen
- Das erste Bild alphabetisch im Ordner wird verwendet
- Slides werden automatisch nach Skill-Kategorie gefiltert (nutzt `categories` in `slides.meta.json`)
- Reviews werden automatisch nach Skill-Kategorie gefiltert (nutzt `categories` in Review-Markdown)
- FAQs werden automatisch nach Skill-Kategorie gefiltert (nutzt `categories` in FAQ-Markdown)

### 3.7 FAQs pflegen

Ablage:
- `public/faq/<stadt>/*.md` für stadtspezifische FAQs
- `public/faq/default/*.md` für allgemeine FAQs

Beispiel:

```md
---
question: "Wie buche ich einen Schnellzeichner?"
answer: "Sie können uns direkt über das Kontaktformular anfragen..."
categories:
   - Schnellzeichner
   - Szenenmaler
---
```

Pflicht:
- `question`: Die Frage
- `answer`: Die Antwort

Optional:
- `categories`: Array von Skills, für die diese FAQ relevant ist
- `city`: Überschreibt den Ordnernamen (Stadt-Zuordnung)

Automatik:
- FAQs werden automatisch nach Skill und Stadt gefiltert
- Auf Skill-Seiten werden nur FAQs mit passender Kategorie angezeigt
- Auf Stadt-Landings werden stadt-spezifische FAQs bevorzugt

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

### Git-Hooks (einmalig aktivieren)

```bash
npm run setup:hooks
```

| Hook | Wann | Was |
| :-- | :-- | :-- |
| `pre-commit` | Vor jedem Commit | Gestagete Slides optimieren, Content-Sync |
| `pre-push` | Vor jedem Push | **Alle** nicht-WebP Bilder in `public/img/` konvertieren |

### Automatische Bildoptimierung beim Push

Einfach Bilder (`.jpg`, `.jpeg`, `.png`, `.gif`) in beliebige Unterordner von `public/img/` legen, committen und pushen. Der Pre-Push-Hook macht dann automatisch:

1. Scannt alle `public/img/` Unterordner rekursiv
2. Konvertiert gefundene Nicht-WebP-Bilder → `.webp` (max. 1600px, Qualität 75)
3. Löscht die Originaldateien
4. Wenn Slides betroffen: `slides.meta.json` wird automatisch aktualisiert
5. Erstellt einen Commit `chore: optimize images to webp` und pusht ihn mit

Für eine einmalige manuelle Ausführung (z. B. um bestehende Bilder zu migrieren):

```bash
npm run optimize:all
```

## 6) Befehle

| Befehl | Zweck |
| :-- | :-- |
| `npm install` | Abhängigkeiten installieren |
| `npm run sync:landings` | Stadtordner für Slides und Reviews anlegen |
| `npm run sync:skills` | Skill-Bildordner anlegen |
| `npm run sync:title-images` | Titelbild-Ordner für default, Landings, Skills und Skill+Landing-Kombis anlegen |
| `npm run sync:slides` | Slide-Dateien und `slides.meta.json` synchronisieren |
| `npm run sync:content:safe` | Führt alle Syncs fehlertolerant aus (Teilfehler werden isoliert, Build/Dev läuft weiter) |
| `npm run sync:content` | Alle Content-Syncs nacheinander ausführen |
| `npm run remove:landing -- <stadt> [archivpfad]` | Archiviert alle Landing-Daten einer Stadt nach `removed_landings/` und entfernt die Stadt aus `landings.md/json` |
| `npm run optimize:all` | Alle Bilder in `public/img/` zu WebP konvertieren (einmalig/manuell) |
| `npm run dev` | Entwicklungsserver starten (inkl. Sync) |
| `npm run build` | Produktionsbuild (inkl. Sync) |
| `npm run preview` | Build lokal prüfen |
