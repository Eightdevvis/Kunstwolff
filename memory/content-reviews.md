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

## Admin-Tool

ReviewManager schreibt nach `public/reviews/<city>/review*.md`.
