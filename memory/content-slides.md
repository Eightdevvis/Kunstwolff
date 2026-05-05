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

## Fallback-Logik

- Hat eine Stadt **weniger als 6 eigene Slides**, werden Slides aus `default/` ergänzt
- Liegen `foto.jpg` und `foto.webp` im selben Ordner: nur `.webp` wird angezeigt (Deduplication)

## Lightbox

Eigene Implementierung (kein externes Package):
- **Desktop:** Klick zoomt auf 2.5×, Doppelklick / Klick im Zoom setzt zurück, Drag verschiebt
- **Mobile:** Pinch-Zoom (1–4×), Swipe navigiert (wenn nicht gezoomt)
- **Tastatur:** Pfeiltasten navigieren, ESC schließt

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
| `categories` | array | Skill-Filter (z.B. für Schnellzeichner-Slideshow) |
| `altOverride` | string | Alt-Text für `<img>` (Accessibility + Google Bild-SEO) |
| `title` | string | Anzeigetitel in Lightbox-Caption (unabhängig von altOverride; Fallback: altOverride) |
| `priority` | number | Sortierreihenfolge, höher = weiter vorne |
| `enabled` | boolean | `false` blendet Bild aus |

**Key-Format für Events:** `events/<slug>/dateiname.webp`

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
