import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type ReviewItem = {
  author: string;
  text: string;
  categories: string[];
  city: string;
  rating?: number;
  /**
   * Tag-System (Skill × Anlass × Ort). Gleiche Form wie bei FAQs
   * (`FAQItem.tags` in faq.ts) und bei Bildern (`slides.meta.json`) – EINE
   * Konvention für alle Inhaltstypen, damit sich Inhalte nach denselben Regeln
   * einsortieren lassen statt nach ihrem Ablageort.
   *
   * `categories` (Skill) und `city` (Ort) bleiben daneben bestehen: sie werden
   * heute vom Rendering benutzt. Der Tag-Block ist die Zukunft, nicht der
   * sofortige Ersatz.
   */
  tags?: {
    skills?: string[];
    events?: string[];
    landings?: string[];
  };
  /**
   * Darf diese Bewertung fremde Seiten auffüllen?
   *
   * Bewertungen sind absichtlich unspezifischer als FAQs und Bilder: „nett,
   * schnell, tolles Bild" passt überall, und eine Stadtseite ohne eigene
   * Bewertungen soll nicht leer bleiben. Deshalb gilt hier NICHT die strenge
   * Regel der anderen beiden Typen.
   *
   * `tagOnly: true` schaltet das ab: die Bewertung erscheint dann nur noch da,
   * wo ihr Tag sitzt. Für alles, was ortsgebunden ist („die Trierer Location
   * war perfekt") und auf einer Berliner Seite peinlich wäre.
   *
   * Fehlt das Feld, ist die Bewertung frei — das ist das bisherige Verhalten
   * aller 38 Dateien und bleibt der Standard.
   */
  tagOnly?: boolean;
};

const reviewsRoot = path.resolve('./public/reviews');
const defaultCityKey = 'default';
const minLandingReviews = 7;
const reviewTemplateFileNames = new Set(['_vorlage.md', 'vorlage.md']);

const normalize = (value: string): string => value.trim().toLowerCase();

const isTemplateFile = (fileName: string): boolean => {
  return reviewTemplateFileNames.has(fileName.trim().toLowerCase());
};

const readMarkdownFiles = (dir: string): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries
    .filter(
      (entry) => entry.isFile() && /\.md$/i.test(entry.name) && !isTemplateFile(entry.name),
    )
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

const cityFromPath = (filePath: string): string => {
  const relative = path.relative(reviewsRoot, filePath);
  const segments = relative.split(path.sep);
  const firstSegment = segments.length > 1 ? segments[0] : '';
  return (firstSegment ?? '').trim();
};

const parseReviewFile = (filePath: string): ReviewItem | null => {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(raw);

  const author = typeof parsed.data.author === 'string' ? parsed.data.author.trim() : '';
  const text = parsed.content.trim();
  const categories = toStringArray(parsed.data.categories);
  const fallbackCity = cityFromPath(filePath);
  const cityFromFrontmatter =
    typeof parsed.data.city === 'string' ? parsed.data.city.trim() : '';
  const city = cityFromFrontmatter || fallbackCity;

  const rating =
    typeof parsed.data.rating === 'number' && Number.isFinite(parsed.data.rating)
      ? parsed.data.rating
      : undefined;

  // Nur ein ausdrückliches `true` beschränkt. Alles andere (fehlend, false,
  // Tippfehler) heißt „frei" – der Standard darf nicht von einem kaputten
  // Wert abhängen.
  const tagOnly = parsed.data.tagOnly === true;

  const rawTags =
    parsed.data.tags && typeof parsed.data.tags === 'object' && !Array.isArray(parsed.data.tags)
      ? (parsed.data.tags as Record<string, unknown>)
      : {};
  const tags = {
    skills: toStringArray(rawTags.skills),
    events: toStringArray(rawTags.events),
    landings: toStringArray(rawTags.landings),
  };
  const hasTags = tags.skills.length > 0 || tags.events.length > 0 || tags.landings.length > 0;

  if (!author || !text || !city) {
    return null;
  }

  return {
    author,
    text,
    categories,
    city,
    rating,
    tagOnly: tagOnly || undefined,
    tags: hasTags ? tags : undefined,
  };
};

export const getAllReviews = (): ReviewItem[] => {
  if (!fs.existsSync(reviewsRoot)) {
    return [];
  }

  const parsed = readMarkdownFiles(reviewsRoot)
    .map(parseReviewFile)
    .filter((item): item is ReviewItem => item !== null);

  const defaultReviews = parsed.filter(
    (review) => normalize(review.city) === defaultCityKey,
  );

  const nonDefaultReviews = parsed.filter(
    (review) => normalize(review.city) !== defaultCityKey,
  );

  return [...defaultReviews, ...nonDefaultReviews];
};

const uniqueReviews = (reviews: ReviewItem[]): ReviewItem[] => {
  const seen = new Set<string>();

  return reviews.filter((review) => {
    const key = `${normalize(review.city)}|${review.author.trim()}|${review.text.trim()}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

/**
 * Ort-Treffer über den TAG, nicht über den Ablageort.
 *
 * Seit 2026-07-28 die einzige Ortsprüfung. Vorher entschied `review.city` –
 * also der Ordner, in dem die Datei liegt. Ein Review konnte damit an genau
 * EINER Stadt hängen, obwohl derselbe Kunde oft für mehrere Regionen spricht.
 * Über Tags kann es an mehreren hängen, ohne als Kopie zweimal im Repo zu
 * liegen (gleiche Umstellung wie bei den Bildern, `getSlidesByTag`).
 *
 * Nachgewiesen vor der Umstellung: alle 38 Reviews tragen den Ort-Tag ihres
 * Ordners, keine Datei weicht ab (`tests/reviews-tags.test.ts` hält das fest).
 * Die Umstellung kann also nichts verlieren, nur hinzufügen.
 */
const hatOrtTag = (review: ReviewItem, landingKey: string): boolean =>
  (review.tags?.landings ?? []).some((tag) => normalize(tag) === landingKey);

/**
 * Reviews ohne Ort-Tag gelten überall.
 *
 * Das ersetzt den früheren `default`-Ordner, den es unter `public/reviews/` gar
 * nicht (mehr) gab – der Default-Zweig lief also jahrelang ins Leere und die
 * Auffüllung sprang direkt zu fremden Städten. "Allgemein" ist ab jetzt eine
 * Eigenschaft des Inhalts statt seines Ablageorts.
 */
const istAllgemein = (review: ReviewItem): boolean =>
  (review.tags?.landings ?? []).length === 0;

/**
 * Darf diese Bewertung eine Seite auffüllen, auf die ihr Tag nicht zeigt?
 *
 * Der Schalter aus dem Frontmatter (`tagOnly: true`) sagt nein. Er greift NUR
 * beim Auffüllen — wo der Tag sitzt, erscheint die Bewertung immer.
 */
const darfAuffuellen = (review: ReviewItem): boolean => review.tagOnly !== true;

/**
 * Skill-Treffer aus Tag ODER `categories`.
 *
 * `categories` bleibt gültig, weil es das Feld ist, das Jenny im Admin sieht;
 * der Tag ist die normalisierte Form davon. Beide zu prüfen kostet nichts und
 * verhindert, dass ein Review durchfällt, dessen Tag-Block noch fehlt.
 */
const filterBySkill = (reviews: ReviewItem[], skill?: string): ReviewItem[] => {
  if (!skill) {
    return reviews;
  }

  const skillKey = normalize(skill);

  return reviews.filter(
    (review) =>
      review.categories.some((category) => normalize(category) === skillKey) ||
      (review.tags?.skills ?? []).some((tag) => normalize(tag) === skillKey),
  );
};

/**
 * Auffüll-Reihenfolge: alphabetisch ab der eigenen Stadt, dann von vorn.
 *
 * Gleiche Rotation wie vorher, nur speist sie sich jetzt aus den vergebenen
 * Ort-TAGS statt aus den Ordnernamen. Sonst käme eine Stadt, die nur noch per
 * Tag existiert, in der Auffüllung nie vor.
 */
const auffuellReihenfolge = (landingKey: string, all: ReviewItem[]): string[] => {
  const vergeben = [
    ...new Set(all.flatMap((review) => (review.tags?.landings ?? []).map(normalize))),
  ].filter(Boolean);

  const alle = [...new Set([landingKey, ...vergeben])].sort((a, b) => a.localeCompare(b));
  const index = alle.indexOf(landingKey);

  return [...alle.slice(index + 1), ...alle.slice(0, index)].filter((key) => key !== landingKey);
};

/**
 * Auffüllen ist ein MINIMUM, kein Freibrief.
 *
 * `minLandingReviews` sagt "mindestens so viele" – ohne Deckel hiess das aber
 * faktisch "alle, die nicht ausdrücklich woanders hingehören". Bei den Orten
 * fiel das nicht auf (nur 9 Bewertungen tragen keinen Ort-Tag), bei den
 * Anlässen sofort: 33 der 38 tragen keinen Anlass-Tag, also zeigte
 * `/hochzeit/` 36 statt der 3 gemeinten. Ein Slider mit 36 Einträgen ist von
 * "gar keine Auswahl" nicht zu unterscheiden – genau der Zustand, den wir
 * gerade abstellen.
 *
 * Deshalb: eigene Treffer immer vollständig, die Auffüllung nur bis zum
 * Minimum. Eine Stadt mit 8 eigenen Bewertungen behält alle 8.
 */
const deckel = (eigene: ReviewItem[], aufgefuellt: ReviewItem[]): ReviewItem[] =>
  aufgefuellt.slice(0, Math.max(eigene.length, minLandingReviews));

const reviewsForLanding = (city: string, skill?: string): ReviewItem[] => {
  const landingKey = normalize(city);
  const all = getAllReviews();

  const eigene = filterBySkill(
    all.filter((review) => hatOrtTag(review, landingKey)),
    skill,
  );
  let combined = eigene;

  if (combined.length < minLandingReviews) {
    combined = uniqueReviews([
      ...combined,
      ...filterBySkill(all.filter((r) => istAllgemein(r) && darfAuffuellen(r)), skill),
    ]);
  }

  if (combined.length < minLandingReviews) {
    for (const fremderOrt of auffuellReihenfolge(landingKey, all)) {
      combined = uniqueReviews([
        ...combined,
        ...filterBySkill(
          all.filter((review) => hatOrtTag(review, fremderOrt) && darfAuffuellen(review)),
          skill,
        ),
      ]);

      if (combined.length >= minLandingReviews) {
        break;
      }
    }
  }

  return deckel(eigene, combined);
};

export const getReviewsByLanding = (city: string): ReviewItem[] => reviewsForLanding(city);

/**
 * Anlass-Treffer über den Tag – dieselbe Regel wie beim Ort.
 *
 * Die `events`-Dimension der Reviews wurde seit Phase 5d geparst, im Admin
 * angeboten und von KEINER Funktion je abgefragt. Eine als „Hochzeit"
 * ausgezeichnete Bewertung erschien deshalb auf allen 38 Seiten statt auf der
 * einen, für die sie gedacht war. Ab hier gilt für Anlässe, was für Orte
 * längst gilt: erst die ausdrücklich passenden, dann die allgemeinen auffüllen.
 */
const hatAnlassTag = (review: ReviewItem, eventKey: string): boolean =>
  (review.tags?.events ?? []).some((tag) => normalize(tag) === eventKey);

const istAnlassneutral = (review: ReviewItem): boolean =>
  (review.tags?.events ?? []).length === 0;

const reviewsForEvent = (event: string, skill?: string): ReviewItem[] => {
  const eventKey = normalize(event);
  const all = getAllReviews();

  const eigene = filterBySkill(
    all.filter((review) => hatAnlassTag(review, eventKey)),
    skill,
  );
  let combined = eigene;

  if (combined.length < minLandingReviews) {
    combined = uniqueReviews([
      ...combined,
      ...filterBySkill(all.filter((r) => istAnlassneutral(r) && darfAuffuellen(r)), skill),
    ]);
  }

  return deckel(eigene, combined);
};

export const getReviewsByEvent = (event: string): ReviewItem[] => reviewsForEvent(event);

export const getReviewsByLandingAndSkill = (city: string, skill: string): ReviewItem[] => {
  return reviewsForLanding(city, skill);
};
