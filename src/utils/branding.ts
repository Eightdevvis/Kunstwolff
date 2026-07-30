import fs from 'fs';
import path from 'path';
import { aufloesenBildpfad } from './bildAufloesung';
import { aufgeloesteHighlights } from './whyHighlights';

export type BrandingExample = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  linkUrl: string;
  linkLabel: string;
};

export type BrandingOtherHighlight = {
  title: string;
  text: string;
  image: string;
  alt: string;
  linkUrl: string;
  linkLabel: string;
};

export type BrandingContent = {
  seo: { title: string; description: string };
  hero: { title: string; subtitle: string };
  intro: string;
  examplesTitle: string;
  examples: BrandingExample[];
  otherSectionTitle: string;
  otherHighlights: BrandingOtherHighlight[];
};

const contentPath = path.resolve('./public/branding/content.json');

export const getBrandingContent = (): BrandingContent | null => {
  if (!fs.existsSync(contentPath)) return null;

  try {
    const raw = fs.readFileSync(contentPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;

    const seo = o.seo as BrandingContent['seo'] | undefined;
    const hero = o.hero as BrandingContent['hero'] | undefined;
    const intro = typeof o.intro === 'string' ? o.intro : '';
    const examplesTitle = typeof o.examplesTitle === 'string' ? o.examplesTitle : '';
    // Bildpfade sind Kopien aus gepflegten Ordnern – siehe `bildAufloesung.ts`.
    const examples = (Array.isArray(o.examples) ? (o.examples as BrandingExample[]) : []).map(
      (item) => ({ ...item, image: aufloesenBildpfad(item.image) }),
    );
    const otherSectionTitle = typeof o.otherSectionTitle === 'string' ? o.otherSectionTitle : '';
    const otherHighlights = aufgeloesteHighlights(
      Array.isArray(o.otherHighlights) ? (o.otherHighlights as BrandingOtherHighlight[]) : [],
    );

    if (!seo?.title || !hero?.title) return null;
    return { seo, hero, intro, examplesTitle, examples, otherSectionTitle, otherHighlights };
  } catch {
    return null;
  }
};

