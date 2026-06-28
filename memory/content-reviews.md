# Reviews

## Ablage

```
public/reviews/_vorlage.md              # Vorlage
public/reviews/default/*.md             # generische Reviews (Fallback)
public/reviews/<stadt>/*.md             # stadtspezifische Reviews
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

`src/components/reviews-references/MiniReviews.astro` zeigt immer **einen** Review als
Slide; alle Slides liegen absolut übereinander im `.review-track`. **Die Track-Höhe wird per
JS auf das aktive Review gesetzt** (`syncHeight()` → `track.style.height`) und per CSS weich
animiert (`transition: height`). Grund: bei `HomepageReviews` liegen ALLE ~45 Reviews drin –
ein Grid-Stack (Höhe = höchstes Review) erzeugte ein riesiges schwarzes Blank-Band. Jetzt
kompakt + kein harter Sprung. `syncHeight` läuft initial, bei `document.fonts.ready`, bei
`resize` und nach jedem Slide-Wechsel.

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
