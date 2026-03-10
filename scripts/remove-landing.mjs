import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const projectRoot = process.cwd();

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

const toSessionPrefix = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const getUniquePath = (targetPath) => {
  if (!fs.existsSync(targetPath)) {
    return targetPath;
  }

  const parsed = path.parse(targetPath);
  let counter = 1;

  while (true) {
    const candidate = path.join(parsed.dir, `${parsed.name}__${counter}${parsed.ext}`);
    if (!fs.existsSync(candidate)) {
      return candidate;
    }
    counter += 1;
  }
};

const moveToArchive = (sourcePath, archiveSessionRoot, manifest) => {
  if (!fs.existsSync(sourcePath)) {
    return;
  }

  const relative = path.relative(projectRoot, sourcePath);
  const targetPath = getUniquePath(path.join(archiveSessionRoot, relative));

  ensureDirectory(path.dirname(targetPath));
  fs.renameSync(sourcePath, targetPath);

  manifest.push({ from: relative, to: path.relative(projectRoot, targetPath) });
};

const collectMatchingDirectories = (rootPath, slug, options = {}) => {
  const { exclude = [] } = options;

  if (!fs.existsSync(rootPath)) {
    return [];
  }

  const excluded = new Set(exclude);

  return fs
    .readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !excluded.has(name))
    .filter((name) => normalizeSlug(name) === slug)
    .map((name) => path.join(rootPath, name));
};

const collectMatchingWhyJsonFiles = (whyRoot, slug) => {
  if (!fs.existsSync(whyRoot)) {
    return [];
  }

  return fs
    .readdirSync(whyRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.json')
    .map((entry) => entry.name)
    .filter((fileName) => {
      const base = path.basename(fileName, '.json');
      const normalizedBase = normalizeSlug(base);
      return normalizedBase === slug || normalizedBase.endsWith(`-${slug}`);
    })
    .map((fileName) => path.join(whyRoot, fileName));
};

const cleanTitleMetadataForLanding = (titleMetaPath, landingSlug) => {
  if (!fs.existsSync(titleMetaPath)) {
    return { changed: false, removedKeys: [] };
  }

  try {
    const raw = fs.readFileSync(titleMetaPath, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { changed: false, removedKeys: [] };
    }

    const entries = Object.entries(parsed);
    const toRemove = entries
      .map(([key]) => key)
      .filter((key) => {
        const parts = String(key)
          .replace(/\\/g, '/')
          .replace(/^\/+|\/+$/g, '')
          .split('/')
          .filter(Boolean);

        if (parts.length === 0) {
          return false;
        }

        if (normalizeSlug(parts[0]) === landingSlug) {
          return true;
        }

        if (parts[0] === 'landings' && parts[1] && normalizeSlug(parts[1]) === landingSlug) {
          return true;
        }

        if (parts[0] === 'skills' && parts[2] && normalizeSlug(parts[2]) === landingSlug) {
          return true;
        }

        return false;
      });

    if (toRemove.length === 0) {
      return { changed: false, removedKeys: [] };
    }

    const next = { ...parsed };
    for (const key of toRemove) {
      delete next[key];
    }

    fs.writeFileSync(titleMetaPath, `${JSON.stringify(next, null, 2)}\n`, 'utf-8');
    return { changed: true, removedKeys: toRemove };
  } catch {
    return { changed: false, removedKeys: [] };
  }
};

const collectMatchingTitleImageTargets = (titleRoot, slug) => {
  if (!fs.existsSync(titleRoot)) {
    return [];
  }

  const targets = [];

  // Current structure: public/img/Titelbild/<landing-slug>
  targets.push(...collectMatchingDirectories(titleRoot, slug, { exclude: ['default'] }));

  // Legacy structure: public/img/Titelbild/landings/<landing-slug>
  const legacyLandingsRoot = path.join(titleRoot, 'landings');
  targets.push(...collectMatchingDirectories(legacyLandingsRoot, slug, { exclude: ['default'] }));

  // Legacy structure: public/img/Titelbild/skills/<skill-slug>/<landing-slug>
  const legacySkillsRoot = path.join(titleRoot, 'skills');
  if (fs.existsSync(legacySkillsRoot)) {
    const skillFolders = fs
      .readdirSync(legacySkillsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const skillFolder of skillFolders) {
      const skillPath = path.join(legacySkillsRoot, skillFolder);
      targets.push(...collectMatchingDirectories(skillPath, slug, { exclude: ['default'] }));
    }
  }

  return [...new Set(targets)];
};

const removeSlugFromLandingsMarkdown = (filePath, slug) => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');

  try {
    const parsed = matter(raw);
    const nextData = { ...(parsed.data || {}) };
    let changed = false;

    for (const key of ['cities', 'landings']) {
      const current = nextData[key];
      if (!Array.isArray(current)) {
        continue;
      }

      const filtered = current.filter((item) => normalizeSlug(item) !== slug);
      if (filtered.length !== current.length) {
        nextData[key] = filtered;
        changed = true;
      }
    }

    const nextBody = parsed.content
      .split(/\r?\n/)
      .filter((line) => {
        const trimmed = line.trim();
        if (!(trimmed.startsWith('- ') || trimmed.startsWith('* '))) {
          return true;
        }

        const value = trimmed.slice(2).trim();
        return normalizeSlug(value) !== slug;
      })
      .join('\n');

    if (nextBody !== parsed.content) {
      changed = true;
    }

    if (!changed) {
      return false;
    }

    const nextRaw = matter.stringify(nextBody, nextData);
    fs.writeFileSync(filePath, nextRaw, 'utf-8');
    return true;
  } catch {
    const fallback = raw
      .split(/\r?\n/)
      .filter((line) => {
        const trimmed = line.trim();
        if (!(trimmed.startsWith('- ') || trimmed.startsWith('* '))) {
          return true;
        }

        const value = trimmed.slice(2).trim();
        return normalizeSlug(value) !== slug;
      })
      .join('\n');

    if (fallback === raw) {
      return false;
    }

    fs.writeFileSync(filePath, fallback, 'utf-8');
    return true;
  }
};

const removeSlugFromLandingsJson = (filePath, slug) => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);

    let changed = false;
    let nextPayload = parsed;

    if (Array.isArray(parsed)) {
      const filtered = parsed.filter((item) => normalizeSlug(item) !== slug);
      changed = filtered.length !== parsed.length;
      nextPayload = filtered;
    } else if (parsed && typeof parsed === 'object') {
      const next = { ...parsed };
      for (const key of ['cities', 'landings']) {
        const values = next[key];
        if (!Array.isArray(values)) {
          continue;
        }

        const filtered = values.filter((item) => normalizeSlug(item) !== slug);
        if (filtered.length !== values.length) {
          next[key] = filtered;
          changed = true;
        }
      }
      nextPayload = next;
    }

    if (!changed) {
      return false;
    }

    fs.writeFileSync(filePath, `${JSON.stringify(nextPayload, null, 2)}\n`, 'utf-8');
    return true;
  } catch {
    return false;
  }
};

const landingArg = process.argv[2];
const archiveRootArg = process.argv[3];

if (!landingArg) {
  console.error('remove-landing: Bitte Stadtkennung/Stadtname übergeben. Beispiel: node scripts/remove-landing.mjs berlin');
  process.exit(1);
}

const landingSlug = normalizeSlug(landingArg);
if (!landingSlug) {
  console.error('remove-landing: Ungültiger Stadtname (normalisiert leer).');
  process.exit(1);
}

const archiveRoot = archiveRootArg
  ? path.resolve(projectRoot, archiveRootArg)
  : path.resolve(projectRoot, 'removed_landings');

const archiveSessionRoot = path.join(archiveRoot, `${toSessionPrefix()}-${landingSlug}`);
ensureDirectory(archiveSessionRoot);

const roots = {
  slides: path.join(projectRoot, 'public', 'img', 'slides'),
  titleImages: path.join(projectRoot, 'public', 'img', 'Titelbild'),
  titleMeta: path.join(projectRoot, 'public', 'img', 'Titelbild', 'title.meta.json'),
  reviews: path.join(projectRoot, 'public', 'reviews'),
  faq: path.join(projectRoot, 'public', 'faq'),
  whyImages: path.join(projectRoot, 'public', 'img', 'why'),
  why: path.join(projectRoot, 'public', 'why'),
  landings: path.join(projectRoot, 'public', 'landings'),
};

const manifest = [];

const directoriesToMove = [
  ...collectMatchingDirectories(roots.slides, landingSlug, { exclude: ['default'] }),
  ...collectMatchingTitleImageTargets(roots.titleImages, landingSlug),
  ...collectMatchingDirectories(roots.reviews, landingSlug, { exclude: ['default'] }),
  ...collectMatchingDirectories(roots.faq, landingSlug, { exclude: ['default'] }),
  ...collectMatchingDirectories(roots.whyImages, landingSlug, { exclude: ['default'] }),
  ...collectMatchingDirectories(roots.landings, landingSlug, { exclude: [] }),
];

const filesToMove = [
  ...collectMatchingWhyJsonFiles(roots.why, landingSlug),
];

const moveTargets = [...new Set([...directoriesToMove, ...filesToMove])];

for (const sourcePath of moveTargets) {
  moveToArchive(sourcePath, archiveSessionRoot, manifest);
}

const titleMetaCleanup = cleanTitleMetadataForLanding(roots.titleMeta, landingSlug);

const mdChanged = removeSlugFromLandingsMarkdown(path.join(roots.landings, 'landings.md'), landingSlug);
const jsonChanged = removeSlugFromLandingsJson(path.join(roots.landings, 'landings.json'), landingSlug);

const reportPath = path.join(archiveSessionRoot, 'report.json');
fs.writeFileSync(
  reportPath,
  `${JSON.stringify(
    {
      removedLanding: landingArg,
      normalizedSlug: landingSlug,
      movedEntries: manifest,
      updatedLandingsMd: mdChanged,
      updatedLandingsJson: jsonChanged,
      updatedTitleMeta: titleMetaCleanup.changed,
      removedTitleMetaKeys: titleMetaCleanup.removedKeys,
      archivedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
  'utf-8',
);

if (manifest.length === 0 && !mdChanged && !jsonChanged && !titleMetaCleanup.changed) {
  console.log(`remove-landing: Keine passenden Daten für "${landingSlug}" gefunden.`);
  console.log(`remove-landing: Leerer Archivlauf unter ${path.relative(projectRoot, archiveSessionRoot)}`);
  process.exit(0);
}

console.log(`remove-landing: ${manifest.length} Pfade archiviert für "${landingSlug}".`);
if (mdChanged) {
  console.log('remove-landing: public/landings/landings.md aktualisiert.');
}
if (jsonChanged) {
  console.log('remove-landing: public/landings/landings.json aktualisiert.');
}
if (titleMetaCleanup.changed) {
  console.log(`remove-landing: public/img/Titelbild/title.meta.json bereinigt (${titleMetaCleanup.removedKeys.length} Einträge).`);
}
console.log(`remove-landing: Archiv: ${path.relative(projectRoot, archiveSessionRoot)}`);
