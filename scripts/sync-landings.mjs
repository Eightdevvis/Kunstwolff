import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const projectRoot = process.cwd();
const landingsRoot = path.join(projectRoot, 'public', 'landings');
const landingsMdPath = path.join(landingsRoot, 'landings.md');
const landingsJsonPath = path.join(landingsRoot, 'landings.json');
const slidesRoot = path.join(projectRoot, 'public', 'img', 'slides');
const reviewsRoot = path.join(projectRoot, 'public', 'reviews');

const normalizeSlug = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeList = (items) => {
  const unique = new Set();

  for (const item of items) {
    if (typeof item !== 'string') continue;
    const slug = normalizeSlug(item);
    if (!slug) continue;
    if (slug === 'default') continue;
    unique.add(slug);
  }

  return Array.from(unique).sort((a, b) => a.localeCompare(b));
};

const readCitiesFromMarkdown = () => {
  if (!fs.existsSync(landingsMdPath)) {
    return [];
  }

  const raw = fs.readFileSync(landingsMdPath, 'utf-8');
  const parsed = matter(raw);
  const data = parsed.data || {};
  const fromFrontmatter = data.cities ?? data.landings;

  if (Array.isArray(fromFrontmatter)) {
    return normalizeList(fromFrontmatter);
  }

  const fromBody = parsed.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- ') || line.startsWith('* '))
    .map((line) => line.slice(2).trim());

  return normalizeList(fromBody);
};

const readCitiesFromJson = () => {
  if (!fs.existsSync(landingsJsonPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(landingsJsonPath, 'utf-8');
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return normalizeList(parsed);
    }

    if (parsed && typeof parsed === 'object') {
      const values = parsed.cities ?? parsed.landings;
      if (Array.isArray(values)) {
        return normalizeList(values);
      }
    }
  } catch {
    return [];
  }

  return [];
};

const ensureDirectory = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const ensureGitkeep = (dir) => {
  const keepFile = path.join(dir, '.gitkeep');
  if (!fs.existsSync(keepFile)) {
    fs.writeFileSync(keepFile, '');
  }
};

ensureDirectory(landingsRoot);
ensureDirectory(slidesRoot);
ensureDirectory(reviewsRoot);

const cities = (() => {
  const fromMd = readCitiesFromMarkdown();
  if (fromMd.length > 0) return fromMd;

  const fromJson = readCitiesFromJson();
  if (fromJson.length > 0) return fromJson;

  return [];
})();

if (cities.length === 0) {
  console.log('sync-landings: Keine Städte in public/landings/landings.md oder landings.json gefunden.');
  process.exit(0);
}

const created = [];

for (const city of cities) {
  const slideDir = path.join(slidesRoot, city);
  const reviewDir = path.join(reviewsRoot, city);

  if (!fs.existsSync(slideDir)) {
    ensureDirectory(slideDir);
    created.push(`+ ${path.relative(projectRoot, slideDir)}`);
  }

  if (!fs.existsSync(reviewDir)) {
    ensureDirectory(reviewDir);
    created.push(`+ ${path.relative(projectRoot, reviewDir)}`);
  }

  ensureGitkeep(slideDir);
  ensureGitkeep(reviewDir);
}

if (created.length > 0) {
  console.log('sync-landings: Neue Ordner angelegt:');
  for (const line of created) {
    console.log(line);
  }
} else {
  console.log('sync-landings: Alles bereits vorhanden.');
}
