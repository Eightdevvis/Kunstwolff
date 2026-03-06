import fs from 'fs';
import path from 'path';

export type WhyBenefit = {
  title: string;
  text: string;
  image: string;
  alt: string;
};

const whyRoot = path.resolve('./public/why');
const defaultKey = 'default';

const normalize = (value: string): string => value.trim().toLowerCase();

const readWhyFile = (filePath: string): WhyBenefit[] => {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!parsed.benefits || !Array.isArray(parsed.benefits)) {
      return [];
    }

    return parsed.benefits
      .filter(
        (item: any) =>
          item &&
          typeof item.title === 'string' &&
          typeof item.text === 'string' &&
          typeof item.image === 'string',
      )
      .map((item: any) => ({
        title: item.title.trim(),
        text: item.text.trim(),
        image: item.image.trim(),
        alt: typeof item.alt === 'string' ? item.alt.trim() : item.title.trim(),
      }));
  } catch {
    return [];
  }
};

export const getWhyBenefits = (skill?: string, landing?: string): WhyBenefit[] => {
  const skillKey = skill ? normalize(skill) : '';
  const landingKey = landing ? normalize(landing) : '';

  // Priority order:
  // 1. skill-landing.json (e.g., schnellzeichner-berlin.json)
  // 2. landing.json (e.g., berlin.json)
  // 3. skill.json (e.g., schnellzeichner.json)
  // 4. default.json

  const candidates: string[] = [];

  if (skillKey && landingKey) {
    candidates.push(path.join(whyRoot, `${skillKey}-${landingKey}.json`));
  }

  if (landingKey) {
    candidates.push(path.join(whyRoot, `${landingKey}.json`));
  }

  if (skillKey) {
    candidates.push(path.join(whyRoot, `${skillKey}.json`));
  }

  candidates.push(path.join(whyRoot, `${defaultKey}.json`));

  for (const candidate of candidates) {
    const benefits = readWhyFile(candidate);
    if (benefits.length > 0) {
      return benefits;
    }
  }

  // Fallback to hardcoded defaults if no file exists
  return [
    {
      title: 'Echte Künstler - keine Agentur',
      text: 'Sie buchen uns direkt - ohne Vermittlung. Persönlicher Kontakt, klare Absprachen und professionelle Umsetzung.',
      image: '/img/samples/sample1.jpeg',
      alt: 'Live Künstler von Kunstwolff beim Zeichnen',
    },
    {
      title: 'Interaktiv & unvergesslich',
      text: 'Ihre Gäste erleben Kunst live und nehmen eine individuelle Erinnerung mit nach Hause.',
      image: '/img/samples/sample2.jpeg',
      alt: 'Gäste lachen während Schnellzeichner live zeichnet',
    },
    {
      title: 'Branding möglich',
      text: 'Logo, Hashtag oder Event-Motto integrieren wir direkt in jede Zeichnung - perfekt für Corporate Events.',
      image: '/img/samples/sample3.jpeg',
      alt: 'Gebrandete Karikatur mit Firmenlogo',
    },
    {
      title: 'Digital & klassisch',
      text: 'Ob Papier, iPad oder auch großem Monitor - wir passen uns Ihrem Eventkonzept flexibel an.',
      image: '/img/samples/sample4.jpeg',
      alt: 'Digitaler Schnellzeichner zeichnet auf Tablet',
    },
  ];
};
