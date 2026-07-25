# Reviews

## Ablage

```
public/reviews/_vorlage.md              # Vorlage
public/reviews/<stadt>/*.md             # stadtspezifische Reviews
# 'default' bleibt als Fallback-Stadt-Key im Code unterstützt (Ordnername ODER
# city:-Frontmatter), aktuell existiert aber KEIN public/reviews/default/-Ordner.
```

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

## Fallback-Logik

- Die Website zeigt **mindestens 7 Reviews** pro Seite
- Reihenfolge der Quellen:
  1. Stadt-Reviews
  2. `default/`-Reviews
  3. Reviews anderer Städte (alphabetisch zirkulär um die aktuelle Stadt)

## Filter

Auf Skill-Seiten werden nur Reviews mit passender `categories` angezeigt.

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
