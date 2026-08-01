import fs from 'fs';
import path from 'path';
import { readWebpSize } from './webpSize';
// Ein Skill hat zwei Schlüssel: die URL (skills.json.link) und den
// Inhalts-Schlüssel aus dem Titel. Hier zählt der Inhalt – siehe skills.ts.
import { skillContentKey } from './skills';

export type SlideItem = {
  src: string;
  alt: string;
  title?: string;       // Optionaler Anzeigetitel (Lightbox) – unabhängig vom alt-Text
  categories?: string[];
  priority?: number;
  /**
   * Originalbreite in Pixeln. Nötig für `srcset`: angeboten werden dürfen nur
   * Varianten, die auch erzeugt wurden – ein fehlender Kandidat lässt das Bild
   * leer, ohne zweiten Versuch.
   */
  width?: number;
  /**
   * Originalhöhe in Pixeln. Nur die Galerie braucht sie: das Mosaik zeigt jedes
   * Bild in seinem eigenen Seitenverhältnis, und ohne `width`/`height` am `<img>`
   * kennt der Browser das erst nach dem Laden – die Seite springt dann beim
   * Scrollen. Die Slideshow kommt ohne aus, sie skaliert auf eine feste Höhe.
   */
  height?: number;
};

type SlideMetadataEntry = {
  categories?: string[];
  altOverride?: string;
  alt?: string;         // vom Admin geschriebenes Alt-Feld (Alias für altOverride)
  title?: string;       // Anzeigetitel für Lightbox (optional, unabhängig von altOverride)
  priority?: number;
  enabled?: boolean;
  tags?: SlideTags;
};

/** Die drei Tag-Dimensionen – kanonische Form, identisch zu FAQs und Reviews. */
export type SlideTags = {
  skills?: string[];
  events?: string[];
  landings?: string[];
};

export type TagDimension = 'skills' | 'events' | 'landings';

type SlideMetadataMap = Record<string, SlideMetadataEntry>;

/////////////////////////////////////////////////////////////////////////
// Minimum number of slides to show on a city landing page. If there are not
// enough city-specific slides, default slides will be added to reach this number.
export const MIN_LANDING_SLIDES = 6;
//////////////////////////////////////////////////////////////////////////


const allowedExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
const slidesRoot = path.resolve('./public/img/slides');
const slidesMetadataPath = path.join(slidesRoot, 'slides.meta.json');
const defaultSelectionPath = path.join(slidesRoot, 'default-selection.json');

// Ordnerschlüssel können verschachtelt sein ("events/hochzeit", "mediathek/somfot").
// encodeURIComponent über den ganzen Schlüssel macht aus dem Trenn-Schrägstrich %2F –
// und %2F ist laut Spec KEIN Pfadtrenner. Der statische Server antwortet dann mit 500,
// obwohl die Datei da ist. Darum jeden Teil einzeln kodieren und mit / zusammensetzen.
const encodePathSegment = (segment: string): string =>
  segment.split('/').map((part) => encodeURIComponent(part)).join('/');

const normalizeAlt = (fileName: string): string =>
  decodeURIComponent(fileName)
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[_-]+/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

// WEB-011: normalizeAlt liefert bei rein numerischen Dateinamen (z.B.
// "1000018280.webp" → "1000018280" oder "123_.webp" → "") einen wertlosen
// Alt-Text. Dann ein sinnvoller, generischer Default für A11y/SEO.
export const slideAltFallback = (alt: string): string =>
  alt && !/^\d+$/.test(alt) ? alt : 'Live-Kunst von Kunstwolff';

const normalizeMetadataKey = (value: string): string => value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

const metadataExtensionFallbacks = ['.webp', '.jpg', '.jpeg', '.png', '.avif', '.gif'];

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }

  return value;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
};

/**
 * Tag-Block aus den Metadaten lesen.
 *
 * Eine FEHLENDE Dimension und eine LEERE Liste sind nicht dasselbe: leer heißt
 * „bewusst ohne", fehlend heißt „nie zugeordnet". `sync-slides-metadata.mjs`
 * verlässt sich darauf, um Admin-Zuweisungen nicht bei jedem Lauf zu
 * überschreiben – deshalb wird hier nichts aufgefüllt.
 */
const readTagBlock = (value: unknown): SlideTags | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const out: SlideTags = {};
  let gefunden = false;
  for (const dim of ['skills', 'events', 'landings'] as const) {
    if (Array.isArray(raw[dim])) {
      out[dim] = toStringArray(raw[dim]).map((t) => t.toLowerCase());
      gefunden = true;
    }
  }
  return gefunden ? out : undefined;
};

const isAllowedImage = (fileName: string): boolean => {
  const extension = path.extname(fileName).toLowerCase();
  return allowedExtensions.has(extension);
};

const resolveMetadataForFile = (
  folderName: string,
  fileName: string,
  metadata: SlideMetadataMap,
): SlideMetadataEntry | undefined => {
  const exactKey = normalizeMetadataKey(path.posix.join(folderName, fileName));
  if (metadata[exactKey]) {
    return metadata[exactKey];
  }

  const extension = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, extension);

  for (const fallbackExt of metadataExtensionFallbacks) {
    if (fallbackExt === extension) {
      continue;
    }

    const fallbackKey = normalizeMetadataKey(path.posix.join(folderName, `${baseName}${fallbackExt}`));
    if (metadata[fallbackKey]) {
      return metadata[fallbackKey];
    }
  }

  return undefined;
};

const dedupeSlides = (items: SlideItem[]): SlideItem[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.src)) return false;
    seen.add(item.src);
    return true;
  });
};

let metadataCache: SlideMetadataMap | null = null;

const readSlidesMetadata = (): SlideMetadataMap => {
  if (metadataCache) {
    return metadataCache;
  }

  if (!fs.existsSync(slidesMetadataPath)) {
    metadataCache = {};
    return metadataCache;
  }

  try {
    const raw = fs.readFileSync(slidesMetadataPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      metadataCache = {};
      return metadataCache;
    }

    const entries = Object.entries(parsed as Record<string, unknown>).map(([rawKey, value]) => {
      const key = normalizeMetadataKey(rawKey);

      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return [key, {}] as const;
      }

      const metadata = value as Record<string, unknown>;
      const categories = toStringArray(metadata.categories);
      // altOverride hat Vorrang; fällt zurück auf das vom Admin geschriebene `alt`
      // (behebt den alt/altOverride-Feldnamen-Mismatch, durch den Admin-Alt-Texte
      // bisher nicht auf der Website ankamen).
      const altOverride =
        typeof metadata.altOverride === 'string' && metadata.altOverride.trim().length > 0
          ? metadata.altOverride.trim()
          : typeof metadata.alt === 'string' && metadata.alt.trim().length > 0
            ? metadata.alt.trim()
            : undefined;
      const title =
        typeof metadata.title === 'string' && metadata.title.trim().length > 0
          ? metadata.title.trim()
          : undefined;
      const priority = toNumberOrUndefined(metadata.priority);
      const enabled = typeof metadata.enabled === 'boolean' ? metadata.enabled : undefined;
      const tags = readTagBlock(metadata.tags);

      return [key, { categories, altOverride, title, priority, enabled, tags }] as const;
    });

    metadataCache = Object.fromEntries(entries);
    return metadataCache;
  } catch {
    metadataCache = {};
    return metadataCache;
  }
};

const readFolderSlides = (folderName: string): SlideItem[] => {
  const folderPath = path.join(slidesRoot, folderName);
  const metadata = readSlidesMetadata();

  if (!fs.existsSync(folderPath)) {
    return [];
  }

  const fileNames = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isAllowedImage(entry.name))
    .map((entry) => entry.name)
    .filter((fileName, _, allFileNames) => {
      const extension = path.extname(fileName).toLowerCase();
      if (extension === '.webp') {
        return true;
      }

      const webpVariant = `${path.basename(fileName, extension)}.webp`;
      return !allFileNames.includes(webpVariant);
    });

  const entries = fileNames
    .map((entry) => {
      const itemMetadata = resolveMetadataForFile(folderName, entry, metadata);
      const categories = itemMetadata?.categories ?? [];
      const priority = itemMetadata?.priority ?? 0;
      const enabled = itemMetadata?.enabled !== false;
      const groesse = readWebpSize(path.join(folderPath, entry));

      return {
        src: `/img/slides/${encodePathSegment(folderName)}/${encodePathSegment(entry)}`,
        alt: itemMetadata?.altOverride || slideAltFallback(normalizeAlt(entry)),
        title: itemMetadata?.title,
        categories: categories.length > 0 ? categories : undefined,
        priority,
        enabled,
        width: groesse?.width,
        height: groesse?.height,
      };
    })
    .filter((entry) => entry.enabled)
    .sort((a, b) => {
      const byPriority = (b.priority ?? 0) - (a.priority ?? 0);
      if (byPriority !== 0) return byPriority;
      return a.src.localeCompare(b.src);
    })
    .map(({ enabled, ...slide }) => slide);

  return entries;
};

const readDefaultSelection = (): string[] => {
  if (!fs.existsSync(defaultSelectionPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(defaultSelectionPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
};

/**
 * Slides für die Startseite (WEB-010 – Verhalten bewusst dokumentiert):
 * - `default-selection.json` LEER  → kompletter `default/`-Ordner (Standard).
 * - `default-selection.json` GEFÜLLT → GENAU diese Auswahl, aus allen Ordnern, in
 *   Auswahl-Reihenfolge. Die Auswahl **ersetzt** den default-Ordner, sie ergänzt
 *   ihn NICHT. So kuratiert der Admin das exakte Startseiten-Set; wer „default +
 *   Extra" will, nimmt die default-Bilder mit in die Auswahl auf.
 *
 * Ein Wechsel auf „ergänzen statt ersetzen" wäre eine Design-Entscheidung (offen,
 * siehe MAINTENANCE_PLAN P3-8) – hier absichtlich nicht geändert.
 */
export const getDefaultSlides = (): SlideItem[] => {
  const selection = readDefaultSelection();

  // Fallback: wenn keine Auswahl getroffen wurde, altes Verhalten (default-Ordner)
  if (selection.length === 0) {
    return readFolderSlides('default');
  }

  const metadata = readSlidesMetadata();
  const selectionSet = new Set(selection);

  // Alle Ordner lesen und nur ausgewählte Slides zurückgeben
  const allSlides = getAllSlidesFlat();
  const selected = allSlides.filter((slide) => {
    // Key aus src rekonstruieren: /img/slides/{key} → {key}
    const key = decodeURIComponent(slide.src.replace('/img/slides/', ''));
    return selectionSet.has(key);
  });

  // Reihenfolge der Auswahl beibehalten
  const byKey = new Map(selected.map((s) => [decodeURIComponent(s.src.replace('/img/slides/', '')), s]));
  const ordered = selection.map((key) => byKey.get(key)).filter((s): s is SlideItem => s !== undefined);

  return ordered;
};

/**
 * Alle Slides – unabhängig vom Ordner, in dem sie liegen.
 *
 * Grundlage der Tag-Abfrage. Liest jeden Ordner (inkl. `events/<slug>/`, also
 * eine Ebene tiefer) und hängt an jeden Slide seinen Metadaten-Key, damit
 * Aufrufer die Tags nachschlagen können.
 */
const collectAllSlidesWithKeys = (): Array<{ slide: SlideItem; key: string }> => {
  if (!fs.existsSync(slidesRoot)) return [];

  const ordner: string[] = [];
  for (const eintrag of fs.readdirSync(slidesRoot, { withFileTypes: true })) {
    if (!eintrag.isDirectory()) continue;
    ordner.push(eintrag.name);
    // Event-Slides liegen eine Ebene tiefer (events/<anlass>/…) und wären
    // sonst für jede Tag-Abfrage unsichtbar.
    const tiefer = path.join(slidesRoot, eintrag.name);
    for (const unter of fs.readdirSync(tiefer, { withFileTypes: true })) {
      if (unter.isDirectory()) ordner.push(path.posix.join(eintrag.name, unter.name));
    }
  }
  ordner.sort((a, b) => a.localeCompare(b));

  const raus: Array<{ slide: SlideItem; key: string }> = [];
  const gesehen = new Set<string>();
  for (const ordnerName of ordner) {
    for (const slide of readFolderSlides(ordnerName)) {
      if (gesehen.has(slide.src)) continue;
      gesehen.add(slide.src);
      raus.push({ slide, key: decodeURIComponent(slide.src.replace('/img/slides/', '')) });
    }
  }
  return raus;
};

/**
 * Slides über einen Tag statt über den Ablageort finden.
 *
 * Der Unterschied zum Ordner-Modell: ein Bild kann Ort UND Anlass tragen und
 * damit auf beiden Seiten erscheinen, ohne als Byte-Kopie ein zweites Mal im
 * Repo zu liegen. Genau daher stammen die 33 Duplikate.
 *
 * Reihenfolge wie bisher: höhere `priority` zuerst, dann alphabetisch nach
 * Pfad – damit der Wechsel die sichtbare Reihenfolge nicht durcheinanderwirft.
 */
export const getSlidesByTag = (dimension: TagDimension, slug: string): SlideItem[] => {
  const gesucht = String(slug ?? '').toLowerCase();
  if (!gesucht) return [];

  const metadata = readSlidesMetadata();
  const treffer = collectAllSlidesWithKeys().filter(({ key }) => {
    const tags = metadata[key]?.tags;
    return Array.isArray(tags?.[dimension]) && tags[dimension]!.includes(gesucht);
  });

  return treffer
    .map(({ slide }) => slide)
    .sort((a, b) => {
      const nachPrio = (b.priority ?? 0) - (a.priority ?? 0);
      if (nachPrio !== 0) return nachPrio;
      return a.src.localeCompare(b.src);
    });
};

/** Ein Slide samt Metadaten-Key und Tag-Block. Grundlage der Galerie. */
export type TaggedSlide = SlideItem & { key: string; tags: SlideTags };

/**
 * ALLE Slides, jeder mit seinen Tags – der Bestand ohne jede Auswahl.
 *
 * Der Gegenentwurf zu `getSlidesByTag`: dort filtert der Server auf einen Tag,
 * hier bekommt der Client den ganzen Bestand und filtert selbst. Für die
 * Galerie ist das der richtige Schnitt, weil sonst 3 Dimensionen × ~50 Tags als
 * je eigene Seite gebaut werden müssten, nur damit jemand zwei Chips klicken
 * kann.
 *
 * Ein FEHLENDER Tag-Block wird zu `{}` – für die Anzeige ist "nie zugeordnet"
 * dasselbe wie "keine Zuordnung". Die Unterscheidung braucht nur der Sync, der
 * hier nicht mitliest.
 *
 * `enabled: false` ist bereits in `readFolderSlides` ausgesiebt: ein im Admin
 * ausgeblendetes Bild darf auch in der Galerie nicht auftauchen, sonst wäre der
 * Schalter wirkungslos.
 */
export const getAllSlidesWithTags = (): TaggedSlide[] => {
  const metadata = readSlidesMetadata();

  return collectAllSlidesWithKeys()
    .map(({ slide, key }) => ({ ...slide, key, tags: metadata[key]?.tags ?? {} }))
    .sort((a, b) => {
      const nachPrio = (b.priority ?? 0) - (a.priority ?? 0);
      if (nachPrio !== 0) return nachPrio;
      return a.src.localeCompare(b.src);
    });
};

/**
 * Slides einer Stadtseite.
 *
 * Seit 2026-07-28 über den TAG, nicht mehr über den Ordner. Der Unterschied ist
 * kein Detail: im Ordnermodell konnte ein Bild nur an EINER Seite hängen, weil
 * es nur in einem Ordner liegen kann. Ort und Anlass schlossen sich damit
 * gegenseitig aus, und wer ein Motiv auf beiden Seiten wollte, musste es als
 * Byte-Kopie zweimal ins Repo legen.
 *
 * Vor der Umstellung mit `scripts/tag-parity-check.mjs` nachgewiesen: für alle
 * 39 Seiten liefert die Tag-Abfrage mindestens das, was der Ordner lieferte –
 * kein einziges Bild verschwindet, 110 kommen hinzu.
 */
export const getCitySlides = (city: string): SlideItem[] => getSlidesByTag('landings', city);

export const getAllCitySlides = (): SlideItem[] => {
  if (!fs.existsSync(slidesRoot)) {
    return [];
  }

  const cityFolders = fs
    .readdirSync(slidesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'default')
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const slides = cityFolders.flatMap((folderName) => readFolderSlides(folderName));
  return dedupeSlides(slides);
};

/** Alle Slides aus allen Ordnern (inkl. default) – flache Liste */
const getAllSlidesFlat = (): SlideItem[] => {
  if (!fs.existsSync(slidesRoot)) {
    return [];
  }

  const allFolders = fs
    .readdirSync(slidesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const slides = allFolders.flatMap((folderName) => readFolderSlides(folderName));
  return dedupeSlides(slides);
};

export const getHomepageSlides = (): SlideItem[] => getDefaultSlides();

/** Wie viele Bilder eine Skill-Seite höchstens zeigt. */
export const MAX_SKILL_SLIDES = 24;

/**
 * Slides einer Skill-Seite — über den TAG, nicht über die Startseiten-Auswahl.
 *
 * Vorher zog `/schnellzeichner/` `getHomepageSlides()`, also die 30 handverlesenen
 * Bilder aus `default-selection.json`, und filterte die nach Skill. Diese 30 sind
 * für die STARTSEITE kuratiert; auf der Skill-Seite blieben davon **16 von 115**
 * Schnellzeichner-Bildern übrig (Szenenmaler: 12 von 69), und 11 der 30 tragen
 * gar keinen Skill und konnten dort nie erscheinen.
 *
 * Damit war der im Admin gesetzte Skill-Tag auf genau der Seite wirkungslos, die
 * nach dem Skill benannt ist — `getSlidesByTag('skills', …)` hatte in der ganzen
 * Website keinen einzigen Aufrufer. Die handverlesene Auswahl bleibt, wo sie
 * gemeint war: auf der Startseite.
 *
 * Gedeckelt, weil „alle 115" eine Slideshow mit 115 DOM-Knoten wäre. Sortierung
 * kommt aus `getSlidesByTag` (priority, dann Pfad) — die Deckelung nimmt also
 * die wichtigsten. Der Rest ist über den Galerie-Link unter jeder Slideshow
 * erreichbar.
 */
export const getSkillSlides = (skillTitle: string): SlideItem[] =>
  getSlidesByTag('skills', skillContentKey(skillTitle)).slice(0, MAX_SKILL_SLIDES);

/**
 * Trägt ein Slide diesen Skill?
 *
 * Zeichengleich zu der Prüfung, die `Slideshow.astro` über `filteredCategories`
 * macht – bewusst dieselbe Semantik (Label-Vergleich über `categories`), damit
 * das Vorfiltern die Auswahl NICHT verändert, sondern nur früher passiert.
 * Ein Slide ohne `categories` zählt als „passt nicht" – genau wie dort.
 *
 * (Dass die Skill-Dimension überhaupt über Labels statt über `tags.skills`
 * läuft, ist ein eigener Punkt: siehe B6 in
 * `reports/tagsystem-audit-2026-07-30.md`.)
 */
export const matchesSkill = (slide: SlideItem, skillTitle: string): boolean =>
  !!slide.categories?.some((cat) => cat === skillTitle);

/**
 * Nach Skill filtern – und zwar VOR dem Auffüllen.
 *
 * Die Reihenfolge ist der ganze Witz. Vorher lief `supplementWithDefaultSlides`
 * zuerst und die Komponente filterte danach: die Nachfüller wurden also gleich
 * wieder aussortiert, weil 93 der 232 Slides und 11 der 30 Auswahl-Slides gar
 * keine `categories` tragen. Ergebnis waren 38 von 105 Skill×Stadt-Seiten mit
 * LEERER Galerie – Karlsruhe zum Beispiel hatte 7 eigene Bilder, kam damit über
 * die Auffüll-Schwelle, und der Filter warf danach alle 7 weg, obwohl 115
 * Schnellzeichner-Bilder im Repo liegen.
 */
export const getSkillSlidesForCity = (
  citySlides: SlideItem[],
  defaultSlides: SlideItem[],
  skillTitle: string,
  minimumSlides: number,
): SlideItem[] =>
  supplementWithDefaultSlides(
    citySlides.filter((s) => matchesSkill(s, skillTitle)),
    defaultSlides.filter((s) => matchesSkill(s, skillTitle)),
    minimumSlides,
  );

export const supplementWithDefaultSlides = (
  citySlides: SlideItem[],
  defaultSlides: SlideItem[],
  minimumSlides: number,
): SlideItem[] => {
  if (citySlides.length >= minimumSlides) {
    return dedupeSlides(citySlides);
  }

  const needed = minimumSlides - citySlides.length;
  const additions = defaultSlides.slice(0, needed);
  return dedupeSlides([...citySlides, ...additions]);
};
