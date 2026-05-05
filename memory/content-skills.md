# Skills

## Quelle

`public/skills/skills.json`

```json
{
  "skills": [
    {
      "title": "Schnellzeichner",
      "heroTitle": "Live Schnellzeichner für Events",
      "description": "Schnellzeichner für Firmenfeiern, Messen & Hochzeiten..."
    },
    {
      "title": "Szenenmaler"
    }
  ]
}
```

## Felder

| Feld | Pflicht | Zweck |
| :-- | :-- | :-- |
| `title` | ja | Skill-Name, wird auch für Kategorisierung verwendet |
| `heroTitle` | nein | Angepasster Titel für die Hero-Sektion |
| `description` | nein | Meta-Description für SEO |

## Automatik

- **Slug** wird aus `title` generiert: `"Schnellzeichner"` → `/schnellzeichner/`
- **Seiten** werden automatisch generiert:
  - `/<skill>/` – Skill-Hauptseite
  - `/<skill>/<stadt>/` – Skill+Stadt-Kombi (für jede Stadt aus `landings.md`)
  - `/<skill>/<event>/` – Skill+Event-Kombi (für jeden Event aus `events.json`)
- **Skill-Bilder** kommen aus `public/img/UnsereFähigkeitenBilder/<Skill-Titel>/`. Erstes Bild alphabetisch wird verwendet.
- **Slides** werden automatisch nach Skill-Kategorie gefiltert (via `categories` in `slides.meta.json`)
- **Reviews** werden automatisch nach Skill-Kategorie gefiltert (via `categories` im Review-Frontmatter)
- **FAQs** werden automatisch nach Skill-Kategorie gefiltert (via `categories` im FAQ-Frontmatter)

## Sync-Script

`sync:skills` erstellt für jeden Skill den Bildordner `public/img/UnsereFähigkeitenBilder/<Skill-Titel>/`.

## Admin-Tool

Kann `skills.json` **nicht** verwalten – manuell per Git pflegen.
