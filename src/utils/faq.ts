import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { DEFAULT_LOCALE, resolveLocalizedDir, type Locale } from '../i18n/config';

export type FAQItem = {
  question: string;
  answer: string;
  categories?: string[];
  city?: string;
  tags?: {
    events?: string[];
    skills?: string[];
    landings?: string[];
  };
};

const faqRoot = path.resolve('./public/faq');
const defaultCityKey = 'default';

/**
 * i18n (Phase 1): FAQ-Wurzel je Locale. de = public/faq (unverändert), sonst
 * public/i18n/<locale>/faq (mit Fallback aufs deutsche Verzeichnis, falls das
 * Overlay fehlt). Der Stadt-Slug wird relativ zu DIESER Wurzel abgeleitet.
 */
const faqRootFor = (locale: Locale): string =>
  locale === DEFAULT_LOCALE ? faqRoot : resolveLocalizedDir(locale, 'faq');

const normalize = (value: string): string => value.trim().toLowerCase();

const readMarkdownFiles = (dir: string): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /\.md$/i.test(entry.name))
    .map((entry) => path.join(dir, entry.name));

  const nestedFiles = entries
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => readMarkdownFiles(path.join(dir, entry.name)));

  return [...files, ...nestedFiles];
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
};

const normalizeStringArray = (value: unknown): string[] =>
  toStringArray(value).map((item) => normalize(item));

const cityFromPath = (filePath: string, rootDir: string): string => {
  const relative = path.relative(rootDir, filePath);
  const segments = relative.split(path.sep);
  const firstSegment = segments.length > 1 ? segments[0] : '';
  return (firstSegment ?? '').trim();
};

const parseFaqFile = (filePath: string, rootDir: string): FAQItem | null => {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(raw);

  const question = typeof parsed.data.question === 'string' ? parsed.data.question.trim() : '';
  const answer = typeof parsed.data.answer === 'string' ? parsed.data.answer.trim() : '';
  const categories = toStringArray(parsed.data.categories);
  const fallbackCity = cityFromPath(filePath, rootDir);
  const cityFromFrontmatter =
    typeof parsed.data.city === 'string' ? parsed.data.city.trim() : '';
  const city = cityFromFrontmatter || fallbackCity;
  const rawTags = parsed.data.tags && typeof parsed.data.tags === 'object'
    ? (parsed.data.tags as Record<string, unknown>)
    : {};
  const tags = {
    events: normalizeStringArray(rawTags.events),
    skills: normalizeStringArray(rawTags.skills),
    landings: normalizeStringArray(rawTags.landings),
  };
  const hasTags = tags.events.length > 0 || tags.skills.length > 0 || tags.landings.length > 0;

  if (!question || !answer) {
    return null;
  }

  return {
    question,
    answer,
    categories: categories.length > 0 ? categories : undefined,
    city,
    tags: hasTags ? tags : undefined,
  };
};

type FAQFilterContext = {
  categories?: string[];
  city?: string;
};

export const matchesFAQContext = (faq: FAQItem, context: FAQFilterContext): boolean => {
  const categoryKeys = (context.categories ?? []).map(normalize).filter(Boolean);
  const cityKey = normalize(context.city ?? '');
  const isEventContext = cityKey.startsWith('events/');
  const eventKey = isEventContext ? cityKey.replace(/^events\//, '') : '';
  const landingKey = !isEventContext ? cityKey : '';
  const skillKeys = categoryKeys;

  const categoryMatch =
    categoryKeys.length === 0
      ? true
      : !!faq.categories?.some((cat) => categoryKeys.includes(normalize(cat)));

  const skillTagMatch =
    skillKeys.length === 0
      ? true
      : !!faq.tags?.skills?.some((tag) => skillKeys.includes(normalize(tag)));

  const eventTagMatch =
    eventKey.length === 0
      ? true
      : !!faq.tags?.events?.some((tag) => normalize(tag) === eventKey);

  const landingTagMatch =
    landingKey.length === 0
      ? true
      : !!faq.tags?.landings?.some((tag) => normalize(tag) === landingKey);

  return categoryMatch || skillTagMatch || eventTagMatch || landingTagMatch;
};

export const getAllFAQs = (locale: Locale = DEFAULT_LOCALE): FAQItem[] => {
  const root = faqRootFor(locale);
  if (!fs.existsSync(root)) {
    return [];
  }

  const parsed = readMarkdownFiles(root)
    .map((file) => parseFaqFile(file, root))
    .filter((item): item is FAQItem => item !== null);

  return parsed;
};

export const getFAQsByCategory = (category: string): FAQItem[] => {
  const all = getAllFAQs();
  const categoryKey = normalize(category);

  return all.filter((faq) =>
    faq.categories?.some((cat) => normalize(cat) === categoryKey)
  );
};

export const getFAQsByCity = (city: string, locale: Locale = DEFAULT_LOCALE): FAQItem[] => {
  const all = getAllFAQs(locale);
  const cityKey = normalize(city);

  const cityFaqs = all.filter((faq) => normalize(faq.city || '') === cityKey);
  
  // Falls nicht genug FAQs für die Stadt, default-FAQs hinzufügen
  if (cityFaqs.length === 0) {
    return all.filter((faq) => normalize(faq.city || '') === defaultCityKey);
  }

  return cityFaqs;
};

export const getFAQsByCategories = (categories: string[]): FAQItem[] => {
  const all = getAllFAQs();
  const categoryKeys = categories.map(normalize);

  return all.filter((faq) =>
    faq.categories?.some((cat) => categoryKeys.includes(normalize(cat)))
  );
};
