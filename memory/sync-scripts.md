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
| 1 | `sync-landings.mjs` | Erstellt `public/img/slides/{city}/`, `public/reviews/{city}/`, `public/faq/{city}/`; merged Slug-Kollisionen; legt Validierungsreports in `reports/validation/` ab |
| 2 | `sync-skills.mjs` | Erstellt `public/img/UnsereFähigkeitenBilder/{skill}/` |
| 3 | `sync-tags.mjs` | Erzeugt/pflegt `public/config/tags.json` (Vokabular Skill × Anlass × Ort) |
| 4 | `sync-reviews-tags.mjs` | Ergänzt fehlende `tags:`-Blöcke in `public/reviews/**` (Ort aus Ordner, Skills aus `categories`, Anlass aus dem Text) |
| 5 | `sync-faq-tags.mjs` | Ergänzt fehlende `tags:`-Blöcke in `public/faq/**` (Ort aus Ordner, Skills aus `categories`; Anlass wird **nicht** geraten) |
| 6 | `sync-title-images.mjs` | Erstellt `public/img/Titelbild/{city}/` |
| 7 | `sync-slides-metadata.mjs` | Pflegt `slides.meta.json` (Priority-Prefix, Categories, Migration) |
| 8 | `sync-why.mjs` | Erstellt `public/why/{city}.json`, `public/why/{skill}.json`, `public/img/why/{key}/benefit-{1-4}/` |
| 9 | `sync-events.mjs` | Erstellt `public/img/slides/events/{event}/`, `public/img/Titelbild/events/{event}/`, `public/events/{event}/content.json` (bestehende NICHT überschreiben) |
| 10 | `sync-erinnerungen.mjs` | Erstellt `public/erinnerungen/{city}.json`, `public/erinnerungen/{skill}.json` (bestehende NICHT überschreiben) |
| 11 | `validate-image-refs.mjs` | **Guard:** scannt alle literalen `/img/…`-Verweise in `src/` + `public/` (json/md/astro/ts) und prüft, ob die Zieldatei existiert. **Exit 1 bei totem Verweis** → bricht `sync:content` ab |

> **Schritte 3–5 sind seit 2026-07-28 auch in `sync:content:safe`** – vorher liefen sie
> NUR in der manuellen Vollvariante. Das war eine echte Lücke: seit Reviews und FAQs über
> Tags ausgewählt werden, wäre ein im Admin neu angelegter Inhalt ohne Tag-Block auf der
> Seite unsichtbar geblieben, weil der Vercel-Build nur `:safe` ausführt.
>
> Die Reihenfolge ist zwingend: `sync:tags` **vor** `sync:reviews-tags`/`sync:faq-tags`,
> denn beide verwerfen einen Ort, den `tags.json` nicht kennt.

> ⚠️ **Was im Build erzeugt wird, existiert im Repo nicht.** Läuft `sync:tags` als
> `prebuild`, landet das erweiterte `public/config/tags.json` im Build-Output – **nicht**
> in einem Commit. Für die Website ist das folgenlos, fürs **Admin-Tool nicht: es liest
> das Repo.** Ein per Hand ergänzter Skill/Anlass/Ort ist dort sonst nicht auswählbar,
> obwohl die Seite live ist (Fall „Aquarelle", 2026-07-30). Wer eine Seed-Quelle
> (`skills.json`, `events.json`, `landings.md`) per Hand ändert: `npm run sync:tags`
> laufen lassen **und das Ergebnis committen**. Details: `tag-system.md`.
> Dasselbe Muster gilt für jedes Sync-Script, dessen Ergebnis der Admin liest.

> **Step 8 (`validate:images`) – warum:** Der pre-push-Hook konvertiert Bilder zu `.webp` und löscht Originale, aktualisiert aber keine Verweise → tote `.jpg`-Pfade (404). Der Guard fängt das vor Commit (hart in `sync:content`) bzw. warnt bei dev/build (tolerant in `sync:content:safe`, das immer exit 0 macht). Eingeführt 2026-06-05 nachdem mehrfach jpg→webp-Leichen auf Live gingen (Samples, frankfurt.json, Luxembourg-Stub, Hochzeitsmaler, Opener-avif-Typo). Grenze: nur **literale** Pfade, keine dynamisch konkatenierten.

## Garantien

- **Keine Datenverluste** – bestehende `content.json`/`why.json`/`erinnerungen.json` werden nie überschrieben
- **Slug-Kollisions-Handling** in `sync-landings.mjs` – `Berlin` + `berlin` werden zu `berlin` gemerged, nichts wird gelöscht
- **Priority-Schutz** – `sync-slides-metadata.mjs` überschreibt `priority` nicht

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

**Trigger:** Push zu `main` wenn `public/landings/landings.md` oder `public/skills/skills.json` geändert. Plus `workflow_dispatch` (manuell auslösbar).

**Macht:**
1. Checkout, Node 20 setup, `npm ci`
2. `npm run sync:content` (volle Variante, nicht `:safe`)
3. `git add` über die generierten Verzeichnisse (siehe Lücke unten), Commit `chore: sync content folders`, Push

So müssen Endbenutzer nach Eintragen einer neuen Stadt nicht lokal builden – die Action macht alles.

### Bekannte Lücken (Stand 2026-05-05, siehe `HEALTH_CHECK_2026-05-05.md` SYNC-1/2/3)

- **Trigger ist unvollständig:** Reagiert nicht auf Änderungen an `public/events/events.json`. Wer einen Event eintragt, sieht den Sync erst beim nächsten Push einer triggernden Datei oder per `workflow_dispatch`.
- **`git add` ist unvollständig:** Erfasst `public/img/slides`, `public/reviews`, `public/img/UnsereFähigkeitenBilder`, `public/img/Titelbild`, `public/img/why`, `public/why`, `public/faq`. Es **fehlen** `public/erinnerungen/` (von `sync:erinnerungen` erzeugt) und `public/events/` (von `sync:events` für Event-`content.json`-Defaults erzeugt). Folge: Stubs entstehen im CI-Workspace, kommen aber nicht ins Repo zurück.
- **Kein Build/Typecheck im CI:** Die Action committet Sync-Output ohne `astro check` / `astro build`. Ein durch den Sync erzeugter kaputter JSON fällt erst lokal oder beim Vercel-Deploy auf.

## Validierungsreports

`sync:landings` schreibt nach jedem Lauf einen Report nach `reports/validation/landings/<timestamp>.json`. Details: `validierungsreports.md`.
