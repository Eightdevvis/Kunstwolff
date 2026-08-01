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
/**
 * Deutsche Umlaute AUSSCHREIBEN, bevor die Akzente fallen.
 *
 * Ohne diesen Schritt entstehen falsche Slugs, und zwar auf zwei Arten:
 * NFD zerlegt „ü“ zu u+Akzent – „Zürich“ wurde damit „zurich“, wahrend die
 * Orte im Repo der ue-Konvention folgen (`koeln`, `saarbruecken`,
 * `duesseldorf`). Und „ß“ hat gar keine NFD-Zerlegung, fiel also komplett
 * heraus: „Straßenfest“ wurde zu „stra-enfest“, „Größere Gala“ zu
 * „gro-ere-gala“.
 *
 * Das ist kein Schönheitsfehler: sobald Jenny im Admin einen Tag TIPPT statt
 * ihn auszuwählen, entscheidet diese Funktion, ob sie den vorhandenen Tag
 * trifft oder lautlos einen zweiten anlegt.
 */
const GERMAN_MAP = [
  [/ä/g, 'ae'], [/ö/g, 'oe'], [/ü/g, 'ue'],
  [/Ä/g, 'ae'], [/Ö/g, 'oe'], [/Ü/g, 'ue'],
  [/ß/g, 'ss'],
];

const transliterateGerman = (value) =>
  GERMAN_MAP.reduce((acc, [re, ersatz]) => acc.replace(re, ersatz), String(value ?? ''));

/**
 * Muss zeichengleich zu `src/utils/tagSlug.ts` im Admin-Repo bleiben – beide
 * Repos vergleichen Tags gegeneinander, eine Abweichung trennt sie lautlos.
 */
export const slugifyTag = (value) =>
  normalize(transliterateGerman(value))
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
  // Schluessel = Slug im Vokabular. `jubilaum` war der einzige von zwoelf, der
  // dort nicht existiert (`tags.json` fuehrt `jubilaeum`) – ein so vergebener
  // Tag traf nie eine Seite und tauchte in keinem Chip auf.
  jubilaeum: ['jubilaum', 'jubilaeum'],
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

  // An WORTGRENZEN, nicht als Substring – dieselbe Regel wie bei den Orten
  // direkt darueber. Der reine `includes`-Test war produktiv im Einsatz und
  // traf zuverlaessig daneben: `angemessen-preis.webp` -> `messe`,
  // `Wir haben die Wirkung gemessen` -> `messe`. Ein Wortanfang reicht, damit
  // `weihnachtsfeier` weiter auf das Stichwort `weihnacht` anspringt.
  const haystack = `-${normalize(raw).replace(/[^a-z0-9]+/g, '-')}-`;
  for (const [slug, keywords] of Object.entries(EVENT_KEYWORDS)) {
    if (keywords.some((kw) => haystack.includes(`-${kw}`))) found.push(slug);
  }

  return normalizeTagList(found);
}

// ── Tag-Blöcke im Frontmatter ergänzen ───────────────────────────────────────

/**
 * Zerlegt einen `tags:`-Block im Frontmatter, ohne ihn neu zu serialisieren.
 *
 * Gibt `null` zurück, wenn es keinen Block gibt – oder wenn er in Flow-Form
 * (`tags: { … }` / `tags: []`) dasteht. Den fassen wir bewusst nicht an: er
 * lässt sich nicht zeilenweise ergänzen, ohne die Datei umzuformatieren, und
 * genau das will dieses Vorgehen vermeiden.
 *
 * `vorhanden` sind die Dimensionen, die im Block als Schlüssel STEHEN – auch
 * wenn sie leer sind. Der Unterschied ist der ganze Punkt: `landings: []` ist
 * eine Entscheidung ("gilt überall"), ein fehlendes `landings` ist eine Lücke.
 */
export function findeTagsBlock(fmBody) {
  const zeilen = fmBody.split('\n');
  const kopf = zeilen.findIndex((z) => /^tags\s*:/.test(z));
  if (kopf === -1) return null;

  // Alles hinter dem Doppelpunkt = Flow-Form, nicht zeilenweise ergänzbar.
  if (zeilen[kopf].slice(zeilen[kopf].indexOf(':') + 1).trim() !== '') return null;

  // Nur eingerückte, nicht-leere Zeilen gehören zum Block. Leerzeilen bewusst
  // NICHT mitnehmen: `body` endet auf `\n`, der Split hat also ein leeres
  // Schlusselement – zählte man das mit, landete die Ergänzung hinter dem
  // Frontmatter statt darin.
  let ende = kopf + 1;
  while (ende < zeilen.length && /^\s+\S/.test(zeilen[ende])) ende += 1;

  const vorhanden = new Set();
  for (let i = kopf + 1; i < ende; i += 1) {
    const treffer = zeilen[i].match(/^\s+(skills|events|landings)\s*:/);
    if (treffer) vorhanden.add(treffer[1]);
  }

  return { kopf, ende, vorhanden, zeilen };
}

/** Eine Dimension als YAML-Zeilen, zweistufig eingerückt wie der Rest. */
export function renderDimension(dimension, werte) {
  if (!werte || werte.length === 0) return [`  ${dimension}: []`];
  return [`  ${dimension}:`, ...werte.map((w) => `    - ${w}`)];
}

/**
 * Ergänzt in einem VORHANDENEN `tags:`-Block die Dimensionen, die gar nicht
 * darin stehen. Vorhandene Dimensionen bleiben unangetastet – auch leere.
 *
 * Warum das nötig wurde (2026-08-01): die Skripte prüften nur, OB ein Block da
 * ist. Ein halber Block – wie ihn der Admin schreibt, wenn nur ein Skill gesetzt
 * ist – schaltete die Ergänzung damit dauerhaft ab. Der Ordner-Tag kam nie nach,
 * und weil "Dimension fehlt = gilt überall" gilt, wanderte eine Stadt-FAQ still
 * auf alle Seiten.
 *
 * Gibt den neuen Frontmatter-Body zurück oder `null`, wenn nichts zu tun war.
 */
export function ergaenzeFehlendeDimensionen(fmBody, werteJeDimension) {
  const block = findeTagsBlock(fmBody);
  if (!block) return null;

  const fehlend = DIMENSIONS.filter((d) => !block.vorhanden.has(d));
  if (fehlend.length === 0) return null;

  const neueZeilen = fehlend.flatMap((d) => renderDimension(d, werteJeDimension[d] ?? []));
  const zeilen = [...block.zeilen];
  zeilen.splice(block.ende, 0, ...neueZeilen);
  return zeilen.join('\n');
}
