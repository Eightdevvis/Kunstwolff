import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const slidesRoot = path.join(projectRoot, 'public', 'img', 'slides');
const metadataPath = path.join(slidesRoot, 'slides.meta.json');
const matchingRulesPath = path.join(slidesRoot, 'category-matching.md');

const allowedExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
const priorityPrefixPattern = /^(\d+)_/;

const normalize = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const uniqueStrings = (items) => {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    if (typeof item !== 'string') continue;
    const value = item.trim();
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }

  return out;
};

const parseCategoryRules = () => {
  if (!fs.existsSync(matchingRulesPath)) {
    return [];
  }

  const raw = fs.readFileSync(matchingRulesPath, 'utf-8');
  const lines = raw.split(/\r?\n/);
  const rules = [];
  let inRulesSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inRulesSection) {
      if (trimmed.toLowerCase() === 'regeln:') {
        inRulesSection = true;
      }
      continue;
    }

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('#')) {
      break;
    }

    if (!trimmed.startsWith('- ') && !trimmed.startsWith('* ')) {
      continue;
    }

    const body = trimmed.slice(2);
    const separatorIndex = body.indexOf(':');

    if (separatorIndex <= 0) {
      continue;
    }

    const category = body.slice(0, separatorIndex).trim();
    const keywordsRaw = body.slice(separatorIndex + 1).trim();

    if (!category || !keywordsRaw) {
      continue;
    }

    const keywords = uniqueStrings(
      keywordsRaw
        .split(',')
        .map((entry) => normalize(entry))
        .filter(Boolean),
    );

    if (keywords.length === 0) {
      continue;
    }

    rules.push({ category, keywords });
  }

  return rules;
};

const readMetadata = () => {
  if (!fs.existsSync(metadataPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(metadataPath, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => {
        const normalizedKey = String(key).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          return [normalizedKey, { categories: [] }];
        }

        const categories = uniqueStrings(Array.isArray(value.categories) ? value.categories : []);
        const altOverride = typeof value.altOverride === 'string' ? value.altOverride.trim() : '';
        const priority = typeof value.priority === 'number' && !Number.isNaN(value.priority) ? value.priority : undefined;
        const enabled = typeof value.enabled === 'boolean' ? value.enabled : undefined;

        return [
          normalizedKey,
          {
            categories,
            ...(altOverride ? { altOverride } : {}),
            ...(typeof priority === 'number' ? { priority } : {}),
            ...(typeof enabled === 'boolean' ? { enabled } : {}),
          },
        ];
      }),
    );
  } catch {
    return {};
  }
};

const writeMetadata = (metadata) => {
  const sortedEntries = Object.entries(metadata).sort(([a], [b]) => a.localeCompare(b));
  const sortedObject = Object.fromEntries(sortedEntries);
  fs.writeFileSync(metadataPath, `${JSON.stringify(sortedObject, null, 2)}\n`, 'utf-8');
};

const isAllowedImage = (fileName) => allowedExtensions.has(path.extname(fileName).toLowerCase());

const getSlideFolders = () => {
  if (!fs.existsSync(slidesRoot)) {
    return [];
  }

  return fs
    .readdirSync(slidesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
};

const parsePriorityFromFileName = (fileName) => {
  const match = fileName.match(priorityPrefixPattern);
  if (!match) {
    return undefined;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const stripPriorityPrefix = (fileName) => fileName.replace(priorityPrefixPattern, '');

const compareQueueOrder = (a, b) => {
  if (a.mtimeMs !== b.mtimeMs) {
    return a.mtimeMs - b.mtimeMs;
  }

  if (a.birthtimeMs !== b.birthtimeMs) {
    return a.birthtimeMs - b.birthtimeMs;
  }

  if (a.ctimeMs !== b.ctimeMs) {
    return a.ctimeMs - b.ctimeMs;
  }

  return a.fileName.localeCompare(b.fileName, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
};

const inferCategoriesFromFileName = (fileName, rules) => {
  const baseName = path.basename(fileName, path.extname(fileName));
  const normalizedName = normalize(baseName);

  const matched = [];

  for (const rule of rules) {
    const hasMatch = rule.keywords.some((keyword) => normalizedName.includes(keyword));
    if (hasMatch) {
      matched.push(rule.category);
    }
  }

  return uniqueStrings(matched);
};

const ensurePriorityPrefixes = () => {
  const folders = getSlideFolders();
  let renamedWithoutPrefixCount = 0;

  for (const folder of folders) {
    const folderPath = path.join(slidesRoot, folder);
    const files = fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && isAllowedImage(entry.name))
      .map((entry) => {
        const filePath = path.join(folderPath, entry.name);
        const stat = fs.statSync(filePath);

        return {
          fileName: entry.name,
          filePath,
          mtimeMs: stat.mtimeMs,
          ctimeMs: stat.ctimeMs,
          birthtimeMs: stat.birthtimeMs,
          parsedPriority: parsePriorityFromFileName(entry.name),
        };
      });

    const existingPriorities = files
      .map((file) => file.parsedPriority)
      .filter((value) => typeof value === 'number');

    let nextPriority = existingPriorities.length > 0 ? Math.max(...existingPriorities) + 1 : 1;

    const withoutPrefix = files
      .filter((file) => typeof file.parsedPriority !== 'number')
      .sort(compareQueueOrder);

    for (const file of withoutPrefix) {
      let candidatePriority = nextPriority;
      let candidateName = `${candidatePriority}_${file.fileName}`;
      let candidatePath = path.join(folderPath, candidateName);

      while (fs.existsSync(candidatePath)) {
        candidatePriority += 1;
        candidateName = `${candidatePriority}_${file.fileName}`;
        candidatePath = path.join(folderPath, candidateName);
      }

      fs.renameSync(file.filePath, candidatePath);
      renamedWithoutPrefixCount += 1;
      nextPriority = candidatePriority + 1;
    }
  }

  return renamedWithoutPrefixCount;
};

const compactPriorityPrefixes = () => {
  const folders = getSlideFolders();
  let compactedCount = 0;

  for (const folder of folders) {
    const folderPath = path.join(slidesRoot, folder);
    const prefixedFiles = fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && isAllowedImage(entry.name))
      .map((entry) => {
        const filePath = path.join(folderPath, entry.name);
        const stat = fs.statSync(filePath);

        return {
          fileName: entry.name,
          filePath,
          mtimeMs: stat.mtimeMs,
          ctimeMs: stat.ctimeMs,
          birthtimeMs: stat.birthtimeMs,
          parsedPriority: parsePriorityFromFileName(entry.name),
          restName: stripPriorityPrefix(entry.name),
        };
      })
      .filter((file) => typeof file.parsedPriority === 'number')
      .sort((a, b) => {
        if (a.parsedPriority !== b.parsedPriority) {
          return a.parsedPriority - b.parsedPriority;
        }

        return compareQueueOrder(a, b);
      });

    if (prefixedFiles.length <= 1) {
      continue;
    }

    const minPriority = prefixedFiles[0].parsedPriority;
    let nextExpected = minPriority;
    const operations = [];

    for (const file of prefixedFiles) {
      const targetName = `${nextExpected}_${file.restName}`;
      if (targetName !== file.fileName) {
        operations.push({
          currentPath: file.filePath,
          targetPath: path.join(folderPath, targetName),
          tempPath: path.join(
            folderPath,
            `.__sync_tmp__${Date.now()}_${Math.random().toString(16).slice(2)}_${file.fileName}`,
          ),
        });
      }

      nextExpected += 1;
    }

    if (operations.length === 0) {
      continue;
    }

    for (const operation of operations) {
      fs.renameSync(operation.currentPath, operation.tempPath);
    }

    for (const operation of operations) {
      fs.renameSync(operation.tempPath, operation.targetPath);
      compactedCount += 1;
    }
  }

  return compactedCount;
};

const getImageKeys = () => {
  const folders = getSlideFolders();
  const keys = [];

  for (const folder of folders) {
    const folderPath = path.join(slidesRoot, folder);
    const files = fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && isAllowedImage(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      keys.push(path.posix.join(folder, file));
    }
  }

  return keys;
};

const toCanonicalKey = (key) => {
  const folder = key.split('/')[0] ?? '';
  const fileName = path.basename(key);
  return `${folder}/${normalize(stripPriorityPrefix(fileName))}`;
};

const groupByCanonicalKey = (keys) => {
  const grouped = new Map();

  for (const key of keys) {
    const canonicalKey = toCanonicalKey(key);
    const current = grouped.get(canonicalKey) ?? [];
    current.push(key);
    grouped.set(canonicalKey, current);
  }

  return grouped;
};

const migrateMetadataForRenames = (metadata, imageKeys) => {
  const imageKeySet = new Set(imageKeys);
  const metadataKeys = Object.keys(metadata);

  const missingKeys = metadataKeys.filter((key) => !imageKeySet.has(key));
  const newKeys = imageKeys.filter((key) => !metadata[key]);

  const missingByCanonical = groupByCanonicalKey(missingKeys);
  const newByCanonical = groupByCanonicalKey(newKeys);

  let migratedCount = 0;

  for (const [canonical, missingGroup] of missingByCanonical.entries()) {
    const newGroup = newByCanonical.get(canonical) ?? [];

    if (missingGroup.length !== 1 || newGroup.length !== 1) {
      continue;
    }

    const oldKey = missingGroup[0];
    const nextKey = newGroup[0];

    if (metadata[nextKey]) {
      continue;
    }

    metadata[nextKey] = metadata[oldKey];
    delete metadata[oldKey];
    migratedCount += 1;
  }

  return migratedCount;
};

const rules = parseCategoryRules();
const metadata = readMetadata();

const renamedWithoutPrefixCount = ensurePriorityPrefixes();
const compactedPriorityCount = compactPriorityPrefixes();
const imageKeys = getImageKeys();
const renameMigratedCount = migrateMetadataForRenames(metadata, imageKeys);
const imageKeySet = new Set(imageKeys);

let removedCount = 0;
for (const key of Object.keys(metadata)) {
  if (imageKeySet.has(key)) {
    continue;
  }

  delete metadata[key];
  removedCount += 1;
}

let addedCount = 0;
let refreshedCount = 0;

for (const key of imageKeys) {
  const fileName = path.basename(key);
  const parsedPriority = parsePriorityFromFileName(fileName) ?? 0;
  const existing = metadata[key] ?? {};

  const existingCategories = uniqueStrings(Array.isArray(existing.categories) ? existing.categories : []);
  const categories =
    existingCategories.length > 0 ? existingCategories : inferCategoriesFromFileName(fileName, rules);

  const nextEntry = {
    categories,
    priority: parsedPriority,
    ...(typeof existing.altOverride === 'string' && existing.altOverride.trim()
      ? { altOverride: existing.altOverride.trim() }
      : {}),
    ...(typeof existing.enabled === 'boolean' ? { enabled: existing.enabled } : {}),
  };

  const previous = metadata[key];
  if (!previous) {
    addedCount += 1;
  } else if (JSON.stringify(previous) !== JSON.stringify(nextEntry)) {
    refreshedCount += 1;
  }

  metadata[key] = nextEntry;
}

writeMetadata(metadata);

console.log(`sync-slides: ${renamedWithoutPrefixCount} Dateien ohne Prefix umbenannt.`);
console.log(`sync-slides: ${compactedPriorityCount} Dateien zur Lückenglättung umnummeriert.`);
console.log(`sync-slides: ${renameMigratedCount} Metadaten-Einträge bei Umbenennung migriert.`);
console.log(`sync-slides: ${removedCount} veraltete Metadaten-Einträge entfernt.`);
console.log(`sync-slides: ${refreshedCount} bestehende Einträge aktualisiert.`);
console.log(`sync-slides: ${addedCount} neue Metadaten-Einträge erstellt.`);
console.log(`sync-slides: Regeln geladen: ${rules.length}`);
console.log(`sync-slides: Gesamt-Einträge: ${Object.keys(metadata).length}`);
