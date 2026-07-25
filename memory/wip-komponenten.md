# WIP – Nicht eingebundene Komponenten

Diese Components existieren im Code, sind aber aktuell **nirgendwo in Pages/Layouts importiert**. Bewusst vorbereitet, noch nicht live.

| Component | Zweck |
| :-- | :-- |
| `src/components/hero/SchnellzeichnerHero.astro` | Alternativer Hero-Block für Schnellzeichner-Seiten (helles Design, Grid-Layout mit MiniReviews + BrandStripe) |
| `src/components/about/AboutSchnellzeichner.astro` | Skill-spezifische About-Sektion mit festem Schnellzeichner-Text und Bild-Slot |

**Beim Refactoren beachten:** Diese Files nicht entfernen, nur weil sie nicht referenziert sind – sind absichtlich da.

**Nicht mehr WIP:** `src/components/Eventtypes.astro` ist inzwischen live – importiert und in der Sektions-Component-Map registriert in `src/pages/index.astro` (Import Z. 11, `eventtypes:` Z. 39) und `src/pages/[landing].astro` (Import Z. 27, `eventtypes:` Z. 172).
