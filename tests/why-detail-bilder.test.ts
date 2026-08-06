import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { aufloesenBildpfad } from '../src/utils/bildAufloesung';
import { aufgeloesteHighlights } from '../src/utils/whyHighlights';
import { getWhyBenefits } from '../src/utils/why';
import { WHY_DETAIL_LINKS } from '../src/utils/whyDetailLinks';
import { getBrandingContent } from '../src/utils/branding';
import { getCanvasContent } from '../src/utils/canvas';
import { getDuBistKunstContent } from '../src/utils/duBistKunst';
import { getStimmungDurchKunstContent } from '../src/utils/stimmungDurchKunst';

/**
 * Am 2026-07-30 zeigten vier Seiten tote Bilder: Mom hatte im Admin das Bild
 * der vierten Why-Karte getauscht, die alte Datei wurde gelöscht – aber die
 * vier Why-Detailseiten hielten den Pfad als eigene Kopie.
 *
 * Diese Tests halten fest, dass der Build so etwas nicht mehr ausliefern KANN.
 */

const existiert = (webPfad: string): boolean =>
  fs.existsSync(path.resolve('./public', webPfad.replace(/^\//, '')));

/**
 * Der Prüfwert wird AUS DEM ORDNER gelesen, nicht hineingeschrieben.
 *
 * Vorher stand hier ein fester Dateiname. Genau der wurde am 2026-08-06 im
 * Admin ausgetauscht — und der Test, der vor dem Bildwechsel schützen soll,
 * fiel selbst dem Bildwechsel zum Opfer. Ein Prüfwert, der bei jedem
 * Bildwechsel bricht, prüft am Ende nur noch sich selbst.
 */
const ersteDateiIn = (ordner: string): string => {
  const abs = path.resolve('./public', ordner.replace(/^\//, ''));
  const treffer = fs
    .readdirSync(abs)
    .filter((f) => /\.(webp|avif|jpe?g|png|gif|svg)$/i.test(f))
    .sort();
  if (treffer.length === 0) throw new Error(`Kein Bild in ${ordner} – Testvoraussetzung fehlt.`);
  return `${ordner}/${treffer[0]}`;
};

describe('aufloesenBildpfad', () => {
  it('lässt einen gültigen Pfad unverändert', () => {
    const echt = ersteDateiIn('/img/why/default/benefit-4');
    expect(existiert(echt)).toBe(true);
    expect(aufloesenBildpfad(echt)).toBe(echt);
  });

  it('nimmt das Bild, das jetzt im Ordner liegt – der echte Vorfall', () => {
    // Genau dieser Pfad stand nach Moms Bildwechsel noch in vier content.json.
    const tot = '/img/why/default/benefit-4/digital-caricaturist--ludwigshafen.webp';
    expect(existiert(tot)).toBe(false);

    const ersatz = aufloesenBildpfad(tot);
    expect(ersatz).not.toBe('');
    expect(existiert(ersatz)).toBe(true);
    expect(ersatz.startsWith('/img/why/default/benefit-4/')).toBe(true);
  });

  it('gibt leer zurück, wenn auch der Ordner weg ist', () => {
    // Leer heisst „kein Bild" – die Seite lässt das <img> dann weg. Ein
    // src="" wäre schlimmer: der Browser lädt damit die Seite selbst nochmal.
    expect(aufloesenBildpfad('/img/gibt/es/nicht/bild.webp')).toBe('');
  });

  it('weist Unfug ab, statt ihn durchzureichen', () => {
    expect(aufloesenBildpfad('')).toBe('');
    expect(aufloesenBildpfad(undefined)).toBe('');
    expect(aufloesenBildpfad(42)).toBe('');
    expect(aufloesenBildpfad('img/ohne/slash.webp')).toBe('');
    // Kein Ausbruch aus public/ – sonst könnte eine JSON Dateien ausserhalb
    // des Auslieferungsordners als „vorhanden" bestätigen.
    expect(aufloesenBildpfad('/../package.json')).toBe('');
  });
});

describe('aufgeloesteHighlights', () => {
  it('holt das Bild aus den Why-Karten statt aus der Kopie', () => {
    const benefits = getWhyBenefits();
    const [ergebnis] = aufgeloesteHighlights([
      {
        title: 'Das Format das sie brauchen',
        text: 'egal',
        image: '/img/why/default/benefit-4/laengst-geloescht.webp',
        alt: '',
        linkUrl: '',
        linkLabel: '',
      },
    ]);

    // /canvas/ ist Position 3 in WHY_DETAIL_LINKS – dessen Why-Karte zählt.
    expect(WHY_DETAIL_LINKS[3]).toBe('/canvas/');
    expect(ergebnis.image).toBe(benefits[3].image);
    expect(existiert(ergebnis.image)).toBe(true);
  });

  it('fällt auf den JSON-Pfad zurück, wenn die Karte nicht zuzuordnen ist', () => {
    const echt = '/img/slides/default/1_schnellzeichner_hq.webp';
    const [ergebnis] = aufgeloesteHighlights([
      { title: 'Irgendwas Eigenes', text: '', image: echt, alt: '', linkUrl: '', linkLabel: '' },
    ]);
    expect(ergebnis.image).toBe(echt);
  });

  it('lässt Titel und Text in Ruhe – nur der Bildpfad war das Problem', () => {
    const [ergebnis] = aufgeloesteHighlights([
      {
        title: 'Ihr Geschmack',
        text: 'Gekürzter Text nur für diese Seite.',
        image: '',
        alt: '',
        linkUrl: '',
        linkLabel: 'Mehr zu Stimmung',
      },
    ]);
    expect(ergebnis.title).toBe('Ihr Geschmack');
    expect(ergebnis.text).toBe('Gekürzter Text nur für diese Seite.');
    expect(ergebnis.linkLabel).toBe('Mehr zu Stimmung');
  });
});

describe('die vier Why-Detailseiten liefern kein totes Bild aus', () => {
  const seiten = {
    '/branding/': getBrandingContent(),
    '/canvas/': getCanvasContent(),
    '/du-bist-kunst/': getDuBistKunstContent(),
    '/stimmung-durch-kunst/': getStimmungDurchKunstContent(),
  };

  const bilderVon = (inhalt: unknown): string[] => {
    const raus: string[] = [];
    const gehe = (o: unknown): void => {
      if (Array.isArray(o)) o.forEach(gehe);
      else if (o && typeof o === 'object')
        for (const [k, v] of Object.entries(o)) {
          if (k === 'image' && typeof v === 'string') raus.push(v);
          else gehe(v);
        }
    };
    gehe(inhalt);
    return raus;
  };

  for (const [pfad, inhalt] of Object.entries(seiten)) {
    it(`${pfad} – jeder Bildpfad zeigt auf eine echte Datei`, () => {
      expect(inhalt).not.toBeNull();
      const bilder = bilderVon(inhalt);
      expect(bilder.length).toBeGreaterThan(0);
      const tote = bilder.filter((b) => b !== '' && !existiert(b));
      expect(tote).toEqual([]);
    });
  }

  it('zeigt in „Andere Besonderheiten" dasselbe Bild wie die Why-Karten', () => {
    const benefits = getWhyBenefits();
    for (const [pfad, inhalt] of Object.entries(seiten)) {
      for (const h of inhalt!.otherHighlights) {
        const ziel = h.linkUrl?.trim() || '';
        const position = WHY_DETAIL_LINKS.indexOf(ziel as (typeof WHY_DETAIL_LINKS)[number]);
        if (position < 0) continue;
        expect(h.image, `${pfad} → ${ziel}`).toBe(benefits[position].image);
      }
      // Die eigene Karte gehört nicht in „andere".
      expect(inhalt!.otherHighlights.some((h) => h.linkUrl?.trim() === pfad)).toBe(false);
    }
  });
});
