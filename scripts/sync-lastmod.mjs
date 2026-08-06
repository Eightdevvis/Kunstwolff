/**
 * sync-lastmod.mjs
 *
 * Schreibt `public/config/lastmod.json`: je Seitenpfad das Datum der letzten
 * echten Änderung, gezogen aus der Git-Historie. `astro.config.mjs` hängt daraus
 * `<lastmod>` an die Sitemap-Einträge.
 *
 * ─── Warum überhaupt? ────────────────────────────────────────────────────────
 * Ohne `lastmod` weiß Google nicht, welche der 40 Seiten sich geändert hat, und
 * crawlt entsprechend träge nach. Mit einem EHRLICHEN `lastmod` holt es gezielt
 * die neuen ab.
 *
 * ─── Warum eine committete Datei statt `git log` zur Build-Zeit? ─────────────
 * Weil ein Build-Server das Repo flach klonen kann (nur die letzten paar
 * Commits). Dann liefert `git log -1 -- <datei>` für JEDE Datei denselben
 * Commit — alle 40 Seiten bekämen dasselbe Datum. Das ist kein fehlendes
 * Signal, das ist ein FALSCHES: Google erkennt gleichförmige `lastmod`-Werte
 * und stuft das Feld dann dauerhaft als unglaubwürdig ein. Ein einmal
 * verspieltes Vertrauen holt man nicht zurück.
 *
 * Deshalb: das Datum entsteht dort, wo die volle Historie liegt (lokal), wird
 * committet und auf dem Build-Server nur noch gelesen. Fehlt die Historie,
 * rührt dieses Skript die vorhandene Datei NICHT an.
 *
 * ─── Was zählt als Änderung? ─────────────────────────────────────────────────
 * Nur die Quellen, die den INHALT dieser einen Seite bestimmen: ihre
 * Seitendatei plus ihre Content-Dateien. Bewusst NICHT Layout, Kopf-, Fußzeile
 * oder globales CSS — sonst trüge nach jeder Stiländerung jede Seite dasselbe
 * neue Datum, und das Feld wäre wieder wertlos.
 *
 * Kein Datum ermittelbar → der Pfad fehlt in der Datei → die Sitemap lässt
 * `lastmod` für ihn weg. Weglassen ist erlaubt; raten ist es nicht.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(projectRoot, 'public/config/lastmod.json');

/** Läuft `git` mit den gegebenen Argumenten im Projekt, oder null bei Fehler. */
function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Haben wir überhaupt eine brauchbare Historie? Drei Ausschlüsse:
 * kein Git, flacher Klon, oder weniger als 50 Commits (dann ist die Historie
 * so kurz, dass „letzte Änderung“ für die meisten Dateien auf denselben
 * Anfangs-Commit fiele).
 */
function hasUsableHistory() {
  if (git(['rev-parse', '--git-dir']) === null) return { ok: false, grund: 'kein Git-Repository' };
  if (git(['rev-parse', '--is-shallow-repository']) === 'true') return { ok: false, grund: 'flacher Klon (shallow)' };
  const anzahl = Number(git(['rev-list', '--count', 'HEAD']) ?? '0');
  if (!Number.isFinite(anzahl) || anzahl < 50) {
    return { ok: false, grund: `nur ${anzahl} Commits in der Historie` };
  }
  return { ok: true, anzahl };
}

const datumCache = new Map();

/** ISO-Datum des letzten Commits, der diesen Pfad berührt hat. */
function letzteAenderung(relPath) {
  if (datumCache.has(relPath)) return datumCache.get(relPath);
  let wert = null;
  if (fs.existsSync(path.join(projectRoot, relPath))) {
    wert = git(['log', '-1', '--format=%cI', '--', relPath]) || null;
  }
  datumCache.set(relPath, wert);
  return wert;
}

/**
 * Datum des letzten Commits, dessen Änderung an `relPath` eine Zeile mit
 * `muster` berührt hat (`git log -G`).
 *
 * Warum überhaupt: Städte, Anlässe und Können teilen sich je EINE Sammeldatei
 * (`content.json`, `events.json`, `skills.json`). Nähme man deren Datei-Datum,
 * bekämen nach einer Berlin-Änderung alle 34 Städte ein frisches `lastmod` —
 * für 33 davon wäre das schlicht gelogen. Diese Dateien schreiben pro Eintrag
 * eine Zeile (`"berlin": "…"`), deshalb trifft die Zeilensuche genau den
 * richtigen Eintrag.
 */
function letzteAenderungMitMuster(relPath, muster) {
  const key = `${relPath}::${muster}`;
  if (datumCache.has(key)) return datumCache.get(key);
  let wert = null;
  if (fs.existsSync(path.join(projectRoot, relPath))) {
    wert = git(['log', '-1', '--format=%cI', `-G${muster}`, '--', relPath]) || null;
  }
  datumCache.set(key, wert);
  return wert;
}

/**
 * Das jüngste Datum aus mehreren Quellen. Eine Quelle ist entweder ein Pfad
 * (String) oder ein Paar `[pfad, muster]` für die zeilengenaue Suche.
 * Null, wenn keine ein Datum liefert.
 */
function juengstes(quellen) {
  let best = null;
  for (const q of quellen) {
    const d = Array.isArray(q) ? letzteAenderungMitMuster(q[0], q[1]) : letzteAenderung(q);
    if (d && (!best || d > best)) best = d; // ISO-8601 ist zeichenweise sortierbar
  }
  return best;
}

// ─── Inhalts-Register: welcher Slug ist was? ──────────────────────────────────

function leseJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(projectRoot, rel), 'utf-8'));
  } catch {
    return null;
  }
}

/** Slugs aus landings.md: eine Stadt pro Zeile, `#` ist Kommentar. */
function leseStaedte() {
  try {
    return fs
      .readFileSync(path.join(projectRoot, 'public/landings/landings.md'), 'utf-8')
      .split('\n')
      .map((z) => z.trim())
      .filter((z) => z && !z.startsWith('#'));
  } catch {
    return [];
  }
}

const staedte = new Set(leseStaedte());

const eventsJson = leseJson('public/events/events.json');
const events = new Set(
  (Array.isArray(eventsJson?.events) ? eventsJson.events : [])
    .map((e) => (typeof e?.slug === 'string' ? e.slug : null))
    .filter(Boolean),
);

/**
 * Skill-Slugs. `link` ist die Adresse (`/schnellzeichner-karikaturist/`); fehlt
 * sie, leitet die Website sie aus dem Titel ab — dieselbe Regel wie in
 * `src/utils` (kleinschreiben, Leerzeichen zu Bindestrichen).
 */
const skillsJson = leseJson('public/skills/skills.json');
const skills = new Set(
  (Array.isArray(skillsJson?.skills) ? skillsJson.skills : [])
    .map((s) => {
      if (typeof s?.link === 'string') return s.link.replace(/^\/+|\/+$/g, '');
      if (typeof s?.title === 'string') return s.title.toLowerCase().replace(/\s+/g, '-');
      return null;
    })
    .filter(Boolean),
);

// ─── Quellen je Seitenpfad ────────────────────────────────────────────────────

const CONTENT_JSON = 'public/site-texts/content.json';

/**
 * Welche Dateien bestimmen den Inhalt dieser Adresse?
 * Leeres Array = unbekannt = kein `lastmod`.
 */
function quellenFuer(pathname) {
  const segmente = pathname.split('/').filter(Boolean);

  // Startseite
  if (segmente.length === 0) return ['src/pages/index.astro', CONTENT_JSON];

  // Statische Seite? (`/contact/` → src/pages/contact.astro)
  const alsDatei = `src/pages/${segmente.join('/')}.astro`;
  const alsOrdner = `src/pages/${segmente.join('/')}/index.astro`;
  if (fs.existsSync(path.join(projectRoot, alsDatei))) return [alsDatei];
  if (fs.existsSync(path.join(projectRoot, alsOrdner))) return [alsOrdner];

  if (segmente.length === 1) {
    const slug = segmente[0];
    if (skills.has(slug)) {
      return ['src/pages/[skill].astro', ['public/skills/skills.json', slug]];
    }
    if (events.has(slug)) {
      return [
        'src/pages/[landing].astro',
        ['public/events/events.json', slug],
        `public/img/slides/events/${slug}`,
      ];
    }
    if (staedte.has(slug)) {
      return ['src/pages/[landing].astro', [CONTENT_JSON, slug], `public/img/slides/${slug}`];
    }
    return [];
  }

  if (segmente.length === 2) {
    const [erst, zweit] = segmente;
    // Skill × Anlass, hierarchisch: /szenenmaler/hochzeit/
    if (skills.has(erst) && events.has(zweit)) {
      return [
        'src/pages/[...kombi].astro',
        ['public/skills/skills.json', erst],
        ['public/events/events.json', zweit],
      ];
    }
  }

  return [];
}

// ─── Lauf ─────────────────────────────────────────────────────────────────────

const historie = hasUsableHistory();
if (!historie.ok) {
  const vorhanden = fs.existsSync(outFile);
  console.log(
    `[lastmod] Übersprungen (${historie.grund}). ` +
      (vorhanden
        ? 'Die committete lastmod.json bleibt unverändert.'
        : 'Keine lastmod.json vorhanden – die Sitemap kommt ohne lastmod aus.'),
  );
  process.exit(0);
}

/** Alle gebauten Adressen kennen wir vor dem Build nicht – wir leiten sie ab. */
const pfade = new Set(['/']);

// statische Seiten aus src/pages (ohne dynamische [ ]-Routen und ohne 404)
for (const eintrag of fs.readdirSync(path.join(projectRoot, 'src/pages'), { withFileTypes: true })) {
  if (!eintrag.isFile() || !eintrag.name.endsWith('.astro')) continue;
  const name = eintrag.name.replace(/\.astro$/, '');
  if (name.includes('[') || name === 'index' || name === '404') continue;
  pfade.add(`/${name}/`);
}
for (const slug of staedte) pfade.add(`/${slug}/`);
for (const slug of events) pfade.add(`/${slug}/`);
for (const slug of skills) {
  pfade.add(`/${slug}/`);
  for (const ev of events) pfade.add(`/${slug}/${ev}/`);
}

/** @type {Record<string, string>} */
const ergebnis = {};
let ohneDatum = 0;
for (const p of [...pfade].sort()) {
  const datum = juengstes(quellenFuer(p));
  if (datum) ergebnis[p] = datum;
  else ohneDatum += 1;
}

const inhalt = `${JSON.stringify(ergebnis, null, 2)}\n`;
const altInhalt = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf-8') : null;
if (altInhalt === inhalt) {
  console.log(`[lastmod] unverändert (${Object.keys(ergebnis).length} Pfade).`);
} else {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, inhalt);
  console.log(
    `[lastmod] geschrieben: ${Object.keys(ergebnis).length} Pfade mit Datum` +
      (ohneDatum ? `, ${ohneDatum} ohne (bekommen kein lastmod).` : '.'),
  );
}
