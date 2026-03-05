import fs from 'fs';
import path from 'path';

export type SkillItem = {
  title: string;
  link: string;
  image?: string;
  alt?: string;
};

type SkillsJson = SkillItem[] | { skills?: SkillItem[] };

const skillsRoot = path.resolve('./public/skills');
const skillImagesRoot = path.resolve('./public/img/UnsereFähigkeitenBilder');
const allowedImageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);

const encodePathSegment = (segment: string): string => encodeURIComponent(segment);

const normalizeKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeSkill = (skill: Partial<SkillItem>): SkillItem | null => {
  const title = (skill.title ?? '').trim();
  const link = (skill.link ?? '').trim();

  if (!title || !link) {
    return null;
  }

  return {
    title,
    link,
    image: skill.image?.trim() || undefined,
    alt: skill.alt?.trim() || undefined,
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
