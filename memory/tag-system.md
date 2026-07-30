# Tag-System (Skill × Anlass × Ort)

**Stand:** Phase 5a (Datenmodell/Vokabular/Migration) 2026-07-26, Phase 5b
(Bilder-Rendering) und Phase 5d (Reviews + FAQs) 2026-07-28. **Alle drei
Inhaltstypen wählen jetzt über Tags aus – der Ordner ist nur noch Ablage.**
Phase 6 (KI-Tagging) ist seit 2026-07-30 gebaut – **vorschlagend, nicht
automatisch** (siehe unten).

## Phase 5b: Umstellung des Renderings (2026-07-28)

Geändert wurden genau zwei Stellen:

| vorher | nachher |
| :-- | :-- |
| `getCitySlides(city)` = `readFolderSlides(city)` | `getSlidesByTag('landings', city)` |
| `getEventSlides(slug)` = eigener Ordner-Reader (~80 Zeilen) | `getSlidesByTag('events', slug)` |

**Harter Schnitt ohne Ordner-Fallback** — zwei parallele Modelle wären genau die
Doppelrealität, die das Tag-System beseitigen soll. Abgesichert durch
`scripts/tag-parity-check.mjs`: die Prüfung vergleicht für jede Seite das
Ordner-Ergebnis gegen das Tag-Ergebnis und meldet, was verschwinden würde. Vor
der Umstellung stand sie auf **0 Lücken bei 39 Seiten**.

Nachher am gebauten `dist/` gegengeprüft (44 Seiten mit Slideshow):

- **0 Seiten leer**, **0 echte Bildverluste**, **108 Bilder neu sichtbar**
- Die scheinbaren „Verluste" auf `firmenfeier` und `mainz` waren
  **Füllbilder** aus `default-selection.json`: `supplementWithDefaultSlides`
  füllt auf `MIN_LANDING_SLIDES` (6) auf. Firmenfeier hatte **ein** eigenes Bild
  und ist jetzt bei 28 — die Füllung entfällt zu Recht.

**Der Gewinn ist bei Event-Seiten am größten**, weil dort der Ordnerzwang am
härtesten war: Firmenfeier 1 → 28, Hochzeit 8 → 33, Messe 9 → 33. Die Bilder
lagen längst im Repo, nur eben in Stadtordnern.

**Preis:** Event-Seiten wiegen jetzt so viel wie Stadtseiten schon vorher
(~0,7 MB → ~3 MB Slide-Gesamtgewicht, `loading="lazy"`, also Obergrenze statt
Erstlast). Das macht `srcset` dringlicher, nicht optional.

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
fiele auseinander.

**Deutsche Umlaute werden AUSGESCHRIEBEN** (`Jubiläum` → `jubilaeum`, `Köln` →
`koeln`, `Straßenfest` → `strassenfest`). Korrigiert 2026-07-28; vorher lief nur
NFD-Zerlegung, mit zwei Folgen:

- `Zürich` wurde `zurich`, während die Orte im Repo der ue-Konvention folgen
  (`koeln`, `saarbruecken`, `duesseldorf`). Ein getippter Ort hätte den
  vorhandenen Tag verfehlt und lautlos einen zweiten angelegt.
- `ß` hat gar keine NFD-Zerlegung und fiel komplett heraus: `Straßenfest` wurde
  `stra-enfest`, `Größere Gala` wurde `gro-ere-gala`.

Das war vorher folgenlos, weil nur der Sync Slugs erzeugte. Mit der Chip-
Oberfläche tippt Jenny sie — ab da entscheidet die Funktion über Treffer oder
Dublette. Einzige betroffene Vokabel war `jubilaum` (in keinem Inhalt
referenziert); sie wurde durch `jubilaeum` ersetzt.

⚠️ `slugifyTag()` muss **zeichengleich** zu `src/utils/tagSlug.ts` im Admin-Repo
bleiben. Beide Repos vergleichen dieselben Tags gegeneinander; eine Abweichung
trennt sie lautlos. Der Admin hat dafür einen Test, der die erwarteten Slugs
fest verdrahtet.

**Harte Prüfung:** `sync-tags` bricht ab, wenn ein Event-Slug keinen passenden
Anlass-Tag hätte — sonst fände die Event-Seite ihre Bilder nicht, und das fiele
erst live auf.

## Tags an Bildern: `slides.meta.json`

Ein `tags`-BLOCK mit allen drei Dimensionen, neben dem bestehenden `categories`
(korrigiert 2026-07-30: hier standen die drei Listen früher fälschlich auf
oberster Ebene – so liest sie niemand, `getSlidesByTag` greift auf
`metadata[key].tags[dimension]` zu):

```json
"trier/1_2-kollegen-...-weihnachtsfeier-...webp": {
  "categories": ["Schnellzeichner"],
  "tags": {
    "skills": ["schnellzeichner"],
    "events": ["firmenfeier", "weihnachtsfeier"],
    "landings": ["trier"]
  },
  "priority": 1
}
```

| Feld | Dimension | Vorbelegung |
| :-- | :-- | :-- |
| `categories` | Skill (als **Label**) | bestand schon, aus Dateinamen-Regeln; noch von den Skill-Seiten abgefragt |
| `tags.skills` | Skill (als **Slug**) | aus `categories` |
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

## Phase 5d: Reviews und FAQs (2026-07-28)

Damit wählt **jeder** Inhaltstyp über Tags aus. Details in `content-reviews.md`
und `content-faqs.md`; hier nur, was am Tag-System selbst hängt:

- **Reviews:** `reviewsForLanding` fragt `tags.landings` ab statt `review.city`.
  Parität vorher bewiesen (jedes Review trägt den Ort-Tag seines Ordners) und als
  Test festgenagelt; nach dem Build 39 Landing-Seiten gegen die Live-Seite
  verglichen – kein Autor verschwunden.
- **FAQs:** die Annahme in der Tabelle unten war **falsch**. FAQs trugen `tags`
  eben NICHT „schon immer": am 2026-07-28 gemessen hatte von 71 Dateien keine
  einzige einen Ort-Tag und nur eine einen Skill-Tag. `matchesFAQContext` las
  Tags, die es nicht gab, und die Auswahl lief zu 100 % über den Ordner. Neu:
  `scripts/sync-faq-tags.mjs` füllt sie, `matchesFAQContext` verknüpft die
  Dimensionen mit UND statt ODER, `getFAQsForContext` ersetzt das Ordner-Gate.
- **Lücke geschlossen:** `sync:tags`, `sync:reviews-tags` und `sync:faq-tags`
  liefen nur in der manuellen Vollvariante, nicht in `sync:content:safe` – also
  nicht im Vercel-Build. Ein im Admin neu angelegter Inhalt wäre ungetaggt und
  damit unsichtbar geblieben. Jetzt in beiden Ketten.

## Phase 6: KI-Tagging (2026-07-30) – vorschlagend, nicht automatisch

Gebaut, aber bewusst **nicht** als Automatik: die KI schaut sich die Fotos an und
**schlägt Tags vor**, gesetzt werden sie erst, wenn jemand in der Mediathek
bestätigt. Ein falscher Tag kippt ein Bild lautlos auf eine Seite, auf die es
nicht gehört — das fällt niemandem auf, weil dort ja Bilder stehen. Deshalb
bleibt der letzte Klick bei einem Menschen.

Was dabei am Vokabular hängt:

- Die KI bekommt das Vokabular mit und darf **nur daraus** wählen. Alles andere
  wirft der Worker weg. Sie kann also keinen Tag erfinden — und `tags.json`
  bleibt die Wahrheit.
- **Ort wird fast nie vergeben.** Ein Foto zeigt nicht, in welcher Stadt es
  entstand; verlangt wird ein lesbares Schild oder Wahrzeichen, sonst bleibt die
  Dimension leer. Der Ort kommt weiterhin aus Ablageort und Dateiname
  (`inferLandingsFromKey`), nicht aus dem Bild.
- Skill und Anlass sind das, was die Bild-Erkennung wirklich beisteuert — genau
  die zwei Dimensionen, die die Dateinamen-Regeln am schlechtesten treffen.
- Übernommene Vorschläge laufen durch denselben Weg wie das Umsortieren von
  Hand: `tags` **und** der `categories`-Spiegel werden geschrieben.

Technik, Modellwahl und Grenzen: Admin-Memory `ki-faehigkeiten-und-vision.md`
(kurz: multimodal ohne neues Modell, 8 Bilder pro Anfrage, Endpunkt schreibt nie
selbst, erst nach `npm run worker:deploy` verfügbar).

Damit ist die Phasenliste des Plans abgearbeitet. Was ausdrücklich **nicht**
gebaut wurde: ein Durchlauf über alle Bilder auf einen Knopf. Das wäre teuer,
nicht abbrechbar und würde die Prüfung durch einen Menschen zur Formsache
machen.

## Abdeckung je Inhaltstyp

| Typ | | Stand |
| :-- | --: | :-- |
| FAQs | 71 | ✅ seit 2026-07-28 vollständig getaggt (`sync-faq-tags.mjs`); 15 bewusst ohne Ort-Tag = gelten überall |
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

**Erledigt 2026-07-28.** Das Admin-Tool bietet die Tags als Chips an (Bilder und
Reviews), liest `tags.json` und kann eigene Tags anlegen (`source: "custom"`).
Siehe `admin-tool.md`.

Zwei Punkte, die dabei wichtig waren:

- Der Admin führt `categories` beim Setzen von Skill-Tags **mit**. Das bleibt
  auch nach Phase 5b nötig, aber aus einem engeren Grund: Stadt- und
  Event-Seiten fragen inzwischen Tags ab, die **Skill-Seiten** filtern die
  Slideshow aber weiter über `categories` (`[skill].astro` →
  `filteredCategories: [skillData.title]`). Ohne die Spiegelung wählt Jenny
  einen Skill und auf `/<skill>/` ändert sich nichts.
- Neue Uploads bekommen eine Startbelegung aus ihrem Ablageort (Ordner → Ort,
  `events/<slug>/` → Anlass). Ohne sie lägen sie ungetaggt herum und wären nach
  der Umstellung auf keiner Seite mehr zu sehen.

### ⚠️ `tags.json` muss COMMITTED werden (2026-07-30)

`sync-tags.mjs` läuft als `prebuild`/`predev`. Es schreibt `tags.json` damit in
den **Build-Output** – aber **nie zurück ins Repo**. Für die Website ist das
folgenlos (sie baut die Datei ja gerade neu), für das Admin-Tool nicht: **es
liest das Repo.** Steht der neue Skill/Anlass/Ort dort nicht, ist er im Admin
nicht auswählbar, obwohl die Seite längst live ist.

Genau so entstand der Fall „Aquarelle": Skill über den Admin angelegt, Seite da,
aufrufbar – in der Mediathek nicht filterbar. Wer eine Seed-Quelle per Hand
ändert, muss `npm run sync:tags` laufen lassen und das Ergebnis **committen**.

Die Admin-Seite ist ab 2026-07-30 dagegen abgesichert (Details in Admin-Memory
`mediathek-tags.md`):

- **Lesen:** der Admin mischt fehlende Seeds aus `skills.json`, `events.json` und
  `landings.md` selbst dazu – ein neuer Skill ist dort sofort wählbar.
- **Schreiben:** Quick-Add (Skill/Event/Landing), `CityManager` und die Mediathek
  schreiben den Tag mit `source` der Seed-Quelle nach `tags.json`. Der nächste
  Sync-Lauf erzeugt denselben Eintrag, es entsteht also kein Diff.

Zusätzlich kann die Mediathek Tags jetzt **mengenweise** setzen (Zieltag wählen,
Kacheln an-/abhaken) und schreibt dabei in `slides.meta.json` – bisher ging das
nur Bild für Bild im ImageManager und nur innerhalb einer Stadt.

## Bekannte Kosmetik

`sync-slides` meldet bei jedem Lauf „N bestehende Einträge aktualisiert", obwohl
die Datei bytegleich bleibt (verifiziert). Der Zähler vergleicht gegen die
normalisierte Lesefassung. Vorbestehend, harmlos, aber irreführend.
