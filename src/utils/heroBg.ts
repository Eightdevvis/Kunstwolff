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
  // Teilweise kodieren: ein verschachtelter Ordnername würde am Stück zu %2F,
  // und %2F trennt keine Pfade (siehe slideImages.ts).
  const encodePath = (value: string): string =>
    value.split('/').map((part) => encodeURIComponent(part)).join('/');
  return `/img/hero-bg/${encodePath(folderName)}/${encodePath(files[0])}`;
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
