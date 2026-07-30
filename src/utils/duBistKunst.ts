import fs from 'fs';
import path from 'path';
import { aufloesenBildpfad } from './bildAufloesung';
import { aufgeloesteHighlights } from './whyHighlights';

export type DuBistKunstExample = {
  personTitle: string;
  personDescription: string;
  artDescription: string;
  image: string;
  imageAlt: string;
  linkUrl: string;
  linkLabel: string;
};

export type DuBistKunstOtherHighlight = {
  title: string;
  text: string;
  image: string;
  alt: string;
  linkUrl: string;
  linkLabel: string;
};

export type DuBistKunstContent = {
  seo: { title: string; description: string };
  hero: { title: string; subtitle: string };
  intro: string;
  galleryTitle: string;
  examples: DuBistKunstExample[];
  otherSectionTitle: string;
  otherHighlights: DuBistKunstOtherHighlight[];
};

const contentPath = path.resolve('./public/du-bist-kunst/content.json');

export const getDuBistKunstContent = (): DuBistKunstContent | null => {
  if (!fs.existsSync(contentPath)) return null;

  try {
    const raw = fs.readFileSync(contentPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;

    const seo = o.seo as DuBistKunstContent['seo'] | undefined;
    const hero = o.hero as DuBistKunstContent['hero'] | undefined;
    const intro = typeof o.intro === 'string' ? o.intro : '';
    const galleryTitle = typeof o.galleryTitle === 'string' ? o.galleryTitle : '';
    // Bildpfade sind Kopien aus gepflegten Ordnern – siehe `bildAufloesung.ts`.
    const examples = (Array.isArray(o.examples) ? (o.examples as DuBistKunstExample[]) : []).map(
      (item) => ({ ...item, image: aufloesenBildpfad(item.image) }),
    );
    const otherSectionTitle = typeof o.otherSectionTitle === 'string' ? o.otherSectionTitle : '';
    const otherHighlights = aufgeloesteHighlights(
      Array.isArray(o.otherHighlights) ? (o.otherHighlights as DuBistKunstOtherHighlight[]) : [],
    );

    if (!seo?.title || !hero?.title) return null;
    return { seo, hero, intro, galleryTitle, examples, otherSectionTitle, otherHighlights };
  } catch {
    return null;
  }
};

