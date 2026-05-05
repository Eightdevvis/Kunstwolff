# WIP – Nicht eingebundene Komponenten

Diese Components existieren im Code, sind aber aktuell **nirgendwo in Pages/Layouts importiert**. Bewusst vorbereitet, noch nicht live.

| Component | Zweck |
| :-- | :-- |
| `src/components/Eventtypes.astro` | Eventtypen-Grid (Firmenfeiern, Messen, Hochzeiten, Private Feiern) mit aufklappbaren Detailboxen und Links zu Event-Seiten |
| `src/components/hero/SchnellzeichnerHero.astro` | Alternativer Hero-Block für Schnellzeichner-Seiten (helles Design, Grid-Layout mit MiniReviews + BrandStripe) |
| `src/components/about/AboutSchnellzeichner.astro` | Skill-spezifische About-Sektion mit festem Schnellzeichner-Text und Bild-Slot |

**Beim Refactoren beachten:** Diese Files nicht entfernen, nur weil sie nicht referenziert sind – sind absichtlich da.
