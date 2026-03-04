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
    return dedupeSkills(readSkillsFile(canonicalFile));
  }

  const skillFiles = fs
    .readdirSync(skillsRoot)
    .filter((name) => name.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b));

  const merged = skillFiles.flatMap((fileName) =>
    readSkillsFile(path.join(skillsRoot, fileName)),
  );

  return dedupeSkills(merged);
};
