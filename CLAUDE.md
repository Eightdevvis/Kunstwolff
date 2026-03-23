# Claude-Anweisungen – Kunstwolff Website

## Über dieses Projekt

Astro 5 + Preact SSG-Website für kunstwolff.de (Eventkünstler). SEO-fokussiert, mit statischen City/Skill-Kombinations-Seiten. Kein CMS, alles dateibasiert im `public/`-Ordner.

---

## Das Admin-Tool – warum es hier relevant ist

Das Projekt hat ein eigenständiges Admin-Tool. Das Admin-Tool ist eine separate Preact-App, die via GitHub REST API direkt in dieses Repo schreibt.

**Pfad (in diesem Repo enthalten):**

| Gerät | Admin-Tool-Pfad |
| :-- | :-- |
| PC & Laptop | `/home/sasha/codicus/Kunstwolff/kunstwolff-admin/` |

**Für Cross-Repo-Arbeit:** Admin-README lesen: `/home/sasha/codicus/Kunstwolff/kunstwolff-admin/README.md`

**Warum das wichtig ist für jeden Claude der an diesem Projekt arbeitet:**
- Jede Änderung an Pfadstrukturen, Dateinamen oder Dateiformaten in `public/` kann das Admin-Tool brechen
- Das Admin-README (`/home/sasha/codicus/Kunstwolff/kunstwolff-admin/README.md`) muss bei Pfadänderungen zwingend mitgepflegt werden
- Das Admin-Tool kennt nicht alle Features des Websites – Lücken sind dokumentiert im Admin-README unter "Bekannte Einschränkungen"
- Schnittstelle: Admin schreibt nach `public/` → GitHub Action `sync-landings.yml` + Netlify Build → Website live

**Admin-Tool Komponenten** (`{admin-pfad}/src/components/`):
- `Dashboard.tsx` – Hauptlayout: Kategorie→Seite-Navigation, Tab-Leiste (Interface | Städte | Kalender | Bereinigung)
- `interface/InterfaceView.tsx` – Visueller Seiten-Editor: SVG-Stack (links) + eingebetteter Editor (rechts)
- `interface/pageTypes.ts` – Seitentyp-Definitionen, Komponent-Stacks, Editor-Mappings
- `interface/componentSvgs.tsx` – Statische SVG-Wireframes für alle Astro-Komponenten (WARTUNG: bei Layout-Änderungen anpassen!)
- `ImageManager.tsx` – Slideshow, Titelbild, Why-Bilder, Hero-Hintergrund (city-Prop = Pfad-Segment, funktioniert auch mit `events/{slug}`)
- `ReviewManager.tsx` – Reviews pro Stadt
- `CityManager.tsx` – Städteliste (`landings.md`)
- `FaqManager.tsx` – Standard- und stadtspezifische FAQs
- `EventManager.tsx` – Events (`events.json` + `content.json` pro Event + Slideshow + Titelbild)
- `CalendarView.tsx` + `EventModal.tsx` – Kalender (nur Admin, nicht auf Website)
- `CleanupManager.tsx` – Duplikate/kaputte Bilder bereinigen
- `PartnerManager.tsx` – Partner (`partners.json` + Logo-Upload)
- `CinemaManager.tsx` – Cinema-Welcome-Konfigurator (`cinema.json`: Sektionen, Satelliten, Ergebnisse)

**Pfade die das Admin-Tool schreibt:**
- `public/img/slides/{stadt}/` + `public/img/slides/slides.meta.json`
- `public/img/slides/events/{slug}/` + `public/img/slides/slides.meta.json`
- `public/img/Titelbild/{stadt}/`
- `public/img/Titelbild/events/{slug}/`
- `public/img/why/{stadt}/benefit-{1-4}/`
- `public/reviews/{stadt}/review*.md`
- `public/faq/{stadt}/*.md` + `public/faq/default/*.md`
- `public/landings/landings.md`
- `public/events/events.json` + `public/events/{slug}/content.json`
- `public/calendar/{jahr}/{monat}.json`
- `public/partners/partners.json` + `public/img/partners/`
- `public/img/hero-bg/{key}/` – Hero-Hintergrundbild pro Skill/Stadt
- `public/config/components.json` – Komponent-Visibility (Enable/Disable pro Seite)
- `public/cinema/cinema.json` – Cinema-Welcome-Konfigurator (Sektionen, Satelliten, Ergebnisse)

**Vor Änderungen an `public/`-Strukturen immer prüfen:**
1. Schreibt das Admin-Tool in diese Pfade? → siehe Komponenten-Liste oben
2. Liest die Website diese Pfade? → `src/utils/*.ts`
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

**Admin-Tool:** Tab "Events" – vollständiges CRUD für events.json, content.json-Editor (Ablauf, Pakete, Referenzen) + Slideshow + Titelbild pro Event. Komponente: `EventManager.tsx`. Content.json wird NIE vom sync-Script überschrieben.

### CinemaWelcome (Interaktiver Konfigurator)

`public/cinema/cinema.json` – Interaktiver Auswahl-Konfigurator auf der Startseite (Event → Muse → Geschmack → Angebot).
Geladen von `src/utils/cinema.ts` → verwendet in `src/components/CinemaWelcome.astro`.

**Ausführliche Doku:** Siehe `README.md` → Sektion "CinemaWelcome".

**Für Entwickler wichtig:**
- Satelliten haben `value` (Logik) + `title` (Anzeige) + `defaults` (Textbausteine) + optional `displayMode: "text"` (Muse-Kreise)
- **Kompositions-Modell:** Ergebnis wird aus den 3 Auswahlen zusammengesetzt (Titel: `"{geschmack} auf {event} für {muse}"`, Text/Offer: Bausteine konkateniert in Reihenfolge geschmack→muse→event)
- **Overrides:** `overrides["{geschmack}-{event}-{muse}"]` ersetzt das gesamte Ergebnis für eine Kombination
- Event/Geschmack-Satelliten kommen aus `events.json`/`skills.json` – nicht frei eingebbar
- Layout (reversed, CSS-Positionen, Animationen) hartcodiert in `.astro` – JSON steuert nur Inhalte

**Admin-Tool:** `CinemaManager.tsx` (editorType `'cinema'`) – Tab „Sektionen" (Intro + Satelliten mit Defaults bearbeiten) + Tab „Kombinationen" (Grid aller Kombis mit Vorschau + Override-Editor).

### Erinnerungen (Pinnwand-Fotos)

`public/erinnerungen/{key}.json` – Pinnwand-Fotos für die LandingErinnerungen-Komponente.
Jede JSON enthält ein `photos`-Array mit `{ image, alt }`-Einträgen (max. 4 werden angezeigt).

**Fallback-Kette:** `{skill}-{landing}.json` → `{landing}.json` → `{skill}.json` → `default.json`
Geladen von `src/utils/erinnerungen.ts` → verwendet in `src/components/LandingErinnerungen.astro`.

**Wo angezeigt:** Auf Landing-Seiten (`/<stadt>/`, `/<skill>/<stadt>/`) zwischen Why und Contact. Nicht auf Event-Seiten.
**Admin-Tool:** Kann Erinnerungen noch nicht verwalten (geplant). `sync-erinnerungen.mjs` erstellt automatisch JSONs für alle Städte/Skills.

### Partner

`public/partners/partners.json` – Liste aller Kooperationspartner, angezeigt auf `/partner/`.
`public/img/partners/` – Logos der Partner.

**JSON-Format:**
```json
{
  "partners": [
    { "id": "firma-gmbh", "name": "Firma GmbH", "logo": "/img/partners/firma-gmbh.webp",
      "description": "...", "url": "https://...", "enabled": true }
  ]
}
```
- `id` – Slug, bestimmt auch den Logo-Dateinamen
- `enabled: false` – blendet aus ohne zu löschen

**Admin-Tool:** Tab "Partner" – vollständiges CRUD inkl. Logo-Upload. ID wird aus Name generiert (Umlaut-sicher).
Komponente: `PartnerManager.tsx`

### Kalender

`public/calendar/{jahr}/{monat}.json` – Event-Kalender-Daten.
Diese werden **nur vom Admin-Tool** (CalendarView) gelesen und geschrieben – die Website selbst nutzt sie nicht.

### Component-Visibility-Config

`public/config/components.json` – Steuert welche Astro-Komponenten pro Seitentyp/Seite aktiv sind.
Geladen von `src/utils/componentConfig.ts` → `isComponentEnabled(pageType, pageSlug, componentId)`.
Geschrieben vom Admin-Tool: Interface-Tab → Enable/Disable-Toggle pro Komponent.

**JSON-Struktur:**
```json
{
  "homepage": {
    "_default": { "opener": true, "cinemaWelcome": true, "slideshow": true, ... }
  },
  "landing": {
    "_default": { "opener": true, "slideshow": true, "faq": true, ... },
    "berlin": { "erinnerungen": false }
  },
  "event": {
    "_default": { "eventHero": true, "slideshow": true, "eventAblauf": true, ... }
  },
  "skill": {
    "_default": { "skillHero": true, "slideshow": true, ... }
  }
}
```

**Fallback-Kette:** Seiten-spezifisch (`landing.berlin.faq`) → Kategorie-Default (`landing._default.faq`) → `true`

**Komponenten-IDs:** `opener`, `cinemaWelcome`, `skillBanner`, `slideshow`, `why`, `erinnerungen`, `contact`, `faq`, `landingsection`, `eventHero`, `eventAblauf`, `eventPakete`, `eventSkills`, `eventReferenzen`, `skillHero`, `heroBackground`

**Integriert in alle Seiten-Templates:**
- `src/pages/index.astro` (Homepage)
- `src/pages/[landing].astro` (Landing + Event)
- `src/pages/[skill].astro` (Skill-Index)
- `src/pages/[skill]/[landing].astro` (Skill+Landing + Skill+Event)

**Admin-Tool:** Interface-Tab → SVG-Stack zeigt alle Komponenten der gewählten Seite → Toggle schaltet Komponent ein/aus → Änderung landet in Pending-Queue → wird beim Veröffentlichen committet.

**WARTUNG:** Wenn ein neuer Astro-Komponent hinzugefügt wird:
1. ID in `components.json` Defaults eintragen
2. `show('id')` Guard in die Astro-Seite einfügen
3. SVG-Wireframe in `componentSvgs.tsx` hinzufügen
4. Komponent-Definition in `pageTypes.ts` → `COMP` + `PAGE_STACKS` eintragen

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

**Memory-Pfad ist auf beiden Geräten identisch:**

`/home/sasha/.claude/projects/-home-sasha-codicus-Kunstwolff-Kunstwolffwebsite/memory/MEMORY.md`
