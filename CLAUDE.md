# Claude-Anweisungen – Kunstwolff Website

## Über dieses Projekt

Astro 5 + Preact SSG-Website für kunstwolff.de (Eventkünstler). SEO-fokussiert, mit statischen City/Skill-Kombinations-Seiten. Kein CMS, alles dateibasiert im `public/`-Ordner.

---

## Das Admin-Tool – warum es hier relevant ist

Das Projekt hat ein eigenständiges Admin-Tool unter `/home/sasha/codicus/Kunstwolff-admin/kunstwolff-admin/`. Das Admin-Tool ist eine separate Preact-App, die via GitHub REST API direkt in dieses Repo schreibt.

**Für Cross-Repo-Arbeit:** Admin-CLAUDE.md lesen: `/home/sasha/codicus/Kunstwolff-admin/kunstwolff-admin/CLAUDE.md`
Admin-README lesen: `/home/sasha/codicus/Kunstwolff-admin/kunstwolff-admin/README.md`

**Warum das wichtig ist für jeden Claude der an diesem Projekt arbeitet:**
- Jede Änderung an Pfadstrukturen, Dateinamen oder Dateiformaten in `public/` kann das Admin-Tool brechen
- Das Admin-README (`/home/sasha/codicus/Kunstwolff-admin/kunstwolff-admin/README.md`) muss bei Pfadänderungen zwingend mitgepflegt werden
- Das Admin-Tool kennt nicht alle Features des Websites – Lücken sind dokumentiert im Admin-README unter "Bekannte Einschränkungen"
- Schnittstelle: Admin schreibt nach `public/` → GitHub Action `sync-landings.yml` + Netlify Build → Website live

**Vor Änderungen an `public/`-Strukturen immer prüfen:**
1. Schreibt das Admin-Tool in diese Pfade? → `src/components/ImageManager.tsx`, `ReviewManager.tsx`, `CityManager.tsx`, `FaqManager.tsx`
2. Liest das Website diese Pfade? → `src/utils/*.ts`
3. Beides in README und Admin-README aktualisieren

---

## Pfadstruktur – kritische Details

### Why-Content (häufig missverstanden!)

`public/why/` enthält JSON-Dateien mit Text (Titel, Text, Alt) für die Why-Sektion.
`public/img/why/` enthält die Bilder in `{key}/benefit-{1-4}/` Unterordnern.

**Dateinamen-Schema:** `{key}.json` wobei key sein kann:
- Stadtslug: `berlin.json`
- Skillslug: `schnellzeichner.json`
- Kombination: `schnellzeichner-berlin.json` (falls gewünscht)

**Priorität in `why.ts`:** skill-landing → landing → skill → default

**Wichtig:** `sync-why.mjs` erstellt automatisch `{stadt}.json` UND `{skill}.json` für alle Cities/Skills aus `landings.md`/`skills.json`. Das `image`-Feld zeigt auf `/img/why/{key}/benefit-{N}/...`.

### Titelbild

`public/img/Titelbild/{stadt}/` – Bilder direkt rein, NICHT in `landings/` oder `skills/` Unterordner.
Die `landings/` und `skills/` Unterordner darin sind Sync-Artefakte aus einer alten Struktur.
`public/img/Titelbild/title.meta.json` – Metadaten (wie `slides.meta.json`); aktuell `{}`, wird vom Admin noch nicht geschrieben.

### Events (Veranstaltungstypen)

`public/events/events.json` – Event-Registry (Liste aller Event-Typen: Firmenfeier, Messe, Hochzeit, Private Feier).
`public/events/{slug}/content.json` – Reicher Per-Event-Content (Ablauf-Steps, Pakete, Referenzen) mit `enabled`-Flags.
`public/img/slides/events/{slug}/` – Event-spezifische Slides (separater Namespace von Stadt-Slides).
`public/img/Titelbild/events/{slug}/` – Event-Titelbilder.

**URL-Routing:** Event-Slugs teilen den Route-Slot `[landing]` mit Stadt-Slugs. `getStaticPaths()` differenziert via `pageType: 'event' | 'landing'` Prop.
- `/{slug}/` → `src/pages/[landing].astro` mit `pageType: 'event'`
- `/{skill}/{slug}/` → `src/pages/[skill]/[landing].astro` mit `pageType: 'event'`

**Slides-Metadaten:** Nutzen dieselbe `public/img/slides/slides.meta.json` wie Stadt-Slides. Key-Format: `events/{slug}/dateiname.webp`.

**Admin-Tool:** Kann Events noch nicht verwalten (geplant). Content.json wird NIE vom sync-Script überschrieben.

### CinemaWelcome (Startseiten-Orbit)

`public/cinema/cinema.json` – Konfiguration der 3 Orbit-Sektionen + Intro auf der Startseite.
Enthält pro Sektion: Titel, Subtitle, Hauptkreis (Bild/Alt/Hint), Satelliten (Titel/Bild/Link/Alt).
Geladen von `src/utils/cinema.ts` → verwendet in `src/components/CinemaWelcome.astro`.

**JSON-Struktur:**
- `intro` – Titel + Subtitle des Willkommen-Blocks
- `sections[0..2]` – Die 3 Orbit-Sektionen (Ihr Event, Ihre Muse, Ihr Geschmack)
  - `mainCircle` – Großer Kreis (image, alt, hint) – immer genau einer pro Sektion
  - `satellites[]` – Kleine Kreise (title, image, link, alt) – 1 bis 6 Stück

**Admin-Tool:** Kann cinema.json noch nicht verwalten (geplant). Layout (welche Sektion reversed ist, IDs) bleibt im Code.

### Erinnerungen (Pinnwand-Fotos)

`public/erinnerungen/{key}.json` – Pinnwand-Fotos für die LandingErinnerungen-Komponente.
Jede JSON enthält ein `photos`-Array mit `{ image, alt }`-Einträgen (max. 4 werden angezeigt).

**Fallback-Kette:** `{skill}-{landing}.json` → `{landing}.json` → `{skill}.json` → `default.json`
Geladen von `src/utils/erinnerungen.ts` → verwendet in `src/components/LandingErinnerungen.astro`.

**Wo angezeigt:** Auf Landing-Seiten (`/<stadt>/`, `/<skill>/<stadt>/`) zwischen Why und Contact. Nicht auf Event-Seiten.
**Admin-Tool:** Kann Erinnerungen noch nicht verwalten (geplant). `sync-erinnerungen.mjs` erstellt automatisch JSONs für alle Städte/Skills.

### Kalender

`public/calendar/{jahr}/{monat}.json` – Event-Kalender-Daten.
Diese werden **nur vom Admin-Tool** (CalendarView) gelesen und geschrieben – die Website selbst nutzt sie nicht.

---

## Sync-Scripts – Reihenfolge und was sie tun

`sync:content` (= `predev`/`prebuild`) führt aus:
1. `sync-landings.mjs` – Erstellt `public/img/slides/{city}/`, `public/reviews/{city}/`, `public/faq/{city}/`; merged Slug-Kollisionen; legt Validierungsreports in `reports/validation/` ab
2. `sync-skills.mjs` – Erstellt `public/img/UnsereFähigkeitenBilder/{skill}/`
3. `sync-title-images.mjs` – Erstellt `public/img/Titelbild/{city}/`
4. `sync-slides-metadata.mjs` – Pflegt `slides.meta.json` (Priority-Prefix, Categories, Migration)
5. `sync-why.mjs` – Erstellt `public/why/{city}.json`, `public/why/{skill}.json`, `public/img/why/{key}/benefit-{1-4}/`
6. `sync-events.mjs` – Erstellt `public/img/slides/events/{event}/`, `public/img/Titelbild/events/{event}/`, `public/events/{event}/content.json` (bestehende NICHT überschreiben)
7. `sync-erinnerungen.mjs` – Erstellt `public/erinnerungen/{city}.json`, `public/erinnerungen/{skill}.json` (bestehende NICHT überschreiben)

**GitHub Action `sync-landings.yml`:** Triggert bei Push zu `main` wenn `landings.md` oder `skills.json` geändert. Führt `sync:content` aus und committet neue Verzeichnisse.

---

## Admin-README aktuell halten

Das Admin-README dokumentiert:
- Alle Pfade die das Admin-Tool liest/schreibt
- Was automatisch erstellt wird vs. was manuell nötig ist
- Was das Admin-Tool noch nicht kann (Bekannte Einschränkungen)

**Nach diesen Änderungen immer Admin-README prüfen:**
- Neue `public/`-Verzeichnisstrukturen
- Neue Metadaten-Dateien
- Geänderte Datei-Formate (JSON/MD-Frontmatter)
- Neue sync-Scripts die Pfade erzeugen

---

## Memory-Datei

Ausführlichere Projekt-Übersicht steht in:
`/home/sasha/.claude/projects/-home-sasha-codicus-Kunstwolffwebsite/memory/MEMORY.md`
