import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const projectRoot = process.cwd();
const titleRoot = path.join(projectRoot, 'public', 'img', 'Titelbild');
const titleMetaPath = path.join(titleRoot, 'title.meta.json');
const landingsRoot = path.join(projectRoot, 'public', 'landings');
const landingsMdPath = path.join(landingsRoot, 'landings.md');
const landingsJsonPath = path.join(landingsRoot, 'landings.json');

const transliterateGerman = (value) =>
  String(value)
    .replace(/ä/gi, 'ae')
    .replace(/ö/gi, 'oe')
    .replace(/ü/gi, 'ue')
    .replace(/ß/gi, 'ss');

const normalizeSlug = (value) =>
  transliterateGerman(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ensureDirectory = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const ensureGitkeep = (dirPath) => {
  const filePath = path.join(dirPath, '.gitkeep');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
    return filePath;
  }

  return null;
};

const uniqueSorted = (items) => Array.from(new Set(items)).sort((a, b) => a.localeCompare(b));

const readLandingsFromBodyBullets = (content) =>
  uniqueSorted(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- ') || line.startsWith('* '))
      .map((line) => normalizeSlug(line.slice(2).trim()))
      .filter((slug) => slug.length > 0 && slug !== 'default'),
  );

const readLandings = () => {
  if (fs.existsSync(landingsMdPath)) {
    try {
      const raw = fs.readFileSync(landingsMdPath, 'utf-8');
      const parsed = matter(raw);
      const data = parsed.data || {};
      const fromFrontmatter = data.cities ?? data.landings;

      if (Array.isArray(fromFrontmatter)) {
        return uniqueSorted(
          fromFrontmatter
            .map((item) => normalizeSlug(item))
            .filter((slug) => slug.length > 0 && slug !== 'default'),
        );
      }

      return readLandingsFromBodyBullets(parsed.content);
    } catch {
      const fallback = fs.readFileSync(landingsMdPath, 'utf-8');
      return readLandingsFromBodyBullets(fallback);
    }
  }

  if (fs.existsSync(landingsJsonPath)) {
    try {
      const raw = fs.readFileSync(landingsJsonPath, 'utf-8');
      const parsed = JSON.parse(raw);

      const list = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray(parsed.cities)
          ? parsed.cities
          : parsed && typeof parsed === 'object' && Array.isArray(parsed.landings)
            ? parsed.landings
            : [];

      return uniqueSorted(
        list
          .map((item) => normalizeSlug(item))
          .filter((slug) => slug.length > 0 && slug !== 'default'),
      );
    } catch {
      return [];
    }
  }

  return [];
};

ensureDirectory(titleRoot);

const created = [];

const registerCreated = (filePath) => {
  if (!filePath) {
    return;
  }

  created.push(`+ ${path.relative(projectRoot, filePath)}`);
};

registerCreated(ensureGitkeep(titleRoot));

if (!fs.existsSync(titleMetaPath)) {
  fs.writeFileSync(titleMetaPath, '{}\n');
  created.push(`+ ${path.relative(projectRoot, titleMetaPath)}`);
}

const defaultDir = path.join(titleRoot, 'default');
ensureDirectory(defaultDir);
registerCreated(ensureGitkeep(defaultDir));

const landings = readLandings();

for (const landing of landings) {
  const cityDir = path.join(titleRoot, landing);
  ensureDirectory(cityDir);
  registerCreated(ensureGitkeep(cityDir));
}

if (created.length > 0) {
  console.log('sync-title-images: Neue Titelbild-Ordner/Dateien angelegt:');
  for (const line of created) {
    console.log(line);
  }
} else {
  console.log('sync-title-images: Alles bereits vorhanden.');
}
