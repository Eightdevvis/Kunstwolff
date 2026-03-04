import fs from 'fs';
import path from 'path';

type SlideItem = {
  src: string;
  alt: string;
};

/////////////////////////////////////////////////////////////////////////
// Minimum number of slides to show on a city landing page. If there are not
// enough city-specific slides, default slides will be added to reach this number.
export const MIN_LANDING_SLIDES = 6;
//////////////////////////////////////////////////////////////////////////


const allowedExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
const slidesRoot = path.resolve('./public/img/slides');

const encodePathSegment = (segment: string): string => encodeURIComponent(segment);

const normalizeAlt = (fileName: string): string =>
  decodeURIComponent(fileName)
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

const isAllowedImage = (fileName: string): boolean => {
  const extension = path.extname(fileName).toLowerCase();
  return allowedExtensions.has(extension);
};

const dedupeSlides = (items: SlideItem[]): SlideItem[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.src)) return false;
    seen.add(item.src);
    return true;
  });
};

const readFolderSlides = (folderName: string): SlideItem[] => {
  const folderPath = path.join(slidesRoot, folderName);

  if (!fs.existsSync(folderPath)) {
    return [];
  }

  const entries = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isAllowedImage(entry.name))
    .map((entry) => ({
      src: `/img/slides/${encodePathSegment(folderName)}/${encodePathSegment(entry.name)}`,
      alt: normalizeAlt(entry.name),
    }))
    .sort((a, b) => a.src.localeCompare(b.src));

  return entries;
};

export const getDefaultSlides = (): SlideItem[] => readFolderSlides('default');

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

export const getHomepageSlides = (): SlideItem[] => {
  const citySlides = getAllCitySlides();
  const defaultSlides = getDefaultSlides();
  return dedupeSlides([...citySlides, ...defaultSlides]);
};

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
