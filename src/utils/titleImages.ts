import fs from 'fs';
import path from 'path';

const titleRoot = path.resolve('./public/img/Titelbild');
const titleMetadataPath = path.join(titleRoot, 'title.meta.json');
const titleDimensionsPath = path.join(titleRoot, 'title.dimensions.json');
const allowedExtensions = new Set(['.avif', '.webp', '.png', '.jpg', '.jpeg', '.gif']);
const fallbackImage = '/img/samples/sample1.webp';

const transliterateGerman = (value: string): string =>
  String(value)
    .replace(/ä/gi, 'ae')
    .replace(/ö/gi, 'oe')
    .replace(/ü/gi, 'ue')
    .replace(/ß/gi, 'ss');

const normalizeSlug = (value: string): string =>
  transliterateGerman(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const encodeUrlPath = (segments: string[]): string =>
  segments.map((segment) => encodeURIComponent(segment)).join('/');

type TitleMetadataEntry = {
  categories?: string[];
  priority?: number;
  enabled?: boolean;
  /** CSS object-position / background-position, z.B. "50% 30%". Steuert den Bildausschnitt im Hero. */
  focus?: string;
  /**
   * Dicke des weißen Rahmens um das Titelbild in px. 0/fehlt = kein Rahmen (Bild füllt
   * den Hero via `cover`). > 0 = weißer Rahmen dieser Dicke UND das Bild wird via
   * `contain` komplett sichtbar (nicht mehr beschnitten), sodass abweichend skalierte
   * Bilder automatisch mit weißer Matte eingefasst werden.
   */
  frame?: number;
};

type TitleMetadataMap = Record<string, TitleMetadataEntry>;

/**
 * Pixel-Maße pro Titelbild. Werden vom Sync-Script `sync-title-dimensions.mjs`
 * gepflegt und synchron gelesen. Grund: Der Hero (`Opener.astro`) braucht das
 * Bild-Aspect-Ratio, damit er auf Mobil das Titelbild nicht mehr croppt,
 * sondern die Container-Höhe an die Bild-Ratio anpasst. Sharp scheidet zur
 * Render-Zeit aus (async).
 */
type TitleDimensionsEntry = { width: number; height: number };
type TitleDimensionsMap = Record<string, TitleDimensionsEntry>;

type TitleImageItem = {
  src: string;
  categories: string[];
  priority: number;
  focus: string;
  frame: number;
  dimensions: TitleDimensionsEntry | null;
};

/** Default-Fokuspunkt (Bildmitte), falls keiner gesetzt ist. */
export const DEFAULT_TITLE_FOCUS = '50% 50%';

/** Default-Rahmendicke (kein Rahmen), falls keine gesetzt ist. */
export const DEFAULT_TITLE_FRAME = 0;

const normalizeMetadataKey = (value: string): string => value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
};

const toNumberOrDefault = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return value;
};

let metadataCache: TitleMetadataMap | null = null;
let dimensionsCache: TitleDimensionsMap | null = null;

/**
 * Öffentlicher Lookup ins `title.dimensions.json`-Cache. `events.ts` nutzt
 * das, weil Event-Titelbilder außerhalb der `titleImages.ts`-Auswahl liegen
 * (Doku: `memory/content-titelbild.md`, Warnkasten), aber im selben Titelbild-
 * Baum stehen und deshalb im selben Sync-Ergebnis mitgeführt werden.
 *
 * `relativePath` ist der Pfad UNTER `public/img/Titelbild/` — z.B.
 * `"events/hochzeit/foto.webp"`.
 */
export const lookupTitleDimensions = (relativePath: string): TitleDimensionsEntry | null => {
  const dims = readTitleDimensions();
  return dims[normalizeMetadataKey(relativePath)] ?? null;
};

const readTitleDimensions = (): TitleDimensionsMap => {
  if (dimensionsCache) {
    return dimensionsCache;
  }

  if (!fs.existsSync(titleDimensionsPath)) {
    dimensionsCache = {};
    return dimensionsCache;
  }

  try {
    const raw = fs.readFileSync(titleDimensionsPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      dimensionsCache = {};
      return dimensionsCache;
    }

    const entries = Object.entries(parsed as Record<string, unknown>)
      .map(([rawKey, value]) => {
        const key = normalizeMetadataKey(rawKey);
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const entry = value as Record<string, unknown>;
        const width = typeof entry.width === 'number' && Number.isFinite(entry.width) && entry.width > 0 ? entry.width : null;
        const height = typeof entry.height === 'number' && Number.isFinite(entry.height) && entry.height > 0 ? entry.height : null;
        if (width === null || height === null) return null;
        return [key, { width, height }] as const;
      })
      .filter((pair): pair is readonly [string, TitleDimensionsEntry] => pair !== null);

    dimensionsCache = Object.fromEntries(entries);
    return dimensionsCache;
  } catch {
    dimensionsCache = {};
    return dimensionsCache;
  }
};

const readTitleMetadata = (): TitleMetadataMap => {
  if (metadataCache) {
    return metadataCache;
  }

  if (!fs.existsSync(titleMetadataPath)) {
    metadataCache = {};
    return metadataCache;
  }

  try {
    const raw = fs.readFileSync(titleMetadataPath, 'utf-8');
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

      const entry = value as Record<string, unknown>;
      const categories = toStringArray(entry.categories);
      const priority = typeof entry.priority === 'number' && !Number.isNaN(entry.priority) ? entry.priority : undefined;
      const enabled = typeof entry.enabled === 'boolean' ? entry.enabled : undefined;
      const focus = typeof entry.focus === 'string' && entry.focus.trim() ? entry.focus.trim() : undefined;
      const frame =
        typeof entry.frame === 'number' && Number.isFinite(entry.frame) && entry.frame >= 0
          ? entry.frame
          : undefined;

      return [key, { categories, priority, enabled, focus, frame }] as const;
    });

    metadataCache = Object.fromEntries(entries);
    return metadataCache;
  } catch {
    metadataCache = {};
    return metadataCache;
  }
};

const readFolderTitleImages = (folderName: string): TitleImageItem[] => {
  const folderPath = path.join(titleRoot, folderName);
  if (!fs.existsSync(folderPath)) {
    return [];
  }

  const metadata = readTitleMetadata();
  const dimensions = readTitleDimensions();

  return fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => allowedExtensions.has(path.extname(fileName).toLowerCase()))
    .map((fileName, index): TitleImageItem | null => {
      const metadataKey = normalizeMetadataKey(path.posix.join(folderName, fileName));
      const itemMetadata = metadata[metadataKey] ?? {};
      const enabled = itemMetadata.enabled !== false;
      if (!enabled) {
        return null;
      }

      return {
        src: `/img/${encodeUrlPath(['Titelbild', folderName, fileName])}`,
        categories: toStringArray(itemMetadata.categories),
        priority: toNumberOrDefault(itemMetadata.priority, index + 1),
        focus: itemMetadata.focus ?? DEFAULT_TITLE_FOCUS,
        frame: itemMetadata.frame ?? DEFAULT_TITLE_FRAME,
        dimensions: dimensions[metadataKey] ?? null,
      };
    })
    .filter((entry): entry is TitleImageItem => entry !== null)
    .sort((a, b) => b.priority - a.priority || a.src.localeCompare(b.src));
};

const categoryMatchesSkill = (categories: string[], skillSlug: string): boolean => {
  if (!skillSlug || categories.length === 0) {
    return false;
  }

  return categories.some((category) => normalizeSlug(category) === skillSlug);
};

const pickTitleImageFromPool = (pool: TitleImageItem[], skillSlug: string): TitleImageItem | undefined => {
  if (pool.length === 0) {
    return undefined;
  }

  if (skillSlug) {
    const categorized = pool.filter((item) => categoryMatchesSkill(item.categories, skillSlug));
    if (categorized.length > 0) {
      return categorized[0];
    }
  }

  return pool[0];
};

/**
 * Liefert das gewählte Titelbild inkl. Fokuspunkt. Beide öffentlichen Helfer
 * (resolveTitleImage / resolveTitleImageFocus) bauen darauf auf, damit src und
 * focus garantiert zum selben Bild gehören.
 */
export const resolveTitleImageItem = (
  params?: { skill?: string; landing?: string },
): { src: string; focus: string; frame: number; dimensions: TitleDimensionsEntry | null } => {
  const skillSlug = params?.skill ? normalizeSlug(params.skill) : '';
  const landingSlug = params?.landing ? normalizeSlug(params.landing) : '';

  // "Eigener" Bild-Ordner der Seite: Stadt-Seiten (und Skill+Stadt) nutzen den
  // Landing-Ordner, reine Skill-Seiten den Skill-Ordner. Das spiegelt exakt den
  // Ordner, in den der Admin für diese Seite hochlädt (Titelbild/{slug}) – ohne
  // diesen Zweig „erbt" die Skill-Seite still das Default-/Homepage-Bild.
  const ownSlug = landingSlug || skillSlug;
  const ownImages = ownSlug ? readFolderTitleImages(ownSlug) : [];
  const defaultImages = readFolderTitleImages('default');
  const pool = ownImages.length > 0 ? [...ownImages, ...defaultImages] : defaultImages;

  const picked = pickTitleImageFromPool(pool, skillSlug);
  return {
    src: picked?.src ?? fallbackImage,
    focus: picked?.focus ?? DEFAULT_TITLE_FOCUS,
    frame: picked?.frame ?? DEFAULT_TITLE_FRAME,
    dimensions: picked?.dimensions ?? null,
  };
};

export const resolveTitleImage = (params?: { skill?: string; landing?: string }): string =>
  resolveTitleImageItem(params).src;

export const resolveTitleImageFocus = (params?: { skill?: string; landing?: string }): string =>
  resolveTitleImageItem(params).focus;

export const resolveTitleImageFrame = (params?: { skill?: string; landing?: string }): number =>
  resolveTitleImageItem(params).frame;

/**
 * Aspect-Ratio-String (`"1180 / 818"`) für die CSS-Var `--hero-aspect` im Hero,
 * oder `null`, wenn die Bildmaße nicht bekannt sind (Fallback-Bild, Sync noch
 * nicht gelaufen, unlesbares Bild). Bei `null` fällt der Hero auf sein altes
 * Verhalten zurück (volle Viewport-Höhe + cover), sonst passt sich die
 * Container-Höhe auf Mobil an das Bild an, sodass nichts mehr beschnitten wird.
 */
export const resolveTitleImageAspect = (params?: { skill?: string; landing?: string }): string | null => {
  const dims = resolveTitleImageItem(params).dimensions;
  return dims ? `${dims.width} / ${dims.height}` : null;
};
