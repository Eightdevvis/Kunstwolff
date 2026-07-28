# Reviews

## Ablage

```
public/reviews/_vorlage.md              # Vorlage (wird beim Einlesen übersprungen)
public/reviews/<stadt>/*.md             # Reviews, nach Stadt abgelegt
```

**Der Ordner entscheidet seit 2026-07-28 nichts mehr.** Er liefert beim Anlegen den
Ort-Tag (`scripts/sync-reviews-tags.mjs`), danach ist er reine Ablage – die Auswahl läuft
über `tags.landings`. Ein Review kann damit an **mehreren** Städten hängen, ohne als
Kopie zweimal im Repo zu liegen (gleiche Umstellung wie bei Bildern und FAQs).

Einen `public/reviews/default/`-Ordner gibt es nicht und gab es nie – der alte
Default-Zweig im Code lief also ins Leere und die Auffüllung sprang direkt zu fremden
Städten. „Allgemein" heißt jetzt: **kein** Ort-Tag.

## Format

```md
---
author: "Max Mustermann"
categories:
  - Schnellzeichner
rating: 5
---
Das war ein großartiges Event.
```

## Frontmatter-Felder

| Feld | Pflicht | Zweck |
| :-- | :-- | :-- |
| `author` | ja | Name des Reviewers |
| `categories` | nein | Skill-Filter (Array) |
| `rating` | nein | Sterne-Bewertung |
| `city` | nein | Überschreibt den Ordnernamen (Stadt-Zuordnung) |

**Body:** Der Review-Text – Pflicht.

## Auswahl- und Auffüll-Logik (`reviewsForLanding`, `src/utils/reviews.ts`)

- Die Website zeigt **mindestens 7 Reviews** pro Seite
- Reihenfolge der Quellen:
  1. Reviews mit passendem **`tags.landings`** (früher: passender Ordner)
  2. Reviews **ohne** Ort-Tag (= allgemein; ersetzt den nie existierenden `default/`-Ordner)
  3. Reviews anderer Orte (alphabetisch zirkulär um den aktuellen Ort, aus den
     **vergebenen Ort-Tags** statt aus den Ordnernamen – sonst käme ein Ort, den es nur
     per Tag gibt, in der Auffüllung nie vor)

## Filter

Auf Skill-Seiten zählen `categories` **oder** `tags.skills`. Beide zu prüfen kostet nichts
und verhindert, dass ein Review durchfällt, dessen Tag-Block noch fehlt.

## Warum die Umstellung nichts verlieren konnte

Vorher gemessen und als Test festgehalten (`tests/content-tags.test.ts`): **alle 38 Reviews**
tragen den Ort-Tag ihres Ordners, keine Datei weicht ab. Die Tag-Auswahl ist damit eine
Obermenge der Ordner-Auswahl. Zusätzlich nach dem Build geprüft: über **39 Landing-Seiten**
`dist` gegen die Live-Seite verglichen – kein einziger Review-Autor verschwunden.

(Die früher notierten „74 Review-Dateien" waren inklusive 36 `_vorlage.md`; echte Reviews: 38.)

## Anzeige (MiniReviews.astro)

`src/components/reviews-references/MiniReviews.astro` zeigt immer genau **einen** Review als
Slide: Das aktive `.review-slide` ist `display:flex` (`.is-active`), alle anderen sind
`display:none` und nehmen keinen Platz weg (kein absolutes Stapeln). Die Höhe ergibt sich
allein aus dem sichtbaren Review im normalen Fluss – **kein JS-Höhenmessen, kein
`track.style.height`, keine `transition: height`**. `.review-track` hat nur `width:100%`.
Slide-Wechsel togglet lediglich die `is-active`-Klasse (mit `review-fade-in`-Opacity-Animation),
`applyReviewTheme` (Hell/Dunkel aus dem Hintergrund) läuft initial und bei `resize`.

**Seit Umbau: manuelles Durchklicken, KEIN Autoplay mehr** (vorher `setInterval` alle 4,5 s).
Steuerung pro Rotator via zwei Pfeilen (`.review-prev`/`.review-next`, direkt unter dem Review)
und Pfeiltasten links/rechts. Bewusst **keine** Positions-Punkte/Dots. Das `<script>` ist Astro-hoisted (läuft einmal global) und
iteriert über alle `[data-review-rotator]` – Controls sind pro Rotator gescoped. Bei ≤1 Slide
werden keine Controls gerendert (`filteredItems.length > 1`). Theme (hell/dunkel) wird weiter
automatisch aus dem Hintergrund abgeleitet (`data-review-theme`).

## Admin-Tool

ReviewManager schreibt nach `public/reviews/<city>/review*.md`. Der Manager zeigt seit dem
Umbau eine **Erklär-Infobox** (sky-farben), die die Fallback-/Auffüll-Logik im UI sichtbar
macht (vorher null Kontext beim leeren `default`-Streifen).
