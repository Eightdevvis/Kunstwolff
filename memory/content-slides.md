# Slides

## Ablage

```
public/img/slides/default/             # generische Slides (Fallback)
public/img/slides/<stadt>/             # stadtspezifische Slides
public/img/slides/events/<event>/      # event-spezifische Slides
public/img/slides/slides.meta.json     # Metadaten
public/img/slides/category-matching.md # optionale Zusatzregeln
```

## Erlaubte Formate

`.avif`, `.gif`, `.jpeg`, `.jpg`, `.png`, `.webp`

## Bilder hinzufügen

1. Bild in den richtigen Ordner legen
2. Committen und pushen
3. Pre-Push-Hook konvertiert automatisch zu WebP (siehe `git-hooks.md`)

## Sortierung & Priorität

- Reihenfolge wird über `priority` in `slides.meta.json` gesteuert (höhere Zahl = weiter vorne)
- Admin-Tool setzt Priority beim Upload automatisch
- Manuell hochgeladene Bilder ohne Priority werden alphabetisch ans Ende sortiert
- `sync:slides` überschreibt `priority` **nie**

## ⚠️ „Eigene Bilder einer Stadt" zählt man über TAGS, nicht über Ordner (2026-08-09)

Der häufigste Zählfehler in diesem Repo — er ist zweimal passiert und hat beide Male zu
falschen Sichtbarkeits-Entscheidungen geführt.

`getSlidesByTag('landings', slug)` wählt Bilder ausschließlich über `tags.landings` in
`slides.meta.json`. **Der Ordner entscheidet nichts** (siehe `tag-system.md`, Phase 5a) —
er ist Ablage und Upload-Ziel. Ein Bild unter `wuppertal/` kann für Wiesbaden getaggt sein
und erscheint dann dort; ein Bild unter `bw/` kann zusätzlich Stuttgart tragen.

Wer `ls public/img/slides/<stadt>/ | wc -l` zählt, misst deshalb **etwas anderes** als
das, was auf der Seite landet. Gemessen am 2026-08-09: Wiesbaden hat 5 Dateien im Ordner,
aber **16** getaggte Bilder; Karlsruhe 3 im Ordner, **17** getaggt.

Zwei brauchbare Kennzahlen:

| Frage | Zählung |
| :-- | :-- |
| „Läuft die Stadt ins Auffüllen?" | Bilder mit dem Stadt-Slug in `tags.landings` |
| „Ist die Seite inhaltlich eigenständig?" | Bilder, deren `tags.landings` **nur** diesen Slug enthält (*exklusiv*) |

Für Sichtbarkeits- und SEO-Entscheidungen zählt die **zweite** Zahl. Die erste liegt bei
allen Städten über der Schwelle und ist damit als Kriterium wertlos.

## Fallback-Logik

- Hat eine Stadt **weniger als 6 eigene Slides** (`MIN_LANDING_SLIDES = 6`), wird über
  `getDefaultSlides()` aufgefüllt. ⚠️ Das ist **nicht** der Ordner `default/`: solange
  `default-selection.json` gefüllt ist (derzeit 28 Einträge aus allen Ordnern, davon
  genau einer aus `default/`), kommen die Nachfüller aus dieser kuratierten Auswahl,
  und der Ordner wird gar nicht gelesen. Erst bei **leerer** Auswahl-Datei greift der
  alte Weg über `readFolderSlides('default')`.
- **Skill-Seiten** (`/<skill>/`) fallen aus dieser Logik heraus: sie wählen über
  `getSkillSlides()` = `getSlidesByTag('skills', skillContentKey(titel))`, also über
  `tags.skills`, ohne Auffüllen und gedeckelt auf `MAX_SKILL_SLIDES = 24`. Was darüber
  hinausgeht, ist über den Galerie-Link erreichbar.
- Liegen `foto.jpg` und `foto.webp` im selben Ordner: nur `.webp` wird angezeigt (Deduplication)

### ⚠️ Auf Skill×Stadt-Seiten wird ZUERST gefiltert, dann aufgefüllt (2026-07-30)

`getSkillSlidesForCity()` in `slideImages.ts` — nicht mehr
`supplementWithDefaultSlides` direkt. Die Reihenfolge ist der ganze Punkt:

Vorher lief das Auffüllen zuerst und `Slideshow.astro` filterte danach über
`filteredCategories`. Da **93 von 232** Slides und **11 von 30** Auswahl-Slides
gar keine `categories` tragen, wurden die Nachfüller gleich wieder aussortiert.
Gemessen: **38 von 105** Skill×Stadt-Seiten mit leerer Galerie. Karlsruhe hatte
7 eigene Bilder, kam damit über die Schwelle (also kein Auffüllen), und der
Filter warf danach alle 7 weg — obwohl 115 Schnellzeichner-Bilder im Repo liegen.

Nach dem Umbau am gebauten `dist/` gegengeprüft: **0 leere Galerie-Sektionen**,
`schnellzeichner/karlsruhe|neunkirchen|fulda` von 0 auf je 6 Bilder. Die 39
verbliebenen Seiten ohne Bilder sind alle `aquarelle/*` — dort trägt kein
einziges Bild den Skill, das ist Redaktionsstand, kein Rendering-Fehler
(B3 in `reports/tagsystem-audit-2026-07-30.md`).

`matchesSkill()` hält die Prüfung zeichengleich zu der in `Slideshow.astro`:
Label-Vergleich über `categories`, ein Bild ohne `categories` passt zu keinem
Skill. Dass die Skill-Dimension überhaupt über Labels statt über `tags.skills`
läuft, ist ein eigener offener Punkt (B6 im selben Report).

**Leer-Guards:** `Slideshow.astro` und `MiniReviews.astro` rendern nichts mehr,
wenn nach dem Filtern 0 Einträge übrig sind. Vorher stand die Überschrift
„Unsere Kunst" über dem Nichts, und im Hero ein leerer Bewertungs-Rahmen
(`SkillHero.astro` prüft gegen die **ungefilterte** Liste).

## Bildunterschrift: nur `title`, kein Rückfall auf `alt` (2026-07-31)

Die Lightbox zeigte `slide.title || slide.alt`. Der Alt-Text wird aus dem
**Dateinamen** gebaut (`normalizeAlt`: Endung weg, führende Nummer samt folgendem
`_`/`-` weg, Unterstriche **und Bindestriche** zu Leerzeichen) — unter den Bildern
stand also technischer Kram wie
„2 kollegen weihnachtsfeier trier".

Jetzt zeigt sie **ausschließlich** den gepflegten `title` aus `slides.meta.json`.
Ohne Titel gibt es **keine** Unterschrift. Der Alt-Text bleibt am `<img>` und
damit für Screenreader erhalten — er ist nur nicht mehr sichtbar.

Gepflegt wird der Titel **in der Mediathek des Admin-Tools** (Bild anklicken →
Feld „Bildunterschrift"), auch für längst vorhandene Bilder; leeres Feld
entfernt ihn. Details: Admin-Memory `mediathek-tags.md`.

Stand beim Umbau: 85 von 232 Bildern hatten bereits einen echten Titel.
Festgehalten in `tests/lightbox-caption.test.ts` — die Regel rutscht sonst leicht
zurück.

## ⚠️ `lazy` allein reicht in einem Karussell nicht (2026-08-16)

Alle Slides tragen `loading="lazy"` – richtig, es sind bis zu 24 Bilder à
~55 KB, die niemand alle ansieht. In einem Karussell heisst das aber „lade das
Bild in dem Moment, in dem es hereinfährt". Der Autoplay wechselt alle 2,5 s,
der Browser fängt also erst dann an; bis die Datei da ist, steht die Bühne
schwarz (`.swiper-slide { background: #000 }`).

Das war die gemeldete „langsame" Slideshow – **kein Bandbreiten-, sondern ein
Zeitpunktproblem**: das Bild wird zu spät angefordert, nicht zu langsam
geliefert. Wer hier misst, schaut deshalb auf den Startzeitpunkt der Anfrage,
nicht auf die Dateigrösse.

Gegenmittel in `Slideshow.astro`: ein **rollendes Vorladefenster**. Es öffnet
per `IntersectionObserver` (`rootMargin: 400px`), gibt die ersten 3 Slides frei
und läuft danach bei jedem `slideChange` dem Autoplay um 3 Slides voraus.
Freigeben heisst: `loading` von `lazy` auf `eager` setzen – das startet den
Ladevorgang sofort. `src` wird bewusst NICHT angefasst, ein neu gesetztes `src`
würde von vorn beginnen. Der Index kommt aus `realIndex`, nicht `activeIndex`:
im Loop-Modus zählt letzterer die verschobenen Slides mit.

Warum nicht gleich beim Skriptstart: die Slideshow steht fast immer unterhalb
des ersten Bildschirms – vier Slides würden sonst mit dem **Titelbild** um die
Leitung streiten.

Der zweite Teil derselben Meldung lag gar nicht bei den Slides, sondern bei den
Referenzlogos (`content-referenzlogos.md`): 342 KB `eager` weit oben auf der
Seite, vor allem, was die Slideshow `lazy` anfordert.

## Lightbox

Eigene Implementierung (kein externes Package):
- **Desktop:** Klick zoomt auf 2.5×, Doppelklick / Klick im Zoom setzt zurück, Drag verschiebt
- **Mobile:** Pinch-Zoom (1–4×), Swipe navigiert (wenn nicht gezoomt)
- **Tastatur:** Pfeiltasten navigieren, ESC schließt

**Seit 2026-07-30 geteilt** (vorher inline im `<script>` von `Slideshow.astro`):

| Datei | Inhalt |
| :-- | :-- |
| `src/scripts/lightbox.ts` | Logik, exportiert `openLightbox(slides, idx)` |
| `src/styles/lightbox.css` | Styles, per `@import` in `global.css` – also auf **jeder** Seite |

Grund für den Umzug: die Galerie (`content-galerie.md`) ist ein **zweiter**
Aufrufer. Zwei Kopien derselben ~200 Zeilen wären bei der nächsten Änderung
auseinandergelaufen – Fix in der einen Bühne, unbemerkt fehlend in der anderen.

⚠️ Das CSS **muss** global liegen, nicht als `<style is:global>` in
`Slideshow.astro`: ein Komponenten-Style wird nur ausgeliefert, wenn die
Komponente auf der Seite vorkommt. Auf `/galerie/` gibt es keine Slideshow – die
Lightbox wäre dort ohne Backdrop und Positionierung aufgegangen.

Das DOM (`#kw-lightbox`) injiziert das Skript einmal pro Seite in `<body>`, beide
Aufrufer nutzen dasselbe Element.

## Alle Slides samt Tags

`getAllSlidesWithTags()` in `src/utils/slideImages.ts` liefert den **gesamten**
Bestand, jeden Slide mit Metadaten-Key und Tag-Block, sortiert nach `priority`
und Pfad. `enabled: false` bleibt ausgesiebt. Grundlage der Galerie – Details
dort.

## Metadaten: `slides.meta.json`

```json
{
  "berlin/event.jpg": {
    "categories": ["Schnellzeichner"],
    "altOverride": "Live-Karikaturen in Berlin",
    "title": "Firmenevent Berlin 2024",
    "priority": 120,
    "enabled": true
  }
}
```

| Feld | Typ | Zweck |
| :-- | :-- | :-- |
| `categories` | array | Skill-Filter (z.B. für Schnellzeichner-Slideshow) = **Skill-Dimension** des Tag-Systems |
| `tags.events` | array | **Anlass-Dimension** (Slugs, z.B. `["firmenfeier","weihnachtsfeier"]`) – siehe `tag-system.md` |
| `tags.landings` | array | **Ort-Dimension** (Slugs, z.B. `["hessen","frankfurt"]`) – siehe `tag-system.md` |
| `altOverride` | string | Alt-Text für `<img>` (Accessibility + Google Bild-SEO) |
| `title` | string | Bildunterschrift in der Lightbox. **Kein Fallback mehr** (seit 2026-07-31): ohne `title` keine Unterschrift — der frühere Rückfall auf den Alt-Text zeigte den Dateinamen. Pflege in der Mediathek. |
| `priority` | number | Sortierreihenfolge, höher = weiter vorne |
| `enabled` | boolean | `false` blendet Bild aus |

**Key-Format für Events:** `events/<slug>/dateiname.webp`

⚠️ Dieses Format war bis 2026-07-26 **reine Theorie**: `getImageKeys()` ging nur
eine Ebene tief, `slides/events/` enthält aber nur Unterordner. Die 18
Event-Slides hatten deshalb nie einen Eintrag – keine Skill-Tags, keine
Alt-Texte, keine Priorität. Seit dem rekursiven Walk (`MAX_DEPTH = 2`) sind sie
erfasst: 194 → 234 Einträge.

## Kategorie-Matching

Datei: `public/img/slides/category-matching.md`

**Automatische Basis:** Keywords werden automatisch aus den vorhandenen Skills in `public/skills/` erzeugt (Skill-Name + Skill-Slug).

**Optionale Zusatzregeln:**

```md
Regeln:
- Schnellzeichner: karikatur, caricature
- Szenenmaler: speedpainting, eventmaler
```

**Hinweise:**
- Diese Regeln **ergänzen** nur die automatisch erzeugten Skill-Keywords
- Bei inhaltlicher Umbenennung (anderer Dateiname/Keywords) kann neu zugeordnet werden
- Bei reiner Prefix-/Nummern-Änderung bleibt die Zuordnung erhalten

## Automatik

- Neue Bilder bekommen automatisch einen Metadaten-Eintrag
- Kategorien werden beim ersten Anlegen via Dateiname-Regeln vorbelegt
- Bei klarer Umbenennung werden Metadaten auf den neuen Dateinamen migriert

## ⚠️ Ordnerschlüssel sind verschachtelt — niemals am Stück kodieren

Die Schlüssel sind teils zweistufig: `events/hochzeit`, `mediathek/somfot`.
`encodeURIComponent` über den **ganzen** Schlüssel macht aus dem Trenner `%2F`,
und das ist laut RFC 3986 **kein** Pfadtrenner, sondern ein Zeichen im Segment.
Die Adresse trifft dann keine Datei mehr.

Am 2026-08-01 lief genau das in `slideImages.ts`: **141 Bild-Adressen** kaputt,
unter anderem auf `/galerie/`, `/hochzeit/`, `/messe/`, `/firmenfeier/`.
Nachgemessen gegen den statischen Server: korrekter Pfad `200`, die Form aus dem
HTML `500`.

**Warum es lange niemandem auffiel:** die Dateien existieren ja — nur der Weg
dorthin war falsch geschrieben. `validate-image-refs.mjs` prüft die Verweise in
den *Quellen*, nicht die *erzeugte* Adresse, und meldete „alle gültig".
Seither kodiert `encodePathSegment` jeden Teil einzeln (auch in `skills.ts`,
`events.ts`, `heroBg.ts`, wo es bisher nur latent war).
Festgehalten in `tests/bild-adressen.test.ts`.

**Wenn du Bild-Adressen anfasst:** verlass dich nicht auf die Verweis-Prüfung,
sondern ruf sie gegen `dist/` per HTTP ab. Nur das misst, was der Browser bekommt.


## ⚠️ Der Feldname `alt` ist eine Falle (2026-08-18)

Das Admin-Tool schrieb den Alt-Text jahrelang in das Feld **`alt`**.
`slideImages.ts` und `services/mediaLibrary.ts` im Admin lasen es beide als
Alias – aber `sync-slides-metadata.mjs` übernimmt beim Neuschreiben nur eine
**feste Feldliste** (`categories, tags, altOverride, title, priority, enabled`),
und `alt` stand nicht darauf.

Ergebnis: Jeder im Admin getippte Alt-Text wurde beim **nächsten lokalen Commit
im Website-Repo** vom pre-commit-Hook gelöscht. Danach zeigten Website und Admin
den maschinellen `altOverride` aus `migrate-slide-meta.mjs` – für die Betreiberin
sah das aus, als hätten „alle Bilder automatische Namen bekommen".

**Das Tückische war der Zeitversatz.** Kaputt ging es nicht beim Tippen, sondern
irgendwann später, wenn irgendwer committete. Deshalb wirkte es willkürlich.

Nachgemessen am 2026-08-18: 81 von 273 Einträgen hatten einen `altOverride`, und
**alle 81 waren byte-identisch mit der Ableitung aus dem Dateinamen** – also
komplett maschinell. Von Hand geschriebene Alt-Texte: null. Aus der Dateihistorie
(168 Commits über `slides.meta.json`) ließen sich 23 zurückholen,
2 waren endgültig weg, weil es ihre Bilder nicht mehr gibt.

**Reparatur:**
- `sync-slides-metadata.mjs` hebt `alt` jetzt über `altAus()` auf `altOverride`
  statt es wegzuwerfen – Altbestand heilt sich beim ersten Lauf selbst.
- Das Admin-Tool schreibt nur noch `altOverride` und räumt `alt` dabei weg.
- `scripts/alt-texte-zurueckholen.mjs` holt die verlorenen Texte zurück
  (Trockenlauf ohne Argument, `--schreiben` übernimmt).
- Festgehalten in `tests/sync-slides-alt.test.ts` und, auf der Admin-Seite,
  in `src/services/mediaLibrary.alttext.test.ts`.

**Regel für die Zukunft:** Wer ein Feld in `slides.meta.json` einführt, trägt es
in dieselbe Feldliste im Sync ein – sonst ist es beim nächsten Commit weg, und
zwar lautlos. Ein Feld nur lesen zu können heißt nicht, dass es überlebt.


## Maschinentext ist kein Inhalt (2026-08-18)

`migrate-slide-meta.mjs` ist **gelöscht**. Es hatte 67 `altOverride` geschrieben,
die byte-identisch mit der Ableitung aus dem Dateinamen waren, und 86 Titel nach
Schablone (`{Skill} {Stadt}`). Beide Sorten stehen in derselben Datei neben
25 von Hand geschriebenen Texten und sind von außen nicht zu unterscheiden.

Der Schaden ist nicht der Text selbst – die Website hätte denselben ohnehin
gebaut. Der Schaden ist, dass ein gefülltes Feld **behauptet**, hier habe jemand
etwas gepflegt. Damit fallen genau die Bilder aus dem Blick, die einen echten
Alt-Text am nötigsten hätten.

Die Werte bleiben bewusst in der Datei (nichts gelöscht, kein Risiko). Das
Admin-Tool erkennt sie über `utils/altHerkunft.ts` und zeigt sie **grau als
Platzhalter** statt als Feldinhalt – das Feld sieht leer aus, weil es leer ist.
Auch der KI-Alt-Text-Vorschlag überschreibt einen Maschinentext, aber niemals
einen handgeschriebenen.

**Regel:** Schreib nie einen abgeleiteten Wert in ein Feld, das für gepflegte
Inhalte gedacht ist. Die Ableitung gehört in die Anzeige, nicht in die Daten –
sonst kann später niemand mehr sagen, was ein Mensch gemeint hat.
