# Why-Sektion

Die Why-Sektion zeigt 4 Benefit-Blöcke (Titel, Text, Bild) auf jeder Landing-/Skill-Seite.

## Ablage

```
public/why/default.json
public/why/<stadt>.json                 # auto von sync:why
public/why/<skill>.json                 # auto von sync:why
public/why/<skill>-<stadt>.json         # manuell für spezifischste Variante

public/img/why/<key>/benefit-{1-4}/     # Bilder, key = <stadt> ODER <skill>
```

## Auflösung in `why.ts` (Priorität absteigend)

1. `{skill}-{stadt}.json` – z.B. `schnellzeichner-berlin.json`
2. `{stadt}.json` – z.B. `berlin.json`
3. `{skill}.json` – z.B. `schnellzeichner.json`
4. `default.json` – globaler Fallback

## JSON-Format

```json
{
  "benefits": [
    {
      "title": "Echte Künstler - keine Agentur",
      "text": "Sie buchen uns direkt ...",
      "image": "/img/why/berlin/benefit-1/sample1.jpeg",
      "alt": "Live Künstler von Kunstwolff beim Zeichnen"
    }
  ]
}
```

## Felder pro Benefit

| Feld | Zweck |
| :-- | :-- |
| `title` | Überschrift des Benefit-Blocks |
| `text` | Beschreibungstext |
| `image` | Pfad zum Bild relativ zu `public/` |
| `alt` | Alt-Text des Bildes (SEO) |

## Bilder

`public/img/why/<key>/benefit-{1-4}/` – Pro Key gibt es 4 Benefit-Ordner. Einfach ein Bild in den jeweiligen Ordner legen. Der `image`-Pfad in der JSON zeigt darauf.

## Sync-Script

`sync:why` erstellt automatisch:
- `{stadt}.json` für alle Städte aus `landings.md`
- `{skill}.json` für alle Skills aus `skills.json`
- `public/img/why/<key>/benefit-{1-4}/` Ordner

Basis: `default.json`. Die generierten Stadt-/Skill-Dateien enthalten **leere Felder** (`title`/`text`/`image`/`alt`); die Website merged fehlende Felder zur Laufzeit aus `default.json` (`why.ts`). Eigene Bilder/Texte entstehen nur durch Admin-Überschreibung. Manuell anlegen muss man nur `{skill}-{stadt}.json` Kombis.

## Admin-Tool

- Der Why-Editor (`ImageManager`, `editorType: 'why'`) verwaltet **Bilder UND Texte**.
- **Bilder** landen unter `public/img/why/<city>/benefit-{1-4}/`.
- **Texte** (`title`/`text`/`alt`) schreibt `saveWhyBenefits()` als Per-Feld-Overrides nach `public/why/<city>.json` (Commit `admin: Why-Texte aktualisiert (<city>)`). Nicht-überschriebene Felder bleiben leer und werden von der Website aus `default.json` gemerged.
