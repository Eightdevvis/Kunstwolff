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
        { "label": "Schnellzeichner", "url": "/schnellzeichner-karikaturist/" },
        { "label": "Szenenmaler", "url": "/szenenmaler/" }
      ]
    },
    { "label": "FAQ", "url": "#faq" },
    { "label": "Anfrage", "url": "#contact", "cta": true }
  ]
}
```

## Zwei Menüs kommen NICHT aus der JSON

`getNavigationItems()` schreibt zwei Einträge selbst – beides in `navigation.ts`:

| Menü | Quelle | Funktion |
| :-- | :-- | :-- |
| **Services** → children | `public/skills/skills.json` (via `getVisibleSharedSkills`) | `fillServicesWithSkills` – **ersetzt** die children komplett |
| **Events** (neben Services) | `public/events/events.json` (via `getVisibleEvents`) | `addEventsDropdownNextToServices` – fügt ein/ersetzt das Dropdown |

⚠️ Bis 2026-07-30 stand die Services-Liste von Hand in der JSON. Ein im Admin
angelegter Skill bekam damit zwar seine Seite (`/aquarelle/`), war aber von
nirgendwo erreichbar – und weil der Admin `navigation.json` nicht bearbeiten
kann, konnte mom das auch nicht selbst reparieren. Ersetzen statt Ergänzen ist
Absicht: sonst bliebe ein gelöschter Skill als toter Link stehen.
Test: `tests/nav-services-skills.test.ts`.

⚠️ Die children unter „Services" in der JSON müssen trotzdem **nicht leer**
sein: ein Dropdown ohne gültige children fliegt schon beim Parsen raus
(`isValidDropdownItem`), dann findet `fillServicesWithSkills` nichts zum Füllen.
Sie dienen als Platzhalter **und als Notnagel**: normalerweise wird `skills.json`
gezeigt, aber wenn kein sichtbarer Skill lesbar ist (`children.length === 0`, weil
die Datei fehlt, kaputt ist oder alles über `page-visibility` ausgeblendet wurde),
bricht `fillServicesWithSkills` ab und lässt die Hand-Liste stehen – lieber die als
ein leeres Menü.

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

Home · Services (aus `skills.json` ersetzt: Schnellzeichner, Szenenmaler –
`/aquarelle/` ist über `page-visibility.json` ausgeblendet) · **Events** (aus
`events.json`, vom Code hinter Services eingefügt: Firmenfeier, Messe, Hochzeit,
Private Feier) · **Über uns (Team, Referenzen, Partner)** · FAQ (`#faq`) ·
Anfrage (`#contact`, cta)

Das Events-Dropdown steht **nicht** in `navigation.json`:
`addEventsDropdownNextToServices` schiebt es zur Laufzeit direkt hinter „Services"
(`tests/nav-services-skills.test.ts` prüft, dass es im Menü landet).

`Team` → `/team/` kam am 2026-07-30 dazu, siehe `content-team.md`.

Die Galerie (`/galerie/`) steht **absichtlich nicht** im Menü: sie ist unter
jedem „Unsere Kunst"-Banner verlinkt (`content-galerie.md`).

## Handy-Menü (Burger)

Unter 768 px ist das Menü eine reine CSS-Lösung: versteckte Checkbox
`#nav-toggle-main` + `<label class="nav-toggle">`. Seit 2026-11-20 schließt ein
kleines Skript in `Navigation.astro` das Menü bei **jedem Tipp auf einen Menü-Link**
(Checkbox zurück auf `false`). Vorher blieb es nach einer Sprungmarke (`#faq`,
`#contact`) offen und lag mit ~640 px Höhe über genau dem Abschnitt, zu dem man
wollte.

Seit 2026-11-20 (Branch `mobile-fixes`) außerdem:
- **Tipp daneben schließt:** ein zweites, leeres `<label class="nav-backdrop">`
  derselben Checkbox liegt bei offenem Menü fixiert über der ganzen Seite
  (z-index 0, Burger + Menü darüber). Funktioniert ohne JS und fängt den Tipp ab,
  damit darunter kein Link auslöst.
- **Scroll-Sperre:** `html:has(#nav-toggle-main:checked) { overflow: hidden }`
  (reines CSS); das Menü selbst scrollt mit `overscroll-behavior: contain`.
- **Tastatur:** die Checkbox ist unter 768 px nicht mehr `display: none`, sondern
  unsichtbar (opacity 0) über dem Burger und fokussierbar; Fokusrahmen am Burger
  (`:focus-visible + .nav-toggle`). Leertaste schaltet nativ, Enter per Skript,
  Escape schließt von überall. Das `aria-label` hängt jetzt an der Checkbox,
  das sichtbare Label ist `aria-hidden`. Über 768 px bleibt sie `display: none`.
- **Geschlossen unsichtbar auch für Tastatur:** `visibility: hidden` am zu-
  geklappten Menü (erst nach der Animation) – vorher lief der Tab-Fokus durch
  alle unsichtbaren Menü-Links.
- **Tap-Ziele:** Burger 44×44 (vorher 42), Menü- und Untermenü-Links `min-height: 44px`.
- **Weichzeichner** (`.nav::before`, blur + Verlauf) ist unter 768 px bei
  geschlossenem Menü 74 statt 104 px hoch (`bottom: 30px`) – er lag sonst über
  fast der Hälfte des ~250 px hohen Handy-Heroes. Offen deckt er das ganze Menü.
- **Querformat** (`max-height: 500px` + landscape): Leiste 72 statt 104 px
  (Innenabstand 12, Logo 44 px).

## Admin-Tool

Kann Navigation **nicht** verwalten – manuell per Git pflegen.
