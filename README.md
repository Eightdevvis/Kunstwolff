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
   - [3.10 Navigation pflegen](#310-navigation-pflegen)
   - [3.11 Referenzlogos pflegen](#311-referenzlogos-pflegen)
   - [3.12 Events pflegen](#312-events-pflegen)
   - [3.13 CinemaWelcome pflegen](#313-cinemawelcome-pflegen)
   - [3.14 Erinnerungen pflegen](#314-erinnerungen-pflegen)
   - [3.15 Partner pflegen](#315-partner-pflegen)
- [4) Neue Stadt hinzufügen](#4-neue-stadt-hinzufügen-vollständiger-workflow)
- [5) Seite bauen und prüfen](#5-seite-bauen-und-prüfen)
- [6) Automatisierung](#6-automatisierung)
- [7) Befehle](#7-befehle)
- [8) SEO-Technische Grundlagen](#8-seo-technische-grundlagen)
- [Anleitungen (nicht-technisch)](#anleitungen-nicht-technisch)

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
- VS Code: projektspezifische Settings liegen in `.vscode/settings.json` (u.a. TypeScript-Plugin für Astro).
- Fonts: Custom-Font "Mayonice" liegt in `public/fonts/mayonice/` und wird via `global.css` eingebunden.

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
- **Event-Seiten** werden automatisch statisch generiert für:
   - `/<event>/` (Event-Typ-Seite, z.B. `/firmenfeier/`, `/messe/`, `/hochzeit/`, `/private-feier/`)
   - `/<skill>/<event>/` (Skill + Event Kombination, z.B. `/schnellzeichner/firmenfeier/`)
   - Events werden über `public/events/events.json` gesteuert (analog zu skills.json)
   - Per-Event-Content (Ablauf, Pakete, Referenzen) in `public/events/<event>/content.json`
   - Event-Slides in `public/img/slides/events/<event>/`, Titelbilder in `public/img/Titelbild/events/<event>/`
- Slides kommen aus Stadtordnern + Fallback aus `default/` (Mindestzahl: **6 Slides** – wird mit Default-Slides aufgefüllt).
- Reviews kommen zuerst aus der Stadt, dann aus `default/`, dann aus anderen Städten in alphabetischer Reihenfolge (Mindestzahl: **7 Reviews**).
- FAQs werden aus `public/faq/` geladen und nach Stadt und Skill-Kategorie gefiltert.
- Skill-Bilder werden automatisch aus `public/img/UnsereFähigkeitenBilder/<Skill-Titel>/` geladen.
- **Astro Content Collections** werden aktuell nicht verwendet – Content kommt direkt aus `public/` via Utils in `src/utils/`. (`src/content.config.ts` existiert nur weil Astro den Export erwartet, ist aber leer.)
- **Admin-Tool:** Ein separates Preact-Admin-Tool (`Kunstwolff-admin`) schreibt via GitHub REST API direkt in dieses Repo. Pfade in `public/` die davon betroffen sind: `public/img/slides/`, `public/reviews/`, `public/faq/`, `public/calendar/`, `public/cinema/`. Pfadänderungen dort müssen mit dem Admin-Tool abgeglichen werden.
- **Partner-Seite:** `/partner/` → `src/pages/partner.astro`. Daten aus `public/partners/partners.json`, Logos aus `public/img/partners/`. Wird vom Admin-Tool (Tab "Partner") verwaltet.
- **`CMS-erstellung-anweisung.md`** im Projekt-Root: Das ist die CLAUDE.md-Instruktionsdatei für das Admin-Repo, hier gecacht damit Claude-Instanzen die am Website-Repo arbeiten auch den Admin-Kontext kennen. Wird manuell synchron gehalten wenn sich das Admin-Repo ändert.

### Nicht eingebundene Komponenten (Work in Progress)

Folgende Components existieren, sind aber aktuell nirgendwo in Pages/Layouts importiert:

| Component | Zweck |
| :-- | :-- |
| `src/components/Eventtypes.astro` | Eventtypen-Grid (Firmenfeiern, Messen, Hochzeiten, Private Feiern) mit aufklappbaren Detailboxen und Links zu Event-Seiten – noch nicht in Pages eingebunden |
| `src/components/hero/SchnellzeichnerHero.astro` | Alternativer Hero-Block für Schnellzeichner-Seiten (helles Design, Grid-Layout mit MiniReviews + BrandStripe) |
| `src/components/about/AboutSchnellzeichner.astro` | Skill-spezifische About-Sektion mit festem Schnellzeichner-Text und Bild-Slot |

Diese Components sind bewusst vorbereitet aber noch nicht live.

---

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
- Reihenfolge wird über das `priority`-Feld in `slides.meta.json` gesteuert (höhere Zahl = weiter vorne).
- Das Admin-Tool setzt die Priority beim Upload automatisch.
- Manuell hochgeladene Bilder ohne Priority-Eintrag werden alphabetisch ans Ende sortiert.

Fallback-Logik:
- Hat eine Stadt weniger als **6 eigene Slides**, werden automatisch Slides aus `default/` ergänzt bis 6 Slides erreicht sind.
- Liegen `foto.jpg` und `foto.webp` im selben Ordner, wird nur das `.webp` angezeigt (Deduplication).

Lightbox:
- Klick auf ein Bild öffnet die Lightbox (eigene Implementierung, kein externes Package).
- Desktop: Klick zooms auf 2.5×, Doppelklick oder Klick im Zoom setzt zurück; Drag zum Verschieben im Zoom.
- Mobile: Pinch-Zoom (1–4×), Swipe zum Navigieren (wenn nicht gezoomt).
- Tastatur: Pfeiltasten navigieren, ESC schließt.

### 3.3 Slide-Metadaten

Datei: `public/img/slides/slides.meta.json`

Format:

```json
{
   "berlin/event.jpg": {
      "categories": ["Schnellzeichner"],
      "altOverride": "Live-Karikaturen in Berlin",
      "title": "Firmenevent Berlin 2024",
      "priority": 120,
      "enabled": true
   }
}
```

Felder:
- `categories` (Array): Skill-Filter, z. B. für Schnellzeichner-Slideshow.
- `altOverride` (optional): Alt-Text für das `<img>`-Tag (Accessibility + Google Bild-SEO).
- `title` (optional): Anzeigetitel in der Lightbox-Caption. Unabhängig von `altOverride`. Kein Wert gesetzt → Lightbox zeigt `altOverride` als Fallback.
- `priority` (Zahl, optional): Sortierreihenfolge – höhere Zahl = weiter vorne. Wird vom Admin-Tool gesetzt. `sync:slides` überschreibt diesen Wert nicht.
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

Fallback-Logik:
- Die Website zeigt mindestens **7 Reviews** pro Seite.
- Reihenfolge der Quellen: Stadt-Reviews → `default/`-Reviews → Reviews anderer Städte (alphabetisch zirkulär um die aktuelle Stadt).
- Hat eine Stadt weniger als 7 eigene Reviews, wird automatisch aufgefüllt.

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

Fallback-Kette: stadtspezifisch → `default/` → `/img/samples/sample1.jpeg` (Systemfallback wenn auch `default/` leer ist).

**Artefakt-Unterordner:** `public/img/Titelbild/landings/` und `public/img/Titelbild/skills/` sind Überbleibsel aus einer früheren Struktur. Sie werden ignoriert und haben keine Auswirkung auf die Website. Nicht löschen (werden ggf. noch manuell aufgeräumt), aber auch nicht befüllen.

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

### 3.10 Navigation pflegen

Datei: `public/navigation/navigation.json`

Format:

```json
{
  "items": [
    { "label": "Home", "url": "/" },
    { "label": "Services", "children": [
      { "label": "Schnellzeichner", "url": "/schnellzeichner/" }
    ]}
  ]
}
```

Einfache Links haben `label` + `url`. Dropdown-Menüs haben `label` + `children` (Array von Links). Ausführliche Anleitung: [`ANLEITUNGEN/Wie?_NAVIGATION.md`](ANLEITUNGEN/Wie?_NAVIGATION.md)

### 3.11 Referenzlogos pflegen

Ablage: `public/img/referenzenLogos/`

Alle Bilder in diesem Ordner werden automatisch in der Referenz-Sektion (`BrandStripe`) angezeigt. Der Dateiname (ohne Extension) wird als Label genutzt – Unterstriche werden zu Leerzeichen: `acme_gmbh.webp` → "acme gmbh". Erlaubte Formate: `.webp`, `.png`, `.jpg`, `.avif`.

### 3.12 Events pflegen

Datei: `public/events/events.json`

```json
{
  "events": [
    {
      "title": "Firmenfeier",
      "slug": "firmenfeier",
      "heroTitle": "Live-Kunst auf Ihrer Firmenfeier",
      "description": "Professionelle Eventkünstler für Corporate Events...",
      "categories": ["Schnellzeichner", "Szenenmaler"]
    }
  ]
}
```

**Neuen Event hinzufügen:**
1. Eintrag in `public/events/events.json` anlegen (`title`, `slug`, `heroTitle`, `description`, `categories`)
2. `npm run sync:events` (oder `npm run dev`) ausführen
   - Erstellt automatisch: `public/img/slides/events/<slug>/`, `public/img/Titelbild/events/<slug>/`, `public/events/<slug>/content.json`
3. Bilder hochladen: Event-Slides nach `public/img/slides/events/<slug>/`, Titelbild nach `public/img/Titelbild/events/<slug>/`
4. Content anpassen: `public/events/<slug>/content.json` – Ablauf-Schritte, Pakete, Sektionen ein-/ausblenden via `enabled`-Flag

**Generierten Seiten:**
- `/<slug>/` – Standalone Event-Seite (z.B. `/firmenfeier/`)
- `/<skill>/<slug>/` – Skill+Event-Kombination (z.B. `/schnellzeichner/firmenfeier/`) – wird automatisch für alle Skills generiert

**Per-Event-Content (`public/events/<slug>/content.json`):**

Jede Sektion hat ein `enabled`-Flag – Admin-Tool kann Sektionen aktivieren/deaktivieren.
Vollständiges Format:

```json
{
  "ablauf": {
    "enabled": true,
    "title": "So läuft Ihre Firmenfeier mit uns ab",
    "steps": [
      {
        "title": "Anfrage & Briefing",
        "text": "Beschreibung des Schritts...",
        "icon": "chat"
      }
    ]
  },
  "pakete": {
    "enabled": true,
    "title": "Unsere Pakete für Ihre Firmenfeier",
    "items": [
      {
        "title": "Starter",
        "duration": "2 Stunden",
        "price": "Auf Anfrage",
        "features": [
          "1 Künstler",
          "Live-Karikaturen oder Szenenmalerei",
          "Material inklusive"
        ]
      }
    ]
  },
  "skills": {
    "enabled": true,
    "title": "Passende Künstler für Ihre Firmenfeier"
  },
  "referenzen": {
    "enabled": false,
    "title": "Unternehmen die uns bereits gebucht haben",
    "text": "",
    "logos": [
      { "src": "/img/partners/logo.webp", "alt": "Firmenname" }
    ]
  }
}
```

**Feld-Referenz:**

| Sektion | Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|---|
| `ablauf.steps[]` | `title` | string | ja | Schritt-Überschrift |
| | `text` | string | ja | Beschreibungstext |
| | `icon` | string | nein | Icon-Kennung: `chat`, `setup`, `star`, `gift` |
| `pakete.items[]` | `title` | string | ja | Paketname (z.B. "Starter", "Event", "Premium") |
| | `duration` | string | ja | Zeitangabe (z.B. "2 Stunden", "Ganztägig") |
| | `price` | string | ja | Preis (z.B. "Auf Anfrage", "ab 500€") |
| | `features` | string[] | ja | Feature-Liste als Array |
| `skills` | `title` | string | nein | Nur Titel – Skills werden automatisch aus `events.json` `categories` gelesen |
| `referenzen` | `text` | string | nein | Freitext über Referenzen |
| | `logos[]` | array | nein | `{ src, alt }` – Pfad zu Logo-Bild + Alt-Text |

**Event-Bilder:**
- Slides: `public/img/slides/events/<slug>/` (separater Namespace, nicht mit Stadtslides vermischt)
- Titelbild: `public/img/Titelbild/events/<slug>/`
- Metadaten: gleiche `slides.meta.json` wie Stadtslides, Key-Format: `events/<slug>/dateiname.webp`

**Event entfernen:**
- Eintrag aus `events.json` löschen
- Ordner manuell löschen: `public/events/<slug>/`, `public/img/slides/events/<slug>/`, `public/img/Titelbild/events/<slug>/`

### 3.13 CinemaWelcome pflegen

Datei: `public/cinema/cinema.json`

Die CinemaWelcome-Komponente auf der Startseite (3 Orbit-Sektionen mit Hauptkreis + Satelliten) wird komplett über diese JSON-Datei gesteuert.

**Struktur:**

```json
{
  "intro": {
    "title": "Willkommen",
    "subtitle": "Erzählen Sie uns doch etwas über sich."
  },
  "sections": [
    {
      "title": "Ihr Event",
      "subtitle": "auf welches Event dürfen wir Sie begleiten?",
      "mainCircle": {
        "image": "/img/pfad/zum/bild.webp",
        "alt": "Alt-Text",
        "hint": "Entdecken"
      },
      "satellites": [
        {
          "title": "Schnellzeichner",
          "image": "/img/slides/default/1_schnellzeichner_hq.webp",
          "link": "/schnellzeichner/",
          "alt": "Live Schnellzeichner für Events"
        }
      ]
    }
  ]
}
```

**Felder:**

| Ebene | Feld | Pflicht | Beschreibung |
| :-- | :-- | :-- | :-- |
| `intro` | `title` | Ja | Titel des Willkommen-Blocks (Mayonice-Font) |
| `intro` | `subtitle` | Ja | Untertitel des Willkommen-Blocks |
| `sections[]` | `title` | Ja | Sektions-Überschrift (h2, Mayonice-Font) |
| `sections[]` | `subtitle` | Ja | Sektions-Untertitel |
| `mainCircle` | `image` | Ja | Pfad zum Bild des großen Kreises (relativ zu `public/`) |
| `mainCircle` | `alt` | Ja | Alt-Text des Hauptkreis-Bildes |
| `mainCircle` | `hint` | Nein | Text bei Hover (Default: "Entdecken") |
| `satellites[]` | `title` | Ja | Label-Text (erscheint bei Hover über den kleinen Kreis) |
| `satellites[]` | `image` | Ja | Pfad zum Bild (relativ zu `public/`) |
| `satellites[]` | `link` | Ja | Ziel-URL beim Klick (z.B. `/schnellzeichner/`) |
| `satellites[]` | `alt` | Nein | Alt-Text (Fallback: `title`) |

**Regeln:**
- `sections` muss genau **3 Einträge** haben (die Website erwartet 3 Orbit-Sektionen)
- Pro Sektion: **1–6 Satelliten** erlaubt (CSS-Layout-Limit bei 6)
- Der Hauptkreis (`mainCircle`) kann nicht entfernt werden – nur Bild/Alt/Hint editierbar
- Jede Sektion hat eigene Satelliten und einen eigenen Hauptkreis
- Layout (welche Sektion reversed ist, Positionierung) ist im Code fest – nicht in der JSON

**Technische Details:**
- Geladen von `src/utils/cinema.ts` (`getCinemaData()`) zur Build-Zeit
- Verwendet in `src/components/CinemaWelcome.astro`
- Robuste Validierung: bei fehlender/kaputter JSON greift automatisch ein Fallback (Schnellzeichner + Szenenmaler)
- Kein Sync-Script nötig – Datei wird direkt gelesen

**Admin-Tool:** Kann `cinema.json` noch nicht verwalten (geplant).

### 3.14 Erinnerungen pflegen

Datei: `public/erinnerungen/<key>.json`

Die Erinnerungen-Komponente zeigt auf Landing-Seiten einen Pinnwand-Streifen mit 4 Fotos, die leicht schräg „angepinnt" wirken (Polaroid-Look mit Pinnadel).

**JSON-Format:**

```json
{
  "photos": [
    {
      "image": "/img/slides/default/1_schnellzeichner_hq.webp",
      "alt": "Schnellzeichner bei einem Live-Event"
    },
    {
      "image": "/img/slides/default/2_karikatur_stadtfest.webp",
      "alt": "Karikatur-Zeichnung als Andenken"
    },
    {
      "image": "/img/slides/default/3_schnellzeichner-schweiz.webp",
      "alt": "Live-Schnellzeichner sorgt für Staunen"
    },
    {
      "image": "/img/slides/default/4_Hochzeit_schnellzeichner_maler.webp",
      "alt": "Schnellzeichner auf einer Hochzeitsfeier"
    }
  ]
}
```

**Felder pro Foto:**
- `image` – Pfad zum Bild relativ zu `public/`
- `alt` – Alt-Text des Bildes (SEO + Accessibility)

**Fallback-Kette** (identisch zum Why-System, höchste Priorität zuerst):
1. `{skill}-{stadt}.json` – z.B. `schnellzeichner-berlin.json`
2. `{stadt}.json` – z.B. `berlin.json`
3. `{skill}.json` – z.B. `schnellzeichner.json`
4. `default.json` – globaler Fallback

**Automatik:** `sync:erinnerungen` erstellt `{stadt}.json` und `{skill}.json` für alle Einträge aus `landings.md` und `skills.json` automatisch (Kopie von `default.json`). Bestehende Dateien werden nie überschrieben.

**Wo die Komponente erscheint:** Auf Stadt-Landings (`/<stadt>/`) und Skill+Stadt-Kombis (`/<skill>/<stadt>/`), zwischen der Why-Sektion und dem Kontaktformular. Nicht auf Event-Seiten.

**Admin-Tool:** Kann Erinnerungen noch nicht verwalten (geplant).

---

### 3.15 Partner pflegen

Seite: `/partner/` → `src/pages/partner.astro`

- JSON: `public/partners/partners.json`
- Logos: `public/img/partners/`

**JSON-Format:**

```json
{
  "partners": [
    {
      "id": "firma-gmbh",
      "name": "Firma GmbH",
      "logo": "/img/partners/firma-gmbh.webp",
      "description": "Kurzbeschreibung des Partners.",
      "url": "https://example.com",
      "enabled": true
    }
  ]
}
```

**Felder:**
- `id` – Slug (URL-sicher, eindeutig); bestimmt auch den Logo-Dateinamen
- `name` – Anzeigename auf der Website
- `logo` – URL-Pfad zum Logo (relativ zu `public/`)
- `description` – Kurzbeschreibung (1–3 Sätze)
- `url` – Externe Website des Partners
- `enabled` – `false` blendet den Partner aus ohne ihn zu löschen (Default: `true`)

**Admin-Tool:** Tab "Partner" – vollständiges CRUD inkl. Logo-Upload. ID wird automatisch aus dem Namen generiert (Umlaut-sicher).

## 4) Neue Stadt hinzufügen (vollständiger Workflow)

1. Slug in `public/landings/landings.md` eintragen (lowercase, keine Leerzeichen)
2. `npm run sync:content` ausführen (oder `npm run dev` – läuft automatisch)
   - Erstellt automatisch: `public/img/slides/<stadt>/`, `public/reviews/<stadt>/`, `public/faq/<stadt>/`, `public/img/Titelbild/<stadt>/`, `public/img/why/<stadt>/benefit-{1-4}/`, `public/why/<stadt>.json`, `public/erinnerungen/<stadt>.json`
3. Stadtspezifische Bilder hochladen (Slides, Titelbild, Why-Bilder)
4. Texte in `public/why/<stadt>.json` anpassen (wurde in Schritt 2 mit Default-Texten erstellt)
5. Optional: stadtspezifische Reviews und FAQs anlegen

**Hinweis:** GitHub Action `sync-landings.yml` macht Schritt 2 automatisch bei Push. Alles außer Bild-Upload und Text-Anpassung ist vollautomatisch.

## 4b) Stadt entfernen

```bash
npm run remove:landing -- <stadtslug>
# Optional: npm run remove:landing -- <stadtslug> ./eigener-archivpfad
```

Das Script archiviert alle Daten der Stadt und entfernt sie aus der Stadtliste. **Was archiviert wird** (nach `removed_landings/<timestamp>-<stadt>/`):
- `public/img/slides/<stadt>/`
- `public/reviews/<stadt>/`
- `public/faq/<stadt>/`
- `public/img/why/<stadt>/`
- `public/why/<stadt>.json` und alle `public/why/*-<stadt>.json` Dateien

**Was NICHT archiviert wird:**
- `public/img/Titelbild/<stadt>/` – muss manuell gelöscht werden
- Einträge in `slides.meta.json` und `title.meta.json` – bleiben als verwaiste Metadaten

**Nach dem Script:** Stadt wird automatisch aus `landings.md` entfernt. Ein `report.json` im Archiv-Ordner dokumentiert was archiviert wurde.

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
   - `sync:events` – Event-Ordner anlegen (`public/img/slides/events/{event}/`, `public/img/Titelbild/events/{event}/`), default `content.json` erstellen
   - `sync:erinnerungen` – `public/erinnerungen/{city|skill}.json` anlegen (bestehende nie überschreiben)
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
| `pre-commit` | Vor jedem Commit | 1. Gestagete Bilder zu WebP optimieren (`optimize:images`), 2. `sync:content` ausführen, 3. generierte Ordner in `public/` stagen |
| `pre-push` | Vor jedem Push | **Alle** nicht-WebP Bilder in `public/img/` konvertieren und als separaten Commit pushen |

**Hinweis pre-commit:** Weil `sync:content` im Hook läuft, können neu generierte Dateien automatisch zum Commit hinzugefügt werden – auch solche die vorher nicht gestaged waren.

### Validierungsreports

`sync:landings` schreibt nach jedem Lauf einen detaillierten Report nach `reports/validation/landings/<timestamp>.json`. Der Report enthält:
- Welche Städte hinzugekommen oder entfernt wurden
- Zusammengeführte Slug-Kollisionen (z.B. "Berlin" + "berlin" → "berlin")
- `slideVisibility` – welche Slides auf welchen Seiten sichtbar sind
- `allImageVisibility` – alle Bilder aus `public/img/` mit Seitenzuordnung
- `unreferencedImages` – Bilder die auf keiner Seite genutzt werden (Aufräum-Hilfe)

Es werden maximal 7 Reports behalten, ältere werden automatisch gelöscht.

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
| `npm run sync:title-images` | Titelbild-Ordner für `default` und alle Landingpage-Städte anlegen; `title.meta.json` initialisieren |
| `npm run sync:slides` | Slide-Dateien und `slides.meta.json` synchronisieren |
| `npm run sync:why` | `public/why/` JSON-Dateien und Why-Bildordner synchronisieren |
| `npm run sync:events` | Event-Ordner anlegen, default `content.json` erstellen (bestehende NICHT überschreiben) |
| `npm run sync:erinnerungen` | `public/erinnerungen/{city\|skill}.json` anlegen (bestehende NICHT überschreiben) |
| `npm run sync:content:safe` | Führt alle Syncs fehlertolerant aus (Teilfehler werden isoliert, Build/Dev läuft weiter) |
| `npm run sync:content` | Alle Content-Syncs nacheinander ausführen |
| `npm run remove:landing -- <stadt> [archivpfad]` | Archiviert alle Landing-Daten einer Stadt und entfernt sie aus `landings.md` (siehe §4b) |
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
| [`UNDEFINED_BEHAVIOR_TIDY_UPS.md`](ANLEITUNGEN/UNDEFINED_BEHAVIOR_TIDY_UPS.md) | **Edge Cases & Fallback-Verhalten** – detaillierte Referenz für Slug-Normalisierung, Duplikat-Handling, Fallback-Reihenfolgen und Sonderfälle |
