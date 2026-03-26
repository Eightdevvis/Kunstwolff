import fs from 'fs';
import path from 'path';

export type StimmungArtForm = {
  id: string;
  name: string;
  whatIsIt: string;
  image: string;
  imageAlt: string;
  atmosphere: string;
  linkUrl: string;
  linkLabel: string;
};

export type StimmungOtherHighlight = {
  title: string;
  text: string;
  image: string;
  alt: string;
  linkUrl: string;
  linkLabel: string;
};

export type StimmungDurchKunstContent = {
  seo: { title: string; description: string };
  hero: { title: string; subtitle: string };
  intro: string;
  artForms: StimmungArtForm[];
  otherSectionTitle: string;
  otherHighlights: StimmungOtherHighlight[];
};

const contentPath = path.resolve('./public/stimmung-durch-kunst/content.json');

export const getStimmungDurchKunstContent = (): StimmungDurchKunstContent | null => {
  if (!fs.existsSync(contentPath)) return null;

  try {
    const raw = fs.readFileSync(contentPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;

    const seo = o.seo as StimmungDurchKunstContent['seo'] | undefined;
    const hero = o.hero as StimmungDurchKunstContent['hero'] | undefined;
    const intro = typeof o.intro === 'string' ? o.intro : '';
    const artForms = Array.isArray(o.artForms) ? (o.artForms as StimmungArtForm[]) : [];
    const otherSectionTitle = typeof o.otherSectionTitle === 'string' ? o.otherSectionTitle : '';
    const otherHighlights = Array.isArray(o.otherHighlights)
      ? (o.otherHighlights as StimmungOtherHighlight[])
      : [];

    if (!seo?.title || !hero?.title) return null;

    return { seo, hero, intro, artForms, otherSectionTitle, otherHighlights };
  } catch {
    return null;
  }
};
