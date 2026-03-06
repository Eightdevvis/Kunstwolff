import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const whyRoot = path.join(projectRoot, 'public', 'why');
const templateFile = path.join(whyRoot, '_vorlage.json');
const defaultFile = path.join(whyRoot, 'default.json');

const fallbackTemplate = {
  benefits: [
    {
      title: 'Vorteil 1',
      text: 'Beschreibung des ersten Vorteils.',
      image: '/img/samples/sample1.jpeg',
      alt: 'Beschreibung des Bildes für Barrierefreiheit',
    },
    {
      title: 'Vorteil 2',
      text: 'Beschreibung des zweiten Vorteils.',
      image: '/img/samples/sample2.jpeg',
      alt: 'Beschreibung des Bildes für Barrierefreiheit',
    },
    {
      title: 'Vorteil 3',
      text: 'Beschreibung des dritten Vorteils.',
      image: '/img/samples/sample3.jpeg',
      alt: 'Beschreibung des Bildes für Barrierefreiheit',
    },
    {
      title: 'Vorteil 4',
      text: 'Beschreibung des vierten Vorteils.',
      image: '/img/samples/sample4.jpeg',
      alt: 'Beschreibung des Bildes für Barrierefreiheit',
    },
  ],
};

const ensureDirectory = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const getTemplateContent = () => {
  if (fs.existsSync(defaultFile)) {
    try {
      return fs.readFileSync(defaultFile, 'utf-8');
    } catch {
      return JSON.stringify(fallbackTemplate, null, 2);
    }
  }

  return JSON.stringify(fallbackTemplate, null, 2);
};

const ensureTemplate = () => {
  if (fs.existsSync(templateFile)) {
    return null;
  }

  const templateContent = getTemplateContent();
  fs.writeFileSync(templateFile, templateContent);
  return path.relative(projectRoot, templateFile);
};

ensureDirectory(whyRoot);

const created = [];

const createdTemplate = ensureTemplate();
if (createdTemplate) {
  created.push(`+ ${createdTemplate}`);
}

if (created.length > 0) {
  console.log('sync-why: Neue Dateien angelegt:');
  for (const line of created) {
    console.log(line);
  }
} else {
  console.log('sync-why: Alles bereits vorhanden.');
}
