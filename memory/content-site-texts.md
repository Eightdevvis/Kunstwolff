# Allgemeine Texte (site-texts)

## Ablage

```
public/site-texts/content.json
```

Geschrieben vom Admin-Tab **„Startseiten-Texte"** (`SiteTextsManager.tsx`) und – seit dem
Einführungstext-Feature – vom **Interface-Editor** (`IntroManager`, Komponente `landingIntro`).
Beide schreiben in **dieselbe** Datei → beim Schreiben müssen die anderen Top-Level-Keys
erhalten bleiben.

Util: `src/utils/siteTexts.ts`. Defaults sind im Code hartcodiert und werden mit der JSON
gemerged – fehlt die Datei oder ein Feld, rendert die Seite unverändert weiter (kein Bruch).

## Top-Level-Keys

| Key | Zweck | Util-Funktion |
| :-- | :-- | :-- |
| `contact` | Kontakt-Abschnitt (kicker/heading/intro/panelTitle/panelText) | `getSiteTexts()` |
| `eventtypes` | Eventformate-Abschnitt (heading/subtitle) | `getSiteTexts()` |
| `why` | „Warum Kunstwolff?"-Abschnitt (heading/intro) | `getSiteTexts()` |
| `landingHeadings` | Pro-Stadt H1-Überschrift, flach `{ "<slug>": "..." }` | `getLandingHeading(slug, fallback)` |
| `landingIntros` | Einführungstext der Stadtseiten (siehe unten) | `getLandingIntro(slug, cityName)` |

## landingIntros (Einführungstext)

Kleiner Text **direkt unter dem Hero/BrandStripe** auf den reinen Stadtseiten
(`src/pages/[landing].astro`, Komponente `src/components/LandingIntro.astro`).
Sichtbarkeit läuft über den **Sektions-Stack**: die Registry-ID `landingIntro`
wird via `resolveSectionOrder`/`isComponentEnabled` aus `componentConfig`
(`public/config/components.json`) gerendert – kein `show()`-Helper mehr.

**Wichtig:** Die BrandStripe steckt **im `Opener`** (`hero/Opener.astro` → `<BrandStripe />`),
deshalb tragen die Stadtseiten den Logo-Streifen, obwohl sie kein `SkillHero` nutzen.

Auch auf der **Startseite** (`src/pages/index.astro`, eigener Eintrag `_home`, ohne Stadt-Bezug):
`getHomeIntro()` liefert `homeIntro`, das als Registry-Eintrag
`landingIntro: { text: homeIntro }` gerendert wird – sichtbar, wenn
`isComponentEnabled(PAGE_TYPE, '', 'landingIntro')` true ist (Sektions-Stack).

Format:

```json
"landingIntros": {
  "_home": "Live-Kunst, die Ihre Gäste … (Startseite, kein {stadt})",
  "_default": "Live-Kunst für Ihr Event in {stadt}. …",
  "berlin": "Eigener Text nur für Berlin …"
}
```

Auflösung Stadtseiten – `getLandingIntro(slug, cityName)`:

1. `landingIntros[slug]` (stadtspezifisch) – falls vorhanden
2. `landingIntros._default` (editierbarer Standard)
3. sonst **leerer String** → nichts rendern (**kein hartcodierter Fallback**)

Auflösung Startseite – `getHomeIntro()`: `landingIntros._home` → sonst leer.

**Kein Code-Default:** Die „Default"-Texte sind ganz normale Einträge `_default`/`_home`
in `site-texts/content.json` (der erste reingeschriebene Text) – voll im Admin editierbar.
Steht kein Eintrag da, rendert die Komponente nichts.

- Platzhalter `{stadt}` (case-insensitiv) → durch den formatierten Stadtnamen ersetzt → ein
  Default-Text passt auf alle Städte („voll dynamisch").
- Getrimmter **Leerstring** als Wert = bewusst kein Intro → `LandingIntro` rendert nichts.
- Der Admin-`IntroManager` **löscht** bei leerem Feld den Key (statt Leerstring zu schreiben),
  damit eine Stadt sauber auf den Default zurückfällt. Komplett ausblenden = Komponenten-Toggle
  `landingIntro` im Interface-Editor.
- Mehrere Absätze: Leerzeile im Text trennt Paragraphen.

**Kein Default-Spiegel mehr nötig:** Da die Default-Texte in der content.json leben (nicht
im Code), gibt es keine zu synchronisierende Hardcoded-Konstante zwischen den Repos.

## Admin

- `SiteTextsManager.tsx` → Tab „Startseiten-Texte" (contact/eventtypes/why).
- `IntroManager.tsx` → Interface-Editor, Komponente `landingIntro` (Default + Per-Stadt).
