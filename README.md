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
   - [3.7 Why-Sektion pflegen](#37-why-sektion-pflegen)
   - [3.8 Titelbild pflegen](#38-titelbild-pflegen)
   - [3.9 FAQs pflegen](#39-faqs-pflegen)
- [4) Neue Stadt hinzufügen](#4-neue-stadt-hinzufügen-vollständiger-workflow)
- [5) Seite bauen und prüfen](#5-seite-bauen-und-prüfen)
- [6) Automatisierung](#6-automatisierung)
- [7) Befehle](#7-befehle)
- [8) SEO-Technische Grundlagen](#8-seo-technische-grundlagen)
- [Anleitungen (nicht-technisch)](#anleitungen-nicht-technisch)
- [8) SEO-Technische Grundlagen](#8-seo-technische-grundlagen)

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
- Für jede Stadt entstehen (falls fehlend) Ordner und Dateien in:
   - `public/img/slides/<stadt>/`
   - `public/reviews/<stadt>/`
   - `public/faq/<stadt>/`
   - `public/img/Titelbild/<stadt>/`
   - `public/img/why/<stadt>/benefit-{1-4}/`
   - `public/why/<stadt>.json`
- Wenn mehrere Schreibweisen auf denselben Slug normalisieren (z. B. `Berlin` und `berlin`), werden bestehende City-Ordner zusammengeführt statt gelöscht (kollisionssicher).
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

```
# Städteliste für kunstwolff.de
# Eine Stadt pro Zeile. kleingeschrieben, keine Leerzeichen, keine Sonderzeichen.
# Korrekt: berlin  |  Falsch: Berlin, Berl in, Berlín

berlin
frankfurt
hamburg
```

**Kein YAML-Frontmatter** – einfache Textliste, eine Stadt pro Zeile. Kommentarzeilen mit `#` werden ignoriert.

**Fallback-Quellen (Reihenfolge):** `landings.ts` kennt drei Quellen für Stadtlisten:
1. `public/landings/landings.md` – primäre Quelle
2. `public/landings/landings.json` – Fallback falls `.md` fehlt (aktuell nicht verwendet)
3. Auto-Discovery aus Verzeichnisstrukturen – letzter Ausweg wenn beide fehlen

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

### 3.7 Why-Sektion pflegen

#### Bilder

Ablage: `public/img/why/<key>/benefit-{1-4}/`

Der `<key>` ist ein Stadtslug oder Skillslug (z.B. `berlin/`, `schnellzeichner/`). Pro Key gibt es 4 Benefit-Ordner. Einfach ein Bild in den jeweiligen Ordner legen.

#### Texte

Datei: `public/why/<key>.json`

Mögliche Keys (Priorität absteigend bei der Auflösung durch `why.ts`):
1. `{skill}-{stadt}.json` – z.B. `schnellzeichner-berlin.json` (spezifischste Variante)
2. `{stadt}.json` – z.B. `berlin.json`
3. `{skill}.json` – z.B. `schnellzeichner.json`
4. `default.json` – globaler Fallback

Format:

```json
{
  "benefits": [
    {
      "title": "Echte Künstler - keine Agentur",
      "text": "Sie buchen uns direkt ...",
      "image": "/img/why/berlin/benefit-1/sample1.jpeg",
      "alt": "Live Künstler von Kunstwolff beim Zeichnen"
    }
  ]
}
```

Felder pro Benefit:
- `title` – Überschrift des Benefit-Blocks
- `text` – Beschreibungstext
- `image` – Pfad zum Bild relativ zu `public/`
- `alt` – Alt-Text des Bildes (SEO)

**Automatik:** `sync:why` erstellt `{stadt}.json` und `{skill}.json` für alle Einträge aus `landings.md` und `skills.json` automatisch (Basis: `default.json`, Bildpfade werden angepasst). Manuell anlegen muss man nur `{skill}-{stadt}.json` Kombis.

---

### 3.8 Titelbild pflegen

Ablage: `public/img/Titelbild/<stadt>/`

Metadaten: `public/img/Titelbild/title.meta.json`

Selbes Format wie `slides.meta.json`:

```json
{
  "berlin/titelbild.webp": {
    "categories": ["Schnellzeichner"],
    "priority": 1,
    "enabled": true
  }
}
```

- `categories` – steuert welches Bild bei Skill-Seiten verwendet wird
- `priority` – höhere Zahl = bevorzugt
- `enabled: false` – Bild ausblenden ohne zu löschen

Fallback: wenn keine stadtspezifischen Titelbilder vorhanden, wird `default/` verwendet.

---

### 3.9 FAQs pflegen

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

## 4) Neue Stadt hinzufügen (vollständiger Workflow)

1. Slug in `public/landings/landings.md` eintragen (lowercase, keine Leerzeichen)
2. `npm run sync:content` ausführen (oder `npm run dev` – läuft automatisch)
   - Erstellt automatisch: `public/img/slides/<stadt>/`, `public/reviews/<stadt>/`, `public/faq/<stadt>/`, `public/img/Titelbild/<stadt>/`, `public/img/why/<stadt>/benefit-{1-4}/`, `public/why/<stadt>.json`
3. Stadtspezifische Bilder hochladen (Slides, Titelbild, Why-Bilder)
4. Texte in `public/why/<stadt>.json` anpassen (wurde in Schritt 2 mit Default-Texten erstellt)
5. Optional: stadtspezifische Reviews und FAQs anlegen

**Hinweis:** GitHub Action `sync-landings.yml` macht Schritt 2 automatisch bei Push. Alles außer Bild-Upload und Text-Anpassung ist vollautomatisch.

---

## 5) Seite bauen und prüfen

```bash
npm run build
npm run preview
```

## 6) Automatisierung

- `npm run dev` und `npm run build` starten automatisch `sync:content`.
- `sync:content` führt aus (in dieser Reihenfolge):
   - `sync:landings` – Stadtordner anlegen, Kollisionen mergen, Validierungsreport
   - `sync:skills` – Skill-Bildordner anlegen
   - `sync:title-images` – Titelbild-Ordner anlegen
   - `sync:slides` – `slides.meta.json` pflegen (Priority-Prefix, Kategorien, Migration)
   - `sync:why` – `public/why/{city|skill}.json` und Why-Bildordner anlegen
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

## 7) Befehle

| Befehl | Zweck |
| :-- | :-- |
| `npm install` | Abhängigkeiten installieren |
| `npm run sync:landings` | Stadtordner für Slides und Reviews anlegen |
| `npm run sync:skills` | Skill-Bildordner anlegen |
| `npm run sync:title-images` | Titelbild-Ordner für default, Landings, Skills und Skill+Landing-Kombis anlegen |
| `npm run sync:slides` | Slide-Dateien und `slides.meta.json` synchronisieren |
| `npm run sync:why` | `public/why/` JSON-Dateien und Why-Bildordner synchronisieren |
| `npm run sync:content:safe` | Führt alle Syncs fehlertolerant aus (Teilfehler werden isoliert, Build/Dev läuft weiter) |
| `npm run sync:content` | Alle Content-Syncs nacheinander ausführen |
| `npm run remove:landing -- <stadt> [archivpfad]` | Archiviert alle Landing-Daten einer Stadt nach `removed_landings/` und entfernt die Stadt aus `landings.md/json` |
| `npm run optimize:all` | Alle Bilder in `public/img/` zu WebP konvertieren (einmalig/manuell) |
| `npm run dev` | Entwicklungsserver starten (inkl. Sync) |
| `npm run build` | Produktionsbuild (inkl. Sync) |
| `npm run preview` | Build lokal prüfen |

## 8) SEO-Technische Grundlagen

### Sitemap

Die Sitemap wird automatisch beim Build über `@astrojs/sitemap` generiert.

Ausgabe nach `npm run build`:

```
dist/sitemap-index.xml
dist/sitemap-0.xml
```

Alle statisch generierten Seiten (Homepage, Stadtseiten, Skill-Seiten, Skill+Stadt-Kombinationen) werden automatisch erfasst. Nach dem Deploy ist die Sitemap erreichbar unter:

```
https://kunstwolff.de/sitemap-index.xml
```

Diese URL sollte in der **Google Search Console** eingetragen werden, damit Google alle Seiten schnell findet und indexiert.

### Meta Tags (Title, Description, Canonical)

Jede Seite bekommt automatisch individuell generierte Meta-Tags:

| Seitentyp | Beispiel-Title | Description |
| :-- | :-- | :-- |
| Homepage | `Kunstwolff – Eventkünstler seit über 20 Jahren` | Generisch (aus `Layout.astro`) |
| Stadtseite `/berlin/` | `Eventkünstler Berlin – Live-Kunst & Performance \| Kunstwolff` | Stadtspezifisch |
| Skill-Seite `/schnellzeichner/` | `Schnellzeichner für Events buchen \| Kunstwolff` | Aus `skills.json` (`description`-Feld) |
| Skill+Stadt `/schnellzeichner/berlin/` | `Schnellzeichner Berlin buchen \| Kunstwolff` | Aus `skills.json` (`description`-Feld) |

Zusätzlich wird auf jeder Seite ein `<link rel="canonical">` gesetzt, der auf die kanonische URL zeigt (wichtig gegen Duplicate-Content-Strafen).

**Wie Title und Description angepasst werden:**

- Skill-Beschreibungen für die Meta-Description → `public/skills/skills.json` im Feld `description`
- Seiten-Titel für Skill-Seiten → `public/skills/skills.json` im Feld `heroTitle`
- Stadtseiten-Texte → direkt in `src/pages/[landing].astro`

### HTML-Sprache

Das `<html lang="de">` Attribut ist korrekt gesetzt. Damit weiß Google, dass der Content auf Deutsch ist, und bevorzugt die Seite bei deutschen Suchanfragen.

### Open Graph Tags

Auf jeder Seite werden automatisch Open Graph Tags generiert – für schöne Vorschau-Karten wenn Links auf WhatsApp, LinkedIn oder Facebook geteilt werden:

```html
<meta property="og:title" content="Schnellzeichner Berlin buchen | Kunstwolff" />
<meta property="og:description" content="..." />
<meta property="og:url" content="https://kunstwolff.de/schnellzeichner/berlin/" />
<meta property="og:type" content="website" />
<meta property="og:image" content="https://kunstwolff.de/img/Titelbild/..." />
```

Das `og:image` wird automatisch aus dem jeweiligen Titelbild der Seite generiert. Kein manueller Aufwand nötig.

### robots.txt

`public/robots.txt` erlaubt alle Crawler und verweist auf die Sitemap:

```
User-agent: *
Allow: /

Sitemap: https://kunstwolff.de/sitemap-index.xml
```

### Structured Data (Schema.org JSON-LD)

Jede Seite enthält maschinenlesbare Metadaten für Google (Rich Snippets). Alles wird **vollautomatisch** beim Build generiert – keine manuelle Pflege nötig.

| Seitentyp | Schema-Typen |
| :-- | :-- |
| Homepage `/` | `LocalBusiness` + `FAQPage` |
| Skill-Seite `/schnellzeichner/` | `Service` + `FAQPage` |
| Stadtseite `/berlin/` | `BreadcrumbList` + `FAQPage` |
| Skill+Stadt `/schnellzeichner/berlin/` | `BreadcrumbList` + `FAQPage` |

**`LocalBusiness`** (nur Homepage) – Unternehmensadresse, Telefon, Tätigkeitsgebiet. Basis für Google-Wissensbox und Maps-Anbindung.

**`Service`** – beschreibt die konkrete Dienstleistung (Schnellzeichner/Szenenmaler), verknüpft mit dem Anbieter. Stärkt das Signal für "XY buchen"-Suchanfragen.

**`BreadcrumbList`** – Pfadstruktur für Google:
```
kunstwolff.de › Schnellzeichner › Berlin
```
Erscheint unter dem Link in den Suchergebnissen, verbessert Klickrate und Seitenstruktur-Erkennung.

**`FAQPage`** (alle Seiten via `FAQ.astro`) – bereits vorhandene FAQ-Komponente generiert automatisch Schema für jede Frage/Antwort. Kann zu aufklappbaren FAQ-Blöcken direkt in den Suchergebnissen führen.

**Wo Daten herkommen:**
- `LocalBusiness`-Adresse/Telefon → hardcoded in `src/pages/index.astro`
- `Service`-Name/Description → aus `public/skills/skills.json`
- `BreadcrumbList`-Pfade → dynamisch aus URL-Parametern (`skill`, `landing`)
- `FAQPage` → aus `public/faq/` Markdown-Dateien


---

## Anleitungen (nicht-technisch)

Im Ordner [`ANLEITUNGEN/`](ANLEITUNGEN/) liegen Schritt-für-Schritt-Anleitungen für wiederkehrende Aufgaben:

| Datei | Inhalt |
| :-- | :-- |
| [`Wie?_FOTOS_HINZUFÜGEN.md`](ANLEITUNGEN/Wie?_FOTOS_HINZUFÜGEN.md) | Bilder für Slideshow/Titelbild/Why hochladen |
| [`Wie?_LANDINGPAGES.md`](ANLEITUNGEN/Wie?_LANDINGPAGES.md) | Neue Stadt als Landingpage anlegen (Non-Tech-Workflow) |
| [`Wie?_NAVIGATION.md`](ANLEITUNGEN/Wie?_NAVIGATION.md) | Navigationseinträge anpassen |
| [`Wie?_REVIEWS.md`](ANLEITUNGEN/Wie?_REVIEWS.md) | Kundenbewertungen hinzufügen oder bearbeiten |
| [`Wie?_WARUM_KUNSTWOLFF.md`](ANLEITUNGEN/Wie?_WARUM_KUNSTWOLFF.md) | Why-Sektion Texte & Bilder pflegen |
| [`UNDEFINED_BEHAVIOR_TIDY_UPS.md`](ANLEITUNGEN/UNDEFINED_BEHAVIOR_TIDY_UPS.md) | Dokumentation von Edge Cases und Fallback-Verhalten |
