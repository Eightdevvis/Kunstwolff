import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildSrcSet,
  variantSrc,
  VARIANT_WIDTHS,
  VARIANT_SOURCES,
  SLIDESHOW_SIZES,
  SRCSET_AKTIV,
  heroSrcSet,
  heroHintergrundVarianten,
} from '../src/utils/responsiveImages';
// Kein @ts-expect-error mehr nötig: allowJs löst die .mjs-Typen inzwischen
// auf, und eine überflüssige Direktive ist selbst ein Typfehler (TS2578).
import {
  variantPath,
  VARIANT_WIDTHS as SKRIPT_WIDTHS,
  VARIANT_SOURCES as SKRIPT_SOURCES,
} from '../scripts/generate-image-variants.mjs';
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
  it.runIf(SRCSET_AKTIV)('bietet nur Stufen unterhalb des Originals an', () => {
    // Das Build-Skript ueberspringt jede Breite >= Original (kein Hochskalieren).
    const set = buildSrcSet('/img/slides/trier/bild.webp', 1000);
    expect(set).toContain('-400.webp 400w');
    expect(set).toContain('-800.webp 800w');
    expect(set).not.toContain('-1200.webp');
    // Das Original bleibt als groesste Stufe drin.
    expect(set).toContain('/img/slides/trier/bild.webp 1000w');
  });

  it.runIf(!SRCSET_AKTIV)('liefert bei gezogener Notbremse gar nichts', () => {
    // SRCSET_AKTIV = false ist ein bewusster Zustand, kein Versehen: solange
    // nicht bewiesen ist, dass die Varianten in der PRODUKTION ankommen, ist
    // "nur das Original" die einzig sichere Auslieferung. Ein fehlender
    // srcset-Kandidat zeigt gar kein Bild.
    expect(buildSrcSet('/img/slides/trier/bild.webp', 1000)).toBe('');
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

describe('Nur Ordner mit Varianten bekommen ein srcset', () => {
  // Der Generator läuft über GENAU drei Ordner. Ein srcset auf einen anderen
  // Ordner verspricht Dateien, die nie erzeugt wurden – und der Browser zeigt
  // dann gar kein Bild, nicht einmal das Original. Beim Nachrüsten der Heroes
  // wäre das um ein Haar passiert: `hero-bg` liegt ausserhalb der drei.
  it('Markup-Liste und Skript-Liste sind dieselben Ordner', () => {
    const ausMarkup = [...VARIANT_SOURCES].map((o) => o.replace(/^\/|\/$/g, '')).sort();
    const ausSkript = [...(SKRIPT_SOURCES as string[])].sort();
    expect(ausMarkup).toEqual(ausSkript);
  });

  it('gibt für Ordner ohne Varianten kein srcset aus', () => {
    for (const pfad of ['/img/team/gabriele.webp', '/img/hero-bg/koeln/bild.webp', '/img/samples/sample1.webp']) {
      expect(buildSrcSet(pfad, 2000), pfad).toBe('');
      expect(heroSrcSet(pfad), pfad).toBe('');
    }
  });

  it('gibt für ein AVIF kein srcset aus – der Generator kann nur WebP', () => {
    expect(heroSrcSet('/img/Titelbild/default/titelbild.avif')).toBe('');
  });

  it('findet die Breite eines echten Titelbilds und baut daraus Stufen', () => {
    const echtes = '/img/Titelbild/berlin/live-painter-trade-fair.webp';
    const srcset = heroSrcSet(echtes);
    // Nur prüfen, wenn die Datei im Repo liegt – sonst ist der Test wertlos.
    if (!fs.existsSync(path.resolve('./public' + echtes))) return;
    expect(srcset).toContain('/img/variants/img/Titelbild/berlin/live-painter-trade-fair-400.webp 400w');
    expect(srcset.endsWith('w')).toBe(true);
  });
});

describe('Hero-Hintergrund: nur Stufen, die es wirklich gibt', () => {
  // DER Fehler dieses Bereichs, hier in seiner zweiten Auflage. Der erste
  // Anlauf las die vorhandenen Stufen aus dem srcset-String zurueck – und
  // uebersah, dass dort auch das ORIGINAL mit seiner eigenen Breite steht.
  // Ein 1200px breites Original erzeugte den Eintrag "… 1200w", also wurde
  // eine 1200er-Variante angeboten, die das Build-Skript nie erzeugt
  // (es ueberspringt jede Breite >= Original). 13 tote Kandidaten, gefunden
  // erst am gebauten dist/.
  it('bietet keine Stufe an, die so breit ist wie das Original', () => {
    const bilder = fs.existsSync(path.resolve('./public/img/Titelbild'))
      ? fs
          .readdirSync(path.resolve('./public/img/Titelbild'), { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .flatMap((d) => {
            const ordner = path.resolve('./public/img/Titelbild', d.name);
            return fs
              .readdirSync(ordner)
              .filter((f) => f.toLowerCase().endsWith('.webp'))
              .map((f) => ({ web: `/img/Titelbild/${d.name}/${f}`, datei: path.join(ordner, f) }));
          })
      : [];

    expect(bilder.length).toBeGreaterThan(0);

    for (const { web, datei } of bilder) {
      const breite = readWebpWidth(datei) ?? 0;
      const varianten = heroHintergrundVarianten(web);
      if (varianten.w800) expect(breite, `${web}: 800er angeboten`).toBeGreaterThan(800);
      if (varianten.w1200) expect(breite, `${web}: 1200er angeboten`).toBeGreaterThan(1200);
    }
  });

  it('bietet fuer ein AVIF und fuer fremde Ordner gar nichts an', () => {
    expect(heroHintergrundVarianten('/img/Titelbild/default/titelbild.avif')).toEqual({});
    expect(heroHintergrundVarianten('/img/hero-bg/koeln/bild.webp')).toEqual({});
  });
});
