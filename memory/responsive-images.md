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

## Die Erzeugung haengt am Astro-Build, nicht am Build-Befehl

`astro.config.mjs` bindet eine kleine Integration ein, die an
`astro:build:done` `generateVariants()` ruft.

**Nicht** als `astro build && node scripts/…` am Build-Befehl. Genau so stand es
zuerst da, und es ging schief: lokal lief es, auf **Vercel nicht** – dort läuft
der eigene Astro-Build, der zweite Teil wurde abgeschnitten. Ergebnis: das
ausgelieferte Markup versprach Varianten, die es in der Produktion nie gab, und
`srcset` kennt keinen Rückfall. Es war live, 20 von 20 geprüften Kandidaten auf
`/trier/` lieferten 404.

Als Integration kann der Schritt nicht mehr übersprungen werden – egal, wer den
Build anstösst und wie.

## Der Schalter `SRCSET_AKTIV`

In `responsiveImages.ts`. **Erst einschalten, wenn die Varianten in der
PRODUKTION nachweislich ankommen** – nicht, wenn `dist/` lokal gut aussieht.
Die Testsuite deckt beide Zustände ab und bleibt in beiden grün.

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

## `sizes` je Bühne

| Konstante | Für | Wert |
| :-- | :-- | :-- |
| `SLIDESHOW_SIZES` | eine Bühne, ~700 px | `(max-width: 640px) 100vw, (max-width: 1200px) 60vw, 700px` |
| `GALLERY_SIZES` | Galerie-Gitter, Kacheln ~220–300 px | `(max-width: 480px) 50vw, (max-width: 900px) 33vw, 300px` |

Die zweite gibt es seit der Galerie (2026-07-30). Mit den Slideshow-Werten lüde
das Gitter für **jede** der ~230 Kacheln die große Variante – der teuerste
Copy-Paste-Fehler in diesem Bereich, weil er visuell nicht auffällt. Ein Test
hält die beiden auseinander.

## ⚠️ Welche Ordner Varianten bekommen

`quellen` in `scripts/generate-image-variants.mjs`: **nur** `img/slides`,
`img/Titelbild`, `img/why`.

Alles andere unter `public/img/` hat **keine** Varianten – dort darf kein
`srcset` ausgeliefert werden, sonst zeigt der Browser gar kein Bild. Betrifft
aktuell `img/team` (siehe `content-team.md`): die beiden Portraits liegen
stattdessen fertig zugeschnitten im Repo, und `tests/team.test.ts` prüft, dass
niemand dort ein `srcset` ergänzt, ohne den Ordner vorher in `quellen`
aufzunehmen.

## Kosten

Der Build dauert länger (671 Varianten, ~25 s zusätzlich). Das trifft nur den
Build, nicht die Besucher – und nicht das Repo.
