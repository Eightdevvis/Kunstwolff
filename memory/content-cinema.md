# CinemaWelcome (Startseiten-Konfigurator)

Interaktiver Konfigurator für Startseite und Landings. Der Besucher wählt nacheinander **Event → Wunsch (Muse) → Geschmack**; am Ende wird ein personalisiertes Angebot zusammengesetzt.

⚠️ **Aktuell überall abgeschaltet.** `components.json` setzt `cinemaWelcome: false` in
`homepage._default` **und** `landing._default` – bewusst, nach mom-Feedback (Commit
`288da32`). Die Sektion steht zwar in `_order`, wird aber von `isComponentEnabled`
aussortiert und rendert auf keiner Seite. Zum Aktivieren das Flag auf `true` setzen oder
pro Seiten-Slug überschreiben.

Aufbau: Intro-Block + 3 Orbit-Sektionen (Hauptkreis + Satelliten-Buttons) + Ergebnis-Sektion (zwei Flip-Karten).

## Quelle

`public/cinema/cinema.json` — direkt zur Build-Zeit gelesen, **kein Sync-Script**.

## Struktur

```json
{
  "intro": { "title": "Willkommen", "subtitle": "…" },
  "sections": [
    {
      "id": "event",
      "title": "Ihr Event",
      "subtitle": "…",
      "mainCircle": { "image": "/img/….webp", "alt": "…", "hint": "Entdecken" },
      "satellites": [
        {
          "value": "messe",
          "title": "Messe",
          "image": "/img/….webp",
          "alt": "…",
          "defaults": { "titlePart": "Messe", "text": "…", "offerItems": ["…"] },
          "autoSelect": { "muse": "stand-attraktion" }
        }
      ]
    }
  ],
  "overrides": {}
}
```

## Felder

| Ebene | Feld | Pflicht | Beschreibung |
| :-- | :-- | :-- | :-- |
| `sections[]` | `id` | ja | **`event` / `muse` / `geschmack`** – fest, von der Logik per ID gesucht |
| `sections[]` | `title` / `subtitle` | ja/– | Überschrift / Untertitel |
| `mainCircle` | `image` / `alt` / `hint` | ja/ja/nein | großer Mittelkreis |
| `satellites[]` | `value` | ja | logischer Auswahl-Wert (z.B. `firmenfeier`, `stand-attraktion`, `schnellzeichner`) |
| `satellites[]` | `title` | ja | Label / Hover-Text |
| `satellites[]` | `image` | bedingt | Bild-Satellit. **Pflicht, außer** `displayMode:"text"` |
| `satellites[]` | `displayMode` | nein | `"text"` = goldener Text-Kreis statt Bild (Muse-Sektion) |
| `satellites[]` | `defaults` | ja | Bausteine für die Ergebnis-Komposition (s.u.) |
| `satellites[]` | `autoSelect` | nein | `{ sektionsId: value }` – setzt andere Sektion automatisch + überspringt sie |
| `defaults` | `titlePart` | ja | Anteil am zusammengesetzten Titel |
| `defaults` | `text` | – | Beschreibungs-Baustein |
| `defaults` | `offerItems` | – | Bullet-Punkte fürs Angebot |
| `defaults` | `image` | nur Geschmack | Default-Ergebnisbild (Skill-Bild) |
| `overrides` | Key `"{geschmack}-{event}-{muse}"` | – | Komplett-Ersatz-Ergebnis für eine exakte Kombination |

## Ergebnis-Komposition (Laufzeit, im `<script>` der .astro)

Ohne passenden `override`:
- **Titel:** `{geschmack.titlePart} auf {event.titlePart} für {muse.titlePart}`
- **Text:** `geschmack.text + muse.text + event.text` (feste Reihenfolge)
- **Angebot:** `[...event.offerItems, ...muse.offerItems, ...geschmack.offerItems]`
- **Bild:** `geschmack.defaults.image`

Das Ergebnis füllt zusätzlich ein Kontakt-Prefill in `sessionStorage` (`cinemaContactPrefill_v1`), das `Contact.astro` ausliest.

## autoSelect — "Messe überspringt die Wunsch-Sektion" ⚠️ STOLPERFALLE

Wählt der Besucher einen Satelliten mit `autoSelect` (aktuell nur **Messe → `{muse: "stand-attraktion"}`**), wird die Muse-Sektion automatisch gesetzt und übersprungen → direkt zur Geschmack-Sektion.

**Bug-Historie (Fix 2026-06-05):** `parseSatellite()` in `cinema.ts` hat `autoSelect` **nicht** mitgeparst, obwohl der Typ `CinemaSatellite` es deklariert. Folge: Feld kam nie im Client-Data an, der Skip-Flow griff nie, nach Messe erschien fälschlich die Muse-Sektion. **Lehre:** Jedes neue `satellites[]`-Feld muss in DREI Stellen leben, sonst fällt es still raus:
1. Typ `CinemaSatellite` (`cinema.ts`)
2. **Parser `parseSatellite()`** (`cinema.ts`) ← hier ging's verloren
3. Client-Projektion `satelliteData` (im Frontmatter der `.astro`, baut das `window.__cinemaSatelliteData`)

## Regeln

- `sections` = **genau 3** (`event`, `muse`, `geschmack`), sonst Fallback pro Slot
- Pro Sektion **1–6 Satelliten** (CSS-Layout-Limit; Event/Geschmack nutzen 4 Positionen links, Muse 6 im Vollkreis)
- Bei fehlender/kaputter JSON: Fallback-Daten in `cinema.ts` (`FALLBACK_DATA`)

## Technische Details

- Loader: `src/utils/cinema.ts` → `getCinemaData()` (Build-Zeit, robuste Parser pro Feld)
- Komponente: `src/components/CinemaWelcome.astro` (CSS + Client-`<script>` orchestriert Intro/Sektionen/Ergebnis via IntersectionObserver)
- Hauptkreis-Klick navigiert bei `event`/`geschmack` zu `/{value}/` (Event-Landing bzw. Skill-Seite); `muse` navigiert nicht
- Einmalig **manuell im Browser** geprüft (Happy Path + Messe-Skip). Einen
  automatisierten Browsertest gibt es nicht – `tests/` ist reines Vitest, im Repo liegt
  kein Playwright. (Der früher hier genannte Commit `a6d185c` existiert in keinem der
  beiden Repos.)
- **sessionStorage-Keys:** `cinemaIntro_v1` (Intro) sowie `cinemaWelcome_v1`,
  `cinemaWelcome2_v1`, `cinemaWelcome3_v1` (je Orbit-Sektion) merken sich pro Session,
  dass die Kino-Sequenz schon lief; danach greift `instantReveal()` statt
  `playCinemaSequence()`. Wer die Animation testen will, muss den Session-Storage
  leeren – sonst sieht man beim zweiten Aufruf nur das Ergebnis und hält die Animation
  für kaputt. Davon getrennt: `cinemaContactPrefill_v1` fürs Kontakt-Prefill.

## Admin-Tool

Verwaltet `cinema.json` über `CinemaManager.tsx` (draft-aware): `CINEMA_PATH = 'public/cinema/cinema.json'`, `save()` schreibt via `addPendingFile` mit Commit-Message `admin: Cinema-Willkommen aktualisiert – cinema.json`. Satelliten-Bilder werden nach `public/img/cinema` hochgeladen. Doku im Admin-Repo: `kunstwolff-admin/memory/manager-cinema.md`.
