import fs from 'fs';
import path from 'path';

const titleRoot = path.resolve('./public/img/Titelbild');
const titleMetadataPath = path.join(titleRoot, 'title.meta.json');
const allowedExtensions = new Set(['.avif', '.webp', '.png', '.jpg', '.jpeg', '.gif']);
const fallbackImage = '/img/samples/sample1.jpeg';

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
};

type TitleMetadataMap = Record<string, TitleMetadataEntry>;

type TitleImageItem = {
  src: string;
  categories: string[];
  priority: number;
};

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

      return [key, { categories, priority, enabled }] as const;
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

  return fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => allowedExtensions.has(path.extname(fileName).toLowerCase()))
    .map((fileName, index) => {
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

const pickTitleImageFromPool = (pool: TitleImageItem[], skillSlug: string): string | undefined => {
  if (pool.length === 0) {
    return undefined;
  }

  if (skillSlug) {
    const categorized = pool.filter((item) => categoryMatchesSkill(item.categories, skillSlug));
    if (categorized.length > 0) {
      return categorized[0].src;
    }
  }

  return pool[0].src;
};

export const resolveTitleImage = (params?: { skill?: string; landing?: string }): string => {
  const skillSlug = params?.skill ? normalizeSlug(params.skill) : '';
  const landingSlug = params?.landing ? normalizeSlug(params.landing) : '';

  const cityImages = landingSlug ? readFolderTitleImages(landingSlug) : [];
  const defaultImages = readFolderTitleImages('default');
  const pool = cityImages.length > 0 ? [...cityImages, ...defaultImages] : defaultImages;

  return pickTitleImageFromPool(pool, skillSlug) ?? fallbackImage;
};
