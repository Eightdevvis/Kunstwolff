/**
 * Galerie – der vollständige Bildbestand auf einer Seite, filterbar nach Tags
 * und durchsuchbar.
 *
 * Warum es diese Seite gibt: bis hierhin zeigte JEDE Slideshow nur einen
 * Ausschnitt – die Startseite die kuratierte Auswahl aus `default-selection.json`,
 * Stadt- und Event-Seiten die Bilder mit dem passenden Tag. Den gesamten Bestand
 * konnte niemand sehen, obwohl er längst da war und seit dem Tag-System
 * (`memory/tag-system.md`) auch durchgängig beschriftet ist.
 *
 * Vorbild ist die FAQ-Seite: eine Seite, die den kompletten Inhalt eines Typs
 * zeigt, mit Suchfeld und Themen-Chips davor. Der Unterschied liegt in den Chips:
 * FAQ schreibt ein Schlagwort ins Suchfeld, die Galerie filtert je Dimension und
 * verknüpft die Dimensionen mit UND – dieselbe Semantik, mit der
 * `matchesFAQContext` und `getSlidesByTag` serverseitig auswählen. Ein Klick auf
 * "Szenenmaler" + "Hochzeit" + "Trier" heißt also genau das, und nicht
 * "irgendetwas davon".
 *
 * Gefiltert wird im BROWSER, nicht auf dem Server. Serverseitig wären das drei
 * Dimensionen × ~50 Tags als je eigene gebaute Seite (plus alle Kombinationen),
 * nur damit jemand zwei Chips klicken kann. Der Bestand ist mit gut 230 Bildern
 * klein genug, dass eine Seite ihn tragen kann – die `<img>`-Tags stehen alle im
 * HTML, die Bytes holt der Browser per `loading="lazy"` erst beim Scrollen.
 */

import fs from 'fs';
import path from 'path';
import { getAllSlidesWithTags, type TaggedSlide, type TagDimension } from './slideImages';

/**
 * Die URL der Galerie an EINER Stelle.
 *
 * Sie wird von zwei Seiten gebraucht (Slideshow-Link und die Seite selbst) und
 * von `tests/gallery.test.ts` gegen die vorhandenen Routen geprüft. Ein
 * getippter Pfad in der Komponente wäre genau der Fehler, den WEB-001 schon
 * einmal produziert hat: Link auf `/faq`, Route hieß `/FAQ`.
 */
export const GALERIE_URL = '/galerie/';

/** Ein Tag-Chip: Slug zum Filtern, Label zum Lesen, Anzahl als Erwartungswert. */
export type GalleryTag = {
  slug: string;
  label: string;
  count: number;
};

/** Eine Filtergruppe = eine Tag-Dimension. */
export type GalleryFacet = {
  dimension: TagDimension;
  label: string;
  tags: GalleryTag[];
};

/** Ein Bild, angereichert um das, was der Client zum Filtern braucht. */
export type GalleryImage = TaggedSlide & {
  /** Alles Durchsuchbare in Kleinschreibung: Alt-Text, Titel, Pfad, Tag-Slugs UND Tag-Labels. */
  suchtext: string;
  /** Tags als `dimension:slug`, damit ein Chip-Klick pro Dimension prüfen kann. */
  tagListe: string[];
};

export type GalleryData = {
  bilder: GalleryImage[];
  facets: GalleryFacet[];
  /** Bilder ohne jeden Tag. Sie sind über die Chips nicht erreichbar – nur über "Alle". */
  ohneTags: number;
};

const tagsConfigPath = path.resolve('./public/config/tags.json');

/** Reihenfolge und Beschriftung der Filtergruppen: erst was, dann wofür, dann wo. */
const DIMENSIONEN: Array<{ dimension: TagDimension; label: string }> = [
  { dimension: 'skills', label: 'Kunstform' },
  { dimension: 'events', label: 'Anlass' },
  { dimension: 'landings', label: 'Ort' },
];

/**
 * Slugs, die sich nicht automatisch in eine lesbare Form bringen lassen.
 *
 * Hintergrund: Ort-Slugs schreiben Umlaute aus (`koeln`, `saarbruecken` – siehe
 * `memory/tag-system.md`), und diese Abbildung ist NICHT umkehrbar. Eine
 * generische Regel `ue → ü` würde aus `neuwied` ein `neüwied` machen. Deshalb
 * eine kurze, ausdrückliche Liste statt Ratens.
 *
 * Diese Labels sind reine ANZEIGE. Trägt ein Tag in `tags.json` ein eigenes
 * Label (weil Jenny es im Admin gesetzt hat), gewinnt immer dieses – der Sync
 * benennt vorhandene Labels bewusst nie um, und diese Liste tut es auch nicht.
 */
const LABEL_AUSNAHMEN: Record<string, string> = {
  bw: 'Baden-Württemberg',
  duesseldorf: 'Düsseldorf',
  giessen: 'Gießen',
  koeln: 'Köln',
  'nord-rhein-westfalen': 'Nordrhein-Westfalen',
  saarbruecken: 'Saarbrücken',
  tuebingen: 'Tübingen',
};

/** `rhein-main-gebiet` → `Rhein-Main-Gebiet`. Bindestriche bleiben, sie gehören zum Namen. */
const titelFall = (slug: string): string =>
  slug
    .split('-')
    .map((teil) => (teil ? teil.charAt(0).toUpperCase() + teil.slice(1) : teil))
    .join('-');

/**
 * Vokabular aus `public/config/tags.json`: Slug → Label, je Dimension.
 *
 * Fehlt die Datei oder ist sie kaputt, bleibt die Galerie benutzbar – die Labels
 * werden dann aus den Slugs gebildet. Ein leerer Chip-Bereich wäre die
 * schlechtere Antwort auf einen Konfigurationsfehler.
 */
const leseVokabular = (): Record<TagDimension, Map<string, string>> => {
  const leer: Record<TagDimension, Map<string, string>> = {
    skills: new Map(),
    events: new Map(),
    landings: new Map(),
  };

  if (!fs.existsSync(tagsConfigPath)) return leer;

  try {
    const roh = JSON.parse(fs.readFileSync(tagsConfigPath, 'utf-8')) as unknown;
    if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return leer;

    for (const { dimension } of DIMENSIONEN) {
      const liste = (roh as Record<string, unknown>)[dimension];
      if (!Array.isArray(liste)) continue;

      for (const eintrag of liste) {
        if (!eintrag || typeof eintrag !== 'object') continue;
        const { slug, label } = eintrag as { slug?: unknown; label?: unknown };
        if (typeof slug !== 'string' || !slug.trim()) continue;
        leer[dimension].set(
          slug.trim().toLowerCase(),
          typeof label === 'string' ? label.trim() : '',
        );
      }
    }
  } catch {
    return leer;
  }

  return leer;
};

/**
 * Anzeigename eines Tags.
 *
 * Rangfolge: Label aus dem Vokabular, wenn es sich vom Slug unterscheidet (dann
 * ist es gepflegt) → Ausnahmeliste → Titelfall des Slugs. Die Ort-Labels sind im
 * Vokabular derzeit mit dem Slug identisch (`landings.md` liefert nur
 * kleingeschriebene Slugs), weshalb Schritt 2 überhaupt existiert.
 */
export const tagLabel = (slug: string, vokabularLabel?: string): string => {
  const normalisiert = slug.trim().toLowerCase();
  if (vokabularLabel && vokabularLabel.toLowerCase() !== normalisiert) {
    return vokabularLabel;
  }
  return LABEL_AUSNAHMEN[normalisiert] ?? titelFall(normalisiert);
};

const dimensionTags = (slide: TaggedSlide, dimension: TagDimension): string[] => {
  const werte = slide.tags?.[dimension];
  return Array.isArray(werte) ? werte.map((t) => t.trim().toLowerCase()).filter(Boolean) : [];
};

/**
 * Der komplette Datensatz für die Galerie-Seite.
 *
 * Chips entstehen aus dem BESTAND, nicht aus dem Vokabular: gezählt wird, was an
 * Bildern hängt, das Vokabular liefert nur die Beschriftung. Sonst gäbe es Chips,
 * die auf eine leere Galerie führen (das Vokabular entfernt absichtlich nie
 * etwas, auch nicht bei verschwundenen Städten), und umgekehrt Tags an Bildern,
 * die niemand anklicken könnte, weil sie im Vokabular fehlen.
 *
 * Sortierung der Chips: Kunstform und Anlass in Vokabular-Reihenfolge – die ist
 * kuratiert (Seeds aus `events.json` zuerst). Orte alphabetisch, weil eine Liste
 * mit 35 Städten zum Suchen da ist und nicht zum Lesen.
 */
export const getGalleryData = (): GalleryData => {
  const vokabular = leseVokabular();
  const slides = getAllSlidesWithTags();

  const bilder: GalleryImage[] = slides.map((slide) => {
    const tagListe: string[] = [];
    // Set, weil Slug und Label bei Skills identisch sind (`schnellzeichner` /
    // `Schnellzeichner`, im Suchtext ohnehin kleingeschrieben). Doppelt bringt
    // der Substring-Suche nichts und steht 232 Mal im HTML.
    const labels = new Set<string>();

    for (const { dimension } of DIMENSIONEN) {
      for (const slug of dimensionTags(slide, dimension)) {
        tagListe.push(`${dimension}:${slug}`);
        labels.add(slug);
        labels.add(tagLabel(slug, vokabular[dimension].get(slug)).toLowerCase());
      }
    }

    // Der Metadaten-Key steckt mit: Dateinamen tragen hier oft mehr Information
    // als der Alt-Text ("...-weihnachtsfeier-trier.webp"). Bindestriche und
    // Unterstriche werden zu Leerzeichen, sonst findet "hochzeit" nur, wer den
    // Dateinamen auswendig kennt.
    const suchtext = [slide.alt, slide.title ?? '', slide.key.replace(/[/_-]+/g, ' '), ...labels]
      .join(' ')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    return { ...slide, suchtext, tagListe };
  });

  const facets: GalleryFacet[] = DIMENSIONEN.map(({ dimension, label }) => {
    const zaehler = new Map<string, number>();
    for (const slide of slides) {
      for (const slug of dimensionTags(slide, dimension)) {
        zaehler.set(slug, (zaehler.get(slug) ?? 0) + 1);
      }
    }

    const vokabularReihenfolge = [...vokabular[dimension].keys()];
    const tags: GalleryTag[] = [...zaehler.entries()].map(([slug, count]) => ({
      slug,
      label: tagLabel(slug, vokabular[dimension].get(slug)),
      count,
    }));

    if (dimension === 'landings') {
      tags.sort((a, b) => a.label.localeCompare(b.label, 'de'));
    } else {
      tags.sort((a, b) => {
        const ia = vokabularReihenfolge.indexOf(a.slug);
        const ib = vokabularReihenfolge.indexOf(b.slug);
        // Nicht im Vokabular (-1) nach hinten, nicht nach vorn.
        const ra = ia < 0 ? Number.MAX_SAFE_INTEGER : ia;
        const rb = ib < 0 ? Number.MAX_SAFE_INTEGER : ib;
        return ra - rb || a.label.localeCompare(b.label, 'de');
      });
    }

    return { dimension, label, tags };
  }).filter((facet) => facet.tags.length > 0);

  const ohneTags = bilder.filter((bild) => bild.tagListe.length === 0).length;

  return { bilder, facets, ohneTags };
};
