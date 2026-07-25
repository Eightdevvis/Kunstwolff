# Erinnerungen (Pinnwand-Fotos)

Die Erinnerungen-Komponente zeigt auf Landing-Seiten einen Pinnwand-Streifen mit 4 Fotos im Polaroid-Look (mit Pinnadel).

## Ablage

```
public/erinnerungen/default.json
public/erinnerungen/<stadt>.json           # auto von sync:erinnerungen
public/erinnerungen/<skill>.json           # auto von sync:erinnerungen
public/erinnerungen/<skill>-<stadt>.json   # manuell
```

## JSON-Format

```json
{
  "photos": [
    {
      "image": "/img/slides/default/1_schnellzeichner_hq.webp",
      "alt": "Schnellzeichner bei einem Live-Event"
    },
    {
      "image": "/img/slides/default/2_karikatur_stadtfest.webp",
      "alt": "Karikatur-Zeichnung als Andenken"
    },
    {
      "image": "/img/slides/default/3_schnellzeichner-schweiz.webp",
      "alt": "Live-Schnellzeichner sorgt für Staunen"
    },
    {
      "image": "/img/slides/default/4_Hochzeit_schnellzeichner_maler.webp",
      "alt": "Schnellzeichner auf einer Hochzeitsfeier"
    }
  ]
}
```

**Max. 4 Fotos werden angezeigt.**

## Felder pro Foto

| Feld | Zweck |
| :-- | :-- |
| `image` | Pfad zum Bild relativ zu `public/` |
| `alt` | Alt-Text (SEO + Accessibility) |

## Fallback-Kette (identisch zum Why-System)

1. `{skill}-{stadt}.json` – z.B. `schnellzeichner-berlin.json`
2. `{stadt}.json`
3. `{skill}.json`
4. `default.json`

Geladen von `src/utils/erinnerungen.ts` → verwendet in `src/components/LandingErinnerungen.astro`.

## Wo angezeigt

- Nur auf Skill+Stadt-Kombis (`/<skill>/<stadt>/`) – die `erinnerungen`-Sektion steht ausschließlich im `skill-landing`-`_order`-Block von `public/config/components.json`
- Position: zwischen Why-Sektion und Kontaktformular
- **Nicht** auf reinen Stadt-Landings (`/<stadt>/`) und **nicht** auf Event-Seiten
- Gerendert via Registry in `src/pages/[skill]/[landing].astro` (`LandingErinnerungen`), nicht in `src/pages/[landing].astro`

## Sync-Script

`sync:erinnerungen` erstellt `{stadt}.json` und `{skill}.json` für alle Einträge aus `landings.md` und `skills.json` (Kopie von `default.json`). **Bestehende Dateien werden nie überschrieben.**

## Admin-Tool

Kann Erinnerungen **nicht** verwalten (geplant).
