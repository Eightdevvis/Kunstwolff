import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildSrcSet, variantSrc, VARIANT_WIDTHS, SLIDESHOW_SIZES } from '../src/utils/responsiveImages';
// @ts-expect-error – reines JS-Modul ohne Typen, wie die übrigen scripts/
import { variantPath, VARIANT_WIDTHS as SKRIPT_WIDTHS } from '../scripts/generate-image-variants.mjs';
import { readWebpWidth } from '../src/utils/webpSize';

describe('Varianten-Pfade – Markup und Build-Skript müssen sich treffen', () => {
  // Der teuerste Fehler in diesem Bereich: das Markup verspricht eine Datei,
  // die das Skript nie erzeugt. srcset kennt dafür KEINEN Rückfall – der
  // Browser lädt den gewählten Kandidaten oder zeigt nichts.
  it('erzeugt identische Pfade auf beiden Seiten', () => {
    for (const rel of [
      'img/slides/trier/bild.webp',
      'img/slides/events/hochzeit/paar.webp',
      'img/Titelbild/berlin/hero.webp',
    ]) {
      for (const w of VARIANT_WIDTHS) {
        expect(variantSrc(`/${rel}`, w), `${rel}@${w}`).toBe(`/${variantPath(rel, w)}`);
      }
    }
  });

  it('nutzt dieselben Breiten', () => {
    expect([...VARIANT_WIDTHS]).toEqual([...SKRIPT_WIDTHS]);
  });
});

describe('buildSrcSet', () => {
  it('bietet nur Stufen unterhalb des Originals an', () => {
    // Das Build-Skript ueberspringt jede Breite >= Original (kein Hochskalieren).
    const set = buildSrcSet('/img/slides/trier/bild.webp', 1000);
    expect(set).toContain('-400.webp 400w');
    expect(set).toContain('-800.webp 800w');
    expect(set).not.toContain('-1200.webp');
    // Das Original bleibt als groesste Stufe drin.
    expect(set).toContain('/img/slides/trier/bild.webp 1000w');
  });

  it('liefert gar nichts, wenn die Breite unbekannt ist', () => {
    // Lieber nur das Original ausliefern als einen Kandidaten versprechen,
    // den es vielleicht nicht gibt.
    expect(buildSrcSet('/img/slides/trier/bild.webp')).toBe('');
    expect(buildSrcSet('/img/slides/trier/bild.webp', 0)).toBe('');
  });

  it('liefert gar nichts, wenn schon die kleinste Stufe zu gross waere', () => {
    expect(buildSrcSet('/img/slides/trier/klein.webp', 320)).toBe('');
  });

  it('ruehrt fremde Pfade nicht an', () => {
    expect(buildSrcSet('https://example.com/bild.webp', 2000)).toBe('');
    expect(buildSrcSet('/andere/bild.webp', 2000)).toBe('');
  });

  it('haelt sizes und Breiten plausibel zusammen', () => {
    expect(SLIDESHOW_SIZES).toContain('100vw');
    expect(Math.max(...VARIANT_WIDTHS)).toBeLessThanOrEqual(1600);
  });
});

describe('readWebpWidth', () => {
  const slidesRoot = path.resolve('./public/img/slides');

  it('liest die Breite echter Slides', () => {
    const einSlide = fs
      .readdirSync(slidesRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .flatMap((d) =>
        fs
          .readdirSync(path.join(slidesRoot, d.name))
          .filter((f) => f.endsWith('.webp'))
          .map((f) => path.join(slidesRoot, d.name, f))
      )
      .slice(0, 5);

    expect(einSlide.length).toBeGreaterThan(0);
    for (const datei of einSlide) {
      const breite = readWebpWidth(datei);
      expect(breite, datei).toBeGreaterThan(0);
      // MAX_EDGE ist 1600 – breiter darf nach Phase 3 nichts mehr sein.
      expect(breite, datei).toBeLessThanOrEqual(1600);
    }
  });

  it('gibt null statt zu werfen, wenn die Datei nicht taugt', () => {
    expect(readWebpWidth('/gibt/es/nicht.webp')).toBeNull();
    expect(readWebpWidth(path.resolve('./package.json'))).toBeNull();
  });
});
