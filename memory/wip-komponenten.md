# WIP – Nicht eingebundene Komponenten

Diese Components existieren im Code, sind aber aktuell **nirgendwo in Pages/Layouts
importiert** (Stand 2026-10-22). Es sind vier, und sie zerfallen in zwei Gruppen – der
Unterschied entscheidet, was man mit ihnen tun darf.

### Bewusst vorbereitet, noch nicht live

| Component | Zweck |
| :-- | :-- |
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

**Nicht mehr WIP:** `src/components/Eventtypes.astro` ist live – importiert und in der Sektions-Component-Map (`eventtypes:`) registriert in `src/pages/index.astro`, `src/pages/[landing].astro` und `src/pages/fr/[landing].astro`.

**Gelöscht:** `src/components/hero/SchnellzeichnerHero.astro` (2026-08-06, `8f6063d`, von keiner Seite importiert – siehe `seo.md`).
