import fs from 'fs';
import path from 'path';
import { aufloesenBildpfad } from './bildAufloesung';
import { aufgeloesteHighlights } from './whyHighlights';

export type CanvasItem = {
  title: string;
  summary: string;
  image: string;
  imageAlt: string;
  details: string[];
  linkUrl: string;
  linkLabel: string;
};

export type CanvasSection = {
  id: string;
  title: string;
  intro: string;
  items: CanvasItem[];
};

export type CanvasOtherHighlight = {
  title: string;
  text: string;
  image: string;
  alt: string;
  linkUrl: string;
  linkLabel: string;
};

export type CanvasContent = {
  seo: { title: string; description: string };
  hero: { title: string; subtitle: string };
  intro: string;
  sections: CanvasSection[];
  otherSectionTitle: string;
  otherHighlights: CanvasOtherHighlight[];
};

const contentPath = path.resolve('./public/canvas/content.json');

export const getCanvasContent = (): CanvasContent | null => {
  if (!fs.existsSync(contentPath)) return null;

  try {
    const raw = fs.readFileSync(contentPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;

    const seo = o.seo as CanvasContent['seo'] | undefined;
    const hero = o.hero as CanvasContent['hero'] | undefined;
    const intro = typeof o.intro === 'string' ? o.intro : '';
    // Bildpfade sind Kopien aus gepflegten Ordnern – siehe `bildAufloesung.ts`.
    const sections = (Array.isArray(o.sections) ? (o.sections as CanvasSection[]) : []).map(
      (section) => ({
        ...section,
        items: (section.items ?? []).map((item) => ({
          ...item,
          image: aufloesenBildpfad(item.image),
        })),
      }),
    );
    const otherSectionTitle = typeof o.otherSectionTitle === 'string' ? o.otherSectionTitle : '';
    const otherHighlights = aufgeloesteHighlights(
      Array.isArray(o.otherHighlights) ? (o.otherHighlights as CanvasOtherHighlight[]) : [],
    );

    if (!seo?.title || !hero?.title) return null;
    return { seo, hero, intro, sections, otherSectionTitle, otherHighlights };
  } catch {
    return null;
  }
};

