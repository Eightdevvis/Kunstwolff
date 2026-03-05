import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const skillsFile = path.join(projectRoot, 'public', 'skills', 'skills.json');
const skillImagesRoot = path.join(projectRoot, 'public', 'img', 'UnsereFähigkeitenBilder');

const ensureDirectory = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const ensureGitkeep = (dir) => {
  const keepFile = path.join(dir, '.gitkeep');
  if (!fs.existsSync(keepFile)) {
    fs.writeFileSync(keepFile, '');
  }
};

const readSkills = () => {
  if (!fs.existsSync(skillsFile)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(skillsFile, 'utf-8');
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : parsed.skills ?? [];

    if (!Array.isArray(list)) {
      return [];
    }

    return list
      .map((skill) => (typeof skill?.title === 'string' ? skill.title.trim() : ''))
      .filter((title) => title.length > 0);
  } catch {
    return [];
  }
};

ensureDirectory(skillImagesRoot);

const skills = readSkills();

if (skills.length === 0) {
  console.log('sync-skills: Keine Skills in public/skills/skills.json gefunden.');
  process.exit(0);
}

const created = [];

for (const title of skills) {
  const skillDir = path.join(skillImagesRoot, title);

  if (!fs.existsSync(skillDir)) {
    ensureDirectory(skillDir);
    created.push(`+ ${path.relative(projectRoot, skillDir)}`);
  }

  ensureGitkeep(skillDir);
}

if (created.length > 0) {
  console.log('sync-skills: Neue Skill-Bildordner angelegt:');
  for (const line of created) {
    console.log(line);
  }
} else {
  console.log('sync-skills: Alles bereits vorhanden.');
}
