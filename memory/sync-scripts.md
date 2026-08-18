# Sync-Scripts

## Wann laufen sie?

`sync:content:safe` läuft automatisch als `predev` und `prebuild` – also vor `npm run dev` und `npm run build`. Manuell:

```bash
npm run sync:content       # alle Syncs nacheinander (bricht bei Fehler ab)
npm run sync:content:safe  # fehlertolerant (Teilfehler isoliert, Build/Dev läuft weiter)
```

**Wichtig:** Das automatische `predev`/`prebuild` nutzt `:safe`. `sync:content` (ohne `:safe`) ist nur für manuelle Aufrufe gedacht, wenn Fehler hart auffallen sollen.

> **Seit 2026-07-26 neu in der Kette:** `sync:tags` (erzeugt
> `public/config/tags.json`) läuft **nach** `sync:skills` und **vor**
> `sync:title-images`/`sync:slides` – letzteres liest die Ort-Slugs, um bei der
> Tag-Vorbelegung Sammelordner wie `mediathek` nicht als Ort zu werten. Details:
> `tag-system.md`.

## Reihenfolge & Aufgabe pro Script

`sync:content` führt **in dieser Reihenfolge** aus:

| # | Script | Was es tut |
| :-- | :-- | :-- |
| 1 | `sync-landings.mjs` | Erstellt **nur** `public/img/slides/{city}/` und `public/reviews/{city}/` (inkl. `.gitkeep` + `_vorlage.md`); merged Slug-Kollisionen über slides/reviews/faq; legt Validierungsreports in `reports/validation/landings/` ab. ⚠️ **`public/faq/{city}/` wird NICHT angelegt** – `faqRoot` dient hier allein dem Zusammenführen von Duplikaten |
| 2 | `sync-skills.mjs` | Erstellt `public/img/UnsereFähigkeitenBilder/{skill}/` |
| 3 | `sync-tags.mjs` | Erzeugt/pflegt `public/config/tags.json` (Vokabular Skill × Anlass × Ort) |
| 4 | `sync-reviews-tags.mjs` | Ergänzt fehlende Tag-**Dimensionen** in `public/reviews/**` (Ort aus Ordner, Skills aus `categories`, Anlass aus dem Text) |
| 5 | `sync-faq-tags.mjs` | Ergänzt fehlende Tag-**Dimensionen** in `public/faq/**` (Ort aus Ordner, Skills aus `categories`; Anlass wird **nicht** geraten) |
| 6 | `sync-title-images.mjs` | Erstellt `public/img/Titelbild/{city}/` |
| 7 | `sync-slides-metadata.mjs` | Pflegt `slides.meta.json`: Categories (aus Dateinamen abgeleitet), Tag-Vorbelegung `tags: {skills, events, landings}` und Rename-Migration. `priority` wird nur noch **übernommen**, nicht mehr aus einem Dateinamen-Präfix gelesen – gesetzt wird es allein im Admin-Tool |
| 8 | `sync-why.mjs` | Erstellt `public/why/{city}.json`, `public/why/{skill}.json`, `public/img/why/{key}/benefit-{1-4}/` |
| 9 | `sync-events.mjs` | Erstellt `public/img/slides/events/{event}/`, `public/img/Titelbild/events/{event}/`, `public/events/{event}/content.json` (bestehende NICHT überschreiben) |
| 10 | `sync-erinnerungen.mjs` | Erstellt `public/erinnerungen/{city}.json`, `public/erinnerungen/{skill}.json` (bestehende NICHT überschreiben) |
| 11 | `sync-lastmod.mjs` | Schreibt `public/config/lastmod.json` (Seitenpfad → Datum der letzten echten Änderung, aus der Git-Historie) für `<lastmod>` in der Sitemap. **Muss nach 1/2/9 laufen** – es liest `landings.md`, `skills.json` und `events.json`, um zu erkennen, welcher Slug Stadt, Können oder Anlass ist |
| 12 | `validate-image-refs.mjs` | **Guard:** scannt alle literalen `/img/…`-Verweise in `src/` + `public/` (json/md/astro/ts) und prüft, ob die Zieldatei existiert. **Exit 1 bei totem Verweis** → bricht `sync:content` ab |

> **Schritte 3–5 sind seit 2026-07-28 auch in `sync:content:safe`** – vorher liefen sie
> NUR in der manuellen Vollvariante. Das war eine echte Lücke: seit Reviews und FAQs über
> Tags ausgewählt werden, wäre ein im Admin neu angelegter Inhalt ohne Tag-Block auf der
> Seite unsichtbar geblieben, weil der Vercel-Build nur `:safe` ausführt.
>
> Die Reihenfolge ist zwingend: `sync:tags` **vor** `sync:reviews-tags`/`sync:faq-tags`,
> denn beide verwerfen einen Ort, den `tags.json` nicht kennt.

> ✅ **Behoben 2026-07-30 (C3):** `public/config` steht jetzt in **beiden**
> `git add`-Listen (`.githooks/pre-commit` und `.github/workflows/sync-landings.yml`),
> zusammen mit `public/erinnerungen` und `public/events`. `events.json` triggert
> die Action jetzt ebenfalls. Der Commit-Schritt prüft zusätzlich gegen den
> **Index** statt gegen `git status` — vorher färbte eine Änderung außerhalb der
> add-Liste den Job rot, obwohl nichts kaputt war.
>
> ✅ **Behoben 2026-07-30 (C1):** `sync:tags` ist in `sync-content-safe.mjs` ein
> **harter** Schritt (`hart: true`) und bricht den Build mit Exit 1 ab. Die alte
> Begründung „hart blockiert über den pre-commit-Hook" trug nicht: das Admin-Tool
> veröffentlicht über die GitHub-API, dort läuft kein git-Hook. Gemessen mit
> einem Event `{title:'Abiball', slug:'abi-party'}`: vorher Exit 0, jetzt Exit 1.

> ⚠️ **Was im Build erzeugt wird, existiert im Repo nicht.** Läuft `sync:tags` als
> `prebuild`, landet das erweiterte `public/config/tags.json` im Build-Output – **nicht**
> in einem Commit. Für die Website ist das folgenlos, fürs **Admin-Tool nicht: es liest
> das Repo.** Ein per Hand ergänzter Skill/Anlass/Ort ist dort sonst nicht auswählbar,
> obwohl die Seite live ist (Fall „Aquarelle", 2026-07-30). Wer eine Seed-Quelle
> (`skills.json`, `events.json`, `landings.md`) per Hand ändert: `npm run sync:tags`
> laufen lassen **und das Ergebnis committen**. Details: `tag-system.md`.
> Dasselbe Muster gilt für jedes Sync-Script, dessen Ergebnis der Admin liest.

> **Schritt 11 (`sync:lastmod`) – warum es NICHT zur Build-Zeit rechnet:** Das
> Skript erzeugt eine **committete** Datei, statt `git log` beim Bauen zu
> befragen. Grund: klont der Build-Server flach (nur die letzten Commits),
> liefert `git log -1 -- <datei>` für JEDE Datei denselben Commit — alle 39
> Sitemap-Einträge bekämen dasselbe Datum. Das ist kein fehlendes Signal,
> sondern ein falsches; Google stuft gleichförmige `lastmod`-Werte dauerhaft
> als unglaubwürdig ein. Das Skript prüft deshalb selbst auf brauchbare
> Historie (kein Git / flacher Klon / < 50 Commits) und **lässt die vorhandene
> Datei dann unangetastet**. Pro Seite zählen nur ihre eigenen Quellen, nicht
> Layout/Fußzeile/CSS — sonst trüge nach jeder Stiländerung jede Seite dasselbe
> neue Datum. Für die Sammeldateien (`content.json`, `events.json`,
> `skills.json`) sucht es zeilengenau (`git log -G<slug>`), sonst bekämen nach
> einer Berlin-Änderung alle 34 Städte ein frisches Datum.
>
> **Schritt 12 (`validate:images`) – warum:** Der pre-push-Hook konvertiert Bilder zu `.webp` und löscht Originale, aktualisiert aber keine Verweise → tote `.jpg`-Pfade (404). Der Guard fängt das vor Commit (hart in `sync:content`) bzw. warnt bei dev/build (tolerant in `sync:content:safe` – das endet nur dann mit Exit 1, wenn ein als `hart: true` markierter Schritt scheitert, aktuell `sync:tags`; „immer exit 0" galt bis zum C1-Fix). Eingeführt 2026-06-05 nachdem mehrfach jpg→webp-Leichen auf Live gingen (Samples, frankfurt.json, Luxembourg-Stub, Hochzeitsmaler, Opener-avif-Typo). Grenze: nur **literale** Pfade, keine dynamisch konkatenierten.

## Garantien

- **Keine Datenverluste bei Events und Erinnerungen** – bestehende
  `public/events/{slug}/content.json` und `public/erinnerungen/{key}.json` werden nie
  überschrieben
- ⚠️ **Ausnahme Why:** bestehende `public/why/{key}.json` **werden** neu geschrieben.
  `syncExistingWhyFileImages()` läuft über jede Stadt-, Skill- und die Default-Datei und
  leert absichtlich alle Felder, die wortgleich mit `default.json` sind, sowie
  sync-generierte Bildpfade – nur so schlagen spätere Änderungen an `default.json`
  weiter durch. Echte eigene Werte bleiben stehen (`content-why.md`)
- **Slug-Kollisions-Handling** in `sync-landings.mjs` – `Berlin` + `berlin` werden zu `berlin` gemerged, nichts wird gelöscht
- **Priority-Schutz** – `sync-slides-metadata.mjs` überschreibt `priority` nicht
- **Tag-Schutz je Dimension (seit 2026-08-01)** – die beiden Tag-Skripte fassen eine
  Dimension, die im `tags:`-Block **steht**, nie an; auch `landings: []` bleibt, weil das
  „gilt überall" heißt. Ergänzt werden nur Dimensionen, die gar nicht dastehen. Vorher
  galt das je **Block**, und ein halber Block aus dem Admin schaltete die Ergänzung
  dauerhaft ab (`content-faqs.md`). Gemeinsame Logik: `scripts/tags.mjs` →
  `findeTagsBlock` / `ergaenzeFehlendeDimensionen`

## Einzelne Sync-Befehle

```bash
npm run sync:landings        # nur Stadtordner
npm run sync:skills          # nur Skill-Bildordner
npm run sync:title-images    # nur Titelbild-Ordner
npm run sync:slides          # nur slides.meta.json
npm run sync:why             # nur Why-JSONs + Bildordner
npm run sync:events          # nur Events-Ordner
npm run sync:erinnerungen    # nur Erinnerungen-JSONs
```

## GitHub Action: `sync-landings.yml`

Liegt unter `.github/workflows/sync-landings.yml`.

**Trigger:** Push zu `main` wenn `public/landings/landings.md`, `public/skills/skills.json` oder `public/events/events.json` geändert. Plus `workflow_dispatch` (manuell auslösbar).

**Macht:**
1. Checkout, Node 20 setup, `npm ci`
2. `npm run sync:content` (volle Variante, nicht `:safe`)
3. `git add` über die generierten Verzeichnisse (siehe Lücke unten), Commit `chore: sync content folders`, Push

So müssen Endbenutzer nach Eintragen einer neuen Stadt nicht lokal builden – die Action macht alles.

### Behoben 2026-07-30 (waren SYNC-1/2 im `HEALTH_CHECK_2026-05-05.md`)

- ~~**Trigger ist unvollständig**~~ → `public/events/events.json` steht jetzt in den Trigger-Pfaden.
- ~~**`git add` ist unvollständig**~~ → die Liste erfasst jetzt zusätzlich `public/config` (Tag-Vokabular!), `public/erinnerungen` und `public/events`. `public/config` war die Ursache dafür, dass `tags.json` von Hand nachgepflegt werden musste (Commit `6b38e3e`) — und damit indirekt dafür, dass ein neu angelegter Skill im Admin nicht auswählbar war.

### Offene Lücke

- **Kein Build/Typecheck im CI:** Die Action committet Sync-Output ohne `astro check` / `astro build`. Ein durch den Sync erzeugter kaputter JSON fällt erst lokal oder beim Vercel-Deploy auf.

## Einmal-Werkzeuge (laufen NICHT im Sync)

Drei Skripte in `scripts/` gehören nicht in die Kette – sie waren für genau eine
Umstellung gedacht und liegen als Beleg dort. Sie stehen in keinem npm-Script und
werden von keinem Hook aufgerufen; wer sie versehentlich laufen lässt, ändert Inhalte.

| Script | Wofür, einmalig |
| :-- | :-- |
| `flache-kombi-urls.mjs` | Umstellung auf flache Ort-Kombi-Adressen (2026-08-01); hat die 136 Weiterleitungen in `vercel.json` erzeugt (`routing.md`) |
| `dissolve-slide-duplicates.mjs` | Löst bytegleiche Slide-Duplikate auf, die es nur gab, weil im Ordnermodell der Ablageort über die Seite entschied. Vereinigt die Tags aller Kopien auf das Original, biegt die Verweise um, löscht die Kopie. **Trockenlauf ist der Default**, echtes Ändern nur mit `--apply` |
| `migrate-slide-meta.mjs` | Zerlegte aufgeblähte Dateinamen in kurzen `title` + reichen `altOverride` in `slides.meta.json`. Idempotent, fasst bestehende Werte nicht an, berührt nur die Metadaten (Umbenennen der Dateien wäre riskant – `public/erinnerungen/*.json` verweist darauf) |
| `alt-texte-zurueckholen.mjs` | Holt die Alt-Texte zurück, die der Sync-Filter gelöscht hat (Feld `alt` stand nicht auf der Übernahmeliste). Liest aus der Dateihistorie gerettete Texte, schreibt sie als `altOverride`. Idempotent, überschreibt nie einen von Hand gepflegten Text. Trockenlauf ohne Argument, `--schreiben` übernimmt |

## Validierungsreports

`sync:landings` schreibt nach jedem Lauf einen Report nach `reports/validation/landings/<timestamp>.json`. Details: `validierungsreports.md`.


## Wurzeln, nicht Ordner (2026-07-31)

`sync-faq-tags.mjs` läuft über **alle** FAQ-Wurzeln: `public/faq` plus jedes
`public/i18n/<locale>/faq`. Der Ort-Slug wird relativ zur jeweiligen Wurzel
gebildet, `tagsFromPath(filePath, root)` bekommt sie übergeben.

Vorher lief es nur über die deutsche Wurzel — mit der Folge, dass
`/fr/belgique/` vier hartkodierte deutsche FAQs zeigte (Details in
`content-faqs.md`).

**Regel für neue Sync-Skripte:** über alle Locale-Wurzeln laufen, nicht nur über
die deutsche. Ein Overlay, das der Sync nicht kennt, ist ein Inhalt, der nie
ankommt — und der stille Fallback verdeckt es.

## Stichwort-Ableitung trifft an Wortgrenzen (2026-07-31)

`inferEventsFromKey` (`scripts/tags.mjs`) und `eventsFromText`
(`sync-reviews-tags.mjs`) waren reine Substring-Tests: `angemessen-preis.webp`
wurde zu `messe`, ebenso jede Bewertung mit dem Wort „gemessen". Beide prüfen
jetzt am Wortanfang (`-${keyword}`) — dieselbe Regel, die `inferLandingsFromKey`
zehn Zeilen darüber schon anwandte.

Dazu korrigiert: der Stichwort-Schlüssel `jubilaum` war der einzige von zwölf,
den `tags.json` nicht kennt (dort `jubilaeum`) — ein so vergebener Tag traf nie
eine Seite. `tests/event-stichworte.test.ts` hält beides fest.
