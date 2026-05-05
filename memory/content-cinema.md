# CinemaWelcome (Startseiten-Orbit)

Die CinemaWelcome-Komponente auf der Startseite besteht aus einem Intro-Block + 3 Orbit-Sektionen, jeweils mit großem Hauptkreis und 1–6 Satelliten-Kreisen.

## Quelle

`public/cinema/cinema.json`

## Struktur

```json
{
  "intro": {
    "title": "Willkommen",
    "subtitle": "Erzählen Sie uns doch etwas über sich."
  },
  "sections": [
    {
      "title": "Ihr Event",
      "subtitle": "auf welches Event dürfen wir Sie begleiten?",
      "mainCircle": {
        "image": "/img/pfad/zum/bild.webp",
        "alt": "Alt-Text",
        "hint": "Entdecken"
      },
      "satellites": [
        {
          "title": "Schnellzeichner",
          "image": "/img/slides/default/1_schnellzeichner_hq.webp",
          "link": "/schnellzeichner/",
          "alt": "Live Schnellzeichner für Events"
        }
      ]
    }
  ]
}
```

## Felder

| Ebene | Feld | Pflicht | Beschreibung |
| :-- | :-- | :-- | :-- |
| `intro` | `title` | ja | Titel Willkommen-Block (Mayonice-Font) |
| `intro` | `subtitle` | ja | Untertitel Willkommen-Block |
| `sections[]` | `title` | ja | Sektions-Überschrift (h2, Mayonice-Font) |
| `sections[]` | `subtitle` | ja | Sektions-Untertitel |
| `mainCircle` | `image` | ja | Pfad zum Bild des großen Kreises (relativ zu `public/`) |
| `mainCircle` | `alt` | ja | Alt-Text Hauptkreis |
| `mainCircle` | `hint` | nein | Text bei Hover (Default: "Entdecken") |
| `satellites[]` | `title` | ja | Label-Text (erscheint bei Hover) |
| `satellites[]` | `image` | ja | Pfad zum Bild |
| `satellites[]` | `link` | ja | Ziel-URL beim Klick |
| `satellites[]` | `alt` | nein | Alt-Text (Fallback: `title`) |

## Regeln

- `sections` muss **genau 3 Einträge** haben
- Pro Sektion: **1–6 Satelliten** (CSS-Layout-Limit)
- Hauptkreis (`mainCircle`) kann nicht entfernt werden – nur Bild/Alt/Hint editierbar
- Layout (welche Sektion reversed ist, Positionierung) ist im Code fest – nicht in der JSON

## Technische Details

- Geladen von `src/utils/cinema.ts` (`getCinemaData()`) zur Build-Zeit
- Verwendet in `src/components/CinemaWelcome.astro`
- **Robuste Validierung:** bei fehlender/kaputter JSON greift automatisch ein Fallback (Schnellzeichner + Szenenmaler)
- **Kein Sync-Script** nötig – Datei wird direkt gelesen

## Admin-Tool

Kann `cinema.json` **nicht** verwalten (geplant).
