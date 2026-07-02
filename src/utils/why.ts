import fs from 'fs';
import path from 'path';
import { DEFAULT_LOCALE, localeContentRoot, type Locale } from '../i18n/config';

export type WhyBenefit = {
  title: string;
  text: string;
  image: string;
  alt: string;
};

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

    const benefits = parsed.benefits
      .map((item: any): WhyBenefit | null => {
        if (!item) return null;
        if (typeof item.title !== 'string' || typeof item.text !== 'string' || typeof item.image !== 'string') return null;

        const title = item.title.trim();
        const text = item.text.trim();
        const image = item.image.trim();
        const alt = typeof item.alt === 'string' ? item.alt.trim() : title;

        // Allow empty strings. They represent "not overridden" and will be
        // merged field-by-field with default.json.
        return { title, text, image, alt: alt.length > 0 ? alt : title };
      })
      .filter((x: WhyBenefit | null): x is WhyBenefit => x !== null);

    return benefits;
  } catch {
    return [];
  }
};

export const getWhyBenefits = (skill?: string, landing?: string, locale: Locale = DEFAULT_LOCALE): WhyBenefit[] => {
  const skillKey = skill ? normalize(skill) : '';
  const landingKey = landing ? normalize(landing) : '';

  // i18n (Phase 1): Für Fremdsprachen zeigt whyRoot auf das Overlay
  // (public/i18n/<locale>/why). Fehlt dort eine Datei, greift readWhyFile('')
  // = leer und die Kette fällt am Ende auf die (deutsche) default/fallback zurück.
  // de bleibt exakt beim bisherigen Verhalten.
  const whyRoot =
    locale === DEFAULT_LOCALE ? path.resolve('./public/why') : path.join(localeContentRoot(locale), 'why');

  const fallbackDefault: WhyBenefit[] = [
    {
      title: 'Echte Künstler - keine Agentur',
      text: 'Sie buchen uns direkt - ohne Vermittlung. Persönlicher Kontakt, klare Absprachen und professionelle Umsetzung.',
      image: '/img/samples/sample1.webp',
      alt: 'Live Künstler von Kunstwolff beim Zeichnen',
    },
    {
      title: 'Interaktiv & unvergesslich',
      text: 'Ihre Gäste erleben Kunst live und nehmen eine individuelle Erinnerung mit nach Hause.',
      image: '/img/samples/sample2.webp',
      alt: 'Gäste lachen während Schnellzeichner live zeichnet',
    },
    {
      title: 'Branding möglich',
      text: 'Logo, Hashtag oder Event-Motto integrieren wir direkt in jede Zeichnung - perfekt für Corporate Events.',
      image: '/img/samples/sample3.webp',
      alt: 'Gebrandete Karikatur mit Firmenlogo',
    },
    {
      title: 'Digital & klassisch',
      text: 'Ob Papier, iPad oder auch großem Monitor - wir passen uns Ihrem Eventkonzept flexibel an.',
      image: '/img/samples/sample4.webp',
      alt: 'Digitaler Schnellzeichner zeichnet auf Tablet',
    },
  ];

  // Always use default.json as baseline (so we can "supplementWithDefault" even
  // if a city override only provides 1-3 cards).
  const defaultPath = path.join(whyRoot, `${defaultKey}.json`);
  const defaultBenefits = readWhyFile(defaultPath);
  const baseBenefits = defaultBenefits.length > 0 ? defaultBenefits : fallbackDefault;

  // Priority order for the override file:
  // 1. skill-landing.json (e.g., schnellzeichner-berlin.json)
  // 2. landing.json (e.g., berlin.json)
  // 3. skill.json (e.g., schnellzeichner.json)
  const overrideCandidates: string[] = [];
  if (skillKey && landingKey) {
    overrideCandidates.push(path.join(whyRoot, `${skillKey}-${landingKey}.json`));
  }
  if (landingKey) {
    overrideCandidates.push(path.join(whyRoot, `${landingKey}.json`));
  }
  if (skillKey) {
    overrideCandidates.push(path.join(whyRoot, `${skillKey}.json`));
  }

  let overrideBenefits: WhyBenefit[] | null = null;
  for (const candidate of overrideCandidates) {
    const benefits = readWhyFile(candidate);
    if (benefits.length > 0) {
      overrideBenefits = benefits;
      break;
    }
  }

  if (!overrideBenefits || overrideBenefits.length === 0) {
    return Array.from({ length: 4 }, (_, i) => baseBenefits[i] ?? fallbackDefault[i]);
  }

  const isNonEmpty = (value: string | undefined): boolean => typeof value === 'string' && value.trim().length > 0;

  // Merge per card field: empty values should fall back to default.
  return Array.from({ length: 4 }, (_, i) => {
    const base = baseBenefits[i] ?? fallbackDefault[i];
    const over = overrideBenefits?.[i];

    if (!over) return base;

    return {
      title: isNonEmpty(over.title) ? over.title : base.title,
      text: isNonEmpty(over.text) ? over.text : base.text,
      image: isNonEmpty(over.image) ? over.image : base.image,
      alt: isNonEmpty(over.alt) ? over.alt : isNonEmpty(over.title) ? over.title : base.alt,
    };
  });
};
