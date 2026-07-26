import fs from 'fs';
import path from 'path';
import {
  normalizeTagList,
  inferOrteFromKey,
  inferAnlaesseFromKey,
  slugSet,
} from './tags.mjs';

const projectRoot = process.cwd();
const slidesRoot = path.join(projectRoot, 'public', 'img', 'slides');
const tagsConfigPath = path.join(projectRoot, 'public', 'config', 'tags.json');

/** Bekannte Ort-Slugs aus dem Vokabular – ohne die würde `mediathek` zum Ort. */
const knownOrte = (() => {
  try {
    return slugSet(JSON.parse(fs.readFileSync(tagsConfigPath, 'utf-8')).orte);
  } catch {
    // Kein/kaputtes tags.json: dann eben ohne Filter, sync-tags läuft davor.
    return new Set();
  }
})();
const metadataPath = path.join(slidesRoot, 'slides.meta.json');
const matchingRulesPath = path.join(slidesRoot, 'category-matching.md');
const skillsRoot = path.join(projectRoot, 'public', 'skills');

const allowedExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);

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

const slugify = (value) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toKeywordVariants = (value) => {
  const normalized = normalize(value);
  const compact = normalized.replace(/[^a-z0-9]+/g, '');
  return uniqueStrings([normalized, compact]).filter((entry) => entry.length >= 3);
};

const parseSkillsContent = (content) => {
  const rawList = Array.isArray(content)
    ? content
    : content && typeof content === 'object' && Array.isArray(content.skills)
      ? content.skills
      : [];

  return rawList
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const title = typeof entry.title === 'string' ? entry.title.trim() : '';
      if (!title) {
        return null;
      }

      const rawLink = typeof entry.link === 'string' ? entry.link.trim() : '';
      const slug = rawLink ? rawLink.replace(/^\/+|\/+$/g, '') : slugify(title);

      return {
        title,
        slug,
      };
    })
    .filter((entry) => entry !== null);
};

const readSkillEntries = () => {
  if (!fs.existsSync(skillsRoot)) {
    return [];
  }

  const canonicalFile = path.join(skillsRoot, 'skills.json');
  const skillFiles = fs.existsSync(canonicalFile)
    ? [canonicalFile]
    : fs
        .readdirSync(skillsRoot)
        .filter((name) => name.endsWith('.json'))
        .sort((a, b) => a.localeCompare(b))
        .map((name) => path.join(skillsRoot, name));

  const allEntries = [];

  for (const filePath of skillFiles) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      allEntries.push(...parseSkillsContent(parsed));
    } catch {
      continue;
    }
  }

  const seen = new Set();
  return allEntries.filter((entry) => {
    const key = `${normalize(entry.title)}::${normalize(entry.slug)}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const buildSkillCategoryRules = () => {
  const skills = readSkillEntries();

  return skills
    .map((skill) => {
      const keywords = uniqueStrings([
        ...toKeywordVariants(skill.title),
        ...toKeywordVariants(skill.slug),
      ]);

      if (keywords.length === 0) {
        return null;
      }

      return {
        category: skill.title,
        keywords,
      };
    })
    .filter((rule) => rule !== null);
};

const mergeCategoryRules = (...ruleSets) => {
  const byCategory = new Map();

  for (const rules of ruleSets) {
    for (const rule of rules) {
      if (!rule || typeof rule !== 'object') {
        continue;
      }

      const category = typeof rule.category === 'string' ? rule.category.trim() : '';
      if (!category) {
        continue;
      }

      const normalizedCategory = normalize(category);
      const nextKeywords = uniqueStrings(Array.isArray(rule.keywords) ? rule.keywords : []).map(normalize);

      if (nextKeywords.length === 0) {
        continue;
      }

      if (!byCategory.has(normalizedCategory)) {
        byCategory.set(normalizedCategory, {
          category,
          keywords: [],
        });
      }

      const current = byCategory.get(normalizedCategory);
      current.keywords = uniqueStrings([...current.keywords, ...nextKeywords]);
    }
  }

  return Array.from(byCategory.values());
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
      if (/^regeln\b/i.test(trimmed)) {
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
        // title-Feld für Lightbox-Caption – muss preserved werden damit sync es nicht wegschreibt
        const title = typeof value.title === 'string' ? value.title.trim() : '';
        const priority = typeof value.priority === 'number' && !Number.isNaN(value.priority) ? value.priority : undefined;
        const enabled = typeof value.enabled === 'boolean' ? value.enabled : undefined;

        return [
          normalizedKey,
          {
            categories,
            ...(altOverride ? { altOverride } : {}),
            ...(title ? { title } : {}),
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

/**
 * Sammelt Bild-Keys REKURSIV unterhalb eines Slide-Ordners.
 *
 * Bis 2026-07-26 ging der Walk genau eine Ebene tief (`readdirSync` → Ordner,
 * dann nur `isFile()`). `slides/events/` enthält aber ausschließlich
 * Unterordner (firmenfeier, hochzeit, messe, private-feier) – die 18 dort
 * liegenden Event-Slides bekamen deshalb NIE einen Metadaten-Eintrag. Folge:
 * keine Skill-Tags, keine Alt-Texte, keine Priorität. Das in
 * `memory/content-slides.md` dokumentierte Key-Format `events/<slug>/datei.webp`
 * existierte faktisch nicht.
 *
 * MAX_DEPTH 2 reicht für `events/<slug>/` und deckelt zugleich Ausreißer.
 */
const MAX_DEPTH = 2;

const collectImageKeys = (absDir, relPrefix, depth = 0) => {
  const keys = [];
  const entries = fs.readdirSync(absDir, { withFileTypes: true });

  const files = entries
    .filter((entry) => entry.isFile() && isAllowedImage(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  for (const file of files) {
    keys.push(path.posix.join(relPrefix, file));
  }

  if (depth >= MAX_DEPTH) return keys;

  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  for (const dir of dirs) {
    keys.push(...collectImageKeys(path.join(absDir, dir), path.posix.join(relPrefix, dir), depth + 1));
  }

  return keys;
};

const getImageKeys = () => {
  const folders = getSlideFolders();
  const keys = [];

  for (const folder of folders) {
    keys.push(...collectImageKeys(path.join(slidesRoot, folder), folder));
  }

  return keys;
};

// Canonical key für Rename-Migration: Ordner + normalisierter Dateiname (ohne Prefix-Stripping)
const toCanonicalKey = (key) => {
  const folder = key.split('/')[0] ?? '';
  const fileName = path.basename(key);
  return `${folder}/${normalize(fileName)}`;
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

const inferCategoriesFromFileName = (fileName, rules) => {
  const baseName = path.basename(fileName, path.extname(fileName));
  const normalizedName = normalize(baseName);
  const compactName = normalizedName.replace(/[^a-z0-9]+/g, '');

  const matched = [];

  for (const rule of rules) {
    const hasMatch = rule.keywords.some((keyword) => {
      const normalizedKeyword = normalize(keyword);
      const compactKeyword = normalizedKeyword.replace(/[^a-z0-9]+/g, '');

      return (
        (normalizedKeyword.length > 0 && normalizedName.includes(normalizedKeyword)) ||
        (compactKeyword.length > 0 && compactName.includes(compactKeyword))
      );
    });

    if (hasMatch) {
      matched.push(rule.category);
    }
  }

  return uniqueStrings(matched);
};

const skillRules = buildSkillCategoryRules();
const customRules = parseCategoryRules();
const rules = mergeCategoryRules(skillRules, customRules);
const metadata = readMetadata();

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
  const existing = metadata[key] ?? {};

  const existingCategories = uniqueStrings(Array.isArray(existing.categories) ? existing.categories : []);
  const categories =
    existingCategories.length > 0 ? existingCategories : inferCategoriesFromFileName(fileName, rules);

  // Phase 5a: Anlass + Ort als eigene Dimensionen. Bisher steckte der Ort im
  // Ordnernamen und der Anlass gar nirgends – beide konkurrierten um denselben
  // Platz, weshalb ein Bild nie zugleich „Trier" und „Hochzeit" sein konnte.
  // Beide werden EINMAL vorbelegt und danach nie wieder überschrieben; ab dann
  // gilt, was im Admin steht (gleiche Haltung wie bei `priority`).
  const orte = Array.isArray(existing.orte)
    ? normalizeTagList(existing.orte)
    : inferOrteFromKey(key, knownOrte);
  const anlaesse = Array.isArray(existing.anlaesse)
    ? normalizeTagList(existing.anlaesse)
    : inferAnlaesseFromKey(key);

  const nextEntry = {
    categories,
    ...(anlaesse.length > 0 ? { anlaesse } : {}),
    ...(orte.length > 0 ? { orte } : {}),
    // Priority aus JSON preserved – wird nur noch vom Admin-Tool gesetzt, nicht mehr aus Dateinamen gelesen
    ...(typeof existing.priority === 'number' ? { priority: existing.priority } : {}),
    ...(typeof existing.altOverride === 'string' && existing.altOverride.trim()
      ? { altOverride: existing.altOverride.trim() }
      : {}),
    // title für Lightbox-Caption preserved
    ...(typeof existing.title === 'string' && existing.title.trim()
      ? { title: existing.title.trim() }
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

console.log(`sync-slides: ${renameMigratedCount} Metadaten-Einträge bei Umbenennung migriert.`);
console.log(`sync-slides: ${removedCount} veraltete Metadaten-Einträge entfernt.`);
console.log(`sync-slides: ${refreshedCount} bestehende Einträge aktualisiert.`);
console.log(`sync-slides: ${addedCount} neue Metadaten-Einträge erstellt.`);
console.log(`sync-slides: Skill-Regeln geladen: ${skillRules.length}`);
console.log(`sync-slides: Zusätzliche Regeln aus category-matching.md: ${customRules.length}`);
console.log(`sync-slides: Gesamt-Regeln aktiv: ${rules.length}`);
console.log(`sync-slides: Gesamt-Einträge: ${Object.keys(metadata).length}`);
