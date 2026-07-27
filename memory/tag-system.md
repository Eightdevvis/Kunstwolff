# Tag-System (Skill × Anlass × Ort)

**Stand:** Phase 5a umgesetzt 2026-07-26 — Datenmodell, Vokabular und Migration
stehen. Das **Rendering liest noch nicht danach** (Phase 5b), die Tags sind
also vorhanden, aber noch ohne Wirkung auf der Website.

Gesamtplan: `reports/plan-bilder-upload-tags-2026-07-26.md`.

## Warum

Slides gehören heute **per Ordner** zu einer Seite (`slideImages.ts`
`readFolderSlides()`). Daraus folgt:

- **Ort und Anlass konkurrieren um denselben Platz.** Ein Bild liegt entweder in
  `slides/trier/` ODER in `slides/events/hochzeit/`, nie in beidem. Zwei der
  drei Dimensionen schließen sich strukturell aus.
- Ein Bild auf zwei Seiten zu zeigen erzwingt eine **Byte-Kopie** — daher die 33
  bytegleichen Duplikate im Repo.

Nach der Migration tragen **87 Bilder Ort UND Anlass gleichzeitig**, was vorher
unmöglich war.

## Vokabular: `public/config/tags.json`

Erzeugt und gepflegt von `scripts/sync-tags.mjs` (läuft in `sync:content`
**vor** `sync:slides`, weil dieses die Ort-Slugs zur Prüfung liest).

```json
{
  "skills":   [{ "slug": "schnellzeichner", "label": "Schnellzeichner", "source": "skills.json" }],
  "events": [{ "slug": "hochzeit", "label": "Hochzeit", "source": "events.json" },
               { "slug": "weihnachtsfeier", "label": "Weihnachtsfeier", "source": "extra" }],
  "landings":     [{ "slug": "trier", "label": "Trier", "source": "landings.md" }]
}
```

| Dimension | Seed-Quelle | Stand 2026-07-26 |
| :-- | :-- | --: |
| `skills` | `skills.json` (Titel) | 2 |
| `tags.events` | `events.json` (Slugs) + `EXTRA_ANLAESSE` | 12 |
| `tags.landings` | `landings.md` | 34 |

`source` unterscheidet Herkunft: `events.json`/`skills.json`/`landings.md` sind
geseedet, `extra` sind Anlässe ohne eigene Seite (kommen in den Inhalten vor),
`custom` sind im Admin angelegte.

**Regeln in `mergeVocabulary()` (scripts/tags.mjs):**

- Neue Seeds kommen dazu; vorhandene Labels werden **nie umbenannt** (Jenny kann
  sie im Admin geändert haben).
- **Es wird nie etwas entfernt.** Verschwindet eine Stadt aus `landings.md`,
  bleibt ihr Tag: Inhalte könnten noch darauf verweisen, und ein stiller Wegfall
  würde sie unsichtbar aus Seiten kippen. Aufräumen ist Handarbeit.
- Reihenfolge stabil (Seeds zuerst, Rest alphabetisch) → kein Diff-Rauschen.

**Tag-Identität ist immer der Slug, nie das Label** (`slugifyTag()`). Das
Vokabular wird im Admin gepflegt, also getippt — ohne Normalisierung wären
„Weihnachtsfeier" und „weihnachtsfeier" zwei Tags und die Auto-Einsortierung
fiele auseinander. Umlaute werden aufgelöst (`Jubiläum` → `jubilaum`).

**Harte Prüfung:** `sync-tags` bricht ab, wenn ein Event-Slug keinen passenden
Anlass-Tag hätte — sonst fände die Event-Seite ihre Bilder nicht, und das fiele
erst live auf.

## Tags an Bildern: `slides.meta.json`

Zwei neue Felder neben dem bestehenden `categories` (= Skill-Dimension):

```json
"trier/1_2-kollegen-...-weihnachtsfeier-...webp": {
  "categories": ["Schnellzeichner"],
  "events": ["firmenfeier", "weihnachtsfeier"],
  "landings": ["trier"],
  "priority": 1
}
```

| Feld | Dimension | Vorbelegung |
| :-- | :-- | :-- |
| `categories` | Skill | bestand schon, aus Dateinamen-Regeln |
| `tags.events` | Anlass | `events/<slug>/`-Ordner + Stichwörter im Dateinamen |
| `tags.landings` | Ort | Ordnername + bekannte Ort-Slugs im Dateinamen |

Beide werden **einmalig** vorbelegt und danach nie überschrieben — gleiche
Haltung wie bei `priority`. Ab dann gilt, was im Admin steht.

Die Vorbelegung erkennt auch **Region + Stadt** am selben Bild
(`hessen/…-frankfurt.webp` → `["hessen", "frankfurt"]`) und holt für Event-Slides
den Ort aus dem Dateinamen (`events/firmenfeier/…-mainz.webp` → `["mainz"]`).
Matching an Wortgrenzen, sonst würde das kurze `bw` in beliebigen Namen zünden.

## Behobene Lücke: Event-Slides waren unsichtbar

`getImageKeys()` in `sync-slides-metadata.mjs` ging **eine** Ebene tief.
`slides/events/` enthält aber nur Unterordner — die 18 dort liegenden Slides
bekamen deshalb **nie** einen Metadaten-Eintrag: keine Skill-Tags, keine
Alt-Texte, keine Priorität. Das in `content-slides.md` dokumentierte Key-Format
`events/<slug>/datei.webp` existierte faktisch nicht.

Seit 2026-07-26 läuft der Walk rekursiv (`MAX_DEPTH = 2`): 194 → 234 Einträge.

## Was noch fehlt (Phase 5b/5c/6)

- **5b:** `readFolderSlides()` durch eine Tag-Abfrage ersetzen. Erst danach
  lassen sich die 33 Duplikate gefahrlos auflösen — heute halten sie das
  Ordner-Rendering am Leben.
- **5b:** Rendering von Reviews/Bildern auf Tag-Abfrage umstellen (FAQs machen
  es in `matchesFAQContext` schon vor).
- **5c:** `srcset` im selben Aufwasch, weil 5b dieselben Dateien anfasst.
- **6:** KI-Auto-Tagging auf diesem Vokabular.

## Abdeckung je Inhaltstyp

| Typ | | Stand |
| :-- | --: | :-- |
| FAQs | 71 | ✅ trugen `tags` schon immer, `matchesFAQContext` sortiert danach |
| Bilder / Slides | 234 | ✅ `tags` in `slides.meta.json`, 87 mit Anlass UND Ort |
| Reviews | 38 | ✅ `tags` im Frontmatter (35 weitere Dateien sind Vorlagen) |
| Erinnerungen | 37 | erben über Bildpfade – eigene Tags unnötig |
| Why | 37 | erben über Bildpfade – eigene Tags unnötig |

Erinnerungen und Why referenzieren Bilder per Pfad (`"image": "/img/slides/…"`)
und erben deren Zuordnung, sobald das Rendering danach fragt.

### Reviews

`scripts/sync-reviews-tags.mjs` (in `sync:content` nach `sync:tags`) ergänzt den
Block **textuell** vor dem schließenden `---`, statt die Datei über gray-matter
neu zu serialisieren: sonst würden alle Dateien umformatiert (Anführungszeichen,
Feldreihenfolge) – ein riesiger Diff ohne Wert und ein unnötiges Risiko für den
eigenen Frontmatter-Parser des Admin-Tools. Die Migration war entsprechend
**+247/−0 Zeilen**, reine Einfügungen.

Vorbelegung: `skills` aus `categories`, `landings` aus dem Ordner, `events` aus
dem Fließtext (dieselbe `EVENT_KEYWORDS`-Tabelle wie bei Bildern). Vorhandene
Blöcke werden nie angefasst. Vorlagen (`_vorlage.md`) bleiben außen vor.

⚠️ **Cross-Repo-Vorbedingung, die dafür nötig war:** `ReviewManager.saveReview()`
im Admin baute das Frontmatter aus `author` + `categories` NEU und hätte jeden
`tags`-Block bei der ersten Bearbeitung gelöscht. Der Manager trägt jetzt das
vollständige gelesene Frontmatter mit und schreibt es zurück. Wer dort ein Feld
ergänzt, muss dasselbe prüfen.

## Cross-Repo

Das Admin-Tool muss die neuen Felder als Chips anbieten und `tags.json` lesen —
inklusive „neuen Tag anlegen" (`source: "custom"`). Siehe `admin-tool.md`.

## Bekannte Kosmetik

`sync-slides` meldet bei jedem Lauf „N bestehende Einträge aktualisiert", obwohl
die Datei bytegleich bleibt (verifiziert). Der Zähler vergleicht gegen die
normalisierte Lesefassung. Vorbestehend, harmlos, aber irreführend.
