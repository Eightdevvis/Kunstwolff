# Skills

## Quelle

`public/skills/skills.json`

```json
{
  "skills": [
    {
      "title": "Schnellzeichner",
      "link": "/schnellzeichner-karikaturist/",
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
| `title` | ja | Skill-Name **und Inhalts-Schlüssel** – siehe unten |
| `link` | nein | eigene URL; ohne sie wird sie aus `title` gebildet |
| `heroTitle` | nein | Angepasster Titel für die Hero-Sektion |
| `description` | nein | Meta-Description für SEO |

## Automatik

- **Slug** wird aus `title` gebildet, **sofern kein `link` gesetzt ist**:
  `"Schnellzeichner"` → `/schnellzeichner/`
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


## ⚠️ Ein Skill hat ZWEI Schlüssel (seit 2026-07-31)

Seit „Schnellzeichner" auf `/schnellzeichner-karikaturist/` liegt (Wunsch von
Gabriele: „Karikaturist" wird häufiger gesucht), sind Adresse und Inhalt
verschiedene Zeichenketten:

| Rolle | Woher | Beispiel | Wofür |
| :-- | :-- | :-- | :-- |
| **URL** | `skills.json.link` | `schnellzeichner-karikaturist` | Adresse, Breadcrumb, Schema, interne Links, `Landingsection.site` |
| **Inhalt** | `skillContentKey(title)` | `schnellzeichner` | Ordner und Dateien, Tags |

**Alles Inhaltliche hängt am TITEL** – nicht aus Gewohnheit, sondern weil die
Sync-Skripte es so anlegen: `sync-why.mjs` und `sync-erinnerungen.mjs` lesen
`entry.title`. Betroffen sind

- `public/img/Titelbild/<key>/` und die `categories` in `title.meta.json`
- `public/img/hero-bg/<key>-<stadt>/`
- `public/why/<key>.json`, `public/erinnerungen/<key>.json`
- die Bild-Tags (`getSlidesByTag('skills', …)`)
- die Kombitexte in `comboContent.ts` (`schnellzeichner/messe`)

**Die Verwechslung erzeugt keine Fehlermeldung.** Jeder dieser Aufrufe fällt bei
unbekanntem Schlüssel still auf Default oder Leer zurück – man bekommt eine Seite
ohne Bilder und ohne Texte und sucht die Ursache garantiert nicht in der URL.
Deshalb gibt es `skillContentKey()` in `src/utils/skills.ts` als einzige Quelle
(vorher stand dieselbe Funktion privat in `slideImages.ts`), und
`tests/skill-url-vs-inhalt.test.ts` hält beide Rollen auseinander.

`skillContentKey` schreibt Umlaute aus (`Ölmalerei` → `oelmalerei`), weil die
Sync-Skripte und `scripts/tags.mjs` das auch tun. Ohne diesen Schritt gäbe es
für denselben Skill zwei Schlüssel.

### Was die Umbenennung sonst noch berührt hat

`navigation.json`, `page-visibility.json` (34 Pfade), `SkillBanner`-Fallback,
die `linkUrl`-Felder in `public/branding|du-bist-kunst|stimmung-durch-kunst/content.json`
(die fielen erst am gebauten `dist/` auf) und `vercel.json`: die alten Adressen
werden per 301 umgeleitet, und die Wix-Ziele zeigen **direkt** auf die neue URL,
damit keine Kette entsteht.
