# Kunstwolff Website

Astro-Projekt für die Kunstwolff-Landingpages mit statischen Stadtseiten, Skill-Seiten und dateibasierter Content-Pflege.

Ziele des Projekts: saubere und professionelle Representation von Kunstwolff, Erzielung des höchsten Page-Ranking das möglich ist in Suchmaschinen und anderen digitalen organischen Marketingbereichen durch SEO-Optimierung usw.

## Inhaltsverzeichnis

- [1) Schnellstart](#1-schnellstart)
- [2) Architektur](#2-architektur)
- [3) Content-Typen](#3-content-typen)
- [4) Städte & Events verwalten](#4-städte--events-verwalten)
- [5) Automatisierung](#5-automatisierung)
- [6) Befehle](#6-befehle)
- [7) SEO](#7-seo)

## 1) Schnellstart

Voraussetzungen: Node.js 20+, npm

```bash
npm install
npm run dev
```

- Vor `dev` und `build` läuft automatisch `npm run sync:content` (Ordner + Metadaten aktuell halten).
- VS Code: Settings in `.vscode/settings.json` (TypeScript-Plugin für Astro).
- Custom-Font "Mayonice" in `public/fonts/mayonice/`, eingebunden via `global.css`.

---

## 2) Architektur

### Content-Verwaltung

Alle Inhalte liegen dateibasiert in `public/`. Die Verwaltung erfolgt über das **Admin-Tool** (`kunstwolff-admin`), eine separate Preact-App die via GitHub REST API direkt in dieses Repo schreibt.

```
Admin-Tool  →  GitHub REST API  →  public/  →  Netlify Build  →  Website live
```

**Kein manuelles Git nötig** – das Admin-Tool hat für jeden Content-Typ einen eigenen Editor. Technische Details zum Admin-Tool: siehe `kunstwolff-admin/README.md`.

### Seitentypen

| URL-Muster | Seitentyp | Astro-Seite | Beispiel |
|---|---|---|---|
| `/` | Homepage | `index.astro` | kunstwolff.de |
| `/<stadt>/` | Stadt-Landing | `[landing].astro` | `/berlin/` |
| `/<skill>/` | Skill-Index | `[skill].astro` | `/schnellzeichner/` |
| `/<skill>/<stadt>/` | Skill+Stadt | `[skill]/[landing].astro` | `/schnellzeichner/berlin/` |
| `/<event>/` | Event | `[landing].astro` | `/firmenfeier/` |
| `/<skill>/<event>/` | Skill+Event | `[skill]/[landing].astro` | `/schnellzeichner/firmenfeier/` |

Alle Seiten werden statisch generiert (SSG). Stadt-Slugs und Event-Slugs teilen den Route-Slot `[landing]`, differenziert via `pageType`-Prop.

### Component-Visibility

Jeder Astro-Komponent kann pro Seite aktiviert/deaktiviert werden über `public/config/components.json`. Steuerung via Admin-Tool (Interface-Tab mit SVG-Wireframes). Technisch: `src/utils/componentConfig.ts` → `isComponentEnabled()` zur Build-Zeit.

### Nicht eingebundene Komponenten (Work in Progress)

| Component | Zweck |
| :-- | :-- |
| `src/components/Eventtypes.astro` | Eventtypen-Grid mit aufklappbaren Detailboxen |
| `src/components/hero/SchnellzeichnerHero.astro` | Alternativer Hero-Block (helles Design) |
| `src/components/about/AboutSchnellzeichner.astro` | Skill-spezifische About-Sektion |

---

## 3) Content-Typen

Alle Inhalte werden über das Admin-Tool gepflegt. Hier die technische Übersicht wie die Website die Daten konsumiert.

### Städte

**Quelle:** `public/landings/landings.md` (eine Stadt pro Zeile, Slugs lowercase)
**Admin:** Tab "Städte" (CityManager)
**Automatik:** `sync:content` erstellt pro Stadt alle nötigen Ordner und Dateien.
**Slug-Normalisierung:** `ä→ae`, `ö→oe`, `ü→ue`, `ß→ss`, Sonderzeichen → `-`

### Slides (Bilder-Karussell)

**Quelle:** `public/img/slides/<stadt>/` + `public/img/slides/slides.meta.json`
**Admin:** ImageManager (Typ "slides") – Upload, Alt-Text, Kategorien, Löschen
**Fallback:** Stadt hat < 6 eigene Slides → wird mit `default/`-Slides aufgefüllt
**Metadaten:** `slides.meta.json` enthält pro Bild: `categories`, `alt`, `priority`, `enabled`
**Deduplication:** `.jpg` + `.webp` im selben Ordner → nur `.webp` wird angezeigt

### Titelbild (Hero-Image)

**Quelle:** `public/img/Titelbild/<stadt>/` + `title.meta.json`
**Admin:** ImageManager (Typ "titelbild")
**Fallback:** stadtspezifisch → `default/` → `/img/samples/sample1.jpeg`

### Why-Sektion (4 Benefits)

**Texte:** `public/why/<key>.json` (Titel, Text, Alt pro Benefit)
**Bilder:** `public/img/why/<key>/benefit-{1-4}/`
**Admin:** ImageManager (Typ "why") – nur Bilder; Texte via `sync-why.mjs` auto-generiert
**Fallback-Kette:** `{skill}-{stadt}` → `{stadt}` → `{skill}` → `default`

### Reviews

**Quelle:** `public/reviews/<stadt>/review*.md` (YAML-Frontmatter: author, categories, rating)
**Admin:** ReviewManager
**Fallback:** Mindestens 7 Reviews pro Seite. Quellen: Stadt → `default/` → andere Städte (alphabetisch zirkulär)
**Skill-Filter:** `categories` im Frontmatter filtert Reviews auf Skill-Seiten

### FAQs

**Quelle:** `public/faq/default/*.md` + `public/faq/<stadt>/*.md` (YAML: question, answer, categories)
**Admin:** FaqManager (Standard-FAQs + stadtspezifisch)
**Filter:** Nach Stadt und Skill-Kategorie; stadtspezifische FAQs überschreiben Defaults

### Skills

**Quelle:** `public/skills/skills.json` (title, heroTitle, description)
**Automatik:** Slug aus Titel → generiert `/<skill>/` + `/<skill>/<stadt>/` Seiten
**Skill-Bilder:** `public/img/UnsereFähigkeitenBilder/<Skill-Titel>/` (erstes Bild alphabetisch)
**Filter:** Slides, Reviews, FAQs werden nach `categories` gefiltert

### Events

**Quelle:** `public/events/events.json` (title, slug, heroTitle, description, categories)
**Content:** `public/events/<slug>/content.json` (Ablauf, Pakete, Skills, Referenzen – je mit `enabled`-Flag)
**Bilder:** Slides in `public/img/slides/events/<slug>/`, Titelbild in `public/img/Titelbild/events/<slug>/`
**Admin:** EventManager – CRUD für events.json + content.json-Editor + Bilder
**Generierte Seiten:** `/<slug>/` + `/<skill>/<slug>/` für alle Skills

### CinemaWelcome (Interaktiver Konfigurator)

Interaktives Auswahl-Erlebnis auf der Startseite. Der Besucher durchläuft sequenziell 3 Orbit-Sektionen und wählt pro Sektion eine Option. Nach der 3. Auswahl erscheint ein personalisiertes Angebot.

**Quelle:** `public/cinema/cinema.json`
**Admin:** CinemaManager (2 Tabs: Sektionen + Kombinationen)
**Loader:** `src/utils/cinema.ts` → `src/components/CinemaWelcome.astro`

**Ablauf:**
1. **Intro** – „Willkommen" (cinematic wipe-reveal)
2. **Ihr Event** – Event-Typ wählen (Bild-Satelliten aus `events.json`: Firmenfeier, Messe, …)
3. **Ihre Muse** – Gästeanzahl wählen (Text-Satelliten: goldener Text auf dunklem Kreis)
4. **Ihr Geschmack** – Stil wählen (Bild-Satelliten aus `skills.json` mit Atmosphäre-Namen: „locker" = Schnellzeichner, „erlesen" = Szenenmaler)
5. **Ergebnis** – Personalisiertes Angebot: Bild + Titel + Beschreibung (links), Angebotstext + CTA „Termin jetzt anfragen" → Kontakt-Sektion (rechts)

**JSON-Struktur (`cinema.json`):**
```
intro                          Willkommen-Text
sections[0..2]                 Die 3 Orbit-Sektionen
  .id                          "event" | "muse" | "geschmack"
  .title / .subtitle           Anzeige-Texte
  .mainCircle                  Großer Kreis (image, alt, hint)
  .satellites[]                Auswahl-Optionen (1–6), jeweils:
    .title                     Anzeigename
    .value                     Logischer Wert (z.B. "firmenfeier", "50-100", "schnellzeichner")
    .image / .alt              Nur bei Bild-Satelliten
    .displayMode: "text"       Nur bei Text-Satelliten (Muse)
    .defaults                  Text-Bausteine für Ergebnis-Komposition:
      .titlePart               Anteil am Titel (z.B. "Schnellzeichner", "Firmenfeier", "50–100 Gäste")
      .text                    Beschreibungs-Baustein
      .offer                   Angebots-Baustein
      .image                   Ergebnis-Bild (nur bei Geschmack-Satelliten)
overrides                      Vollständige Overrides für bestimmte Kombinationen
                               Key: "{geschmack}-{event}-{muse}" → CinemaResult
```

**Kompositions-Modell (Client-Side):**

Das Ergebnis wird zur Laufzeit aus den 3 Auswahlen zusammengesetzt – jeder Satellit bringt seine eigenen Text-Bausteine mit:

- **Titel:** `"{geschmack.titlePart} auf {event.titlePart} für {muse.titlePart}"`
- **Beschreibung:** `geschmack.text + muse.text + event.text` (feste Reihenfolge, damit Verbindungswörter wie „dazu" funktionieren)
- **Angebot:** `geschmack.offer + muse.offer + event.offer`
- **Bild:** `geschmack.defaults.image`

**Overrides:** Für bestimmte Kombinationen kann das gesamte Ergebnis manuell überschrieben werden. Key = `"{geschmack_value}-{event_value}-{muse_value}"`, Wert = vollständiges `CinemaResult` (`image`, `imageAlt`, `title`, `description`, `offer`). Overrides ersetzen komplett, sind nicht partiell.

**Satelliten-Quellen:**
- **Event:** Aus `events.json` – im Admin wählbar, nicht frei eingebbar
- **Muse:** Feste Optionen (<25, 25–50, 50–100, 150+, Gruppe, Spezialperson(en))
- **Geschmack:** Aus `skills.json` – Titel auf Atmosphäre-Namen gemappt

**Layout im Code:** Welche Sektion reversed ist, CSS-Satelliten-Positionen, Wipe-Animationen, Dimmer – hartcodiert in `CinemaWelcome.astro`. Die JSON steuert nur die Inhalte.

### Erinnerungen (Pinnwand-Fotos)

**Quelle:** `public/erinnerungen/<key>.json` (photos-Array mit image + alt, max. 4)
**Admin:** Noch nicht verwaltbar (geplant)
**Fallback:** `{skill}-{stadt}` → `{stadt}` → `{skill}` → `default`
**Wo:** Nur auf Landing-Seiten, zwischen Why und Contact

### Partner

**Quelle:** `public/partners/partners.json` + `public/img/partners/`
**Admin:** PartnerManager – CRUD + Logo-Upload
**Felder:** id, name, logo, description, url, enabled

### Why-Detailseiten (statisch)

Für einzelne Why-Gründe gibt es statische Detailseiten mit eigenem Content-JSON:

- `/stimmung-durch-kunst/` → `public/stimmung-durch-kunst/content.json`
- `/du-bist-kunst/` → `public/du-bist-kunst/content.json`
- `/branding/` → `public/branding/content.json`
- `/canvas/` → `public/canvas/content.json`

**Admin:** Global Components Tab im `kunstwolff-admin` (eigene Manager pro Seite).
**Hinweis:** Diese Seiten sind bewusst keine dynamischen `[param]`-Routen.

### Referenzlogos (BrandStripe)

**Quelle:** `public/img/referenzenLogos/` – alle Bilder werden automatisch angezeigt
**Dateiname → Label:** Unterstriche werden zu Leerzeichen (`acme_gmbh.webp` → "acme gmbh")

### Navigation

**Quelle:** `public/navigation/navigation.json` (items mit label + url oder children)
**Admin:** Noch nicht verwaltbar – JSON manuell pflegen

### Component-Visibility

**Quelle:** `public/config/components.json`
**Admin:** Interface-Tab (SVG-Wireframes + Enable/Disable-Toggles)
**Fallback:** Seiten-spezifisch → `_default` → `true`

Vollständige Komponenten-IDs und JSON-Format: siehe `CLAUDE.md` → Sektion "Component-Visibility-Config".

---

## 4) Städte & Events verwalten

### Neue Stadt hinzufügen

1. **Admin-Tool** → Tab "Städte" → Stadt hinzufügen (Slug wird automatisch normalisiert)
2. **GitHub Action** `sync-landings.yml` triggert automatisch und erstellt:
   - `public/img/slides/<stadt>/`, `public/reviews/<stadt>/`, `public/faq/<stadt>/`
   - `public/img/Titelbild/<stadt>/`, `public/img/why/<stadt>/benefit-{1-4}/`
   - `public/why/<stadt>.json`, `public/erinnerungen/<stadt>.json`
3. **Admin-Tool** → Bilder hochladen (Slides, Titelbild, Why-Bilder), Reviews und FAQs anlegen

Alternativ lokal: `npm run sync:content` nach Änderung von `landings.md`.

### Stadt entfernen

```bash
npm run remove:landing -- <stadtslug>
```

Archiviert alle Stadt-Daten nach `removed_landings/<timestamp>-<stadt>/` und entfernt den Slug aus `landings.md`. Report in `report.json` im Archiv-Ordner.

**Nicht automatisch archiviert:** `public/img/Titelbild/<stadt>/` (manuell löschen), verwaiste Metadaten-Einträge in `slides.meta.json` und `title.meta.json`.

### Neues Event hinzufügen

1. **Admin-Tool** → Tab "Events" → Event anlegen (Titel, Slug, Hero-Titel, Beschreibung, Kategorien)
2. `content.json` wird automatisch mit Default-Inhalten erstellt
3. Bilder und Sektionen (Ablauf, Pakete, Referenzen) im Event-Editor bearbeiten

### Event entfernen

Eintrag aus `events.json` löschen (via Admin-Tool), dann Ordner manuell aufräumen: `public/events/<slug>/`, `public/img/slides/events/<slug>/`, `public/img/Titelbild/events/<slug>/`.

---

## 5) Automatisierung

### Sync-Scripts

`npm run dev` und `npm run build` starten automatisch `sync:content`:

1. `sync:landings` – Stadtordner anlegen, Slug-Kollisionen mergen, Validierungsreport
2. `sync:skills` – Skill-Bildordner anlegen
3. `sync:title-images` – Titelbild-Ordner anlegen
4. `sync:slides` – `slides.meta.json` pflegen (Priority, Kategorien, Migration)
5. `sync:why` – Why-JSONs und Bildordner anlegen
6. `sync:events` – Event-Ordner + default `content.json` (bestehende nie überschreiben)
7. `sync:erinnerungen` – Erinnerungen-JSONs anlegen (bestehende nie überschreiben)

### GitHub Action

`.github/workflows/sync-landings.yml` triggert bei Änderungen an `landings.md` oder `skills.json`, führt `sync:content` aus und committet neue Ordner.

### Git-Hooks

```bash
npm run setup:hooks    # einmalig aktivieren
```

| Hook | Was |
| :-- | :-- |
| `pre-commit` | Gestagete Bilder → WebP, `sync:content`, generierte Ordner stagen |
| `pre-push` | Alle Nicht-WebP-Bilder in `public/img/` konvertieren + committen |

### Validierungsreports

`sync:landings` schreibt nach jedem Lauf einen detaillierten Report nach `reports/validation/landings/<timestamp>.json`. Der Report enthält:
- Welche Städte hinzugekommen oder entfernt wurden
- Zusammengeführte Slug-Kollisionen (z.B. "Berlin" + "berlin" → "berlin")
- `slideVisibility` – welche Slides auf welchen Seiten sichtbar sind
- `allImageVisibility` – alle Bilder aus `public/img/` mit Seitenzuordnung
- `unreferencedImages` – Bilder die auf keiner Seite genutzt werden (Aufräum-Hilfe)

Es werden maximal 7 Reports behalten, ältere werden automatisch gelöscht.

### Bildoptimierung

Der Pre-Push-Hook konvertiert automatisch Nicht-WebP-Bilder:

1. Scannt alle `public/img/` Unterordner rekursiv
2. Konvertiert gefundene `.jpg/.jpeg/.png/.gif` → `.webp` (max. 1600px, Qualität 75)
3. Löscht die Originaldateien
4. Wenn Slides betroffen: `slides.meta.json` wird automatisch aktualisiert
5. Erstellt einen Commit `chore: optimize images to webp` und pusht ihn mit

Manuell: `npm run optimize:all`.

---

## 6) Befehle

| Befehl | Zweck |
| :-- | :-- |
| `npm run dev` | Entwicklungsserver (inkl. Sync) |
| `npm run build` | Produktionsbuild (inkl. Sync) |
| `npm run preview` | Build lokal prüfen |
| `npm run sync:content` | Alle Content-Syncs nacheinander ausführen |
| `npm run sync:content:safe` | Alle Syncs fehlertolerant (Teilfehler isoliert, Build/Dev läuft weiter) |
| `npm run sync:landings` | Stadtordner für Slides und Reviews anlegen |
| `npm run sync:skills` | Skill-Bildordner anlegen |
| `npm run sync:title-images` | Titelbild-Ordner anlegen, `title.meta.json` initialisieren |
| `npm run sync:slides` | Slide-Dateien und `slides.meta.json` synchronisieren |
| `npm run sync:why` | `public/why/` JSON-Dateien und Why-Bildordner synchronisieren |
| `npm run sync:events` | Event-Ordner anlegen, default `content.json` erstellen (bestehende NICHT überschreiben) |
| `npm run sync:erinnerungen` | `public/erinnerungen/{city\|skill}.json` anlegen (bestehende NICHT überschreiben) |
| `npm run remove:landing -- <stadt>` | Stadt archivieren + aus `landings.md` entfernen (siehe §4) |
| `npm run optimize:all` | Alle Bilder in `public/img/` zu WebP konvertieren |
| `npm run setup:hooks` | Git-Hooks einmalig aktivieren |

---

## 7) SEO

### Sitemap

Die Sitemap wird automatisch beim Build über `@astrojs/sitemap` generiert.

Ausgabe nach `npm run build`:

```
dist/sitemap-index.xml
dist/sitemap-0.xml
```

Alle statisch generierten Seiten (Homepage, Stadtseiten, Skill-Seiten, Skill+Stadt-Kombinationen, Event-Seiten) werden automatisch erfasst. Nach dem Deploy erreichbar unter:

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

## Referenz

- **Technische Detail-Doku:** `CLAUDE.md` (Pfadstrukturen, Dateiformate, Sync-Reihenfolge, Admin-Tool-Schnittstelle)
- **Admin-Tool-Doku:** `kunstwolff-admin/README.md` (Architektur, Funktionen, Pfade, Dateiformate)
- **Edge Cases:** `ANLEITUNGEN/UNDEFINED_BEHAVIOR_TIDY_UPS.md` (Slug-Normalisierung, Duplikate, Fallbacks)
