// Tag-Vokabular (Phase 5a): EINE Quelle für die drei Dimensionen
// Skill × Anlass × Ort, aus denen sich Inhalte automatisch in Seiten
// einsortieren – statt wie bisher über den Ordner, in dem sie liegen.
//
// Warum überhaupt: Ort und Anlass konkurrieren heute um denselben Platz, den
// Ordner. Ein Bild liegt entweder in `slides/trier/` ODER in
// `slides/events/hochzeit/`, nie in beidem. Zwei der drei Dimensionen schließen
// sich damit strukturell aus – und ein Bild auf zwei Seiten zu zeigen erzwingt
// eine Byte-Kopie. Genau daher stammen die 33 Duplikate im Repo.
//
// Reine Funktionen ohne Dateisystem-Zugriff, damit sie in vitest testbar sind;
// das Lesen/Schreiben macht sync-tags.mjs.

/** Akzent-/Umlaut-tolerante Normalisierung. Spiegelt sync-slides-metadata.mjs. */
export const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * Tag-Identität. ALLE Vergleiche laufen über den Slug, nie über das Label –
 * sonst zerlegen „Weihnachtsfeier" vs. „weihnachtsfeier" vs. „Weihnachts-Feier"
 * die Auto-Einsortierung. Das ist wichtig, weil das Vokabular im Admin gepflegt
 * wird und dort getippt statt ausgewählt werden kann.
 */
export const slugifyTag = (value) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Die drei Dimensionen. Reihenfolge = Anzeigereihenfolge im Admin. */
export const DIMENSIONS = ['skills', 'events', 'landings'];

/**
 * Anlässe, die es in den Inhalten faktisch gibt, aber (noch) nicht als eigene
 * Event-Seite. Aus den Dateinamen erhoben (2026-07-26): 10× Weihnachtsfeier,
 * 3× Geburtstag, 2× Silvester, je 1× Stadtfest/Gartenparty. Sie schaden nicht,
 * solange keine Seite sie abfragt – und machen das KI-Auto-Tagging in Phase 6
 * deutlich brauchbarer, weil es mehr als vier Schubladen hat.
 */
export const EXTRA_EVENTS = [
  'Weihnachtsfeier',
  'Geburtstag',
  'Jubiläum',
  'Silvester',
  'Gartenparty',
  'Stadtfest',
  'Gala',
  'Sommerfest',
];

/** Ein Vokabular-Eintrag. `source` steuert, was der Sync anfassen darf. */
const entry = (label, source) => ({ slug: slugifyTag(label), label: String(label).trim(), source });

/**
 * Führt Seeds (aus skills.json / events.json / landings.md) mit dem bereits
 * vorhandenen Vokabular zusammen.
 *
 * Regeln, bewusst konservativ – dieselbe Haltung wie `sync:slides überschreibt
 * priority nie`:
 * - Neue Seeds kommen dazu.
 * - Vorhandene Einträge behalten ihr Label; der Sync benennt nichts um, weil
 *   Jenny es im Admin geändert haben kann.
 * - **Nichts wird je entfernt.** Verschwindet eine Stadt aus landings.md, bleibt
 *   ihr Tag stehen: Inhalte könnten noch darauf verweisen, und ein stiller
 *   Wegfall würde sie unsichtbar aus Seiten kippen. Aufräumen ist Handarbeit.
 * - Reihenfolge: erst Seeds in Seed-Reihenfolge, dann alles Übrige alphabetisch,
 *   damit das JSON bei wiederholtem Lauf stabil bleibt (kein Diff-Rauschen).
 */
export function mergeVocabulary(existing, seeds, seedSource) {
  const bySlug = new Map();

  for (const item of Array.isArray(existing) ? existing : []) {
    const slug = slugifyTag(item?.slug ?? item?.label ?? item);
    if (!slug) continue;
    const label = typeof item?.label === 'string' && item.label.trim() ? item.label.trim() : slug;
    bySlug.set(slug, { slug, label, source: item?.source === 'custom' ? 'custom' : (item?.source ?? seedSource) });
  }

  // Seeds dürfen entweder Strings sein (dann gilt `seedSource`) oder
  // { label, source } – damit ein Aufruf mehrere Herkünfte in EINER
  // Reihenfolge mischen kann, ohne die Sortierung zu zerschießen.
  const seedSlugs = [];
  for (const seed of Array.isArray(seeds) ? seeds : []) {
    const label = typeof seed === 'string' ? seed : seed?.label;
    const source = (typeof seed === 'object' && seed?.source) || seedSource;
    const e = entry(label, source);
    if (!e.slug) continue;
    seedSlugs.push(e.slug);
    if (!bySlug.has(e.slug)) bySlug.set(e.slug, e);
  }

  const seen = new Set();
  const ordered = [];
  for (const slug of seedSlugs) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    ordered.push(bySlug.get(slug));
  }
  const rest = [...bySlug.keys()]
    .filter((s) => !seen.has(s))
    .sort((a, b) => a.localeCompare(b))
    .map((s) => bySlug.get(s));

  return [...ordered, ...rest];
}

/**
 * Bringt eine Tag-Liste aus Inhalten (z.B. `anlaesse` an einem Bild) auf
 * bekannte Slugs: normalisiert, entdoppelt, verwirft Leeres. Unbekannte Slugs
 * bleiben erhalten – sie zu schlucken würde Jennys frisch angelegte Tags
 * verschwinden lassen, bevor der nächste Sync sie ins Vokabular aufnimmt.
 */
export function normalizeTagList(values) {
  const out = [];
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const slug = slugifyTag(value);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

/** Alle Slugs einer Dimension als Set – für Zugehörigkeitsprüfungen. */
export const slugSet = (vocabulary) =>
  new Set((Array.isArray(vocabulary) ? vocabulary : []).map((v) => slugifyTag(v?.slug ?? v)));

// ── Einmalige Vorbelegung aus den vorhandenen Pfaden ─────────────────────────
//
// Die Migration ins Tag-Modell soll nichts von Hand nachtragen müssen: Ort und
// Anlass stecken heute implizit in Ordnername und Dateiname. Das wird EINMAL
// ausgelesen; danach gilt, was im Admin steht.

/**
 * Schreibweisen, unter denen ein Anlass in euren Dateinamen vorkommt.
 * Erhoben am Bestand (2026-07-26). Bewusst KEINE Ableitungen wie
 * „Weihnachtsfeier ⇒ auch Firmenfeier": das mag meistens stimmen, ist aber eine
 * redaktionelle Annahme. Steht „kollegen" oder „mitarbeiter" im Namen, greift
 * die firmenfeier-Regel ohnehin zusätzlich.
 */
export const EVENT_KEYWORDS = {
  firmenfeier: ['firmenfeier', 'firmen', 'betriebsfeier', 'mitarbeiter', 'corporate', 'business', 'kollegen', 'company-party', 'firmenevent'],
  messe: ['messe', 'trade-show', 'tradeshow'],
  hochzeit: ['hochzeit', 'wedding', 'braut', 'braeutigam'],
  'private-feier': ['private-feier', 'privatfeier'],
  weihnachtsfeier: ['weihnacht', 'christmas'],
  geburtstag: ['geburtstag', 'birthday'],
  silvester: ['silvester', 'sylvester'],
  gartenparty: ['gartenparty'],
  stadtfest: ['stadtfest'],
  jubilaum: ['jubilaum', 'jubilaeum'],
  gala: ['gala'],
  sommerfest: ['sommerfest'],
};

/** Ordner, die keinen Ort bezeichnen. */
const NON_PLACE_FOLDERS = new Set(['default', 'mediathek', 'events']);

/**
 * Ort aus dem Ordner ableiten – aber nur, wenn der Ordner auch wirklich ein
 * bekannter Ort ist. Sonst würde aus dem Sammelordner `mediathek` ein „Ort".
 */
export function inferLandingsFromKey(key, knownOrte) {
  const raw = String(key ?? '');
  const found = [];

  const first = slugifyTag(raw.split('/')[0]);
  if (first && !NON_PLACE_FOLDERS.has(first)) {
    if (!(knownOrte instanceof Set) || knownOrte.size === 0 || knownOrte.has(first)) {
      found.push(first);
    }
  }

  // Zusätzlich der Dateiname: Event-Slides liegen in `events/<anlass>/` und
  // hätten sonst NIE einen Ort, obwohl er oft im Namen steht
  // (`walking-act-company-party-mainz.webp`). Genau diese Kombination – Anlass
  // UND Ort am selben Bild – war im Ordnermodell unmöglich.
  //
  // Nur gegen bekannte Ort-Slugs und nur an Wortgrenzen: sonst würde das kurze
  // `bw` in jedem Namen zünden, der die Buchstabenfolge zufällig enthält.
  if (knownOrte instanceof Set) {
    const haystack = `-${normalize(raw).replace(/[^a-z0-9]+/g, '-')}-`;
    for (const slug of knownOrte) {
      if (!slug || found.includes(slug)) continue;
      if (haystack.includes(`-${slug}-`)) found.push(slug);
    }
  }

  return normalizeTagList(found);
}

/**
 * Anlass aus Pfad UND Dateiname ableiten. Der Ordner `events/<slug>/` ist die
 * verlässliche Quelle, die Dateinamen-Stichwörter ergänzen sie – ein Bild in
 * `trier/` kann so „hochzeit" werden, was im Ordnermodell unmöglich war.
 */
export function inferEventsFromKey(key) {
  const raw = String(key ?? '');
  const parts = raw.split('/');
  const found = [];

  if (slugifyTag(parts[0]) === 'events' && parts.length > 2) {
    const slug = slugifyTag(parts[1]);
    if (slug) found.push(slug);
  }

  const haystack = normalize(raw).replace(/[^a-z0-9]+/g, '-');
  for (const [slug, keywords] of Object.entries(EVENT_KEYWORDS)) {
    if (keywords.some((kw) => haystack.includes(kw))) found.push(slug);
  }

  return normalizeTagList(found);
}
