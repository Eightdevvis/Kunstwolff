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
| `skills` | `title` | string | nein | Skills werden automatisch aus `events.json` `categories` gelesen (Abgleich mit dem Skill-Titel ohne Gross/klein, Leer- und Bindestriche: `Event-Zeichner` = `Eventzeichner`, seit 2026-10-22) |
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
  `/img/samples/sample1.webp`. ⚠️ Andere Regel als Start-/Stadtseiten (die sortieren in
  `titleImages.ts` nach `priority` aus `title.meta.json`, dann Pfad): lädt man ein zweites
  Event-Titelbild hoch, entscheidet allein der Dateiname, welches live ist. **`title.meta.json` wird seit 2026-10-05 gelesen**
  (`resolveEventTitleImageMeta`, Commit `ca9545b`): `focus` und `frame` wirken wie im
  Opener (frame > 0 → contain + weißer Rand). `priority`/`categories`/`enabled` bleiben
  wirkungslos (`content-titelbild.md`).
- **Metadaten:** Gleiche `slides.meta.json` wie Stadtslides. Key-Format: `events/<slug>/dateiname.webp`

## Slug-Regeln (seit 2026-10-05)

Der Event-Slug wird zum `[landing]`-Parameter. Ein Slug mit `/`, `?`, `#`, `\` oder nur
aus Punkten bricht den **ganzen** Build – am 05.10.2026 ging dadurch stundenlang nichts
live (`Kunstwolff.de/Tagung` im Slug-Feld, daneben eine Dublette „Tagung"; zusammengeführt
in `828ef22`, Slug jetzt `tagung`). `getEvents()` überspringt solche Einträge seither mit
Warnung; Zahlen als Titel/Slug werden per `String()` gelesen. Der Admin säubert und prüft
den Slug schon beim Anlegen (`admin-tool.md`, „Was die Website gegen kaputte
Admin-Eingaben tut").

## Anlass im Fließtext: `eventPhrase` (Genus-Regel)

Event-Titel sind Überschriften-Labels („Schulung", „Sommerfest", „Private Feier"). Im
Fließtext brauchen sie den besitzanzeigenden Begleiter. `eventPhrase()` in
`src/utils/comboContent.ts` liefert Dativ und Akkusativ:

- Standard feminin: „Ihrer Schulung" / „Ihre Schulung"
- endet auf `…fest` → neutrum: „Ihrem Sommerfest" / „Ihr Sommerfest"
- Ausnahmen in der Tabelle `EVENT_PHRASE` (z. B. `Private Feier` → „Ihrer privaten Feier")

Neue Ausnahmen **dort** eintragen, nicht im Text. Der Admin nutzt dieselbe Regel für die
Startüberschriften neuer Events (`eventAkkusativ` in `kunstwolff-admin/src/utils/neuesEvent.ts`,
„So läuft Ihre Schulung mit uns ab") – wer die Regel ändert, zieht beide mit. Bekannte
Grenze: die Kombi-Rückfalltexte setzen den Skill-Namen ein („Ein Graphic recording macht
aus …") und passen grammatisch nicht zu jedem Skill.

## `EventSkills` – Karten „Unsere Künstler"

`src/components/events/EventSkills.astro`. Gezeigt werden die Skills, deren Titel in
`events.json` `categories` steht (Abgleich ohne Groß/klein, Leer- und Bindestriche).
Layout: `auto-fit, minmax(280px, 1fr)`; bei nur **1–2 Karten** (`--wenige`) ab 601 px
`minmax(280px, 300px)` und zentriert – vorher zog `auto-fit` eine einzelne Karte auf
~960 px und das 220 px hohe Bild schnitt das Porträt zum Streifen (`457ed1f`). Kartentitel
explizit `#111` (erbten sonst Weiß vom `body`, `636f57f`).

## Event entfernen

- Eintrag aus `events.json` löschen
- ⚠️ `/<slug>/` und alle Skill×Anlass-Kombis sind danach sofort 404; eine Weiterleitung
  in `vercel.json` muss von Hand nachgezogen werden (der Admin kann `vercel.json` nicht
  schreiben). Verwaiste Ordner (z. B. `public/events/kinderfest/`) überschreibt ein
  späteres Neuanlegen mit gleichem Slug still mit dem Startinhalt.
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
