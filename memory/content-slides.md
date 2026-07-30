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
| `title` | string | Anzeigetitel in Lightbox-Caption (unabhängig von altOverride; Fallback: altOverride) |
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
