# Claude-Anweisungen – Kunstwolff Admin

## Über dieses Projekt

Preact + Vite + TypeScript Admin-Tool für kunstwolff.de. Schreibt via GitHub REST API direkt
in das `Kunstwolffwebsite`-Repo. Kein Backend – rein statisch, Auth via PAT in `localStorage`.

**Vollständige Dokumentation:** `README.md` in diesem Verzeichnis – bitte immer zuerst lesen.

---

## Website-Repo – PFLICHTLEKTÜRE ZU BEGINN JEDER SESSION

Das Admin-Tool und die Website sind untrennbar verzahnt. Du MUSST diese Dateien mit dem Read-Tool laden bevor du irgendetwas tust:

1. `/home/sasha/codicus/Kunstwolffwebsite/CLAUDE.md`
2. `/home/sasha/codicus/Kunstwolffwebsite/README.md`

Bei Feature-Arbeit zusätzlich:
- `/home/sasha/codicus/Kunstwolffwebsite/src/utils/` – wie die Website Daten aus `public/` konsumiert

```
Admin-Tool schreibt → public/ im Website-Repo → Netlify Build → kunstwolff.de
```

**Kritisch:** Jede Änderung an Pfaden, Dateinamen oder Dateiformaten hier muss mit dem
Website-Repo abgeglichen werden – und umgekehrt.

---

## Neue Features die beide Repos betreffen

Wenn du neue Admin-Felder/Funktionen implementierst die auch die Website betreffen:

1. **Dateiformat zuerst definieren** – was genau landet in `public/`? Welcher Pfad, welches Format?
2. **Website-Seite zuerst** – `src/utils/` im Website-Repo lesen, dort die Parsing-Logik implementieren
3. **Admin-Seite danach** – hier den Manager/Tab bauen der in dieses Format schreibt
4. **Beide READMEs aktualisieren** – Admin-README + Website-CLAUDE.md

Website-Kontext ist bereits oben geladen (siehe Abschnitt "Website-Repo – IMMER mitladen").

---

## Architektur-Kurzübersicht

```
src/
  app.tsx                  # Auth-Gate
  components/
    Dashboard.tsx          # Tabs, Veröffentlichen-Button, Stadt-Dropdown
    ImageManager.tsx       # Slideshow / Titelbild / Why-Bilder
    ReviewManager.tsx      # Reviews (Markdown + Frontmatter)
    FaqManager.tsx         # FAQs (Standard + stadtspezifisch)
    CityManager.tsx        # Städteliste (landings.md)
    CalendarView.tsx       # Kalender
    CleanupManager.tsx     # Duplikat- und Broken-Erkennung
  services/
    github.ts              # GitHub REST API (getFile, putFile, listDirectory, deleteFile)
    state.ts               # Draft-State via @preact/signals (pendingFiles)
  utils/
    encoding.ts            # base64, normalizeSlug, normalizeFilename
    markdown.ts            # Frontmatter parsen/serialisieren
```

**Draft-State-Prinzip:** Alle Änderungen sammeln sich in `pendingFiles` (Signal), kein
sofortiger API-Call. Erst "Veröffentlichen" schreibt alles sequenziell ins Repo.

---

## Was das Admin-Tool aktuell NICHT kann

Siehe Abschnitt "Bekannte Einschränkungen" im README – dort steht was noch manuell
per Git gepflegt werden muss.

**Wichtig für Event-Management:** Die Website hat seit kurzem Eventseiten (Firmenfeier, Messe,
Hochzeit, Private Feier) mit eigenem Layout, eigenen Slides und reichem Content (Ablauf-Steps,
Pakete, Referenzen). Das **vollständige `content.json`-Format** inkl. aller Felder ist in der
Website-README Sektion 3.12 dokumentiert – dort nachschlagen bevor du einen EventManager baust.
Pfade und Kontext stehen im README-Abschnitt "Bekannte Einschränkungen" unter "Events".

---

## Deployment

GitHub Actions deployt bei Push auf `main` zu GitHub Pages → `admin.kunstwolff.de`.
