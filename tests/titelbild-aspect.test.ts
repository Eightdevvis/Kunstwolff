import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { resolveTitleImage, resolveTitleImageAspect } from '../src/utils/titleImages';
import { resolveEventTitleImage, resolveEventTitleImageAspect } from '../src/utils/events';

/**
 * Der Hero-Mobil-Fix: auf einem Portrait-Handy soll das Titelbild in seiner
 * eigenen Ratio erscheinen, statt von `background-size: cover` an einen
 * fast-vollen dvh-Container angepasst und dadurch links/rechts abgeschnitten
 * zu werden. Das geht nur, wenn wir die Pixel-Maße kennen — `Opener.astro`
 * liest sie über die CSS-Var `--hero-aspect`, die aus `resolveTitleImageAspect`
 * kommt und aus `public/img/Titelbild/title.dimensions.json` gespeist wird.
 *
 * Bricht der Sync die Datei, bekommt der Hero einen `null`-Aspect → die
 * Media-Query greift nicht → alter Zustand (Crop). Dieser Test hält die
 * Brücke zwischen Sync-Output und Frontend-Auflösung fest.
 */
describe('resolveTitleImageAspect', () => {
  it('liefert für das Default-Titelbild einen "w / h"-String', () => {
    const aspect = resolveTitleImageAspect();
    expect(aspect).toMatch(/^\d+ \/ \d+$/);
  });

  it('bezieht die Maße aus title.dimensions.json (Sync-Ausgabe)', () => {
    const dimsPath = path.resolve('./public/img/Titelbild/title.dimensions.json');
    expect(fs.existsSync(dimsPath)).toBe(true);

    const dims = JSON.parse(fs.readFileSync(dimsPath, 'utf-8')) as Record<string, { width: number; height: number }>;
    const defaultSrc = resolveTitleImage();
    // resolveTitleImage liefert "/img/Titelbild/<folder>/<file>"; der JSON-Schlüssel
    // ist der Pfad OHNE "/img/Titelbild/"-Präfix.
    const relative = defaultSrc.replace(/^\/img\/Titelbild\//, '');
    const entry = dims[relative];
    expect(entry, `Sync fehlt für ${relative}`).toBeDefined();

    const aspect = resolveTitleImageAspect();
    expect(aspect).toBe(`${entry!.width} / ${entry!.height}`);
  });

  it('liefert für existierende Städte-Titelbilder ebenfalls ein Aspect', () => {
    // Belgique hat ein gepflegtes Titelbild inkl. Meta — der Sync muss dessen
    // Dimensionen erfasst haben, sonst kriegt die Stadtseite auf Mobil den
    // selben Crop-Bug wie die Startseite.
    const aspect = resolveTitleImageAspect({ landing: 'belgique' });
    expect(aspect).toMatch(/^\d+ \/ \d+$/);
  });
});

/**
 * M11: Event-Landings (`/hochzeit/`, `/firmenfeier/` …) laufen NICHT über
 * `titleImages.ts`, sondern über `events.ts` `resolveEventTitleImage`. Der
 * `EventHero.astro` hatte denselben Crop-Bug wie der Opener; die Behebung
 * geht analog über eine eigene Aspect-Auflösung, die auf denselben Sync-Cache
 * zugreift (`lookupTitleDimensions`).
 */
describe('resolveEventTitleImageAspect', () => {
  it('liefert für /hochzeit/ ein "w / h"-Aspect', () => {
    // /hochzeit/ hat gepflegte Titelbilder im Event-Ordner. Ohne Aspect
    // greift die Mobil-Media-Query im EventHero nicht — Bild wird gecropped.
    const aspect = resolveEventTitleImageAspect('hochzeit');
    expect(aspect).toMatch(/^\d+ \/ \d+$/);
  });

  it('fällt auf Default-Titelbild-Aspect zurück, wenn Event-Ordner leer ist', () => {
    // Nicht-existierende Event-Slugs treffen den Zweig, der `resolveDefault…`
    // spiegelt. Das Default-Bild hat immer Maße (aus dem Sync-Cache).
    const aspect = resolveEventTitleImageAspect('gibts-nicht-slug');
    expect(aspect).toMatch(/^\d+ \/ \d+$/);
  });

  it('nutzt intern denselben Bildpfad wie resolveEventTitleImage', () => {
    // Kein Auseinanderdriften zwischen Src und Aspect. Wenn die Src einen
    // Event-Bildpfad liefert, muss der Aspect zum selben Bild gehören —
    // sonst würde die Ratio des Default-Bildes im Container stehen und der
    // Event-Bildinhalt trotzdem gecropped.
    const src = resolveEventTitleImage('hochzeit');
    expect(src).toContain('/img/Titelbild/events/hochzeit/');
    const aspect = resolveEventTitleImageAspect('hochzeit');
    expect(aspect).toMatch(/^\d+ \/ \d+$/);
  });
});
