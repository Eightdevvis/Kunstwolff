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

## Grösse – neue Logos verkleinern!

Die Logos werden **nirgends gross gezeigt**: der Streifen gibt ihnen rund
114×44 px, das Gitter genau 160×48 px. Trotzdem lagen hier am 2026-08-16
33 WebP mit 342 KB – darunter ein Logo mit 3840×1055 px und eines mit 90 KB.

Der Streifen steht weit oben und lädt `eager`; diese 342 KB gingen also **vor**
den Bildern der Slideshow über die Leitung, die `lazy` geladen werden. Genau
daher kam die Meldung „die Slider-Bilder laden so langsam".

```
node scripts/verkleinere-referenzlogos.mjs              # nur zeigen
node scripts/verkleinere-referenzlogos.mjs --schreiben  # anwenden
```

Deckel: 320×96 px (doppelte Anzeigegrösse fürs Retina-Display), WebP q82,
Seitenverhältnis bleibt. Ergebnis 342 KB → 91 KB. Das Skript **ersetzt** die
Quelldatei (das Original bleibt über die Git-Historie erreichbar) und ist
idempotent – nach jedem neuen Logo einfach noch einmal laufen lassen. SVGs
werden nicht angefasst, die sind ohnehin Vektor.

Kein `srcset` und keine Varianten: eine 400er-Stufe wäre für einen 44-px-Platz
immer noch zu gross, und drei Stufen für ein 2-KB-Logo sind Aufwand ohne Ertrag.

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
