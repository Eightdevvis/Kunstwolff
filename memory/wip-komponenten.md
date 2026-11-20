# WIP – Nicht eingebundene Komponenten

Diese Components existieren im Code, sind aber aktuell **nirgendwo in Pages/Layouts
eingebunden** (Stand 2026-11-20).

### Bewusst vorbereitet, noch nicht live

| Component | Zweck |
| :-- | :-- |
| `src/components/about/AboutSchnellzeichner.astro` | Skill-spezifische About-Sektion mit festem Schnellzeichner-Text und Bild-Slot |
| `src/components/about/Aboutsection.astro` | Wird in `src/pages/index.astro` importiert, der Aufruf steht aber nur als Kommentar (`//<Aboutsection />`) – rendert nichts |

### Altlasten – gelöscht (2026-11-20, Inventur)

`reviews-references/References.astro` (ersetzt durch `BrandStripe`/`BrandGrid`),
`header/LanguageMenu.astro` (ersetzt durch `LangSwitcher.astro`),
`SkillBanner.astro` (stand in keinem `_order`) und
`reviews-references/Reviews.astro` (nur von `SkillBanner` benutzt).

⚠️ Der Admin führt noch `COMP.skillBanner` in `pageTypes.ts` – eine Karteileiche,
die in keinem `PAGE_STACKS` und keinem `_order` steht. Zieht ihn jemand im Admin
in den Stack, bricht der Website-Build über `resolveSectionOrder`, weil keine Seite
die ID in ihrer Registry hat. Im Admin entfernen.

**Beim Refactoren beachten:** Die Files oben nicht entfernen, nur weil sie
nicht referenziert sind – sind absichtlich da.

**Nicht mehr WIP:** `src/components/Eventtypes.astro` ist live – importiert und in der Sektions-Component-Map (`eventtypes:`) registriert in `src/pages/index.astro`, `src/pages/[landing].astro` und `src/pages/fr/[landing].astro`.

**Gelöscht:** `src/components/hero/SchnellzeichnerHero.astro` (2026-08-06, `8f6063d`, von keiner Seite importiert – siehe `seo.md`).
