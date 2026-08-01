# WIP – Nicht eingebundene Komponenten

Diese Components existieren im Code, sind aber aktuell **nirgendwo in Pages/Layouts
importiert**. Es sind fünf, und sie zerfallen in zwei Gruppen – der Unterschied
entscheidet, was man mit ihnen tun darf.

### Bewusst vorbereitet, noch nicht live

| Component | Zweck |
| :-- | :-- |
| `src/components/hero/SchnellzeichnerHero.astro` | Alternativer Hero-Block für Schnellzeichner-Seiten (helles Design, Grid-Layout mit MiniReviews + BrandStripe) |
| `src/components/about/AboutSchnellzeichner.astro` | Skill-spezifische About-Sektion mit festem Schnellzeichner-Text und Bild-Slot |

### Altlasten – abgelöst, aber nie entfernt

| Component | Zweck / wovon abgelöst |
| :-- | :-- |
| `src/components/reviews-references/References.astro` | Referenz-Logos mit eigener `DEFAULT_REFERENCES`-Liste – ersetzt durch `BrandStripe`/`BrandGrid` |
| `src/components/header/LanguageMenu.astro` | Alter Emoji-Sprachumschalter – ersetzt durch `LangSwitcher.astro` |
| `src/components/SkillBanner.astro` | Fähigkeiten+Reviews-Dreispalter, steht in keinem `_order` |

⚠️ **`SkillBanner` ist der heikle Fall:** der Admin führt dafür noch `COMP.skillBanner`
in `pageTypes.ts`. Der Eintrag ist eine Karteileiche – er steht in keinem `PAGE_STACKS`
und in keinem `_order`. Zieht ihn jemand im Admin in den Stack, bricht der Website-Build
über `resolveSectionOrder`, weil keine Seite die ID in ihrer Registry hat.

**Beim Refactoren beachten:** Die Files der ersten Gruppe nicht entfernen, nur weil sie
nicht referenziert sind – sind absichtlich da.

**Nicht mehr WIP:** `src/components/Eventtypes.astro` ist inzwischen live – importiert und in der Sektions-Component-Map registriert in `src/pages/index.astro` (Import Z. 11, `eventtypes:` Z. 39) und `src/pages/[landing].astro` (Import Z. 27, `eventtypes:` Z. 184, sectionProps Z. 202).
