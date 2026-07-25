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

## Workflow: Neue Stadt hinzufügen

1. Slug in `public/landings/landings.md` eintragen
2. `npm run sync:content` (oder `npm run dev` – läuft automatisch)
   - Erstellt automatisch:
     - `public/img/slides/<stadt>/`
     - `public/reviews/<stadt>/`
     - `public/img/Titelbild/<stadt>/`
     - `public/img/why/<stadt>/benefit-{1-4}/`
     - `public/why/<stadt>.json` (Default-Texte)
     - `public/erinnerungen/<stadt>.json` (Kopie default)
3. Stadtspezifische Bilder hochladen (Slides, Titelbild, Why-Bilder)
4. Texte in `public/why/<stadt>.json` anpassen
5. Optional: stadtspezifische Reviews und FAQs anlegen

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

**Nach dem Script:**
- Stadt wird automatisch aus `landings.md` entfernt
- `report.json` im Archiv-Ordner dokumentiert was archiviert wurde
