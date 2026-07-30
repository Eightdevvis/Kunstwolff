# Navigation

## Quelle

`public/navigation/navigation.json`

## Format

```json
{
  "items": [
    { "label": "Home", "url": "/" },
    {
      "label": "Services",
      "children": [
        { "label": "Schnellzeichner", "url": "/schnellzeichner/" },
        { "label": "Szenenmaler", "url": "/szenenmaler/" }
      ]
    },
    { "label": "FAQ", "url": "#faq" },
    { "label": "Anfrage", "url": "#contact", "cta": true }
  ]
}
```

## Strukturen

- **Einfacher Link:** `label` + `url` (+ optional `cta: true` für Gold-Pill-Button)
- **Dropdown-Menü:** `label` + `children` (Array von einfachen Links)

## Felder pro Link

| Feld | Pflicht | Zweck |
| :-- | :-- | :-- |
| `label` | ja | Anzeigetext |
| `url` | ja (außer Dropdown) | Ziel-URL (kann auch Anker wie `#faq` sein) |
| `cta` | nein | `true` markiert den Link als Call-to-Action-Button (Gold-Pill-Optik) |
| `children` | nein | Array von Links – macht aus dem Item ein Dropdown |

## Code-Fallback

`navigation.ts` hat einen eingebauten Default mit "Home" (mit Children), "Services", "Work", "Anfrage" (cta) – greift falls die JSON fehlt oder kaputt ist.

## Aktueller Stand (2026-07-30)

Home · Services (Schnellzeichner, Szenenmaler) · **Über uns (Team, Referenzen,
Partner)** · FAQ (`#faq`) · Anfrage (`#contact`, cta)

`Team` → `/team/` kam am 2026-07-30 dazu, siehe `content-team.md`.

Die Galerie (`/galerie/`) steht **absichtlich nicht** im Menü: sie ist unter
jedem „Unsere Kunst"-Banner verlinkt (`content-galerie.md`).

## Admin-Tool

Kann Navigation **nicht** verwalten – manuell per Git pflegen.
