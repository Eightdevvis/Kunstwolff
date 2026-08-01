# Cities / Landings

## Quelle

`public/landings/landings.md`

```
# Städteliste für kunstwolff.de
# Eine Stadt pro Zeile. kleingeschrieben, keine Leerzeichen, keine Sonderzeichen.
# Korrekt: berlin  |  Falsch: Berlin, Berl in, Berlín

berlin
frankfurt
hamburg
```

**Kein YAML-Frontmatter.** Einfache Textliste. Kommentarzeilen mit `#` werden ignoriert.

## Fallback-Quellen (in `landings.ts`)

1. `public/landings/landings.md` – primäre Quelle
2. `public/landings/landings.json` – im Loader vorgesehen, **physisch nicht im Repo vorhanden**
3. Auto-Discovery aus Verzeichnisstrukturen (`public/img/slides/`, `public/reviews/`, `public/landings/`) – greift derzeit als 2. Fallback

`getLandingSlugs()` liefert diesen Rohbestand. Daneben gibt es
**`getVisibleLandingSlugs()`**, das ihn zusätzlich gegen
`public/config/page-visibility.json` filtert (`isPageHiddenByPath('/<slug>/')`) – und
genau das benutzt `Landingsection.astro` für die Ortsliste. Aktuell sind 22 der 34
Stadtseiten dort versteckt. Eine frisch eingetragene Stadt taucht in der Liste also
nicht auf, solange ihr Pfad in `hidden` steht; **gebaut wird ihre Seite trotzdem**.

## Slug-Normalisierung im Loader

`landings.ts` transliteriert vor dem Vergleich:
- `ä → ae`, `ö → oe`, `ü → ue`, `ß → ss`
- entfernt Akzente (`é → e`)
- lowercase
- ersetzt Nicht-Alphanumerisches durch `-`, trimmed führende/folgende `-`

So wird `Berlín` zu `berlin`, `Köln` zu `koeln` etc. Bei Slug-Kollisionen merged der Sync.

## Slug-Regeln

- **Lowercase**, keine Leerzeichen, keine Sonderzeichen, keine Umlaute
- Beispiele: `berlin`, `koeln`, `frankfurt`
- Bei Slug-Kollisionen (z.B. `Berlin` + `berlin`) **merged** der Sync bestehende Ordner statt zu löschen (kollisionssicher)

### Anzeigename ≠ Slug

Der Slug ist ASCII; der **sichtbare** Name kommt aus `src/utils/cityNames.ts`
(`getCityDisplayName`, Map `CITY_DISPLAY_NAMES`, Fallback `titleCaseSlug` = jedes
Bindestrich-Wort groß). Von dort stammen Titel, Meta-Description, H1 und Breadcrumb der
Stadt- und Kombiseiten – `koeln` → „Köln", `bw` → „Baden-Württemberg", `belgique` →
„Belgien". Hat eine neue Stadt Umlaute, mehrere Wörter oder eine eigene Schreibweise,
**muss dort ein Eintrag dazu**, sonst steht auf der Seite der aufgehübschte Slug.

## Workflow: Neue Stadt hinzufügen

1. Slug in `public/landings/landings.md` eintragen
2. `npm run sync:content` (oder `npm run dev` – läuft automatisch)
   - Erstellt automatisch:
     - `public/img/slides/<stadt>/`
     - `public/reviews/<stadt>/`
     - `public/img/Titelbild/<stadt>/`
     - `public/img/why/<stadt>/benefit-{1-4}/`
     - `public/why/<stadt>.json` – mit **vier LEEREN Benefits** (`title`/`text`/`image`/`alt` = `""`);
       die Website merged zur Laufzeit komplett aus `default.json`. Eigene Werte
       entstehen nur durch Admin-Überschreibung, und die Bildordner bleiben leer
       (nur `.gitkeep`, kein Sample-Seeding mehr).
     - `public/erinnerungen/<stadt>.json` (Kopie default)
3. Falls der Name Umlaute, mehrere Wörter oder eine abweichende Schreibweise hat:
   Eintrag in `src/utils/cityNames.ts` ergänzen
4. Stadtspezifische Bilder hochladen (Slides, Titelbild, Why-Bilder)
5. Texte in `public/why/<stadt>.json` anpassen
6. Optional: stadtspezifische Reviews und FAQs anlegen (⚠️ der FAQ-Ordner wird
   **nicht** automatisch angelegt)

**Hinweis:** GitHub Action `sync-landings.yml` macht Schritt 2 automatisch bei Push (siehe `sync-scripts.md`).

## Workflow: Stadt entfernen

```bash
npm run remove:landing -- <stadtslug>
# Optional: npm run remove:landing -- <stadtslug> ./eigener-archivpfad
```

**Was archiviert wird** (nach `removed_landings/<timestamp>-<stadt>/`):
- `public/img/slides/<stadt>/`
- `public/reviews/<stadt>/`
- `public/faq/<stadt>/`
- `public/img/why/<stadt>/`
- `public/img/Titelbild/<stadt>/` (inkl. Legacy-Strukturen `Titelbild/landings/` und `Titelbild/skills/`, via `collectMatchingTitleImageTargets`)
- `public/why/<stadt>.json` und alle `public/why/*-<stadt>.json` Dateien

**Was zusätzlich bereinigt wird (nicht archiviert):**
- `title.meta.json` – passende Einträge werden von `cleanTitleMetadataForLanding` entfernt und die Datei neu geschrieben

**Was NICHT bereinigt wird (manuell aufräumen):**
- Einträge in `slides.meta.json` – bleiben als verwaiste Metadaten
- `public/erinnerungen/<stadt>.json` – `remove-landing.mjs` kennt den Ordner gar nicht
  (er fehlt im `roots`-Objekt), obwohl `sync-erinnerungen.mjs` pro Stadt eine Datei anlegt
- der Ort im Tag-Vokabular `public/config/tags.json` (geseedete Einträge werden nie entfernt)
- Ort- und Kombi-Pfade in `public/config/page-visibility.json`

**Nach dem Script:**
- Stadt wird automatisch aus `landings.md` entfernt
- `report.json` im Archiv-Ordner dokumentiert was archiviert wurde
