# Allgemeine Texte (site-texts)

## Ablage

```
public/site-texts/content.json
```

Geschrieben vom Admin-Tab **„Startseiten-Texte"** (`SiteTextsManager.tsx`) und – seit dem
Einführungstext-Feature – vom **Interface-Editor** (`IntroManager`, Komponente `landingIntro`).
Beide schreiben in **dieselbe** Datei → beim Schreiben müssen die anderen Top-Level-Keys
erhalten bleiben.

Seit 2026-10-14 halten sich **alle drei** Schreiber daran: `SiteTextsManager` merged seine
drei Abschnitte in die geladene Datei (vorher löschte ein Speichern dort `landingIntros` und
alle `landingHeadings`), `IntroManager` und das Überschrift-Feld ändern nur ihren einen Eintrag
und setzen dabei auf dem aktuellen Entwurf auf.

Util: `src/utils/siteTexts.ts`. Defaults sind im Code hartcodiert und werden mit der JSON
gemerged – fehlt die Datei oder ein Feld, rendert die Seite unverändert weiter (kein Bruch).

## Top-Level-Keys

| Key | Zweck | Util-Funktion |
| :-- | :-- | :-- |
| `contact` | Kontakt-Abschnitt (kicker/heading/intro/panelTitle/panelText) | `getSiteTexts()` |
| `eventtypes` | Eventformate-Abschnitt (heading/subtitle) | `getSiteTexts()` |
| `why` | „Warum Kunstwolff?"-Abschnitt (heading/intro) | `getSiteTexts()` |
| `slideshow` | Überschrift der Bilder-Sektion (`heading`, Standard „Unsere Kunst") | `getSiteTexts()` |
| `faq` | Überschrift der FAQ-Sektion (`heading`, Standard „Häufige Fragen (FAQ)") | `getSiteTexts()` |
| `landingHeadings` | H1 im Opener: `_home` (Startseite), `_default` (alle Stadtseiten, `{stadt}`), `<slug>` (eine Stadt) | `getHomeHeading()`, `getLandingHeading(slug, fallback, locale, cityName)` |
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

## Überschriften (seit 2026-10-14)

Alle sichtbaren Sektions-Überschriften der Start-/Stadt-/Skill-Seiten sind editierbar, ohne
eigenen Speicher: sie liegen in dieser Datei (bzw. die Skill-H1 als `heroTitle` in
`skills.json`). Fehlt ein Eintrag oder ist er leer, rendert die Website den bisherigen festen
Text (Code-Default in `SITE_TEXT_DEFAULTS` / `HOME_HEADING_DEFAULT`) – das Live-Bild ändert sich
also erst, wenn jemand etwas einträgt. Auflösung Stadt-H1: eigener Eintrag → `_default` mit
`{stadt}` → `Eventkünstler in <Stadt>`.

Im Admin: Interface-Editor, Sektion anklicken → gelbes Feld „Überschrift" über dem Editor
(`kunstwolff-admin/src/components/interface/ueberschriften.ts` ordnet Sektion → Datei/Key zu;
die Standards dort müssen zu den Code-Defaults hier passen). Das Feld speichert nur
Abweichungen vom Standard.

Weiterhin **nicht** editierbar: die H1 der Kombiseiten (`Live <Skill> in <Stadt>`,
`<Skill> für <Anlass>`, in `[...kombi].astro` zusammengesetzt) und die Überschriften der
statischen Seiten (Team, Partner, Kontakt, FAQ-Seite, Referenzen, Galerie, Impressum,
Datenschutz, 404 – dort ist auch der Fließtext Code). FR-Overlay: neue Keys fallen dort auf
die deutschen Code-Defaults zurück (wie vorher, als sie fest im Code standen).

## Admin

- Interface-Editor → Überschrift-Feld je Sektion (siehe oben).
- `SiteTextsManager.tsx` → Tab „Startseiten-Texte" (contact/eventtypes/why).
- `IntroManager.tsx` → Interface-Editor, Komponente `landingIntro` (Default + Per-Stadt).
