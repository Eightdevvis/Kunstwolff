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
      "image": "/img/slides/events/firmenfeier/walking-act-company-party-mainz.webp",
      "heroTitle": "Live-Kunst auf Ihrer Firmenfeier",
      "description": "Professionelle Eventkünstler für Corporate Events...",
      "categories": ["Schnellzeichner", "Szenenmaler"]
    }
  ]
}
```

## Workflow: Neuen Event hinzufügen

1. Eintrag in `public/events/events.json` (`title`, `slug`, `heroTitle`, `description`, `categories`, optional `image`)
   - `image` (optional): Pfad zum Hero-/Vorschaubild. Fehlt es, nimmt die Website automatisch das erste Slide bzw. Titelbild (`image = events.json ?? erstes Slide ?? Titelbild`, s. `Eventtypes.astro`).
2. `npm run sync:events` (oder `npm run dev`)
   - Erstellt: `public/img/slides/events/<slug>/`, `public/img/Titelbild/events/<slug>/`, `public/events/<slug>/content.json`
3. Bilder hochladen: Slides nach `public/img/slides/events/<slug>/`, Titelbild nach `public/img/Titelbild/events/<slug>/`
4. Content anpassen in `public/events/<slug>/content.json`

## Generierte Seiten

- `/<slug>/` – Standalone Event-Seite (z.B. `/firmenfeier/`)
- `/<skill>/<slug>/` – Skill+Event-Kombi (für alle Skills, z.B. `/schnellzeichner-karikaturist/firmenfeier/`).
  `<skill>` ist hier der **Adress-Slug** aus `skills.json.link`; die Kombitexte in
  `comboContent.ts` liegen dagegen unter dem Inhalts-Schlüssel (`schnellzeichner/messe`).
  Anlass-Kombis sind **weiterhin hierarchisch** – nur die Ort-Kombis wurden 2026-08-01
  auf die flache Form umgestellt (`routing.md`).

  ⚠️ Die Kombiseite ist **nicht** „Event-Seite plus Skill": Ablauf, Pakete und
  Referenzen erscheinen dort bewusst **nicht** (Duplicate Content). Statt dessen
  `comboLead` (LandingIntro mit `combo.lead`), `comboBenefits` und ein `eventTeaser`,
  der auf `/<slug>/` verlinkt. Gemeinsam sind nur eventHero, slideshow, eventSkills,
  faq und contact.

**Routing-Detail:** Event-Slugs teilen den Route-Slot `[landing]` mit Stadt-Slugs. `getStaticPaths()` differenziert via `pageType: 'event' | 'landing'` Prop. Siehe `routing.md`.

## Sektions-Stack

Welche Sektionen eine Event-Seite in welcher Reihenfolge zeigt, steht **nicht** hier,
sondern in `public/config/components.json` unter `event._default._order`
(`[eventHero, slideshow, eventAblauf, eventPakete, eventSkills, eventReferenzen, faq, contact]`);
für die Kombiseiten `skill-event._default._order`
(`[eventHero, comboLead, comboBenefits, slideshow, eventSkills, eventTeaser, faq, contact]`).
Ohne Eintrag in `_order` rendert eine Sektion nie, egal was in `content.json` steht.
Details: `komponenten-stack.md`.

## Per-Event-Content: `content.json`

Jede Sektion trägt historisch ein `enabled`-Flag, und `sync:events` schreibt es weiter –
⚠️ **die Event-Seite wertet es aber nicht mehr aus.** Sichtbarkeit ergibt sich allein aus
dem Stack (`_order`) plus vorhandenem Inhalt (`steps`/`items`/`logos` > 0). Ein
`"enabled": false` blendet dort nichts aus, ein `"enabled": true` ohne Inhalt zeigt
nichts. Einzige Ausnahme: `skills.enabled` auf der Skill+Event-Kombiseite
(`[...kombi].astro`). Vollständiges Format:

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

- **Slides:** über den **Tag** `events:<slug>`, nicht über den Ordner. `getEventSlides()`
  = `getSlidesByTag('events', slug)` zieht aus dem **gesamten** Bestand. Bilder aus
  Stadtordnern erscheinen deshalb bewusst auch auf Event-Seiten – die Vermischung ist
  seit 2026-07-28 das Ziel, nicht der Fehler. Nachgezählt: in
  `public/img/slides/events/firmenfeier/` liegt **eine** Datei, den Tag
  `events:firmenfeier` tragen **45** Einträge.
  `public/img/slides/events/<slug>/` bleibt Ablage für event-eigene Motive; beim ersten
  Lauf belegt `sync:slides` daraus den Tag vor (`inferEventsFromKey`).
- **Titelbild:** `public/img/Titelbild/events/<slug>/` – genommen wird das **alphabetisch
  erste** Bild (.avif/.gif/.jpeg/.jpg/.png/.webp). Fallback-Kette in
  `resolveEventTitleImage()`: Event-Ordner → `public/img/Titelbild/default/` →
  `/img/samples/sample1.webp`. `title.meta.json` wird dabei **nicht** gelesen
  (`content-titelbild.md`).
- **Metadaten:** Gleiche `slides.meta.json` wie Stadtslides. Key-Format: `events/<slug>/dateiname.webp`

## Event entfernen

- Eintrag aus `events.json` löschen
- Ordner manuell löschen: `public/events/<slug>/`, `public/img/slides/events/<slug>/`, `public/img/Titelbild/events/<slug>/`

## Sync-Script

`sync:events` erstellt Ordner und default `content.json` – **bestehende `content.json` wird NIE überschrieben.**

Das Script ist außerdem bewusst **fehlertolerant** (WEB-003): fehlende `events.json` →
Warnung und `return`; kaputtes JSON → Warnung und `return` statt Abbruch, damit ein
Tippfehler nicht Sync, Build und Commit gleichzeitig blockiert; leere Liste → nichts zu
tun. Der letzte gute Stand bleibt stehen. Abgesichert in `tests/sync-events.test.ts`
(drei Fälle, jeweils Exit 0).

## Admin-Tool

Verwaltet Events vollständig via `EventManager.tsx` (im Admin-Repo `kunstwolff-admin/src/components/`): schreibt sowohl `public/events/events.json` (`EVENTS_PATH`) als auch pro Event `public/events/<slug>/content.json` über den Draft-State (`pendingFiles`) und published als atomaren Batch-Commit. Neue Events legt `createEvent()` mit default-`content.json` an; `image`/Slides/Titelbild werden über den `StripeImagePicker` bzw. `ImageManager` gesetzt.
