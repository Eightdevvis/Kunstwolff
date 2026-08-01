import fs from 'fs';
import path from 'path';
import { isPageHiddenByPath } from './pageVisibility';

export type SkillItem = {
  title: string;
  link: string;
  image?: string;
  alt?: string;
  heroTitle?: string;
  description?: string;
};

type SkillsJson = SkillItem[] | { skills?: SkillItem[] };

const skillsRoot = path.resolve('./public/skills');
const skillImagesRoot = path.resolve('./public/img/UnsereFähigkeitenBilder');
const allowedImageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);

// Jeden Teil einzeln kodieren: ein verschachtelter Ordnerschlüssel würde am Stück
// zu %2F, und das trifft keine Datei mehr (Fall siehe slideImages.ts).
const encodePathSegment = (segment: string): string =>
  segment.split('/').map((part) => encodeURIComponent(part)).join('/');

const normalizeKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * Umlaute vor dem Slug ausschreiben — genau wie `scripts/tags.mjs` und die
 * Sync-Skripte. Ohne diesen Schritt würde aus „Ölmalerei" hier `olmalerei`,
 * während `sync-why.mjs` die Datei als `oelmalerei.json` anlegt: zwei Schlüssel
 * für dieselbe Sache, und die Seite bliebe leer. Bei den drei heutigen Skills
 * ändert die Zeile nichts — sie verhindert den nächsten Fall.
 */
const transliterateGerman = (value: string): string =>
  String(value)
    .replace(/ä/gi, 'ae')
    .replace(/ö/gi, 'oe')
    .replace(/ü/gi, 'ue')
    .replace(/ß/gi, 'ss');

const slugify = (text: string): string => {
  return transliterateGerman(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const normalizeSkill = (skill: Partial<SkillItem>): SkillItem | null => {
  const title = (skill.title ?? '').trim();
  
  if (!title) {
    return null;
  }

  // Auto-generate link from title if not provided
  const link = (skill.link ?? '').trim() || `/${slugify(title)}/`;

  return {
    title,
    link,
    image: skill.image?.trim() || undefined,
    alt: skill.alt?.trim() || undefined,
    heroTitle: skill.heroTitle?.trim() || undefined,
    description: skill.description?.trim() || undefined,
  };
};

const parseSkillsContent = (content: SkillsJson): SkillItem[] => {
  const rawList = Array.isArray(content) ? content : content.skills ?? [];

  return rawList
    .map(normalizeSkill)
    .filter((item): item is SkillItem => item !== null);
};

const readSkillsFile = (filePath: string): SkillItem[] => {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as SkillsJson;
  return parseSkillsContent(parsed);
};

const resolveFolderImage = (skillTitle: string): string | undefined => {
  if (!fs.existsSync(skillImagesRoot)) {
    return undefined;
  }

  const folders = fs
    .readdirSync(skillImagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const wanted = normalizeKey(skillTitle);
  const folderName = folders.find((name) => normalizeKey(name) === wanted);

  if (!folderName) {
    return undefined;
  }

  const folderPath = path.join(skillImagesRoot, folderName);
  const firstImage = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => allowedImageExtensions.has(path.extname(fileName).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))[0];

  if (!firstImage) {
    return undefined;
  }

  return `/img/UnsereFähigkeitenBilder/${encodePathSegment(folderName)}/${encodePathSegment(firstImage)}`;
};

const dedupeSkills = (skills: SkillItem[]): SkillItem[] => {
  const seen = new Set<string>();

  return skills.filter((skill) => {
    const key = `${skill.title}::${skill.link}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getSharedSkills = (): SkillItem[] => {
  if (!fs.existsSync(skillsRoot)) {
    return [];
  }

  const canonicalFile = path.join(skillsRoot, 'skills.json');
  if (fs.existsSync(canonicalFile)) {
    return dedupeSkills(readSkillsFile(canonicalFile)).map((skill) => {
      const folderImage = resolveFolderImage(skill.title);
      return {
        ...skill,
        image: folderImage ?? skill.image,
      };
    });
  }

  const skillFiles = fs
    .readdirSync(skillsRoot)
    .filter((name) => name.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b));

  const merged = skillFiles.flatMap((fileName) =>
    readSkillsFile(path.join(skillsRoot, fileName)),
  );

  return dedupeSkills(merged).map((skill) => {
    const folderImage = resolveFolderImage(skill.title);
    return {
      ...skill,
      image: folderImage ?? skill.image,
    };
  });
};

/**
 * Der Inhalts-Schlüssel eines Skills kommt aus seinem TITEL, nicht aus seiner URL.
 *
 * `skills.json` erlaubt ein eigenes `link`-Feld, mit dem die URL frei wählbar ist
 * (seit 2026-07-31: „Schnellzeichner" liegt auf `/schnellzeichner-karikaturist/`).
 * Alles Inhaltliche hängt dagegen am Titel — und zwar nicht aus Gewohnheit, sondern
 * weil die Sync-Skripte es so anlegen: `sync-why.mjs` und `sync-erinnerungen.mjs`
 * lesen `entry.title` und schreiben `public/why/schnellzeichner.json` bzw.
 * `public/erinnerungen/schnellzeichner.json`. Dasselbe gilt für die Bild-Tags
 * (`getSlidesByTag('skills', …)`) und die Titelbild-Kategorien.
 *
 * Wer hier den URL-Slug einsetzt, bekommt keine Fehlermeldung, sondern eine Seite
 * ohne Bilder, ohne Why-Texte und ohne Erinnerungen — und sucht die Ursache
 * garantiert nicht in der URL. Deshalb eine benannte Funktion statt drei Kopien.
 *
 * Zwei Schlüssel, klare Rollen:
 *   URL      → `skill.link` (Adresse, Breadcrumb, Schema, interne Links)
 *   Inhalt   → `skillContentKey(skill.title)` (Ordner, JSON-Dateien, Tags)
 */
export const skillContentKey = (title: string): string => slugify(String(title ?? ''));

export const getSkillSlugs = (): string[] => {
  const skills = getSharedSkills();
  return skills.map((skill) => {
    // Extract slug from link (e.g., "/schnellzeichner/" -> "schnellzeichner")
    const slug = skill.link.replace(/^\/|\/$/g, '');
    return slug;
  });
};

export const getSkillBySlug = (slug: string): SkillItem | null => {
  const skills = getSharedSkills();
  const normalizedSlug = `/${slug}/`;
  return skills.find((skill) => skill.link === normalizedSlug) || null;
};

export const getVisibleSharedSkills = (): SkillItem[] =>
  getSharedSkills().filter((skill) => !isPageHiddenByPath(skill.link));
