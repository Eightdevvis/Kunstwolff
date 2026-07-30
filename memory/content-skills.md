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

**Kann Skills ANLEGEN** (Quick-Add im `Dashboard.tsx`, Commit
`admin: Skills aktualisiert – skills.json`). Der frühere Satz „kann `skills.json`
nicht verwalten" war überholt. Was weiterhin fehlt: Umbenennen, Löschen,
Sortieren – dafür bleibt manuelle Git-Pflege.

⚠️ **Ein neuer Skill braucht ZWEI Dateien**, sonst ist er nur halb da:

| Datei | ohne sie |
| :-- | :-- |
| `public/skills/skills.json` | keine Seite |
| `public/config/tags.json` (Dimension `skills`) | Seite existiert, aber in der Mediathek nicht filterbar und kein Bild zuordenbar |

Genau das ist am 2026-07-30 mit „Aquarelle" passiert. Der Grund ist eine Falle,
die für **jede** Seed-Quelle gilt (`skills.json`, `events.json`, `landings.md`):
`sync-tags.mjs` läuft als `prebuild` und schreibt `tags.json` nur in den
**Build-Output**, nie zurück ins Repo – **und das Admin-Tool liest das Repo.**
Wer eine Seed-Quelle per Hand ändert, muss `npm run sync:tags` laufen lassen und
das Ergebnis **committen**. Der Admin schreibt den Tag seit 2026-07-30 selbst mit
(`createTag`) und mischt fehlende Seeds beim Lesen dazu; Details in
Admin-Memory `mediathek-tags.md`.

Wichtig beim Umbenennen eines Skills: Bilder tragen den **Slug** in
`tags.skills`, aber das **Label** in `categories` – beides muss mitgezogen
werden.
