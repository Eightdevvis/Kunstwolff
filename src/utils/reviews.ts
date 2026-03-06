import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type ReviewItem = {
  author: string;
  text: string;
  categories: string[];
  city: string;
  rating?: number;
};

const reviewsRoot = path.resolve('./public/reviews');
const defaultCityKey = 'default';
const minLandingReviews = 7;
const reviewTemplateFileNames = new Set(['_vorlage.md', 'vorlage.md']);

const normalize = (value: string): string => value.trim().toLowerCase();

const isTemplateFile = (fileName: string): boolean => {
  return reviewTemplateFileNames.has(fileName.trim().toLowerCase());
};

const readMarkdownFiles = (dir: string): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries
    .filter(
      (entry) => entry.isFile() && /\.md$/i.test(entry.name) && !isTemplateFile(entry.name),
    )
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
  const relative = path.relative(reviewsRoot, filePath);
  const segments = relative.split(path.sep);
  const firstSegment = segments.length > 1 ? segments[0] : '';
  return (firstSegment ?? '').trim();
};

const parseReviewFile = (filePath: string): ReviewItem | null => {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(raw);

  const author = typeof parsed.data.author === 'string' ? parsed.data.author.trim() : '';
  const text = parsed.content.trim();
  const categories = toStringArray(parsed.data.categories);
  const fallbackCity = cityFromPath(filePath);
  const cityFromFrontmatter =
    typeof parsed.data.city === 'string' ? parsed.data.city.trim() : '';
  const city = cityFromFrontmatter || fallbackCity;

  const rating =
    typeof parsed.data.rating === 'number' && Number.isFinite(parsed.data.rating)
      ? parsed.data.rating
      : undefined;

  if (!author || !text || !city) {
    return null;
  }

  return {
    author,
    text,
    categories,
    city,
    rating,
  };
};

export const getAllReviews = (): ReviewItem[] => {
  if (!fs.existsSync(reviewsRoot)) {
    return [];
  }

  const parsed = readMarkdownFiles(reviewsRoot)
    .map(parseReviewFile)
    .filter((item): item is ReviewItem => item !== null);

  const defaultReviews = parsed.filter(
    (review) => normalize(review.city) === defaultCityKey,
  );

  const nonDefaultReviews = parsed.filter(
    (review) => normalize(review.city) !== defaultCityKey,
  );

  return [...defaultReviews, ...nonDefaultReviews];
};

const uniqueReviews = (reviews: ReviewItem[]): ReviewItem[] => {
  const seen = new Set<string>();

  return reviews.filter((review) => {
    const key = `${normalize(review.city)}|${review.author.trim()}|${review.text.trim()}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const getCityDirectoryKeys = (): string[] => {
  if (!fs.existsSync(reviewsRoot)) {
    return [];
  }

  return fs
    .readdirSync(reviewsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => normalize(entry.name))
    .sort((a, b) => a.localeCompare(b));
};

const getSupplementCityOrder = (cityKey: string): string[] => {
  const cityDirs = getCityDirectoryKeys().filter(
    (key) => key !== defaultCityKey && key !== cityKey,
  );

  const allCities = [cityKey, ...cityDirs].sort((a, b) => a.localeCompare(b));
  const currentIndex = allCities.indexOf(cityKey);

  if (currentIndex === -1) {
    return cityDirs;
  }

  const after = allCities.slice(currentIndex + 1).filter((key) => key !== cityKey);
  const before = allCities.slice(0, currentIndex).filter((key) => key !== cityKey);

  return [...after, ...before].filter((key) => key !== defaultCityKey);
};

const filterBySkill = (reviews: ReviewItem[], skill?: string): ReviewItem[] => {
  if (!skill) {
    return reviews;
  }

  const skillKey = normalize(skill);

  return reviews.filter((review) =>
    review.categories.some((category) => normalize(category) === skillKey),
  );
};

const reviewsForLanding = (city: string, skill?: string): ReviewItem[] => {
  const cityKey = normalize(city);
  const all = getAllReviews();

  const cityReviews = filterBySkill(
    all.filter((review) => normalize(review.city) === cityKey),
    skill,
  );

  let combined = [...cityReviews];

  if (combined.length < minLandingReviews) {
    const defaultReviews = filterBySkill(
      all.filter((review) => normalize(review.city) === defaultCityKey),
      skill,
    );
    combined = uniqueReviews([...combined, ...defaultReviews]);
  }

  if (combined.length < minLandingReviews) {
    const supplementCityKeys = getSupplementCityOrder(cityKey);

    for (const supplementCity of supplementCityKeys) {
      const citySupplement = filterBySkill(
        all.filter((review) => normalize(review.city) === supplementCity),
        skill,
      );

      combined = uniqueReviews([...combined, ...citySupplement]);

      if (combined.length >= minLandingReviews) {
        break;
      }
    }
  }

  return combined;
};

export const getReviewsByLanding = (city: string): ReviewItem[] => reviewsForLanding(city);

export const getReviewsByLandingAndSkill = (city: string, skill: string): ReviewItem[] => {
  return reviewsForLanding(city, skill);
};
