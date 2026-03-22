# Kunstwolff Admin

Web-basiertes CMS für [kunstwolff.de](https://kunstwolff.de). Ermöglicht die Verwaltung von Inhalten (Bilder, Reviews, FAQs, Städte) ohne direkten GitHub-Zugriff.

**Stack:** Vite + Preact + TypeScript + Tailwind CSS
**Deployment:** GitHub Pages
**Backend:** keins – direkt via GitHub REST API

---

## Architektur

```
Browser  →  GitHub REST API  →  Kunstwolffwebsite-Repo  →  Netlify Build
```

Die App ist komplett statisch. Alle Änderungen sammeln sich als **Draft-State** im Browser und werden erst beim Klick auf "Veröffentlichen" als Commits ins Repo geschrieben. So wird pro Klick maximal ein Netlify-Build ausgelöst.

---

## Auth

Beim ersten Öffnen erscheint ein Eingabefeld für einen **GitHub Personal Access Token (PAT)**.

- Benötigte Berechtigung: **Contents – Read and write** (Fine-grained token)
- Der Token wird in `localStorage` gespeichert und nie irgendwo hochgeladen
- Beim Start wird automatisch das Repo abgefragt (`GET /repos/{owner}/{repo}`) – bei Fehler erscheint der Auth-Screen erneut

---

## Projekt starten

```bash
npm install
npm run dev        # Dev-Server auf http://localhost:5173
npm run build      # Production-Build nach dist/
```

Optionale Umgebungsvariablen (Defaults sind bereits gesetzt):

```env
VITE_REPO_OWNER=eightdevvis
VITE_REPO_NAME=Kunstwolffwebsite
VITE_REPO_BRANCH=main
```

---

## Funktionen

### Stadt-Auswahl

Oben im Header befindet sich ein Dropdown mit allen Städten aus `public/landings/landings.md`. Die gewählte Stadt gilt für alle Tabs gleichzeitig.

- **`default`** ist immer verfügbar und steht ganz oben – es ist das globale Fallback für alle Bereiche
- Wenn eine Stadt keine eigenen Inhalte hat, zeigen alle Manager den Hinweis **"Wird mit default zur Zeit aufgefüllt!"**

#### Slug-Normalisierung

Stadtname-Eingaben werden automatisch normalisiert:
- Umlaute werden transliteriert: `ä→ae`, `ö→oe`, `ü→ue`, `ß→ss`
- Alle anderen Sonderzeichen und Akzente werden entfernt
- Großbuchstaben → Kleinbuchstaben; Leerzeichen/Sonderzeichen → `-`

Beispiel: `München` → `muenchen`, `Köln` → `koeln`, `Rhein-Main-Gebiet` → `rhein-main-gebiet`

**Wichtig:** Der Slug bestimmt den URL-Pfad (`/muenchen/`) und alle Datei-/Ordnernamen. Eine einmal angelegte Stadt sollte nicht umbenannt werden.

---

### Slideshow (`public/img/slides/{stadt}/`)

Zeigt alle Bilder des Slideshow-Ordners der gewählten Stadt als Grid.

- **Upload** per Drag & Drop oder Klick – mehrere Dateien gleichzeitig möglich
- **Alt-Text** pro Bild bearbeitbar (SEO) → wird als `altOverride` in `slides.meta.json` gespeichert
- **Kategorien** pro Bild: `Schnellzeichner` und/oder `Szenenmaler`
- **Löschen** mit Bestätigungsdialog direkt auf dem Bild
- Metadaten werden in `public/img/slides/slides.meta.json` gespeichert

**WebP-Deduplication:** Liegen `foto.jpg` und `foto.webp` im selben Ordner, zeigt die Website nur das `.webp`. Das `.jpg` wird bei der Anzeige übersprungen. Der Pre-Push-Hook des Website-Repos konvertiert Bilder automatisch zu WebP – Bilder die via Admin-Tool hochgeladen werden, umgehen diesen Hook und landen unkomprimiert im Repo.

**Fallback bei leerem Ordner:** Wenn ein Stadtordner keine Bilder enthält, wird automatisch auf `slides/default/` zurückgegriffen.

#### `slides.meta.json` Format

```json
{
  "berlin/120_event.jpg": {
    "categories": ["Schnellzeichner"],
    "alt": "Live-Karikaturen in Berlin",
    "priority": 120,
    "enabled": true
  }
}
```

Key = `{stadt}/{dateiname}`, Pfad relativ zu `public/img/slides/`.

---

### Titelbild (`public/img/Titelbild/{stadt}/`)

Wie Slideshow, aber nur ein Bild pro Stadt (kein Kategorien-Feld).

**Wichtig:** Bilder direkt in `public/img/Titelbild/{stadt}/` ablegen – **nicht** in `landings/` oder `skills/` Unterordner (diese sind interne Sync-Artefakte).

Metadaten (`title.meta.json`): Diese Datei existiert unter `public/img/Titelbild/title.meta.json` und hat dasselbe Format wie `slides.meta.json`. Wird aktuell **nicht vom Admin geschrieben** – nur vom Website-Build gelesen, um bei Skill-Seiten das passende Bild per `categories` auszuwählen. Kann bei Bedarf manuell gepflegt werden.

---

### Why-Bilder (`public/img/why/{stadt}/benefit-{1-4}/`)

4 Benefit-Bilder pro Stadt, aufgeteilt in Unter-Tabs **Benefit 1–4**. Pro Benefit ein Bild (kein Kategorien-Feld).

#### Why-Texte (`public/why/`)

Die Texte (Titel, Beschreibungstext, Alt-Text) der Why-Sektion werden **noch nicht vom Admin verwaltet**. Sie liegen in:

```
public/why/{stadt}.json               ← stadtspezifisch
public/why/{skill}.json               ← skillspezifisch (z.B. schnellzeichner.json)
public/why/{skill}-{stadt}.json       ← Kombination (z.B. schnellzeichner-berlin.json)
public/why/default.json               ← globaler Fallback
```

Entsprechend gibt es auch Bild-Ordner:
```
public/img/why/{stadt}/benefit-{1-4}/
public/img/why/{skill}/benefit-{1-4}/     ← z.B. public/img/why/schnellzeichner/benefit-1/
```

Priorität bei der Auflösung: skill-stadt → stadt → skill → default

Format:

```json
{
  "benefits": [
    {
      "title": "Echte Künstler - keine Agentur",
      "text": "Sie buchen uns direkt - ohne Vermittlung.",
      "image": "/img/why/berlin/benefit-1/sample1.jpeg",
      "alt": "Live Künstler von Kunstwolff beim Zeichnen"
    }
  ]
}
```

Für eine neue Stadt: `default.json` kopieren, umbenennen und Texte anpassen. Das `image`-Feld zeigt auf den Bildpfad im `public/img/why/`-Ordner.

---

### Reviews (`public/reviews/{stadt}/review0.md`, `review1.md`, …)

Liste aller Reviews der gewählten Stadt.

- **Neu erstellen** – Formular mit Name, Text, Kategorien
- **Bearbeiten** – Inline-Editor
- **Löschen** mit Bestätigung
- Nummerierung (`review0.md`, `review1.md`, …) wird automatisch vergeben
- `_vorlage.md` und `vorlage.md` (beide Varianten) werden nie angezeigt

**Fallback-Logik der Website (Hintergrund):** Die Website zeigt mindestens **7 Reviews** pro Seite. Reihenfolge der Quellen:
1. Stadtspezifische Reviews (nach Skill gefiltert)
2. Reviews aus `default/` (nach Skill gefiltert)
3. Reviews aus anderen Städten in zirkulär-alphabetischer Reihenfolge um die aktuelle Stadt herum

Hat eine Stadt weniger als 7 Reviews, wird automatisch aufgefüllt. Das ist kein Bug – gewollt, damit keine Seite leer wirkt.

---

### Städte (`public/landings/landings.md`)

Liste aller aktiven Städte (Landing Pages).

- **Hinzufügen** – Eingabefeld, Enter oder Button; wird automatisch lowercase
- **Löschen** mit Bestätigung
- Beim Speichern bleibt das originale Dateiformat erhalten (Kommentare, Hinweistexte)

#### Was passiert nach dem Hinzufügen einer neuen Stadt?

1. Admin schreibt den neuen Slug in `public/landings/landings.md`
2. GitHub Action `sync-landings.yml` im Website-Repo triggert und erstellt **automatisch**:
   - `public/img/slides/{stadt}/`
   - `public/reviews/{stadt}/`
   - `public/faq/{stadt}/`
   - `public/img/Titelbild/{stadt}/`
   - `public/img/why/{stadt}/benefit-{1-4}/`
   - `public/why/{stadt}.json` (mit Default-Texten vorbelegt)
3. Danach: Bilder für die neue Stadt hochladen (Slideshow, Titelbild, Why-Bilder)
4. Texte in `public/why/{stadt}.json` anpassen (bereits mit Default-Texten erstellt)

---

### Partner (`public/partners/partners.json` + `public/img/partners/`)

Liste aller Kooperationspartner, angezeigt auf der `/partner/`-Seite.

- **Hinzufügen** – Name, URL, Beschreibung, optionaler Logo-Upload
- **Bearbeiten** – Inline-Formular mit optionalem Logo-Austausch
- **Deaktivieren/Aktivieren** – `enabled: false` blendet den Partner auf der Website aus, ohne ihn zu löschen
- **Löschen** mit Bestätigung
- ID (Slug) wird automatisch aus dem Namen generiert (Umlaut-sicher)
- Logo-Pfad in JSON: `/img/partners/{id}.{ext}` · Ablage im Repo: `public/img/partners/{id}.{ext}`
- Keine Stadt-Auswahl nötig – Partners sind global

---

### FAQs (`public/faq/default/` und `public/faq/{stadt}/`)

Zwei Tabs: **Standard-FAQs** (gelten als Fallback für alle Städte) und **stadtspezifische FAQs** (überschreiben die Defaults komplett).

- **Neu erstellen** – Slug (Dateiname ohne `.md`), Frage, Antwort, Kategorien
- **Bearbeiten** – Inline-Editor
- **Löschen** mit Bestätigung
- Erlaubte Kategorien: `Schnellzeichner`, `Szenenmaler`, oder beide

---

### Veröffentlichen

Der grüne Button oben rechts zeigt die Anzahl der ausstehenden Änderungen. Beim Klick werden alle Änderungen sequenziell als einzelne Commits ins Repo geschrieben.

- Neue Dateien: `PUT` ohne SHA
- Geänderte Dateien: `PUT` mit SHA
- Gelöschte Dateien: `DELETE` mit SHA
- Erfolgreich committete Dateien werden sofort aus dem Draft-State entfernt
- Bei Teilerfolg (einige Dateien fehschlagen): nur die fehlgeschlagenen bleiben im Draft-State; ein erneuter Klick auf "Veröffentlichen" versucht nur die verbliebenen Dateien – kein SHA-Mismatch durch Doppel-Commit

---

## Dateistruktur

```
src/
  app.tsx                     # Auth-Check, Root-Komponente
  components/
    Auth.tsx                  # PAT-Eingabe + Verbindungstest
    Dashboard.tsx             # Header, Tabs, Veröffentlichen-Button, Stadt-Dropdown
    ImageManager.tsx          # Slideshow / Titelbild / Why-Bilder
    ReviewManager.tsx         # Reviews
    CityManager.tsx           # Städteliste
    FaqManager.tsx            # Standard- und stadtspezifische FAQs
    CalendarView.tsx          # Kalender-Grid (Monatsansicht)
    EventModal.tsx            # Event-Editor (Titel, Zeit, Ort, Kategorie, Akteure)
    CleanupManager.tsx        # Bereinigung: Duplikate + kaputte Bilder erkennen und löschen
    PartnerManager.tsx        # Partner: partners.json + Logo-Upload
  services/
    github.ts                 # GitHub REST API (getFile, putFile, listDirectory, deleteFile, …)
                              # REPO_CONFIG (owner/repo/branch) hier hardcoded anpassen
    state.ts                  # Draft-State mit @preact/signals
    calendar.ts               # Kalender-Typen, Lade-/Speicherfunktionen
  utils/
    encoding.ts               # base64 encode/decode für Text und Binärdateien;
                              # normalizeSlug() für Umlaut-sichere Stadt-Slugs
    markdown.ts               # Frontmatter parsen und serialisieren
```

---

## Deployment

GitHub Actions deployt automatisch bei jedem Push auf `main` zu GitHub Pages.

```yaml
# .github/workflows/deploy.yml
# build → upload artifact → deploy to pages
```

**Custom Domain:** CNAME `admin.kunstwolff.de` in den GitHub Pages Einstellungen eintragen.

---

### Bereinigung

Tab der alle Bild-Verzeichnisse aller Städte scannt und zwei Kategorien von Problemen erkennt:

**Duplikate:** JPG/PNG für die eine `.webp`-Version im selben Ordner existiert. Die Website zeigt ohnehin nur das `.webp` an (WebP-Deduplication). Button "Duplikate bereinigen" löscht alle non-webp Versionen, das `.webp` bleibt erhalten.

**Kaputte Bilder:** Bilder die sich nicht laden lassen (korrupte Uploads, leere Dateien). Werden automatisch im Hintergrund erkannt sobald der Scan abgeschlossen ist. Button "Alle löschen" entfernt alle fehlerhaften Dateien.

Beide Aktionen landen im gewohnten Draft-State und werden erst beim Klick auf "Veröffentlichen" tatsächlich aus dem Repo gelöscht. Slides-Bilder: zugehörige Einträge in `slides.meta.json` werden automatisch mitbereinigt.

---

## Bekannte Einschränkungen / noch nicht implementiert

- Bilder laden langsam weil `raw.githubusercontent.com` kein Bild-CDN ist – für ein Admin-Tool akzeptabel
- Jede Datei erzeugt einen eigenen Commit; bei vielen Änderungen auf einmal entstehen mehrere Commits hintereinander (Netlify debounced das aber)
- **Why-Texte** (`public/why/{stadt}.json`) sind noch nicht editierbar – nur die Bilder; Texte müssen manuell per Git gepflegt werden
- **`title.meta.json`** (`public/img/Titelbild/title.meta.json`) wird noch nicht vom Admin geschrieben – Categories/Priority für Titelbilder müssen manuell gepflegt werden
- **Bilder werden nicht zu WebP konvertiert** – der Pre-Push-Hook des Website-Repos greift nur bei lokalem `git push`. Bilder die via Admin-Tool hochgeladen werden, landen unkomprimiert im Repo. Für optimale Performance Bilder vor dem Upload manuell konvertieren oder nach dem Upload lokal `npm run optimize:all` ausführen und pushen
- **Fallback auf `/img/samples/`** – fehlt stadtspezifischer Content komplett (keine Titelbilder, keine Why-Bilder), zeigt die Website Placeholder-Bilder aus `/img/samples/` statt einer Fehlermeldung
- **Partner-Logos werden nicht zu WebP konvertiert** – analog zu anderen Bild-Uploads landen sie unkomprimiert im Repo
- **Events (Veranstaltungstypen)** – Eventseiten existieren auf der Website (Firmenfeier, Messe, Hochzeit, Private Feier), werden aber noch nicht vom Admin verwaltet. Alle Event-Pfade und das vollständige `content.json`-Format sind in der Website-README Sektion 3.12 dokumentiert. Relevante Pfade:
  - `public/events/events.json` – Event-Registry (analog zu `skills.json`)
  - `public/events/{slug}/content.json` – Per-Event-Content (Ablauf, Pakete, Referenzen) mit `enabled`-Flags pro Sektion
  - `public/img/slides/events/{slug}/` – Event-Slides (separater Namespace, nicht mit Stadtslides vermischt)
  - `public/img/Titelbild/events/{slug}/` – Event-Titelbilder
  - Slides-Metadaten: gleiche `slides.meta.json`, Key-Format: `events/{slug}/dateiname.webp`
- **CinemaWelcome** (`public/cinema/cinema.json`) – Startseiten-Orbit-Sektionen werden noch nicht vom Admin verwaltet. Format dokumentiert in Website-README Sektion 3.13
- **Erinnerungen** (`public/erinnerungen/{stadt}.json`) – Pinnwand-Fotos auf Landing-Seiten werden noch nicht vom Admin verwaltet. Format: `{ "photos": [{ "image": "/pfad.webp", "alt": "Text" }] }`. Fallback-Kette: `{skill}-{stadt}.json` → `{stadt}.json` → `{skill}.json` → `default.json`. Dokumentiert in Website-README Sektion 3.14

## Dateiformat-Referenz

### Kalender (`public/calendar/{jahr}/{monat}.json`)

Format (Array von Events):

```json
[
  {
    "id": "eindeutige-id",
    "title": "Eventname",
    "description": "Optionale Beschreibung",
    "date": "2026-03-24",
    "time": 14,
    "location": "Stadt",
    "categoryId": "auftrag",
    "actors": ["Jenny", "Gaby"]
  }
]
```

Felder:
- `id` – eindeutige ID (auto-generiert)
- `title` – Eventname
- `date` – ISO-Datum `YYYY-MM-DD`
- `time` – Uhrzeit als Integer (Stunden, z.B. `14` = 14:00)
- `location` – Ort
- `categoryId` – z.B. `auftrag`, `anfrage`
- `actors` – Array von Künstler-Namen
- `description` – optional

Die Kalender-Daten werden nur vom Admin gelesen/geschrieben. Die Website selbst nutzt sie nicht.
