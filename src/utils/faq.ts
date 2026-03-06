import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type FAQItem = {
  question: string;
  answer: string;
  categories?: string[];
  city?: string;
};

const faqRoot = path.resolve('./public/faq');
const defaultCityKey = 'default';

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

const cityFromPath = (filePath: string): string => {
  const relative = path.relative(faqRoot, filePath);
  const segments = relative.split(path.sep);
  const firstSegment = segments.length > 1 ? segments[0] : '';
  return (firstSegment ?? '').trim();
};

const parseFaqFile = (filePath: string): FAQItem | null => {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(raw);

  const question = typeof parsed.data.question === 'string' ? parsed.data.question.trim() : '';
  const answer = typeof parsed.data.answer === 'string' ? parsed.data.answer.trim() : '';
  const categories = toStringArray(parsed.data.categories);
  const fallbackCity = cityFromPath(filePath);
  const cityFromFrontmatter =
    typeof parsed.data.city === 'string' ? parsed.data.city.trim() : '';
  const city = cityFromFrontmatter || fallbackCity;

  if (!question || !answer) {
    return null;
  }

  return {
    question,
    answer,
    categories: categories.length > 0 ? categories : undefined,
    city,
  };
};

export const getAllFAQs = (): FAQItem[] => {
  if (!fs.existsSync(faqRoot)) {
    return [];
  }

  const parsed = readMarkdownFiles(faqRoot)
    .map(parseFaqFile)
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

export const getFAQsByCity = (city: string): FAQItem[] => {
  const all = getAllFAQs();
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
