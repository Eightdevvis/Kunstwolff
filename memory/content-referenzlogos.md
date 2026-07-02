# Referenzlogos

## Ablage

`public/img/referenzenLogos/`

## Auto-Discovery

Alle Bilder in diesem Ordner werden automatisch in der Referenz-Sektion angezeigt. Zwei Darstellungen aus **derselben** Datenquelle (`getBrandLogos()` in `src/utils/brandLogos.ts`):

| Komponente | Darstellung | Verwendet in |
| :-- | :-- | :-- |
| `BrandStripe.astro` | animierter Endlos-Streifen (Marquee) mit Hover-Tooltip | Heros (`SchnellzeichnerHero`, `SkillHero`, `Opener`), Landing-/Skill-Seiten |
| `BrandGrid.astro` | statisches Grid – zeigt **alle** Logos gleichzeitig, ohne Animation | Referenzen-Seite (`src/pages/referenzen.astro`) |

Beide liegen in `src/components/reviews-references/`. Ändert sich das Logo-Verzeichnis oder `getBrandLogos()`, betrifft das beide Komponenten.

## Label-Generierung

Der Dateiname (ohne Extension) wird als Label genutzt – Unterstriche werden zu Leerzeichen.

| Dateiname | Label |
| :-- | :-- |
| `acme_gmbh.webp` | "acme gmbh" |
| `kunde-xyz.png` | "kunde-xyz" |

## Erlaubte Formate

`.webp`, `.png`, `.jpg`, `.avif`

## Partner-Seite (verwandt, aber separat)

Die `/partner/`-Seite (`src/pages/partner.astro`) nutzt `public/partners/partners.json` und Logos aus `public/img/partners/`. Das ist **nicht** dasselbe wie Referenzlogos.

| Konzept | Pfad | Verwendung |
| :-- | :-- | :-- |
| Referenzlogos (BrandStripe) | `public/img/referenzenLogos/` | Auf Landings/Skill-Seiten als Logo-Streifen |
| Partner | `public/partners/partners.json` + `public/img/partners/` | Eigene Seite `/partner/` |
