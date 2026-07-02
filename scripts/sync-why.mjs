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

// Fallback wird nur genutzt wenn default.json noch nicht existiert UND keine Bilder gefunden werden.
// Kein hardcode auf .jpeg – leere image-Strings signalisieren "kein Bild gefunden",
// buildBenefitsForTarget() füllt die echten Pfade später dynamisch aus dem Dateisystem.
const fallbackDefaultWhy = {
  benefits: [
    {
      title: 'Echte Künstler - keine Agentur',
      text: 'Sie buchen uns direkt - ohne Vermittlung. Persönlicher Kontakt, klare Absprachen und professionelle Umsetzung.',
      image: '',
      alt: 'Live Künstler von Kunstwolff beim Zeichnen',
    },
    {
      title: 'Interaktiv & unvergesslich',
      text: 'Ihre Gäste erleben Kunst live und nehmen eine individuelle Erinnerung mit nach Hause.',
      image: '',
      alt: 'Gäste lachen während Schnellzeichner live zeichnet',
    },
    {
      title: 'Branding möglich',
      text: 'Logo, Hashtag oder Event-Motto integrieren wir direkt in jede Zeichnung - perfekt für Corporate Events.',
      image: '',
      alt: 'Gebrandete Karikatur mit Firmenlogo',
    },
    {
      title: 'Digital & klassisch',
      text: 'Ob Papier, iPad oder auch großem Monitor - wir passen uns Ihrem Eventkonzept flexibel an.',
      image: '',
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

const readLandingsFromBodyLines = (content) =>
  normalizeList(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && !line.startsWith('---'))
      .map((line) => (line.startsWith('- ') || line.startsWith('* ') ? line.slice(2).trim() : line)),
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

    return readLandingsFromBodyLines(parsed.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.warn(`sync-why: Warnung - landings.md Frontmatter konnte nicht geparst werden (${message}). Nutze Body-Fallback.`);
    return readLandingsFromBodyLines(raw);
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

// Findet die erste Sample-Datei für einen gegebenen Basisnamen (ohne Extension),
// damit wir unabhängig von der tatsächlichen Extension (.webp, .jpeg, ...) sind.
const findSampleFile = (baseName) => {
  const samplesDir = path.join(projectRoot, 'public', 'img', 'samples');
  if (!fs.existsSync(samplesDir)) return null;

  const files = fs.readdirSync(samplesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  // Exakten Match mit beliebiger Extension suchen (z.B. sample1.webp, sample1.jpeg, ...)
  const match = files.find((name) => {
    const ext = path.extname(name).toLowerCase();
    return imageExtensions.has(ext) && path.basename(name, ext) === baseName;
  });

  return match ? path.join(samplesDir, match) : null;
};

const ensureDefaultWhyImageSeed = (created) => {
  ensureDirectory(defaultWhyImagesDir);

  // KEIN Sample-Seeding mehr: leere Benefit-Ordner bleiben leer (nur .gitkeep).
  // Früher wurden sample1-4.webp hineinkopiert – die tauchten dann im Admin auf,
  // obwohl die Website sie nie nutzt (why.json referenziert sie nicht) → Admin
  // zeigte Platzhalter, live erschienen die Default-Bilder. Verwirrend, daher raus.
  for (const folder of ['benefit-1', 'benefit-2', 'benefit-3', 'benefit-4']) {
    const folderPath = path.join(defaultWhyImagesDir, folder);
    ensureDirectory(folderPath);
    if (!findFirstImageFileName(folderPath)) {
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

  // Nur die Ordnerstruktur sicherstellen – KEINE Default-/Sample-Bilder mehr in
  // Stadt-Ordner kopieren. Leerer Ordner bedeutet „nutzt Default" (why.json ist
  // leer). Eigene Stadt-Bilder entstehen ausschließlich durch Admin-Upload.
  for (const folder of getDefaultBenefitFolders()) {
    const targetFolder = path.join(targetDir, folder);
    ensureDirectory(targetFolder);
    if (!findFirstImageFileName(targetFolder)) {
      const keepPath = path.join(targetFolder, '.gitkeep');
      if (!fs.existsSync(keepPath)) {
        fs.writeFileSync(keepPath, '');
        created.push(`+ ${path.relative(projectRoot, keepPath)}`);
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

    // Alle Felder leer – Website merged komplett aus default.json.
    // Eigene Werte entstehen nur durch Admin-Überschreibung.
    return {
      title: '',
      text: '',
      image: '',
      alt: '',
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
  const isDefault = targetKey === 'default';
  const nextBenefits = generated.map((generatedBenefit, index) => {
    const current = existing.benefits[index] ?? {};
    const defaultBenefit = defaultWhy.benefits[index] ?? {};
    const currentImage = typeof current.image === 'string' ? current.image.trim() : '';

    // Für nicht-default Files: Felder die identisch mit default sind leeren,
    // damit Änderungen an default.json automatisch propagieren.
    const clearIfMatchesDefault = (field, currentValue) => {
      if (isDefault) return currentValue; // default.json selbst nicht bereinigen
      const trimmed = typeof currentValue === 'string' ? currentValue.trim() : '';
      if (trimmed.length === 0) return '';
      const defaultValue = typeof defaultBenefit[field] === 'string' ? defaultBenefit[field].trim() : '';
      return trimmed === defaultValue ? '' : trimmed;
    };

    // Image leeren wenn es kein echter Custom-Upload ist.
    // Sync-generierte Pfade erkennen:
    // 1. Sample/Default-Pfade direkt
    // 2. Gleicher Dateiname wie Default-Bild
    // 3. Sample-Dateiname-Pattern (sample1.webp etc.) in einem City-Benefit-Ordner
    const defaultImage = typeof defaultBenefit.image === 'string' ? defaultBenefit.image.trim() : '';
    const currentFileName = currentImage ? path.basename(currentImage) : '';
    const defaultFileName = defaultImage ? path.basename(defaultImage) : '';
    const isSyncCopy = currentFileName.length > 0 && (
      currentFileName === defaultFileName ||
      /^sample\d+\.\w+$/.test(currentFileName)
    );
    const clearImage = isDefault
      ? currentImage
      : (currentImage.length === 0 ||
         currentImage.startsWith('/img/samples/') ||
         currentImage.startsWith('/img/why/default/') ||
         isSyncCopy)
        ? ''
        : currentImage;

    return {
      title: clearIfMatchesDefault('title', current.title),
      text: clearIfMatchesDefault('text', current.text),
      image: clearImage,
      alt: clearIfMatchesDefault('alt', current.alt),
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
