# Events

## Quellen

```
public/events/events.json              # Event-Registry
public/events/<slug>/content.json      # Per-Event-Content
public/img/slides/events/<slug>/       # Event-Slides
public/img/Titelbild/events/<slug>/    # Event-Titelbilder
```

## Event-Registry: `events.json`

```json
{
  "events": [
    {
      "title": "Firmenfeier",
      "slug": "firmenfeier",
      "heroTitle": "Live-Kunst auf Ihrer Firmenfeier",
      "description": "Professionelle Eventkünstler für Corporate Events...",
      "categories": ["Schnellzeichner", "Szenenmaler"]
    }
  ]
}
```

## Workflow: Neuen Event hinzufügen

1. Eintrag in `public/events/events.json` (`title`, `slug`, `heroTitle`, `description`, `categories`)
2. `npm run sync:events` (oder `npm run dev`)
   - Erstellt: `public/img/slides/events/<slug>/`, `public/img/Titelbild/events/<slug>/`, `public/events/<slug>/content.json`
3. Bilder hochladen: Slides nach `public/img/slides/events/<slug>/`, Titelbild nach `public/img/Titelbild/events/<slug>/`
4. Content anpassen in `public/events/<slug>/content.json`

## Generierte Seiten

- `/<slug>/` – Standalone Event-Seite (z.B. `/firmenfeier/`)
- `/<skill>/<slug>/` – Skill+Event-Kombi (für alle Skills, z.B. `/schnellzeichner/firmenfeier/`)

**Routing-Detail:** Event-Slugs teilen den Route-Slot `[landing]` mit Stadt-Slugs. `getStaticPaths()` differenziert via `pageType: 'event' | 'landing'` Prop. Siehe `routing.md`.

## Per-Event-Content: `content.json`

Jede Sektion hat ein `enabled`-Flag. Vollständiges Format:

```json
{
  "ablauf": {
    "enabled": true,
    "title": "So läuft Ihre Firmenfeier mit uns ab",
    "steps": [
      { "title": "Anfrage & Briefing", "text": "...", "icon": "chat" }
    ]
  },
  "pakete": {
    "enabled": true,
    "title": "Unsere Pakete für Ihre Firmenfeier",
    "items": [
      {
        "title": "Starter",
        "duration": "2 Stunden",
        "price": "Auf Anfrage",
        "features": ["1 Künstler", "Live-Karikaturen", "Material inklusive"]
      }
    ]
  },
  "skills": {
    "enabled": true,
    "title": "Passende Künstler für Ihre Firmenfeier"
  },
  "referenzen": {
    "enabled": false,
    "title": "Unternehmen die uns bereits gebucht haben",
    "text": "",
    "logos": [{ "src": "/img/partners/logo.webp", "alt": "Firmenname" }]
  }
}
```

## Feld-Referenz

| Sektion | Feld | Typ | Pflicht | Beschreibung |
| :-- | :-- | :-- | :-- | :-- |
| `ablauf.steps[]` | `title` | string | ja | Schritt-Überschrift |
| | `text` | string | ja | Beschreibungstext |
| | `icon` | string | nein | `chat`, `setup`, `star`, `gift` |
| `pakete.items[]` | `title` | string | ja | Paketname (z.B. "Starter", "Event", "Premium") |
| | `duration` | string | ja | Zeitangabe |
| | `price` | string | ja | Preis |
| | `features` | string[] | ja | Feature-Liste |
| `skills` | `title` | string | nein | Skills werden automatisch aus `events.json` `categories` gelesen |
| `referenzen` | `text` | string | nein | Freitext über Referenzen |
| | `logos[]` | array | nein | `{ src, alt }` |

## Bilder

- **Slides:** `public/img/slides/events/<slug>/` (separater Namespace, nicht mit Stadtslides vermischt)
- **Titelbild:** `public/img/Titelbild/events/<slug>/`
- **Metadaten:** Gleiche `slides.meta.json` wie Stadtslides. Key-Format: `events/<slug>/dateiname.webp`

## Event entfernen

- Eintrag aus `events.json` löschen
- Ordner manuell löschen: `public/events/<slug>/`, `public/img/slides/events/<slug>/`, `public/img/Titelbild/events/<slug>/`

## Sync-Script

`sync:events` erstellt Ordner und default `content.json` – **bestehende `content.json` wird NIE überschrieben.**

## Admin-Tool

Kann Events **nicht** verwalten (geplant).
