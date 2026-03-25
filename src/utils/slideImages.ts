import fs from 'fs';
import path from 'path';

export type SlideItem = {
  src: string;
  alt: string;
  title?: string;       // Optionaler Anzeigetitel (Lightbox) – unabhängig vom alt-Text
  categories?: string[];
  priority?: number;
};

type SlideMetadataEntry = {
  categories?: string[];
  altOverride?: string;
  title?: string;       // Anzeigetitel für Lightbox (optional, unabhängig von altOverride)
  priority?: number;
  enabled?: boolean;
};

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

const encodePathSegment = (segment: string): string => encodeURIComponent(segment);

const normalizeAlt = (fileName: string): string =>
  decodeURIComponent(fileName)
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[_-]+/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

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
      const altOverride =
        typeof metadata.altOverride === 'string' && metadata.altOverride.trim().length > 0
          ? metadata.altOverride.trim()
          : undefined;
      const title =
        typeof metadata.title === 'string' && metadata.title.trim().length > 0
          ? metadata.title.trim()
          : undefined;
      const priority = toNumberOrUndefined(metadata.priority);
      const enabled = typeof metadata.enabled === 'boolean' ? metadata.enabled : undefined;

      return [key, { categories, altOverride, title, priority, enabled }] as const;
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

      return {
        src: `/img/slides/${encodePathSegment(folderName)}/${encodePathSegment(entry)}`,
        alt: itemMetadata?.altOverride || normalizeAlt(entry),
        title: itemMetadata?.title,
        categories: categories.length > 0 ? categories : undefined,
        priority,
        enabled,
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

export const getCitySlides = (city: string): SlideItem[] => readFolderSlides(city);

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
