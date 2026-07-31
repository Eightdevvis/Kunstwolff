import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { DEFAULT_LOCALE, resolveLocalizedDir, type Locale } from '../i18n/config';

export type FAQItem = {
  question: string;
  answer: string;
  categories?: string[];
  city?: string;
  tags?: {
    events?: string[];
    skills?: string[];
    landings?: string[];
  };
};

const faqRoot = path.resolve('./public/faq');

/**
 * i18n (Phase 1): FAQ-Wurzel je Locale. de = public/faq (unverändert), sonst
 * public/i18n/<locale>/faq (mit Fallback aufs deutsche Verzeichnis, falls das
 * Overlay fehlt). Der Stadt-Slug wird relativ zu DIESER Wurzel abgeleitet.
 */
const faqRootFor = (locale: Locale): string =>
  locale === DEFAULT_LOCALE ? faqRoot : resolveLocalizedDir(locale, 'faq');

const normalize = (value: string): string => value.trim().toLowerCase();

const readMarkdownFiles = (dir: string): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /\.md$/i.test(entry.name))
    .map((entry) => path.join(dir, entry.name));

  const nestedFiles = entries
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => readMarkdownFiles(path.join(dir, entry.name)));

  return [...files, ...nestedFiles];
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
};

const normalizeStringArray = (value: unknown): string[] =>
  toStringArray(value).map((item) => normalize(item));

const cityFromPath = (filePath: string, rootDir: string): string => {
  const relative = path.relative(rootDir, filePath);
  const segments = relative.split(path.sep);
  const firstSegment = segments.length > 1 ? segments[0] : '';
  return (firstSegment ?? '').trim();
};

const parseFaqFile = (filePath: string, rootDir: string): FAQItem | null => {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(raw);

  const question = typeof parsed.data.question === 'string' ? parsed.data.question.trim() : '';
  const answer = typeof parsed.data.answer === 'string' ? parsed.data.answer.trim() : '';
  const categories = toStringArray(parsed.data.categories);
  const fallbackCity = cityFromPath(filePath, rootDir);
  const cityFromFrontmatter =
    typeof parsed.data.city === 'string' ? parsed.data.city.trim() : '';
  const city = cityFromFrontmatter || fallbackCity;
  const rawTags = parsed.data.tags && typeof parsed.data.tags === 'object'
    ? (parsed.data.tags as Record<string, unknown>)
    : {};
  const tags = {
    events: normalizeStringArray(rawTags.events),
    skills: normalizeStringArray(rawTags.skills),
    landings: normalizeStringArray(rawTags.landings),
  };
  const hasTags = tags.events.length > 0 || tags.skills.length > 0 || tags.landings.length > 0;

  if (!question || !answer) {
    return null;
  }

  return {
    question,
    answer,
    categories: categories.length > 0 ? categories : undefined,
    city,
    tags: hasTags ? tags : undefined,
  };
};

export type FAQFilterContext = {
  categories?: string[];
  city?: string;
  /**
   * Anlass (`firmenfeier`, `messe`, …). Eigenes Feld, seit 2026-07-31.
   *
   * Vorher entstand die Anlass-Dimension NUR daraus, dass `city` mit `events/`
   * begann – ein Schmuggelweg, den keiner der Aufrufer benutzte. Ergebnis:
   * `eventKeys` war auf jeder Seite leer, alle 71 FAQs passten mit Treffergüte
   * 0, und `/firmenfeier/`, `/messe/`, `/hochzeit/`, `/private-feier/` zeigten
   * dieselben vier Fragen wie die Startseite. Ein im Admin gesetzter
   * Anlass-Tag konnte nie ankommen.
   */
  event?: string;
};

/**
 * Eine Tag-Dimension prüfen.
 *
 * Zwei Regeln, mehr nicht:
 * - Fragt der Kontext diese Dimension nicht ab (kein Ort, kein Skill), passt jede FAQ.
 * - Trägt die FAQ in dieser Dimension KEINEN Tag, gilt sie überall. Genau das
 *   ersetzt den früheren `default`-Ordner: "allgemein" ist ab jetzt eine
 *   Eigenschaft des Inhalts, keine Eigenschaft seines Ablageorts.
 *
 * Sonst muss der Tag sitzen.
 */
const dimensionPasst = (faqTags: string[] | undefined, gesucht: string[]): boolean => {
  const vorhanden = (faqTags ?? []).map(normalize).filter(Boolean);
  // Kein Tag in dieser Dimension = gilt hier nicht als Einschränkung.
  if (vorhanden.length === 0) return true;
  // Ein Tag gehört dorthin, wo danach gefragt wird. Fragt der Kontext die
  // Dimension gar nicht ab, gehört die FAQ nicht hierher: eine Messe-FAQ hat
  // auf einer Stadtseite nichts zu suchen.
  if (gesucht.length === 0) return false;
  return vorhanden.some((tag) => gesucht.includes(tag));
};

const kontextSchluessel = (context: FAQFilterContext) => {
  const cityKey = normalize(context.city ?? '');
  // `events/<slug>` im city-Feld bleibt gültig: die FAQ-Dateien liegen so im
  // Repo, und `cityFromPath` leitet den Wert daraus ab. Neu ist nur, dass der
  // Anlass auch direkt übergeben werden kann – und das tun die Event-Seiten.
  const istEventPfad = cityKey.startsWith('events/');
  const eventKey = normalize(context.event ?? '') || (istEventPfad ? cityKey.replace(/^events\//, '') : '');
  return {
    skillKeys: (context.categories ?? []).map(normalize).filter(Boolean),
    eventKeys: eventKey ? [eventKey] : [],
    landingKeys: !istEventPfad && cityKey ? [cityKey] : [],
  };
};

/**
 * Passt eine FAQ zu Ort UND Skill?
 *
 * Vorher waren die vier Teilprüfungen mit ODER verknüpft. Das klang harmlos,
 * bedeutete aber: eine FAQ mit passendem Skill erschien auf JEDER Stadtseite,
 * egal wo sie hingehört. Deshalb musste FAQ.astro vorher über den Ordner
 * filtern – und deshalb war der Tag-Teil faktisch wirkungslos. Mit UND über
 * die Dimensionen (und "leer gilt überall" innerhalb einer Dimension) trägt
 * die Auswahl allein, das Ordner-Gate kann weg.
 */
export const matchesFAQContext = (faq: FAQItem, context: FAQFilterContext): boolean => {
  const { skillKeys, eventKeys, landingKeys } = kontextSchluessel(context);

  // Skill steht bei FAQs an zwei Stellen: im Tag-Block und im alten
  // `categories`-Feld. Beide zählen, sonst verlöre eine ungetaggte FAQ
  // ihre Skill-Zuordnung.
  const skillTags = [...(faq.tags?.skills ?? []), ...(faq.categories ?? [])];

  return (
    dimensionPasst(skillTags, skillKeys) &&
    dimensionPasst(faq.tags?.events, eventKeys) &&
    dimensionPasst(faq.tags?.landings, landingKeys)
  );
};

/**
 * Wie viele der abgefragten Dimensionen trifft die FAQ ausdrücklich?
 *
 * Nur für die Reihenfolge: die FAQ, die den Ort wirklich nennt, gehört vor die
 * allgemeine. Ohne das entschiede die Lesereihenfolge der Dateien darüber,
 * was in den ersten `maxItems` landet – und die Stadtseite zeigte ausgerechnet
 * ihre eigenen Fragen nicht.
 */
const trefferGenauigkeit = (faq: FAQItem, context: FAQFilterContext): number => {
  const { skillKeys, eventKeys, landingKeys } = kontextSchluessel(context);
  const trifft = (faqTags: string[] | undefined, gesucht: string[]): number => {
    if (gesucht.length === 0) return 0;
    const vorhanden = (faqTags ?? []).map(normalize).filter(Boolean);
    return vorhanden.some((tag) => gesucht.includes(tag)) ? 1 : 0;
  };

  return (
    trifft(faq.tags?.landings, landingKeys) +
    trifft(faq.tags?.events, eventKeys) +
    trifft([...(faq.tags?.skills ?? []), ...(faq.categories ?? [])], skillKeys)
  );
};
export const getAllFAQs = (locale: Locale = DEFAULT_LOCALE): FAQItem[] => {
  const root = faqRootFor(locale);
  if (!fs.existsSync(root)) {
    return [];
  }

  const parsed = readMarkdownFiles(root)
    .map((file) => parseFaqFile(file, root))
    .filter((item): item is FAQItem => item !== null);

  return parsed;
};

/**
 * DIE Auswahlfunktion für FAQs – seit 2026-07-28 die einzige.
 *
 * Vorher entschied `getFAQsByCity` über den ORDNER, welche FAQs überhaupt in
 * Frage kamen; die Tags durften danach nur noch aussieben. Eine FAQ, die per
 * Tag nach Trier gehörte, aber woanders lag, erschien deshalb nie – und Jenny
 * konnte im Admin Tags vergeben, die nichts bewirkten.
 *
 * Jetzt entscheiden die Tags, und zwar allein. Der Ordner bestimmt beim Anlegen
 * noch den Start-Tag (`scripts/sync-faq-tags.mjs`), danach ist er nur noch
 * Ablage. Dieselbe Umstellung wie bei den Bildern (`getSlidesByTag`) und den
 * Reviews (`reviewsForLanding`).
 *
 * Sortierung: erst die FAQs, die den Kontext ausdrücklich nennen, dann die
 * allgemeinen. Die Lesereihenfolge innerhalb einer Gruppe bleibt erhalten.
 */
export const getFAQsForContext = (
  context: FAQFilterContext,
  locale: Locale = DEFAULT_LOCALE,
): FAQItem[] => {
  const passend = getAllFAQs(locale).filter((faq) => matchesFAQContext(faq, context));

  return passend
    .map((faq, index) => ({ faq, index, genauigkeit: trefferGenauigkeit(faq, context) }))
    .sort((a, b) => b.genauigkeit - a.genauigkeit || a.index - b.index)
    .map((eintrag) => eintrag.faq);
};
