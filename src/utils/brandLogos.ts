import fs from 'fs';
import path from 'path';

export type BrandLogo = {
  src: string;
  label: string;
};

const allowedExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const logosRoot = path.resolve('./public/img/referenzenLogos');

export const getBrandLogos = (): BrandLogo[] => {
  if (!fs.existsSync(logosRoot)) {
    console.warn(`Brand logos directory not found: ${logosRoot}`);
    return [];
  }

  try {
    const files = fs.readdirSync(logosRoot);

    const logos = files
      .filter((file) => {
        const lowerCaseName = file.toLowerCase();
        const extension = lowerCaseName.slice(lowerCaseName.lastIndexOf('.'));
        return allowedExtensions.has(extension);
      })
      .map((file) => ({
        src: `/img/referenzenLogos/${file}`,
        label: decodeURIComponent(file)
          .replace(/\.[^.]+$/, '')
          .replace(/[_-]+/g, ' ')
          .trim(),
      }))
      .sort((a, b) => a.src.localeCompare(b.src));

    return logos;
  } catch (error) {
    console.error('Error reading brand logos:', error);
    return [];
  }
};
