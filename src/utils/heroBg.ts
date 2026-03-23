import fs from 'fs';
import path from 'path';

const heroBgRoot = path.resolve('./public/img/hero-bg');
const allowedExtensions = new Set(['.avif', '.webp', '.png', '.jpg', '.jpeg', '.gif']);

const findFirstImage = (folderName: string): string | null => {
  const folderPath = path.join(heroBgRoot, folderName);
  if (!fs.existsSync(folderPath)) return null;

  const files = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((e) => e.isFile() && allowedExtensions.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();

  if (files.length === 0) return null;
  return `/img/hero-bg/${encodeURIComponent(folderName)}/${encodeURIComponent(files[0])}`;
};

/**
 * Löst ein Hero-Hintergrundbild auf.
 * Fallback-Kette (ohne Skill-"Default"): {skill}-{landing} → {landing} → null
 */
export const resolveHeroBg = (params?: { skill?: string; landing?: string }): string | null => {
  const skill = params?.skill ?? '';
  const landing = params?.landing ?? '';

  if (skill && landing) {
    const combo = findFirstImage(`${skill}-${landing}`);
    if (combo) return combo;
    const city = findFirstImage(landing);
    if (city) return city;
    return null;
  }

  if (landing) return findFirstImage(landing);
  if (skill) return findFirstImage(skill);
  return null;
};
