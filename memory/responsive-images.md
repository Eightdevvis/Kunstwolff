# Responsive Bilder (`srcset` / Varianten)

**Stand:** 2026-07-28 umgesetzt. Vorher stand im gesamten `src/` **kein einziges
`srcset`** – jedes Gerät lud die volle Datei, auch das Handy.

## Entscheidung: `public/` behalten, Varianten beim Bauen erzeugen

`public/` umgeht `astro:assets` grundsätzlich, es gibt dort also keine
automatischen Varianten. Ein Umzug nach `src/assets/` wurde **verworfen**: das
Admin-Tool schreibt nach `public/` und listet von dort – das ist die
Schnittstelle zwischen den Repos, keine interne Konvention.

Die Varianten liegen **nicht im Repo**, sondern entstehen nach dem Astro-Build
direkt in `dist/`. Lägen sie in `public/`, würden sie

- das Repo um ein Vielfaches aufblähen (dieselbe Krankheit wie die Duplikate),
- im Admin als vermeintlich eigene Bilder auftauchen (der `ImageManager` listet
  jede Bilddatei eines Ordners),
- bei jedem Upload-Vorgang als zusätzliche Blobs mitgeschleppt.

## Wie es zusammenhängt

| Datei | Rolle |
| :-- | :-- |
| `scripts/generate-image-variants.mjs` | erzeugt die Varianten in `dist/img/variants/…` (läuft als Teil von `npm run build`) |
| `src/utils/responsiveImages.ts` | baut `srcset`/`sizes` im Markup |
| `src/utils/webpSize.ts` | liest die Originalbreite aus dem WebP-Header |

Breiten: **400 / 800 / 1200**, dazu das Original als grösste Stufe.

## Die Falle, die hier lauert

**`srcset` verzeiht keinen fehlenden Kandidaten.** Wählt der Browser eine
Variante, die es nicht gibt, bleibt das Bild leer – anders als bei einem
kaputten `src` gibt es keinen zweiten Versuch.

Der erste Anlauf hatte genau diesen Fehler: das Skript überspringt jede Breite
`>= Original` (kein Hochskalieren), das Markup bot sie aber trotzdem an. Auf
`/trier/` fehlten dadurch 12 von 63 Kandidaten – alles Hochformate, die nur
1200px breit sind.

Deshalb gilt jetzt: **`buildSrcSet()` braucht die Originalbreite und filtert mit
derselben Bedingung wie das Skript.** Ohne bekannte Breite gibt es gar kein
`srcset` (lieber nur das Original als ein kaputtes Bild). Ein Test hält beide
Seiten aneinander (`tests/responsive-images.test.ts`).

Die Breite kommt aus `readWebpWidth()` – ein 32-Byte-Header-Leser ohne
Abhängigkeit, weil `sharp` asynchron ist und die Slide-Reader synchron sind.
Gegen `sharp` an allen 228 Slides geprüft: 228/228 identisch.

## Wirkung (gemessen 2026-07-28)

| Seite | Original | Handy (400w) | Ersparnis |
| :-- | --: | --: | --: |
| trier | 2,82 MB | 0,46 MB | 84 % |
| hochzeit | 3,38 MB | 0,56 MB | 83 % |
| firmenfeier | 3,08 MB | 0,58 MB | 81 % |
| messe | 2,59 MB | 0,49 MB | 81 % |
| frankfurt | 3,18 MB | 0,63 MB | 80 % |
| **Summe** | **15,05 MB** | **2,72 MB** | **82 %** |

Site-weit: 2983 `srcset`-Kandidaten auf 118 Seiten, **0 fehlend**.

## Kosten

Der Build dauert länger (671 Varianten, ~25 s zusätzlich). Das trifft nur den
Build, nicht die Besucher – und nicht das Repo.
