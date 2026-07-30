import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { GALERIE_URL, getGalleryData, tagLabel } from '../src/utils/gallery';
import { getAllSlidesWithTags } from '../src/utils/slideImages';
import { GALLERY_SIZES, SLIDESHOW_SIZES } from '../src/utils/responsiveImages';

const pagesDir = path.resolve('./src/pages');

describe('Galerie-Route', () => {
  // Gleicher Schutz wie tests/nav-routes.test.ts (WEB-001): ein getippter Pfad,
  // dessen Route anders heisst, ist ein 404 auf jeder Unterseite gleichzeitig –
  // der Link steht in der Slideshow und damit auf fast jeder Seite.
  it('GALERIE_URL hat eine echte Seite', () => {
    const seg = GALERIE_URL.replace(/^\/+/, '').replace(/\/+$/, '');
    const kandidaten = [`${seg}.astro`, path.join(seg, 'index.astro')];
    const treffer = kandidaten.some((rel) => {
      const abs = path.join(pagesDir, rel);
      if (!fs.existsSync(abs)) return false;
      // Case-sensitiv abgleichen, damit der Test auch auf case-insensitiven
      // Dateisystemen greift.
      return fs.readdirSync(path.dirname(abs)).includes(path.basename(abs));
    });
    expect(treffer, `keine Route zu ${GALERIE_URL}`).toBe(true);
  });

  it('die Slideshow verlinkt die Galerie über die Konstante, nicht per Handeingabe', () => {
    const quelle = fs.readFileSync(
      path.resolve('./src/components/slideshows/Slideshow.astro'),
      'utf-8',
    );
    expect(quelle).toContain('GALERIE_URL');
    // Der Link muss in der KOMPONENTE stehen, nicht in den einzelnen Seiten –
    // nur so hängt er unter jedem "Unsere Kunst"-Banner.
    expect(quelle).toContain('Unsere Kunst');
  });
});

describe('getAllSlidesWithTags', () => {
  const slides = getAllSlidesWithTags();

  it('findet den gesamten Bestand', () => {
    expect(slides.length).toBeGreaterThan(100);
  });

  it('deckt alle Slide-Ordner ab, auch die eine Ebene tiefer', () => {
    // Event-Slides (`events/<slug>/`) fielen vor 2026-07-26 aus jeder Abfrage
    // heraus, weil der Walk nur eine Ebene tief ging. Die Galerie behauptet
    // "alle Bilder" – dieser Test ist der Beleg dafür.
    const ordner = new Set(slides.map((s) => s.key.split('/').slice(0, -1).join('/')));
    expect(ordner.has('default')).toBe(true);
    expect([...ordner].some((o) => o.startsWith('events/'))).toBe(true);
  });

  it('liefert Key und Tag-Block zu jedem Bild', () => {
    for (const slide of slides) {
      expect(slide.key, slide.src).toBeTruthy();
      expect(slide.key.startsWith('/'), slide.key).toBe(false);
      expect(slide.tags, slide.key).toBeTypeOf('object');
    }
  });

  it('nennt jedes Bild nur einmal', () => {
    const gesehen = new Set(slides.map((s) => s.src));
    expect(gesehen.size).toBe(slides.length);
  });

  it('sortiert nach priority, dann nach Pfad', () => {
    for (let i = 1; i < slides.length; i += 1) {
      const vorher = slides[i - 1]!;
      const jetzt = slides[i]!;
      const pv = vorher.priority ?? 0;
      const pj = jetzt.priority ?? 0;
      expect(pv, `${vorher.key} vor ${jetzt.key}`).toBeGreaterThanOrEqual(pj);
      if (pv === pj) {
        expect(vorher.src.localeCompare(jetzt.src)).toBeLessThanOrEqual(0);
      }
    }
  });
});

describe('getGalleryData', () => {
  const { bilder, facets, ohneTags } = getGalleryData();

  it('zeigt genau den Bestand – die Galerie filtert nicht vor', () => {
    expect(bilder.length).toBe(getAllSlidesWithTags().length);
  });

  it('kennt alle drei Tag-Dimensionen', () => {
    expect(facets.map((f) => f.dimension)).toEqual(['skills', 'events', 'landings']);
  });

  it('bietet keinen Chip an, der zu null Bildern führt', () => {
    // Das Vokabular entfernt absichtlich NIE einen Tag (siehe memory/tag-system.md).
    // Würden die Chips daraus entstehen statt aus dem Bestand, führte jeder
    // verwaiste Tag – etwa eine entfernte Stadt – in eine leere Galerie.
    for (const facet of facets) {
      for (const tag of facet.tags) {
        expect(tag.count, `${facet.dimension}:${tag.slug}`).toBeGreaterThan(0);
        const echt = bilder.filter((b) => b.tagListe.includes(`${facet.dimension}:${tag.slug}`));
        expect(echt.length, `${facet.dimension}:${tag.slug}`).toBe(tag.count);
      }
    }
  });

  it('macht jeden Tag am Bestand auch anklickbar', () => {
    // Die Gegenrichtung: ein Tag an einem Bild, für den es keinen Chip gibt,
    // wäre unerreichbar – etwa weil er im Vokabular fehlt.
    const angeboten = new Set(
      facets.flatMap((f) => f.tags.map((t) => `${f.dimension}:${t.slug}`)),
    );
    const fehlend = [...new Set(bilder.flatMap((b) => b.tagListe))].filter(
      (t) => !angeboten.has(t),
    );
    expect(fehlend).toEqual([]);
  });

  it('beschriftet jeden Chip lesbar', () => {
    for (const facet of facets) {
      for (const tag of facet.tags) {
        expect(tag.label.trim(), `${facet.dimension}:${tag.slug}`).not.toBe('');
        // Ein Chip darf nicht wie ein Slug aussehen: kleingeschrieben mit
        // Bindestrichen ist die Ablage-Schreibweise, nicht die Anzeige.
        expect(tag.label, `${facet.dimension}:${tag.slug}`).not.toMatch(/^[a-z0-9-]+$/);
      }
    }
  });

  it('sortiert die Orte alphabetisch', () => {
    const orte = facets.find((f) => f.dimension === 'landings')!.tags.map((t) => t.label);
    expect(orte).toEqual([...orte].sort((a, b) => a.localeCompare(b, 'de')));
  });

  it('findet jedes Bild über seinen eigenen Suchtext', () => {
    // Der Suchtext ist das, was das Suchfeld durchsucht. Ist er leer, ist das
    // Bild über die Suche unauffindbar.
    for (const bild of bilder) {
      expect(bild.suchtext.trim(), bild.key).not.toBe('');
      expect(bild.suchtext).toBe(bild.suchtext.toLowerCase());
    }
  });

  it('macht Bilder über ihren Ort-Tag im Klartext findbar', () => {
    // "Köln" statt "koeln": der Suchtext trägt Slug UND Label, sonst findet die
    // ausgeschriebene Schreibweise nichts – und genau die tippt ein Besucher.
    const koeln = bilder.filter((b) => b.tagListe.includes('landings:koeln'));
    for (const bild of koeln) {
      expect(bild.suchtext, bild.key).toContain('köln');
    }
  });

  it('zählt die ungetaggten Bilder ehrlich', () => {
    expect(ohneTags).toBe(bilder.filter((b) => b.tagListe.length === 0).length);
  });
});

describe('tagLabel', () => {
  it('nimmt ein gepflegtes Label aus dem Vokabular', () => {
    expect(tagLabel('private-feier', 'Private Feier')).toBe('Private Feier');
  });

  it('ignoriert ein Label, das nur der Slug ist', () => {
    // `landings.md` liefert kleingeschriebene Slugs als Label – daraus darf kein
    // Chip "koeln" werden.
    expect(tagLabel('koeln', 'koeln')).toBe('Köln');
  });

  it('schreibt Umlaut-Slugs aus der Ausnahmeliste korrekt', () => {
    expect(tagLabel('saarbruecken')).toBe('Saarbrücken');
    expect(tagLabel('duesseldorf')).toBe('Düsseldorf');
    expect(tagLabel('bw')).toBe('Baden-Württemberg');
  });

  it('rät Umlaute NICHT generisch', () => {
    // Eine Regel `ue → ü` würde hier zuschlagen und "Neüwied" erzeugen. Deshalb
    // Ausnahmeliste statt Ersetzung.
    expect(tagLabel('neuwied')).toBe('Neuwied');
  });

  it('behält Bindestriche in zusammengesetzten Namen', () => {
    expect(tagLabel('rhein-main-gebiet')).toBe('Rhein-Main-Gebiet');
    expect(tagLabel('main-taunus-kreis')).toBe('Main-Taunus-Kreis');
  });
});

describe('sizes-Angaben', () => {
  it('unterscheiden Gitter und Bühne', () => {
    // Mit SLIDESHOW_SIZES ('...700px') lüde jede der ~230 Kacheln die grosse
    // Variante. Ein Copy-Paste hier ist teuer und fällt visuell nicht auf.
    expect(GALLERY_SIZES).not.toBe(SLIDESHOW_SIZES);
    expect(GALLERY_SIZES).toContain('300px');
  });
});
