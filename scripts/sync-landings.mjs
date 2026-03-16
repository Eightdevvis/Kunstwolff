import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const projectRoot = process.cwd();
const landingsRoot = path.join(projectRoot, 'public', 'landings');
const landingsMdPath = path.join(landingsRoot, 'landings.md');
const landingsJsonPath = path.join(landingsRoot, 'landings.json');
const slidesRoot = path.join(projectRoot, 'public', 'img', 'slides');
const reviewsRoot = path.join(projectRoot, 'public', 'reviews');
const faqRoot = path.join(projectRoot, 'public', 'faq');
const whyImagesRoot = path.join(projectRoot, 'public', 'img', 'why');
const whyRoot = path.join(projectRoot, 'public', 'why');
const reportsRoot = path.join(projectRoot, 'reports', 'validation', 'landings');
const slidesMetadataPath = path.join(slidesRoot, 'slides.meta.json');
const skillsJsonPath = path.join(projectRoot, 'public', 'skills', 'skills.json');
const publicImgRoot = path.join(projectRoot, 'public', 'img');
const titleImageRoot = path.join(publicImgRoot, 'Titelbild');
const titleMetadataPath = path.join(titleImageRoot, 'title.meta.json');
const skillImagesRoot = path.join(projectRoot, 'public', 'img', 'UnsereFähigkeitenBilder');
const minLandingSlides = 6;
const allowedImageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
const rootReviewTemplatePath = path.join(reviewsRoot, '_vorlage.md');
const cityReviewTemplateFileName = '_vorlage.md';
const fallbackReviewTemplate = `---
author: "Max Mustermann"
categories:
  - Schnellzeichner
---
Das war ein großartiges Event und alle Gäste waren begeistert.
`;

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

const parsePriorityPrefix = (fileName) => {
  const match = fileName.match(/^(\d+)_/);
  if (!match) {
    return undefined;
  }

  const value = Number.parseInt(match[1], 10);
  return Number.isNaN(value) ? undefined : value;
};

const stripPriorityPrefix = (fileName) => fileName.replace(/^\d+_/, '');

const normalizeImageName = (fileName) => {
  const extension = path.extname(fileName);
  const withoutExt = path.basename(fileName, extension);
  return normalizeSlug(stripPriorityPrefix(withoutExt));
};

const normalizeMetadataKey = (value) => String(value).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

const encodeUrlPath = (segments) => segments.map((segment) => encodeURIComponent(segment)).join('/');

const toImageUrlFromImgRelativePath = (imgRelativePath) => {
  const normalized = String(imgRelativePath).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) {
    return '/img';
  }
  return `/img/${encodeUrlPath(segments)}`;
};

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

const normalizeItems = (items) =>
  items
    .filter((item) => typeof item === 'string')
    .map((item) => ({ raw: item.trim(), slug: normalizeSlug(item) }))
    .filter(({ slug }) => slug.length > 0)
    .filter(({ slug }) => slug !== 'default');

const getUniquePath = (targetPath) => {
  if (!fs.existsSync(targetPath)) {
    return targetPath;
  }

  const parsed = path.parse(targetPath);

  for (let counter = 1; counter < 1000; counter++) {
    const candidate = path.join(parsed.dir, `${parsed.name}__merged_${counter}${parsed.ext}`);
    if (!fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`getUniquePath: Konnte keinen freien Pfad für ${targetPath} finden (>1000 Kollisionen)`);

};

const mergeDirectoryContents = (sourceDir, targetDir) => {
  if (!fs.existsSync(sourceDir)) {
    return { moved: 0, collisions: 0 };
  }

  ensureDirectory(targetDir);

  const stack = [{ src: sourceDir, dst: targetDir }];
  let moved = 0;
  let collisions = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = fs.readdirSync(current.src, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(current.src, entry.name);
      const targetPath = path.join(current.dst, entry.name);

      if (entry.isDirectory()) {
        ensureDirectory(targetPath);
        stack.push({ src: sourcePath, dst: targetPath });
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const finalTarget = fs.existsSync(targetPath) ? getUniquePath(targetPath) : targetPath;
      if (finalTarget !== targetPath) {
        collisions += 1;
      }

      ensureDirectory(path.dirname(finalTarget));
      fs.renameSync(sourcePath, finalTarget);
      moved += 1;
    }
  }

  fs.rmSync(sourceDir, { recursive: true, force: true });
  return { moved, collisions };
};

const mergeVariantDirectories = (root, slug, ignoredNames = []) => {
  if (!fs.existsSync(root)) {
    return { moved: 0, collisions: 0, mergedDirs: [] };
  }

  const ignored = new Set(ignoredNames);
  const candidates = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !ignored.has(name))
    .filter((name) => normalizeSlug(name) === slug)
    .sort((a, b) => a.localeCompare(b));

  if (candidates.length <= 1 && candidates[0] === slug) {
    return { moved: 0, collisions: 0, mergedDirs: [] };
  }

  const targetName = candidates.includes(slug) ? slug : candidates[0] ?? slug;
  const targetDir = path.join(root, targetName);
  ensureDirectory(targetDir);

  let moved = 0;
  let collisions = 0;
  const mergedDirs = [];

  for (const sourceName of candidates) {
    if (sourceName === targetName) {
      continue;
    }

    const sourceDir = path.join(root, sourceName);
    const result = mergeDirectoryContents(sourceDir, targetDir);
    moved += result.moved;
    collisions += result.collisions;
    mergedDirs.push(sourceName);
  }

  if (targetName !== slug) {
    const canonicalDir = path.join(root, slug);
    const result = mergeDirectoryContents(targetDir, canonicalDir);
    moved += result.moved;
    collisions += result.collisions;
  }

  return { moved, collisions, mergedDirs };
};

const mergeDuplicateLandingArtifacts = (slug) => {
  const targets = [
    { root: slidesRoot, ignored: ['default'] },
    { root: reviewsRoot, ignored: ['default'] },
    { root: faqRoot, ignored: ['default'] },
    { root: whyImagesRoot, ignored: ['default'] },
  ];

  let moved = 0;
  let collisions = 0;
  let mergedDirCount = 0;

  for (const target of targets) {
    const result = mergeVariantDirectories(target.root, slug, target.ignored);
    moved += result.moved;
    collisions += result.collisions;
    mergedDirCount += result.mergedDirs.length;
  }

  return { moved, collisions, mergedDirCount };
};

const readCitiesFromBodyLines = (content) =>
  normalizeList(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && !line.startsWith('---'))
      .map((line) => (line.startsWith('- ') || line.startsWith('* ') ? line.slice(2).trim() : line)),
  );

const readCitiesFromMarkdown = () => {
  if (!fs.existsSync(landingsMdPath)) {
    return [];
  }

  const raw = fs.readFileSync(landingsMdPath, 'utf-8');
  try {
    const parsed = matter(raw);
    const data = parsed.data || {};
    const fromFrontmatter = data.cities ?? data.landings;

    if (Array.isArray(fromFrontmatter)) {
      return normalizeList(fromFrontmatter);
    }

    return readCitiesFromBodyLines(parsed.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.warn(`sync-landings: Warnung - landings.md Frontmatter konnte nicht geparst werden (${message}). Nutze Body-Fallback.`);
    return readCitiesFromBodyLines(raw);
  }
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

const readSkillsForReport = () => {
  if (!fs.existsSync(skillsJsonPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(skillsJsonPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : parsed?.skills ?? [];
    if (!Array.isArray(list)) {
      return [];
    }

    return list
      .map((item) => (typeof item?.title === 'string' ? item.title.trim() : ''))
      .filter(Boolean)
      .map((title) => ({ title, slug: normalizeSlug(title) }));
  } catch {
    return [];
  }
};

const readSlidesMetadata = () => {
  if (!fs.existsSync(slidesMetadataPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(slidesMetadataPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => {
        const normalizedKey = String(key).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        const entry = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        return [normalizedKey, entry];
      }),
    );
  } catch {
    return {};
  }
};

const normalizeBenefitEntry = (entry) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const image = typeof entry.image === 'string' ? entry.image.trim() : '';
  if (!image) {
    return null;
  }

  return { image };
};

const readWhyBenefitsFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.benefits)) {
      return [];
    }

    return parsed.benefits.map(normalizeBenefitEntry).filter((item) => item !== null);
  } catch {
    return [];
  }
};

const resolveWhyImagesForContext = (skillSlug, landingSlug) => {
  const candidates = [];

  if (skillSlug && landingSlug) {
    candidates.push(path.join(whyRoot, `${skillSlug}-${landingSlug}.json`));
  }

  if (landingSlug) {
    candidates.push(path.join(whyRoot, `${landingSlug}.json`));
  }

  if (skillSlug) {
    candidates.push(path.join(whyRoot, `${skillSlug}.json`));
  }

  candidates.push(path.join(whyRoot, 'default.json'));

  for (const candidate of candidates) {
    const benefits = readWhyBenefitsFile(candidate);
    if (benefits.length > 0) {
      return benefits.map((benefit) => benefit.image);
    }
  }

  return [
    '/img/samples/sample1.webp',
    '/img/samples/sample2.webp',
    '/img/samples/sample3.webp',
    '/img/samples/sample4.webp',
  ];
};

const resolveSkillImageUrl = (skillTitle) => {
  if (!fs.existsSync(skillImagesRoot)) {
    return undefined;
  }

  const folders = fs
    .readdirSync(skillImagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const wanted = normalizeSlug(skillTitle);
  const matchedFolder = folders.find((name) => normalizeSlug(name) === wanted);

  if (!matchedFolder) {
    return undefined;
  }

  const folderPath = path.join(skillImagesRoot, matchedFolder);
  const imageFile = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => allowedImageExtensions.has(path.extname(fileName).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))[0];

  if (!imageFile) {
    return undefined;
  }

  return `/img/${encodeUrlPath(['UnsereFähigkeitenBilder', matchedFolder, imageFile])}`;
};

const readTitleMetadata = () => {
  if (!fs.existsSync(titleMetadataPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(titleMetadataPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => {
        const normalizedKey = normalizeMetadataKey(String(key));
        const entry = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        return [normalizedKey, entry];
      }),
    );
  } catch {
    return {};
  }
};

const readTitleFolderImages = (folderName, metadata) => {
  const folderPath = path.join(titleImageRoot, folderName);
  if (!fs.existsSync(folderPath)) {
    return [];
  }

  return fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => allowedImageExtensions.has(path.extname(fileName).toLowerCase()))
    .map((fileName, index) => {
      const key = normalizeMetadataKey(path.posix.join(folderName, fileName));
      const entry = metadata[key] ?? {};
      if (entry.enabled === false) {
        return null;
      }

      const categories = Array.isArray(entry.categories)
        ? entry.categories.filter((item) => typeof item === 'string' && item.trim().length > 0)
        : [];

      return {
        src: `/img/${encodeUrlPath(['Titelbild', folderName, fileName])}`,
        categories,
        priority: typeof entry.priority === 'number' && !Number.isNaN(entry.priority) ? entry.priority : index + 1,
      };
    })
    .filter((item) => item !== null)
    .sort((a, b) => b.priority - a.priority || a.src.localeCompare(b.src));
};

const categoryMatchesSkillSlug = (categories, skillSlug) => {
  if (!skillSlug || categories.length === 0) {
    return false;
  }

  return categories.some((category) => normalizeSlug(category) === skillSlug);
};

const pickReportTitleImage = (pool, skillSlug) => {
  if (skillSlug) {
    const categorized = pool.filter((item) => categoryMatchesSkillSlug(item.categories, skillSlug));
    if (categorized.length > 0) {
      return categorized[0].src;
    }
  }

  return pool[0]?.src;
};

const resolveReportTitleImage = ({ skillSlug, landingSlug }) => {
  const metadata = readTitleMetadata();
  const cityImages = landingSlug ? readTitleFolderImages(landingSlug, metadata) : [];
  const defaultImages = readTitleFolderImages('default', metadata);
  const pool = cityImages.length > 0 ? [...cityImages, ...defaultImages] : defaultImages;

  return pickReportTitleImage(pool, skillSlug) ?? '/img/samples/sample1.jpeg';
};

const listAllPublicImages = () => {
  if (!fs.existsSync(publicImgRoot)) {
    return [];
  }

  const result = [];
  const stack = [publicImgRoot];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!allowedImageExtensions.has(extension)) {
        continue;
      }

      const relativeFromImgRoot = path.relative(publicImgRoot, absolutePath).replace(/\\/g, '/');
      const url = toImageUrlFromImgRelativePath(relativeFromImgRoot);

      result.push({
        url,
        relativeFromImgRoot,
        fileName: entry.name,
        extension,
        prefixIndex: parsePriorityPrefix(entry.name) ?? null,
        rawBaseName: path.basename(stripPriorityPrefix(entry.name), extension),
        normalizedImageSlug: normalizeImageName(entry.name),
      });
    }
  }

  return result.sort((a, b) => a.relativeFromImgRoot.localeCompare(b.relativeFromImgRoot));
};

const metadataExtensionFallbacks = ['.webp', '.jpg', '.jpeg', '.png', '.avif', '.gif'];

const resolveMetadataForImage = (folderName, fileName, metadata) => {
  const exactKey = `${folderName}/${fileName}`;
  if (metadata[exactKey]) {
    return { metadataKey: exactKey, value: metadata[exactKey] };
  }

  const ext = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, ext);

  for (const fallbackExt of metadataExtensionFallbacks) {
    if (fallbackExt === ext) continue;
    const fallbackKey = `${folderName}/${base}${fallbackExt}`;
    if (metadata[fallbackKey]) {
      return { metadataKey: fallbackKey, value: metadata[fallbackKey] };
    }
  }

  return { metadataKey: exactKey, value: {} };
};

const readEffectiveFolderSlides = (folderName, metadata) => {
  const folderPath = path.join(slidesRoot, folderName);
  if (!fs.existsSync(folderPath)) {
    return [];
  }

  const fileNames = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => allowedImageExtensions.has(path.extname(fileName).toLowerCase()))
    .filter((fileName, _, allFileNames) => {
      const ext = path.extname(fileName).toLowerCase();
      if (ext === '.webp') {
        return true;
      }

      const webpVariant = `${path.basename(fileName, ext)}.webp`;
      return !allFileNames.includes(webpVariant);
    });

  return fileNames
    .map((fileName) => {
      const resolved = resolveMetadataForImage(folderName, fileName, metadata);
      const metadataEntry = resolved.value || {};
      const categories = Array.isArray(metadataEntry.categories)
        ? metadataEntry.categories.filter((item) => typeof item === 'string' && item.trim().length > 0)
        : [];
      const enabled = metadataEntry.enabled !== false;

      return {
        slideKey: `${folderName}/${fileName}`,
        folder: folderName,
        fileName,
        prefixIndex: parsePriorityPrefix(fileName) ?? null,
        rawBaseName: path.basename(stripPriorityPrefix(fileName), path.extname(fileName)),
        normalizedImageSlug: normalizeImageName(fileName),
        metadataKey: resolved.metadataKey,
        priority: typeof metadataEntry.priority === 'number' ? metadataEntry.priority : 0,
        categories,
        enabled,
      };
    })
    .filter((entry) => entry.enabled)
    .sort((a, b) => {
      const byPriority = (b.priority ?? 0) - (a.priority ?? 0);
      if (byPriority !== 0) return byPriority;
      return a.slideKey.localeCompare(b.slideKey);
    });
};

const dedupeBySlideKey = (slides) => {
  const seen = new Set();
  const result = [];

  for (const slide of slides) {
    if (seen.has(slide.slideKey)) {
      continue;
    }
    seen.add(slide.slideKey);
    result.push(slide);
  }

  return result;
};

const buildSlidesVisibilityReport = (cities) => {
  const metadata = readSlidesMetadata();
  const skills = readSkillsForReport();

  const allSlideFolders = fs.existsSync(slidesRoot)
    ? fs
        .readdirSync(slidesRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name) => name !== 'default')
        .sort((a, b) => a.localeCompare(b))
    : [];

  const folderSlides = new Map();
  folderSlides.set('default', readEffectiveFolderSlides('default', metadata));
  for (const folder of allSlideFolders) {
    folderSlides.set(folder, readEffectiveFolderSlides(folder, metadata));
  }

  const pagesBySlideKey = new Map();
  const addPage = (slideKey, page) => {
    const current = pagesBySlideKey.get(slideKey) ?? new Set();
    current.add(page);
    pagesBySlideKey.set(slideKey, current);
  };

  const defaultSlides = folderSlides.get('default') ?? [];

  for (const city of cities) {
    const citySlides = folderSlides.get(city) ?? [];
    const needed = Math.max(0, minLandingSlides - citySlides.length);
    const effectiveLandingSlides = dedupeBySlideKey([...citySlides, ...defaultSlides.slice(0, needed)]);

    for (const slide of effectiveLandingSlides) {
      addPage(slide.slideKey, `/${city}/`);

      for (const skill of skills) {
        if (slide.categories.some((cat) => normalizeSlug(cat) === skill.slug)) {
          addPage(slide.slideKey, `/${skill.slug}/${city}/`);
        }
      }
    }
  }

  const homepageSlides = dedupeBySlideKey([
    ...allSlideFolders.flatMap((folder) => folderSlides.get(folder) ?? []),
    ...defaultSlides,
  ]);
  for (const slide of homepageSlides) {
    addPage(slide.slideKey, '/');
  }

  const allSlides = dedupeBySlideKey([
    ...Array.from(folderSlides.values()).flat(),
  ]);

  return allSlides
    .map((slide) => ({
      ...slide,
      url: `/img/${encodeUrlPath(['slides', slide.folder, slide.fileName])}`,
      visibleOnPages: Array.from(pagesBySlideKey.get(slide.slideKey) ?? []).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.slideKey.localeCompare(b.slideKey));
};

const buildGlobalImageInventoryReport = (cities, slideVisibility) => {
  const skills = readSkillsForReport();
  const usageByImage = new Map();

  const addUsage = (url, page) => {
    if (!url || typeof url !== 'string') {
      return;
    }

    if (!url.startsWith('/img/')) {
      return;
    }

    const current = usageByImage.get(url) ?? new Set();
    current.add(page);
    usageByImage.set(url, current);
  };

  for (const slide of slideVisibility) {
    for (const page of slide.visibleOnPages) {
      addUsage(slide.url, page);
    }
  }

  const allPages = ['/', ...cities.map((city) => `/${city}/`)];

  for (const skill of skills) {
    allPages.push(`/${skill.slug}/`);
    for (const city of cities) {
      allPages.push(`/${skill.slug}/${city}/`);
    }
  }

  for (const page of allPages) {
    const parts = page.split('/').filter(Boolean);
    const skillSlug = parts.length >= 1 && skills.some((skill) => skill.slug === parts[0]) ? parts[0] : undefined;
    const citySlug =
      parts.length === 1 && !skillSlug
        ? parts[0]
        : parts.length >= 2 && skillSlug
          ? parts[1]
          : undefined;

    const whyImages = resolveWhyImagesForContext(skillSlug, citySlug);
    for (const image of whyImages) {
      addUsage(image, page);
    }
  }

  addUsage(resolveReportTitleImage({}), '/');
  for (const city of cities) {
    addUsage(resolveReportTitleImage({ landingSlug: city }), `/${city}/`);
  }

  for (const skill of skills) {
    const skillImage = resolveSkillImageUrl(skill.title);
    if (skillImage) {
      addUsage(skillImage, '/');
      for (const city of cities) {
        addUsage(skillImage, `/${city}/`);
      }
    }

    const skillTitleImage = resolveReportTitleImage({ skillSlug: skill.slug });
    addUsage(skillTitleImage, `/${skill.slug}/`);
    for (const city of cities) {
      addUsage(resolveReportTitleImage({ skillSlug: skill.slug, landingSlug: city }), `/${skill.slug}/${city}/`);
    }
  }

  const inventory = listAllPublicImages();

  return inventory.map((item) => ({
    ...item,
    visibleOnPages: Array.from(usageByImage.get(item.url) ?? []).sort((a, b) => a.localeCompare(b)),
  }));
};

const pruneOldReports = (dir, keepLatest = 7) => {
  if (!fs.existsSync(dir)) {
    return;
  }

  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => ({
      name: entry.name,
      filePath: path.join(dir, entry.name),
      mtimeMs: fs.statSync(path.join(dir, entry.name)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const stale of files.slice(keepLatest)) {
    fs.rmSync(stale.filePath, { force: true });
  }
};

const writeValidationReport = ({ configuredRawEntries, cities, duplicateSummary }) => {
  ensureDirectory(reportsRoot);

  const now = new Date();
  const stamp = now.toISOString().replace(/[:]/g, '-');
  const filePath = path.join(reportsRoot, `${stamp}.json`);

  const normalizedSummary = configuredRawEntries.map((entry) => ({
    raw: entry.raw,
    normalizedSlug: entry.slug,
    kept: cities.includes(entry.slug),
  }));

  const dropped = normalizedSummary.filter((entry) => !entry.kept).map(({ raw, normalizedSlug }) => ({ raw, normalizedSlug }));

  const slideVisibility = buildSlidesVisibilityReport(cities);
  const allImageVisibility = buildGlobalImageInventoryReport(cities, slideVisibility);
  const unreferencedImages = allImageVisibility.filter((entry) => entry.visibleOnPages.length === 0);

  const payload = {
    createdAt: now.toISOString(),
    selectedCities: cities,
    inputCount: configuredRawEntries.length,
    normalizedSummary,
    dropped,
    duplicateMerges: duplicateSummary,
    slideVisibility,
    allImageVisibility,
    unreferencedImages,
  };

  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  pruneOldReports(reportsRoot, 7);
  return path.relative(projectRoot, filePath);
};

const getReviewTemplateContent = () => {
  if (!fs.existsSync(rootReviewTemplatePath)) {
    return fallbackReviewTemplate;
  }

  return fs.readFileSync(rootReviewTemplatePath, 'utf-8');
};

const ensureCityReviewTemplate = (dir, templateContent) => {
  const existingTemplateNames = ['_vorlage.md', 'vorlage.md'];
  const hasTemplate = existingTemplateNames.some((fileName) =>
    fs.existsSync(path.join(dir, fileName)),
  );

  if (hasTemplate) {
    return null;
  }

  const cityTemplatePath = path.join(dir, cityReviewTemplateFileName);
  fs.writeFileSync(cityTemplatePath, templateContent);
  return cityTemplatePath;
};

ensureDirectory(landingsRoot);
ensureDirectory(slidesRoot);
ensureDirectory(reviewsRoot);

// Liest Städteliste einmal und gibt sowohl deduped cities als auch raw entries zurück
const readAllLandingsData = () => {
  if (fs.existsSync(landingsMdPath)) {
    try {
      const raw = fs.readFileSync(landingsMdPath, 'utf-8');
      const parsed = matter(raw);
      const data = parsed.data || {};
      const fromFrontmatter = data.cities ?? data.landings;

      const rawLines = Array.isArray(fromFrontmatter)
        ? fromFrontmatter
        : parsed.content
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#') && !line.startsWith('---'))
            .map((line) => (line.startsWith('- ') || line.startsWith('* ') ? line.slice(2).trim() : line));

      return { cities: normalizeList(rawLines), rawEntries: normalizeItems(rawLines) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.warn(`sync-landings: Warnung - landings.md konnte nicht geparst werden (${message}). Nutze Body-Fallback.`);
    }
  }

  if (fs.existsSync(landingsJsonPath)) {
    try {
      const raw = fs.readFileSync(landingsJsonPath, 'utf-8');
      const parsed = JSON.parse(raw);
      const values = Array.isArray(parsed) ? parsed : (parsed?.cities ?? parsed?.landings ?? []);
      if (Array.isArray(values)) {
        return { cities: normalizeList(values), rawEntries: normalizeItems(values) };
      }
    } catch {
      // ignore
    }
  }

  return { cities: [], rawEntries: [] };
};

const { cities, rawEntries: configuredRawEntries } = readAllLandingsData();

if (cities.length === 0) {
  console.log('sync-landings: Keine Städte in public/landings/landings.md oder landings.json gefunden.');
  process.exit(0);
}

const created = [];
const reviewTemplateContent = getReviewTemplateContent();
const duplicateSummary = [];

if (configuredRawEntries.length > 0) {
  const duplicates = new Map();

  for (const entry of configuredRawEntries) {
    const existing = duplicates.get(entry.slug) ?? new Set();
    existing.add(entry.raw);
    duplicates.set(entry.slug, existing);
  }

  for (const [slug, values] of duplicates.entries()) {
    if (values.size <= 1) {
      continue;
    }

    const mergeResult = mergeDuplicateLandingArtifacts(slug);
    duplicateSummary.push({ slug, variants: Array.from(values), ...mergeResult });
  }
}

// Ensure root-level _vorlage.md exists
const rootTemplate = ensureCityReviewTemplate(reviewsRoot, reviewTemplateContent);
if (rootTemplate) {
  created.push(`+ ${path.relative(projectRoot, rootTemplate)}`);
}

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

  const createdCityTemplate = ensureCityReviewTemplate(reviewDir, reviewTemplateContent);
  if (createdCityTemplate) {
    created.push(`+ ${path.relative(projectRoot, createdCityTemplate)}`);
  }
}

if (created.length > 0) {
  console.log('sync-landings: Neue Ordner angelegt:');
  for (const line of created) {
    console.log(line);
  }
} else {
  console.log('sync-landings: Alles bereits vorhanden.');
}

if (duplicateSummary.length > 0) {
  console.log('sync-landings: Duplikat-Slugs erkannt und zusammengeführt:');
  for (const summary of duplicateSummary) {
    console.log(
      `- ${summary.slug}: Varianten [${summary.variants.join(', ')}], gemergte Ordner ${summary.mergedDirCount}, verschobene Dateien ${summary.moved}, Kollisionen ${summary.collisions}`,
    );
  }
}

const validationReportPath = writeValidationReport({ configuredRawEntries, cities, duplicateSummary });
console.log(`sync-landings: Validierungsreport geschrieben: ${validationReportPath}`);
