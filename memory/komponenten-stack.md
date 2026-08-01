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
- **Ausnahme Fremdsprachen:** `src/pages/fr/[landing].astro` filtert den `_order`-Stack
  zusätzlich über die Konstante `LOCALE_READY_SECTIONS` (aktuell `opener`,
  `landingIntro`, `slideshow`, `why`, `contact`, `faq`) – und zwar **vor**
  `isComponentEnabled`. `homepageReviews`, `eventtypes` und `landingsection` stehen zwar
  in `landing._default._order` und sind aktiviert, erscheinen auf `/fr/<slug>/` aber
  nie. Das ist Absicht, solange sie nicht übersetzt sind.
- **Identisches Format wie das Admin-Tool** (`src/components/interface/InterfaceView.tsx` liest/schreibt denselben
  `_order`-Key inkl. drag&drop-Reorder + Toggle). Admin und Website lesen denselben File →
  kein Drift mehr. Siehe Admin-Memory `interface-system.md`.

## Wie die Website rendert (`src/utils/componentConfig.ts`)
- `getSectionOrder(pageType, pageSlug)` – liest `_order` (page → `_default` → `[]`).
- `isComponentEnabled(pageType, pageSlug, id)` – Sichtbarkeit (page → `_default` → true).
- `resolveSectionOrder(pageType, pageSlug, registry)` – **Build-Guardrail**: wirft, wenn eine
  `_order`-ID keine Komponente im Seiten-Registry hat → Layout & Config können nicht auseinanderlaufen.

Jede Seite (`index.astro`, `[landing].astro`, `[skill].astro`, `[...kombi].astro`,
`fr/[landing].astro`) definiert:
1. `registry` = `{ id → Astro-Komponente }`
2. `sectionProps` = `{ id → Props-Objekt | false }` (`false` = Daten-Guard, z.B. Event-Sektion ohne Inhalt)
3. rendert `sectionOrder.map(id => isEnabled && props!==false && <Section {...props} />)`

Datei-Branches mit zwei Seitentypen (`[landing].astro`: landing+event, `[...kombi].astro`:
skill-landing+skill-event) bauen je Branch eine eigene registry/sectionProps.

⚠️ **`fr/[landing].astro` benutzt `getSectionOrder` statt `resolveSectionOrder`** – dort
gibt es also **keinen Build-Guardrail**, bewusst, weil die Route nur eine Teilmenge der
Sektionen rendert. Die unten beschriebene „Build bricht"-Sicherung gilt für die FR-Route
nicht.

## Warum so (Bug-Historie)
Vorher: hartcodierte `{show(id) && <Comp/>}`-Ketten + `isComponentEnabled`-Fallback `return true`.
Eine Sektion im Layout, aber nicht in der Config → renderte per Default-true als unsichtbarer Geist,
für den der Admin keinen Toggle zeigte. Konkret: `cinemaWelcome` blieb auf `/berlin` sichtbar, obwohl
im Admin entfernt. Jetzt unmöglich, weil nur noch `_order`-IDs gerendert werden und der Admin dieselbe
`_order` liest.

## Beim Hinzufügen/Entfernen einer Sektion
1. Komponente importieren + in `registry` (+ `sectionProps`) der betroffenen Seite eintragen.
2. ID in `components.json` `<kategorie>._default._order` an die richtige Stelle setzen.
3. Admin: `COMP`-Eintrag in `src/components/interface/pageTypes.ts` muss existieren (Editor-Metadaten), und
   `PAGE_STACKS` (Seed/Fallback) an die neue `_order` angleichen.
Vergisst man (1)+(2) synchron, schlägt der Build via `resolveSectionOrder` fehl (gewollt).

⚠️ **Für Schritt (3) gibt es keinen Guardrail** – ein fehlender oder überzähliger
`COMP`-Eintrag fällt erst im Admin auf, und dann als kaputter Website-Build. Stand
2026-08-01 klafft genau dort eine Lücke bei `skill-event`:

- `skill-event._order` führt `comboLead`, `comboBenefits`, `eventTeaser` – zu keiner der
  drei IDs gibt es einen `COMP`-Eintrag im Admin.
- `PAGE_STACKS['skill-event']` führt umgekehrt noch `eventAblauf`, `eventPakete`,
  `eventReferenzen`, die weder in `_order` noch in der skill-event-Registry von
  `[...kombi].astro` stehen.

`PAGE_STACKS` ist laut eigenem Kommentar nur der **tiefste Offline-Fallback**
(Laufzeitquelle ist `components.json` über `getPageOrder`) – aber `InterfaceView` bietet
es zusätzlich als „Vorgeschlagene Struktur" an. Wer die dort in den Stack zieht, schreibt
drei ungültige IDs in `components.json` und bricht den Website-Build über
`resolveSectionOrder`.
