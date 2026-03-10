import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const projectRoot = process.cwd();
const whyRoot = path.join(projectRoot, 'public', 'why');
const defaultFile = path.join(whyRoot, 'default.json');
const landingsRoot = path.join(projectRoot, 'public', 'landings');
const landingsMdPath = path.join(landingsRoot, 'landings.md');
const landingsJsonPath = path.join(landingsRoot, 'landings.json');
const skillsRoot = path.join(projectRoot, 'public', 'skills');
const skillsJsonPath = path.join(skillsRoot, 'skills.json');
const whyImagesRoot = path.join(projectRoot, 'public', 'img', 'why');
const defaultWhyImagesDir = path.join(whyImagesRoot, 'default');
const imageExtensions = new Set(['.avif', '.webp', '.png', '.jpg', '.jpeg', '.gif']);

const transliterateGerman = (value) =>
  String(value)
    .replace(/ä/gi, 'ae')
    .replace(/ö/gi, 'oe')
    .replace(/ü/gi, 'ue')
    .replace(/ß/gi, 'ss');

const fallbackDefaultWhy = {
  benefits: [
    {
      title: 'Echte Künstler - keine Agentur',
      text: 'Sie buchen uns direkt - ohne Vermittlung. Persönlicher Kontakt, klare Absprachen und professionelle Umsetzung.',
      image: '/img/why/default/benefit-1/sample1.jpeg',
      alt: 'Live Künstler von Kunstwolff beim Zeichnen',
    },
    {
      title: 'Interaktiv & unvergesslich',
      text: 'Ihre Gäste erleben Kunst live und nehmen eine individuelle Erinnerung mit nach Hause.',
      image: '/img/why/default/benefit-2/sample2.jpeg',
      alt: 'Gäste lachen während Schnellzeichner live zeichnet',
    },
    {
      title: 'Branding möglich',
      text: 'Logo, Hashtag oder Event-Motto integrieren wir direkt in jede Zeichnung - perfekt für Corporate Events.',
      image: '/img/why/default/benefit-3/sample3.jpeg',
      alt: 'Gebrandete Karikatur mit Firmenlogo',
    },
    {
      title: 'Digital & klassisch',
      text: 'Ob Papier, iPad oder auch großem Monitor - wir passen uns Ihrem Eventkonzept flexibel an.',
      image: '/img/why/default/benefit-4/sample4.jpeg',
      alt: 'Digitaler Schnellzeichner zeichnet auf Tablet',
    },
  ],
};

const ensureDirectory = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const readSkills = () => {
  if (!fs.existsSync(skillsJsonPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(skillsJsonPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const skills = Array.isArray(parsed?.skills) ? parsed.skills : [];
    return normalizeList(
      skills
        .map((entry) => (typeof entry?.title === 'string' ? entry.title : ''))
        .filter((value) => value.length > 0),
    );
  } catch {
    return [];
  }
};

const normalizeSlug = (value) =>
  transliterateGerman(value)
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

const readLandingsFromBodyBullets = (content) =>
  normalizeList(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- ') || line.startsWith('* '))
      .map((line) => line.slice(2).trim()),
  );

const readLandingsFromMarkdown = () => {
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

    return readLandingsFromBodyBullets(parsed.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.warn(`sync-why: Warnung - landings.md Frontmatter konnte nicht geparst werden (${message}). Nutze Body-Fallback.`);
    return readLandingsFromBodyBullets(raw);
  }
};

const readLandingsFromJson = () => {
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

const readDefaultWhy = () => {
  if (fs.existsSync(defaultFile)) {
    try {
      const raw = fs.readFileSync(defaultFile, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.benefits) && parsed.benefits.length > 0) {
        return parsed;
      }
    } catch {
      return fallbackDefaultWhy;
    }
  }

  return fallbackDefaultWhy;
};

const ensureDefaultWhyFile = () => {
  if (fs.existsSync(defaultFile)) {
    return null;
  }

  fs.writeFileSync(defaultFile, `${JSON.stringify(fallbackDefaultWhy, null, 2)}\n`);
  return path.relative(projectRoot, defaultFile);
};

const getDefaultBenefitFolders = () => {
  if (!fs.existsSync(defaultWhyImagesDir)) {
    return [];
  }

  return fs
    .readdirSync(defaultWhyImagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
};

const ensureDefaultWhyImageSeed = (created) => {
  ensureDirectory(defaultWhyImagesDir);

  const seeds = [
    { folder: 'benefit-1', source: path.join(projectRoot, 'public', 'img', 'samples', 'sample1.jpeg') },
    { folder: 'benefit-2', source: path.join(projectRoot, 'public', 'img', 'samples', 'sample2.jpeg') },
    { folder: 'benefit-3', source: path.join(projectRoot, 'public', 'img', 'samples', 'sample3.jpeg') },
    { folder: 'benefit-4', source: path.join(projectRoot, 'public', 'img', 'samples', 'sample4.jpeg') },
  ];

  for (const seed of seeds) {
    const folderPath = path.join(defaultWhyImagesDir, seed.folder);
    ensureDirectory(folderPath);

    if (fs.existsSync(seed.source)) {
      const target = path.join(folderPath, path.basename(seed.source));
      if (!fs.existsSync(target)) {
        fs.copyFileSync(seed.source, target);
        created.push(`+ ${path.relative(projectRoot, target)}`);
      }
    } else {
      const keepPath = path.join(folderPath, '.gitkeep');
      if (!fs.existsSync(keepPath)) {
        fs.writeFileSync(keepPath, '');
        created.push(`+ ${path.relative(projectRoot, keepPath)}`);
      }
    }
  }
};

const findFirstImageFileName = (dir) => {
  if (!fs.existsSync(dir)) {
    return null;
  }

  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => imageExtensions.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  return files[0] ?? null;
};

const ensureTargetImageFoldersFromDefault = (targetKey, created) => {
  const targetDir = path.join(whyImagesRoot, targetKey);
  ensureDirectory(targetDir);

  const folders = getDefaultBenefitFolders();

  for (const folder of folders) {
    const sourceFolder = path.join(defaultWhyImagesDir, folder);
    const targetFolder = path.join(targetDir, folder);

    if (!fs.existsSync(targetFolder)) {
      fs.cpSync(sourceFolder, targetFolder, { recursive: true });
      created.push(`+ ${path.relative(projectRoot, targetFolder)}`);
      continue;
    }

    const targetImage = findFirstImageFileName(targetFolder);
    if (targetImage) {
      continue;
    }

    const sourceImage = findFirstImageFileName(sourceFolder);
    if (sourceImage) {
      const sourcePath = path.join(sourceFolder, sourceImage);
      const targetPath = path.join(targetFolder, sourceImage);
      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath);
        created.push(`+ ${path.relative(projectRoot, targetPath)}`);
      }
    }
  }

  return targetDir;
};

const buildBenefitsForTarget = (targetKey, defaultWhy) => {
  const folders = getDefaultBenefitFolders();

  return defaultWhy.benefits.map((benefit, index) => {
    const folderName = folders[index] ?? `benefit-${index + 1}`;
    const targetFolder = path.join(whyImagesRoot, targetKey, folderName);
    const imageFileName = findFirstImageFileName(targetFolder);

    const nextImage = imageFileName
      ? `/img/why/${targetKey}/${folderName}/${imageFileName}`
      : typeof benefit.image === 'string'
        ? benefit.image
        : '/img/samples/sample1.jpeg';

    return {
      title: typeof benefit.title === 'string' ? benefit.title : `Vorteil ${index + 1}`,
      text: typeof benefit.text === 'string' ? benefit.text : '',
      image: nextImage,
      alt:
        typeof benefit.alt === 'string' && benefit.alt.trim().length > 0
          ? benefit.alt
          : typeof benefit.title === 'string'
            ? benefit.title
            : `Vorteil ${index + 1}`,
    };
  });
};

const readWhyPayload = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.benefits)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const syncExistingWhyFileImages = (targetKey, defaultWhy) => {
  const targetFile = path.join(whyRoot, `${targetKey}.json`);
  const existing = readWhyPayload(targetFile);

  if (!existing) {
    return null;
  }

  const generated = buildBenefitsForTarget(targetKey, defaultWhy);
  const nextBenefits = generated.map((generatedBenefit, index) => {
    const current = existing.benefits[index] ?? {};
    const currentImage = typeof current.image === 'string' ? current.image.trim() : '';
    const shouldReplaceImage =
      currentImage.length === 0 ||
      currentImage.startsWith('/img/samples/') ||
      currentImage.startsWith('/img/why/default/');

    return {
      title:
        typeof current.title === 'string' && current.title.trim().length > 0
          ? current.title
          : generatedBenefit.title,
      text:
        typeof current.text === 'string' && current.text.trim().length > 0
          ? current.text
          : generatedBenefit.text,
      image: shouldReplaceImage ? generatedBenefit.image : currentImage,
      alt:
        typeof current.alt === 'string' && current.alt.trim().length > 0
          ? current.alt
          : generatedBenefit.alt,
    };
  });

  const hasChanged = JSON.stringify(existing.benefits) !== JSON.stringify(nextBenefits);
  if (!hasChanged) {
    return null;
  }

  const nextPayload = {
    benefits: nextBenefits,
  };

  fs.writeFileSync(targetFile, `${JSON.stringify(nextPayload, null, 2)}\n`);
  return path.relative(projectRoot, targetFile);
};

const ensureWhyFile = (targetKey, defaultWhy) => {
  const targetFile = path.join(whyRoot, `${targetKey}.json`);

  if (fs.existsSync(targetFile)) {
    return null;
  }

  const nextPayload = {
    benefits: buildBenefitsForTarget(targetKey, defaultWhy),
  };

  fs.writeFileSync(targetFile, `${JSON.stringify(nextPayload, null, 2)}\n`);
  return path.relative(projectRoot, targetFile);
};

ensureDirectory(whyRoot);
ensureDirectory(whyImagesRoot);

const created = [];
const defaultFileCreated = ensureDefaultWhyFile();
if (defaultFileCreated) {
  created.push(`+ ${defaultFileCreated}`);
}

const defaultWhy = readDefaultWhy();

ensureDefaultWhyImageSeed(created);

const landingSlugs = (() => {
  const fromMd = readLandingsFromMarkdown();
  if (fromMd.length > 0) return fromMd;

  const fromJson = readLandingsFromJson();
  if (fromJson.length > 0) return fromJson;

  return [];
})();
const skillSlugs = readSkills();

if (fs.existsSync(path.join(whyRoot, '_vorlage.json'))) {
  fs.rmSync(path.join(whyRoot, '_vorlage.json'));
}

for (const landing of landingSlugs) {
  ensureTargetImageFoldersFromDefault(landing, created);
  const createdLandingFile = ensureWhyFile(landing, defaultWhy);
  if (createdLandingFile) {
    created.push(`+ ${createdLandingFile}`);
    continue;
  }

  const updatedLandingFile = syncExistingWhyFileImages(landing, defaultWhy);
  if (updatedLandingFile) {
    created.push(`~ ${updatedLandingFile}`);
  }
}

for (const skill of skillSlugs) {
  ensureTargetImageFoldersFromDefault(skill, created);
  const createdSkillFile = ensureWhyFile(skill, defaultWhy);
  if (createdSkillFile) {
    created.push(`+ ${createdSkillFile}`);
    continue;
  }

  const updatedSkillFile = syncExistingWhyFileImages(skill, defaultWhy);
  if (updatedSkillFile) {
    created.push(`~ ${updatedSkillFile}`);
  }
}

const updatedDefaultFile = syncExistingWhyFileImages('default', defaultWhy);
if (updatedDefaultFile) {
  created.push(`~ ${updatedDefaultFile}`);
}

if (created.length > 0) {
  console.log('sync-why: Neue Dateien angelegt:');
  for (const line of created) {
    console.log(line);
  }
} else {
  console.log('sync-why: Alles bereits vorhanden.');
}
