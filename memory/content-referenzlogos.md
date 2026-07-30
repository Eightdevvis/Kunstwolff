# Referenzlogos

## Ablage

`public/img/referenzenLogos/`

## Auto-Discovery

Alle Bilder in diesem Ordner werden automatisch angezeigt – `getBrandLogos()` scannt
den Ordner, beide Darstellungen hängen daran:

| Komponente | Wo | Form |
| :-- | :-- | :-- |
| `BrandStripe.astro` | Hero (`Opener`, `SkillHero`, `SchnellzeichnerHero`) | laufender Logo-Streifen, Name nur als Tooltip |
| `BrandGrid.astro` | `/referenzen/` | Gitter mit allen Firmen, **Name sichtbar** unter dem Logo |

⚠️ Auf `/referenzen/` lief bis 2026-07-30 derselbe Laufstreifen. Das war falsch:
dort ist die Firmenliste der Inhalt der Seite, kein Teaser – man musste warten,
bis die gesuchte Firma vorbeikam, und auf dem Handy gab es mangels Hover gar
keinen Namen. Test dagegen: `tests/brand-referenzen.test.ts`.

## Label-Generierung

`buildBrandLabel()` in `src/utils/brandLogos.ts` (exportiert, getestet):
Endung weg → Unterstriche **und** Bindestriche zu Leerzeichen → Mehrfach-Trenner
zusammengefasst → ein angehängtes „logo" entfernt. Groß-/Kleinschreibung bleibt
wie im Dateinamen, damit `CDU` nicht zu „Cdu" wird.

| Dateiname | Label |
| :-- | :-- |
| `acme_gmbh.webp` | "acme gmbh" |
| `kunde-xyz.png` | "kunde xyz" |
| `Deutsche_Bundesbank_logo.svg` | "Deutsche Bundesbank" |

**Ausnahmen:** `NAME_KORREKTUREN` (gleiche Datei) überschreibt einzelne Namen,
die der Dateiname nicht ausdrücken kann – aktuell `SAmsung.svg` → „Samsung" und
`Europäische_Zentral_Bank.svg` → „Europäische Zentralbank". Bewusst klein
halten: Quelle ist der Dateiname. Seit das Gitter die Namen anzeigt, fällt ein
Tippfehler im Dateinamen sofort auf.

## Erlaubte Formate

`.avif`, `.gif`, `.jpeg`, `.jpg`, `.png`, `.svg`, `.webp` (siehe `allowedExtensions` in `src/utils/brandLogos.ts`). `.svg` wird häufig genutzt (viele Logos im Ordner liegen als SVG vor).

## Partner-Seite (verwandt, aber separat)

Die `/partner/`-Seite (`src/pages/partner.astro`) nutzt `public/partners/partners.json` und Logos aus `public/img/partners/`. Das ist **nicht** dasselbe wie Referenzlogos.

| Konzept | Pfad | Verwendung |
| :-- | :-- | :-- |
| Referenzlogos | `public/img/referenzenLogos/` | Logo-Streifen im Hero + Gitter auf `/referenzen/` |
| Partner | `public/partners/partners.json` + `public/img/partners/` | Eigene Seite `/partner/` |
