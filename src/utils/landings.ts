import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { resolveTitleImage } from './titleImages';
import { isPageHiddenByPath } from './pageVisibility';

export type LandingReference = {
  title: string;
  image: string;
  alt?: string;
  link?: string;
};

export type LandingMeta = {
  slug: string;
  title: string;
  titleImage: string;
  references: LandingReference[];
};

const landingsRoot = path.resolve('./public/landings');
const landingsRegistryMdPath = path.join(landingsRoot, 'landings.md');
const landingsRegistryJsonPath = path.join(landingsRoot, 'landings.json');
const slidesRoot = path.resolve('./public/img/slides');
const reviewsRoot = path.resolve('./public/reviews');

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

const readDirNames = (dir: string): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
};

const readSlugsFromSlides = (): string[] =>
  readDirNames(slidesRoot)
    .filter((name) => normalizeSlug(name) !== 'default')
    .map(normalizeSlug);

const readSlugsFromReviews = (): string[] =>
  readDirNames(reviewsRoot)
    .filter((name) => {
      const normalized = normalizeSlug(name);
      return normalized !== 'default' && !normalized.startsWith('_');
    })
    .map(normalizeSlug);

const readSlugsFromLandings = (): string[] =>
  readDirNames(landingsRoot)
    .filter((name) => !name.startsWith('_'))
    .filter((name) => normalizeSlug(name) !== 'default')
    .map(normalizeSlug);

const toTitle = (slug: string): string => `${slug.charAt(0).toUpperCase()}${slug.slice(1)} Landingpage`;

const normalizeList = (items: unknown[]): string[] => {
  const unique = new Set<string>();

  for (const item of items) {
    if (typeof item !== 'string') {
      continue;
    }

    const normalized = normalizeSlug(item);
    if (!normalized) {
      continue;
    }

    if (normalized === 'default') {
      continue;
    }

    if (normalized.startsWith('_')) {
      continue;
    }

    unique.add(normalized);
  }

  return Array.from(unique).sort((a, b) => a.localeCompare(b));
};

const readCitiesFromBodyLines = (content: string): string[] =>
  normalizeList(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && !line.startsWith('---'))
      .map((line) => (line.startsWith('- ') || line.startsWith('* ') ? line.slice(2).trim() : line)),
  );

const readRegistryFromMarkdown = (): string[] => {
  if (!fs.existsSync(landingsRegistryMdPath)) {
    return [];
  }

  const raw = fs.readFileSync(landingsRegistryMdPath, 'utf-8');
  try {
    const parsed = matter(raw);
    const data = parsed.data as Record<string, unknown>;
    const frontmatterCities = data.cities ?? data.landings;

    if (Array.isArray(frontmatterCities)) {
      return normalizeList(frontmatterCities);
    }

    return readCitiesFromBodyLines(parsed.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`landings: Could not parse landings.md frontmatter (${message}). Using body fallback.`);
    return readCitiesFromBodyLines(raw);
  }
};

const readRegistryFromJson = (): string[] => {
  if (!fs.existsSync(landingsRegistryJsonPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(landingsRegistryJsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      return normalizeList(parsed);
    }

    if (parsed && typeof parsed === 'object') {
      const data = parsed as Record<string, unknown>;
      const values = data.cities ?? data.landings;
      if (Array.isArray(values)) {
        return normalizeList(values);
      }
    }
  } catch {
    return [];
  }

  return [];
};

export const getLandingSlugs = (): string[] => {
  const configured = readRegistryFromMarkdown();
  if (configured.length > 0) {
    return configured;
  }

  const configuredJson = readRegistryFromJson();
  if (configuredJson.length > 0) {
    return configuredJson;
  }

  const merged = new Set<string>([...readSlugsFromLandings(), ...readSlugsFromSlides(), ...readSlugsFromReviews()]);
  return Array.from(merged).sort((a, b) => a.localeCompare(b));
};

export const getLandingBySlug = (slug: string): LandingMeta => {
  const normalizedSlug = normalizeSlug(slug);

  return {
    slug: normalizedSlug,
    title: toTitle(normalizedSlug),
    titleImage: resolveTitleImage({ landing: normalizedSlug }),
    references: [],
  };
};

export const getVisibleLandingSlugs = (): string[] =>
  getLandingSlugs().filter((slug) => !isPageHiddenByPath(`/${slug}/`));
