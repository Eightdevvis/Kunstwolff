# Komponenten-Stack / Sektions-Sichtbarkeit (`components.json` + componentConfig.ts)

Welche Sektionen eine Seite in welcher Reihenfolge rendert, kommt **vollständig aus
`public/config/components.json`** – nicht mehr aus hartcodierten JSX-Listen in den Seiten.

## Eine Quelle der Wahrheit
`public/config/components.json`:
```json
{
  "<kategorie>": {
    "<slug|_default>": {
      "_order": ["opener", "landingIntro", ...],   // DIE kanonische, geordnete Sektions-Liste
      "<componentId>": false                          // optionale Sichtbarkeits-Overrides (default: true)
    }
  }
}
```
- Kategorien: `homepage`, `landing`, `event`, `skill`, `skill-landing`, `skill-event`.
- `_order` = der Stack. Sichtbarkeit pro Sektion: page-Override → `_default` → `true`.
- **Identisches Format wie das Admin-Tool** (`interface/InterfaceView.tsx` liest/schreibt denselben
  `_order`-Key inkl. drag&drop-Reorder + Toggle). Admin und Website lesen denselben File →
  kein Drift mehr. Siehe Admin-Memory `interface-system.md`.

## Wie die Website rendert (`src/utils/componentConfig.ts`)
- `getSectionOrder(pageType, pageSlug)` – liest `_order` (page → `_default` → `[]`).
- `isComponentEnabled(pageType, pageSlug, id)` – Sichtbarkeit (page → `_default` → true).
- `resolveSectionOrder(pageType, pageSlug, registry)` – **Build-Guardrail**: wirft, wenn eine
  `_order`-ID keine Komponente im Seiten-Registry hat → Layout & Config können nicht auseinanderlaufen.

Jede Seite (`index.astro`, `[landing].astro`, `[skill].astro`, `[skill]/[landing].astro`) definiert:
1. `registry` = `{ id → Astro-Komponente }`
2. `sectionProps` = `{ id → Props-Objekt | false }` (`false` = Daten-Guard, z.B. Event-Sektion ohne Inhalt)
3. rendert `sectionOrder.map(id => isEnabled && props!==false && <Section {...props} />)`

Datei-Branches mit zwei Seitentypen (`[landing].astro`: landing+event, `[skill]/[landing].astro`:
skill-landing+skill-event) bauen je Branch eine eigene registry/sectionProps.

## Warum so (Bug-Historie)
Vorher: hartcodierte `{show(id) && <Comp/>}`-Ketten + `isComponentEnabled`-Fallback `return true`.
Eine Sektion im Layout, aber nicht in der Config → renderte per Default-true als unsichtbarer Geist,
für den der Admin keinen Toggle zeigte. Konkret: `cinemaWelcome` blieb auf `/berlin` sichtbar, obwohl
im Admin entfernt. Jetzt unmöglich, weil nur noch `_order`-IDs gerendert werden und der Admin dieselbe
`_order` liest.

## Beim Hinzufügen/Entfernen einer Sektion
1. Komponente importieren + in `registry` (+ `sectionProps`) der betroffenen Seite eintragen.
2. ID in `components.json` `<kategorie>._default._order` an die richtige Stelle setzen.
3. Admin: `COMP`-Eintrag in `interface/pageTypes.ts` muss existieren (Editor-Metadaten), und
   `PAGE_STACKS` (Seed/Fallback) an die neue `_order` angleichen.
Vergisst man (1)+(2) synchron, schlägt der Build via `resolveSectionOrder` fehl (gewollt).
