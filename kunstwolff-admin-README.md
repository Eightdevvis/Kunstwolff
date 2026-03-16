# Kunstwolff Admin CMS – Bauanleitung

Dieses Dokument ist eine vollständige Spezifikation für ein Admin-CMS für die Website kunstwolff.de.
Es enthält alles was du brauchst um das Tool zu bauen, ohne den Kunstwolff-Website-Code selbst zu lesen.

---

## Kontext: Was ist Kunstwolff?

Kunstwolff (kunstwolff.de) ist eine Eventkünstler-Website (Live-Schnellzeichner, Szenenmaler für Events).
Die Website ist ein statisch generierter Astro-Build, deployed auf Netlify.
Der Website-Code liegt in einem separaten GitHub-Repo (`eightdevvis/Kunstwolffwebsite` o.ä.).

**Das Problem:** Der Content (Bilder, Reviews, Alt-Texte, Städteliste) wird von einer nicht-technischen Person
(„Mom") verwaltet, die aktuell direkt im GitHub Web-Interface arbeitet. Das führt ständig zu kaputten
JSON-Dateien, falsch platzierten Bildern und fehlerhaften Commits.

**Die Lösung:** Dieses Admin-Tool – eine kleine Web-App die ein benutzerfreundliches Interface bietet
und alle Änderungen gesammelt als einen einzigen Git-Commit ins Repo schreibt.

---

## Architektur

```
[Admin-App im Browser]  -->  GitHub REST API  -->  [Kunstwolff-Repo auf GitHub]
                                                           |
                                                    Netlify Build
                                              (nur wenn "Veröffentlichen")
```

- **Kein Backend, kein Server.** Die App ist komplett statisch.
- **Auth:** GitHub Personal Access Token (PAT), einmalig eingeben, in localStorage gespeichert.
- **Änderungen werden gebündelt:** Alle Änderungen sammeln sich im Browser-State.
  Erst beim Klick auf "Veröffentlichen" geht alles als **ein einziger Commit** raus → ein Netlify-Build.
  Das ist wichtig weil Netlify-Build-Minutes bezahlt werden müssen.

---

## Eigenes Projekt

- **Repo-Name:** `kunstwolff-admin` (eigenes, separates GitHub-Repo)
- **Framework:** Vite + Preact + TypeScript
- **Styling:** Tailwind CSS
- **Deployment:** GitHub Pages (kostenlos, z.B. `admin.kunstwolff.de` per CNAME)
- **GitHub API:** Native `fetch()`, keine Library

---

## Auth: Personal Access Token

Kein OAuth-Flow nötig. Stattdessen:

1. Beim ersten Öffnen der App: Eingabefeld für GitHub PAT
2. PAT wird in `localStorage` gespeichert
3. Bei jedem API-Call wird der Token als Bearer-Header mitgeschickt:
   ```
   Authorization: Bearer {token}
   ```
4. Der PAT braucht folgende Berechtigungen: `repo` (read + write auf private/public repos)
5. Beim Start der App: Verbindungstest via `GET /user` – wenn OK, weiter zur App; wenn Fehler, PAT-Eingabe anzeigen

Der Token wird NIE irgendwo hochgeladen, bleibt nur im Browser der Userin.

---

## GitHub REST API – die drei Endpunkte die du brauchst

Basis-URL: `https://api.github.com`

### Datei lesen

```
GET /repos/{owner}/{repo}/contents/{path}
```

Response:
```json
{
  "content": "base64-encodierter-inhalt...",
  "sha": "abc123def456...",
  "name": "dateiname.json"
}
```

Content ist immer base64-kodiert. Zum Lesen: `atob(content.replace(/\n/g, ''))`.

### Datei schreiben (neu oder update)

```
PUT /repos/{owner}/{repo}/contents/{path}
```

Body:
```json
{
  "message": "admin: reviews frankfurt aktualisiert",
  "content": "base64-encodierter-neuer-inhalt",
  "sha": "abc123def456..."
}
```

`sha` ist die SHA des **aktuellen** Datei-Stands (aus dem GET-Response). Für **neue** Dateien: `sha` weglassen.

Zum Encodieren: `btoa(unescape(encodeURIComponent(inhalt)))` für Text,
für Binärdateien (Bilder) anders – siehe Abschnitt Bilder-Upload.

### Verzeichnis-Inhalt lesen

```
GET /repos/{owner}/{repo}/contents/{path}
```

Wenn `path` ein Verzeichnis ist, kommt ein Array zurück:
```json
[
  { "name": "review0.md", "path": "public/reviews/frankfurt/review0.md", "sha": "...", "type": "file" },
  { "name": "review1.md", "path": "public/reviews/frankfurt/review1.md", "sha": "...", "type": "file" }
]
```

---

## Das Kunstwolff-Repo: Wichtige Pfade

```
public/
  landings/
    landings.md              <- Städteliste (plain text)
  img/
    slides/
      {stadt}/               <- Slideshow-Bilder pro Stadt
        1_bildname.webp
        2_bildname.jpg
        ...
      default/               <- Fallback-Bilder wenn Stadt keine eigenen hat
      slides.meta.json       <- Alt-Text + Kategorien + Priorität für alle Bilder
    Titelbild/
      {stadt}/               <- Hero-Bild pro Stadt
      default/
    why/
      {stadt}/
        benefit-1/           <- Bild für Why-Benefit 1
        benefit-2/
        benefit-3/
        benefit-4/
  why/
    default.json             <- Why-Sektion Default-Texte
    {stadt}.json             <- Why-Sektion stadtspezifisch (optional)
  reviews/
    _vorlage.md              <- Template für neue Reviews
    {stadt}/
      _vorlage.md            <- Stadt-spezifisches Template
      review0.md
      review1.md
      ...
  faq/
    default/                 <- Standard-FAQs (Fallback)
      duration.md
      booking.md
      ...
    {stadt}/                 <- Stadtspezifische FAQs (optional)
  skills/
    skills.json              <- Skill-Definitionen
```

---

## Datenformate – exakt

### landings.md (Städteliste)

```
# Städteliste für kunstwolff.de
# Eine Stadt pro Zeile. kleingeschrieben, keine Leerzeichen, keine Sonderzeichen.
# Korrekt: berlin  |  Falsch: Berlin, Berl in, Berlín

berlin
frankfurt
hamburg
schweiz
kaiserslautern
trier
wiesbaden
mainz
luxembourg
koeln
ludwigshafen
mannheim
saarbruecken
belgique
saarland
hessen
rhein-main-gebiet
rheinland-pfalz
wuppertal
nord-rhein-westfalen
main-taunus-kreis
koblenz
neuwied
tuebingen
karlsruhe
heidelberg
```

Regeln: Zeilen die mit `#` beginnen sind Kommentare, werden ignoriert. Leere Zeilen werden ignoriert.
Beim Schreiben: nur die Städtenamen, einen pro Zeile, die Kommentar-Kopfzeilen stehen lassen.

---

### slides.meta.json (Bild-Metadaten)

Pfad: `public/img/slides/slides.meta.json`

```json
{
  "{stadt}/{dateiname}": {
    "categories": ["Schnellzeichner"],
    "priority": 1,
    "alt": "Beschreibungstext für SEO",
    "enabled": true
  },
  "frankfurt/1_karikaturist-hilton-frankfurt.webp": {
    "categories": ["Schnellzeichner"],
    "priority": 1,
    "alt": "Karikaturist zeichnet Gäste beim Hilton Frankfurt Event",
    "enabled": true
  }
}
```

- Key ist `{stadtordner}/{dateiname}` – exakt wie der Datei-Pfad relativ zu `public/img/slides/`
- `categories`: Array, erlaubte Werte: `"Schnellzeichner"` und/oder `"Szenenmaler"`, kann leer sein `[]`
- `priority`: Zahl, höher = weiter vorne in der Slideshow. Innerhalb einer Stadt durchnummeriert.
- `alt`: Optional, Freitext für SEO. Wenn nicht vorhanden: wird aus Dateinamen abgeleitet.
- `enabled`: Optional, default `true`. Auf `false` setzen um Bild auszublenden ohne es zu löschen.

Beim Schreiben: Die gesamte JSON-Datei neu schreiben (mit allen existierenden Einträgen + Änderungen).
Vorher immer lesen und den SHA merken.

---

### Review-Dateien

Pfad: `public/reviews/{stadt}/review0.md`, `review1.md`, etc.

```
---
author: "Maria Müller"
categories:
  - Schnellzeichner
---
Das war ein fantastisches Event! Der Schnellzeichner hat alle Gäste begeistert
und die Karikaturen waren wirklich einzigartig.
```

- Frontmatter (zwischen `---` und `---`): `author` (String), `categories` (Array)
- Body: Freitext, der eigentliche Review-Text
- Erlaubte Kategorien: `Schnellzeichner`, `Szenenmaler`
- Nummerierung: `review0.md`, `review1.md`, ... – beim Erstellen nächste freie Nummer nehmen
- `_vorlage.md` ist eine Vorlagendatei und kein echter Review – niemals anzeigen/editieren

---

### Why-Section JSON

Pfad: `public/why/{stadt}.json` oder `public/why/default.json`

```json
{
  "benefits": [
    {
      "title": "Echte Künstler - keine Agentur",
      "text": "Sie buchen uns direkt - ohne Vermittlung. Persönlicher Kontakt, klare Absprachen.",
      "image": "/img/why/default/benefit-1/sample1.webp",
      "alt": "Live Künstler von Kunstwolff beim Zeichnen"
    },
    {
      "title": "Interaktiv & unvergesslich",
      "text": "Ihre Gäste erleben Kunst live und nehmen eine individuelle Erinnerung mit nach Hause.",
      "image": "/img/why/default/benefit-2/sample2.webp",
      "alt": "Gäste lachen während Schnellzeichner live zeichnet"
    },
    {
      "title": "Branding möglich",
      "text": "Logo, Hashtag oder Event-Motto integrieren wir direkt in jede Zeichnung.",
      "image": "/img/why/default/benefit-3/sample3.webp",
      "alt": "Gebrandete Karikatur mit Firmenlogo"
    },
    {
      "title": "Digital & klassisch",
      "text": "Ob Papier, iPad oder großem Monitor - wir passen uns Ihrem Eventkonzept an.",
      "image": "/img/why/default/benefit-4/sample4.webp",
      "alt": "Digitaler Schnellzeichner zeichnet auf Tablet"
    }
  ]
}
```

Immer genau 4 Benefits. `image` ist ein absoluter Pfad ab Repo-Root.

---

### FAQ-Dateien

Pfad: `public/faq/default/{thema}.md` oder `public/faq/{stadt}/{thema}.md`

```
---
question: "Wie lange dauert eine Live-Zeichnung?"
answer: "Die Dauer hängt vom Event ab. In der Regel zeichnen wir 5–10 Minuten pro Gast."
categories:
  - Schnellzeichner
---
```

Kein Body-Text – alles im Frontmatter. Dateiname = Thema-Slug (z.B. `duration.md`, `booking.md`).

**Existierende Default-FAQs** (`public/faq/default/`):
- `booking.md` – Wie buche ich?
- `branding.md` – Branding/Logo in Zeichnungen
- `duration.md` – Wie lange dauert eine Zeichnung?
- `eventtypes.md` – Für welche Events?
- `international.md` – Internationale Buchungen?
- `speedpainting.md` – Was ist Speedpainting?

**Fallback-System:** Die Website zeigt stadtspezifische FAQs (`public/faq/{stadt}/`) wenn vorhanden,
sonst die Default-FAQs. Stadtspezifische FAQs überschreiben die Defaults komplett (kein Merge).

**Erlaubte Kategorien:** `Schnellzeichner`, `Szenenmaler`, oder beide – bestimmt auf welchen
Skill-Seiten die FAQ erscheint. Leeres Array = erscheint überall.

---

### skills.json

Pfad: `public/skills/skills.json`

```json
{
  "skills": [
    {
      "title": "Schnellzeichner",
      "heroTitle": "Live Schnellzeichner für Events",
      "description": "Schnellzeichner für Firmenfeiern, Messen & Hochzeiten..."
    },
    {
      "title": "Szenenmaler",
      "heroTitle": "Live Szenenmaler für Events",
      "description": "Szenenmaler für Firmenfeiern, Messen & Hochzeiten..."
    }
  ]
}
```

---

## Bild-Upload via GitHub API

Bilder sind Binärdateien. Der Ablauf:

1. User wählt Datei per `<input type="file">`
2. Datei wird mit `FileReader.readAsArrayBuffer()` eingelesen
3. ArrayBuffer → Uint8Array → base64-String:
   ```js
   const bytes = new Uint8Array(arrayBuffer);
   let binary = '';
   for (const byte of bytes) binary += String.fromCharCode(byte);
   const base64 = btoa(binary);
   ```
4. `PUT /repos/{owner}/{repo}/contents/{pfad}` mit `content: base64`
5. Dateiname: aus dem originalen Dateinamen ableiten, lowercase, Leerzeichen zu Bindestrichen
6. Zielpfad: `public/img/slides/{stadtSlug}/{dateiname}`

**Wichtig:** Die Nummerierung im Dateinamen (`1_`, `2_`, etc.) wird vom `sync-slides`-Script beim
nächsten Build automatisch vergeben. Bilder ohne Prefix werden beim Build korrekt eingeordnet.
Also einfach ohne Prefix hochladen.

---

## Bündel-Commit (wichtig für Netlify-Kosten)

Jeder `PUT`-Request an die GitHub Contents API erstellt einen eigenen Commit. Um das zu vermeiden,
entweder:

**Option A (einfach):** Alle Änderungen sequenziell in einem "Veröffentlichen"-Schritt committen.
Das erstellt N Commits aber triggert nur einen Netlify-Build (da sie schnell hintereinander kommen
und Netlify debounced). Akzeptabler Kompromiss.

**Option B (sauber):** GitHub Git Trees API benutzen um einen einzigen Commit mit allen Änderungen
zu bauen. Komplexer, aber sauberer. Endpunkte:
- `POST /repos/{owner}/{repo}/git/blobs` – Blob für jede geänderte Datei erstellen
- `POST /repos/{owner}/{repo}/git/trees` – Tree mit allen Blobs erstellen
- `POST /repos/{owner}/{repo}/git/commits` – Commit auf dem Tree erstellen
- `PATCH /repos/{owner}/{repo}/git/refs/heads/main` – Branch auf neuen Commit zeigen lassen

Option A ist für den Start völlig ausreichend.

---

## App-Struktur (Screens)

### Screen 1: Auth
- Eingabefeld für GitHub PAT
- "Verbinden"-Button → testet `GET /user`
- Bei Erfolg: PAT in localStorage, weiter zu Screen 2
- PAT-Format: `ghp_...` oder `github_pat_...`

### Screen 2: Dashboard
- Städte-Dropdown oder Liste
- Tabs: Bilder | Reviews | Städte | Why-Sektion
- "Veröffentlichen"-Button (oben rechts, immer sichtbar, zeigt Anzahl ausstehender Änderungen)
- Zeigt aktuell ausgewählte Stadt

### Screen 3: Bilder (pro Stadt)
- Grid aller Bilder in `public/img/slides/{stadt}/`
- Bilder als Thumbnails (URL: `https://raw.githubusercontent.com/{owner}/{repo}/main/{pfad}`)
- Unter jedem Bild: Alt-Text bearbeiten (Textfeld), Kategorie-Checkboxen (Schnellzeichner / Szenenmaler)
- "Bild hochladen"-Bereich (drag & drop oder Datei-Auswahl)
- Änderungen → lokaler State, noch kein Commit

### Screen 4: Reviews (pro Stadt)
- Liste existierender Reviews (author + erste Zeile Text)
- "Neuer Review"-Button → Formular: Author, Text, Kategorie
- Edit/Delete für bestehende
- Änderungen → lokaler State

### Screen 5: Städte verwalten
- Liste aller aktiven Städte (aus landings.md)
- "Stadt hinzufügen"-Feld (Input + Button)
- Löschen per X-Button (mit Bestätigungs-Dialog)
- Hinweis: Slug muss lowercase sein, keine Leerzeichen

### Screen 6: FAQ-Manager
- Zwei Tabs: "Standard-FAQs" (default) und "{Stadt}-FAQs" (stadtspezifisch)
- Liste aller FAQs mit Frage als Titel + Kategorie-Badge
- Bearbeiten: Frage-Text, Antwort-Text, Kategorie-Checkboxen (Schnellzeichner / Szenenmaler / beide)
- Neue FAQ erstellen: Slug-Feld (Dateiname ohne .md, z.B. `parking`), Frage, Antwort, Kategorien
- Löschen mit Bestätigungs-Dialog
- Hinweis sichtbar: "Standard-FAQs gelten für alle Städte ohne eigene FAQs"

**Wichtig beim Schreiben:** Frontmatter korrekt formatieren:
```
---
question: "Fragetext hier?"
answer: "Antworttext hier."
categories:
  - Schnellzeichner
---
```
Kein Body-Inhalt nach dem schließenden `---`.

### Screen 7: Why-Sektion (optional, Phase 2)
- 4 Benefit-Karten pro Stadt
- Felder: Titel, Text, Alt-Text
- Bild-Upload für jedes Benefit

---

## Lokaler State / Draft-System

```ts
type DraftState = {
  pendingFiles: Map<string, {
    content: string;      // base64 für Bilder, UTF-8 für Text
    sha: string | null;   // null = neue Datei
    isBinary: boolean;
  }>;
};
```

- Jede Änderung landet in `pendingFiles`
- Key = Repo-Pfad (z.B. `public/img/slides/slides.meta.json`)
- "Veröffentlichen" iteriert über alle `pendingFiles` und macht sequenziell PUT-Requests
- Nach erfolgreichem Commit: `pendingFiles` leeren, UI-Feedback anzeigen

---

## Repo-Konfiguration (muss beim Start einmalig eingetragen werden)

```ts
const REPO_CONFIG = {
  owner: "eightdevvis",        // GitHub-Username oder Org
  repo: "Kunstwolffwebsite",   // Repo-Name
  branch: "main",
};
```

Diese Werte könnten auch per Env-Variable (Vite: `import.meta.env.VITE_REPO_OWNER` etc.) konfiguriert werden.

---

## Sicherheitshinweise

- Der PAT gibt Schreibzugriff auf das Repo. Er wird ausschließlich in `localStorage` gespeichert,
  niemals irgendwo hochgeladen oder geloggt.
- Das Admin-Tool sollte nicht öffentlich verlinkt sein. Security through obscurity reicht hier aus,
  da der PAT ohne Kenntnis der URL nutzlos ist.
- Optional: Passwort-Schutz vor dem PAT-Eingabe-Screen (einfaches hardcodiertes Passwort).

---

## Build & Deploy

Das Admin-Tool ist ein eigenständiges Vite-Projekt:

```
kunstwolff-admin/
  src/
    main.tsx
    components/
      Auth.tsx
      Dashboard.tsx
      ImageManager.tsx
      ReviewManager.tsx
      CityManager.tsx
      FaqManager.tsx
    services/
      github.ts          <- alle GitHub API calls
      state.ts           <- Draft-State Management
    utils/
      encoding.ts        <- base64 Hilfen
      markdown.ts        <- Frontmatter parsen/schreiben
  index.html
  vite.config.ts
  tailwind.config.js
```

Deployment auf GitHub Pages:
1. `npm run build` → `dist/`
2. GitHub Actions Workflow: bei Push auf `main` → build → deploy zu GitHub Pages
3. Custom Domain: CNAME `admin.kunstwolff.de` → GitHub Pages URL

---

## Implementierungs-Reihenfolge

1. **Projekt-Setup:** Vite + Preact + TypeScript + Tailwind initialisieren
2. **GitHub Service:** `github.ts` mit `getFile()`, `putFile()`, `listDirectory()`, `testConnection()`
3. **Auth-Screen:** PAT-Eingabe, localStorage, Verbindungstest
4. **Städte-Manager:** Einfachster Screen, landings.md lesen/schreiben
5. **Bilder-Manager:** slides.meta.json lesen/schreiben + Bild-Upload
6. **Reviews-Manager:** Markdown-Dateien lesen/schreiben/erstellen
7. **FAQ-Manager:** Default-FAQs + stadtspezifische FAQs lesen/schreiben/erstellen/löschen
8. **Veröffentlichen-Button:** Draft-State committen
9. **Deploy:** GitHub Actions + GitHub Pages

---

## Bekannte Besonderheiten des Kunstwolff-Repos

- Beim Commit auf `main` laufen automatisch Pre-Commit-Hooks (`sync:slides`, `sync:landings` etc.)
  die Dateien umbenennen und Metadaten generieren. Das passiert aber auf der Netlify-Seite beim Build,
  nicht im Admin-Tool. Das Admin-Tool muss sich darum nicht kümmern.
- Bilder können als `.jpg` oder `.webp` existieren. Das Sync-Script konvertiert JPGs automatisch zu WebP.
  Das Admin-Tool kann einfach JPGs/PNGs hochladen, WebP-Konvertierung übernimmt der Build.
- `slides.meta.json` Schlüssel enthalten manchmal Sonderzeichen im Dateinamen (URLs, Umlaute).
  Beim Schreiben exakt so beibehalten wie gelesen.
- Nummerierungs-Prefix (`1_`, `2_`, `3_` etc.) in Bildnamen wird automatisch vom Sync-Script gesetzt.
  Neue Bilder können ohne Prefix hochgeladen werden.
