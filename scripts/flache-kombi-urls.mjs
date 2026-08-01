/**
 * Einmal-Werkzeug für die Umstellung auf flache Ort-Kombi-Adressen (01.08.2026).
 *
 * Schreibt zwei Dateien um, die die neue Adressform sonst nicht mitbekommen:
 *
 * 1. `public/config/page-visibility.json` — die versteckten Skill×Ort-Seiten
 *    stehen dort mit ihrer ALTEN, hierarchischen Adresse. Die Ausblende-Regel
 *    greift per Präfix (`/aquarelle/` versteckt `/aquarelle/berlin/`); bei einer
 *    flachen Adresse greift sie NICHT mehr. Ohne dieses Umschreiben würden 102
 *    bewusst versteckte Seiten wieder indexierbar und stünden in der Sitemap.
 *
 * 2. `vercel.json` — 301er von der alten auf die neue Adresse, plus direkte
 *    301er vom früheren Skill-Namen (`/schnellzeichner/berlin`), damit keine
 *    Weiterleitungs-Kette entsteht (Wix-URL → alte Astro-URL → neue Astro-URL).
 *
 * Aufruf: `node scripts/flache-kombi-urls.mjs`
 * Ist idempotent – zweimal laufen lassen ändert nichts.
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const lies = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf-8'));

// ── Slugs einlesen (ohne die TS-Utils, damit das Skript ohne Build läuft) ─────
const skills = lies('public/skills/skills.json').skills.map((s) =>
  String(s.link ?? `/${s.title.toLowerCase()}/`).replace(/^\/+|\/+$/g, ''),
);
const events = lies('public/events/events.json').events.map((e) => e.slug);

const landingsMd = fs.readFileSync(path.join(root, 'public/landings/landings.md'), 'utf-8');
const landings = [
  ...new Set(
    landingsMd
      .split('\n')
      // Eine Stadt pro Zeile, Kommentarzeilen beginnen mit '#'.
      .map((z) => z.trim())
      .filter((z) => z && !z.startsWith('#'))
      .map((z) => z.match(/^([a-z0-9-]+)$/)?.[1])
      .filter(Boolean),
  ),
].filter((s) => !events.includes(s));

const flach = (skill, ort) => `/${ort}-${skill}/`;
const alt = (skill, ort) => `/${skill}/${ort}/`;

console.log(`${skills.length} Skills × ${landings.length} Orte = ${skills.length * landings.length} Kombis`);
console.log(`${events.length} Anlässe bleiben hierarchisch`);

// ── 1. page-visibility.json ──────────────────────────────────────────────────
const visPfad = path.join(root, 'public/config/page-visibility.json');
const vis = JSON.parse(fs.readFileSync(visPfad, 'utf-8'));
const umbenannt = new Map();
for (const skill of skills) {
  for (const ort of landings) umbenannt.set(alt(skill, ort), flach(skill, ort));
}
let getauscht = 0;
vis.hidden = vis.hidden.map((p) => {
  const neu = umbenannt.get(p);
  if (neu) getauscht++;
  return neu ?? p;
});
fs.writeFileSync(visPfad, JSON.stringify(vis, null, 2) + '\n', 'utf-8');
console.log(`page-visibility.json: ${getauscht} Einträge auf die flache Adresse gezogen`);

// ── 2. vercel.json ───────────────────────────────────────────────────────────
const verPfad = path.join(root, 'vercel.json');
const ver = JSON.parse(fs.readFileSync(verPfad, 'utf-8'));

const neueRedirects = [];
for (const skill of skills) {
  for (const ort of landings) {
    neueRedirects.push({ source: `/${skill}/${ort}`, destination: flach(skill, ort), permanent: true });
  }
}
// Der frühere Skill-Name direkt aufs neue Ziel – sonst zwei Sprünge.
const SCHNELL = 'schnellzeichner-karikaturist';
if (skills.includes(SCHNELL)) {
  for (const ort of landings) {
    neueRedirects.push({ source: `/schnellzeichner/${ort}`, destination: flach(SCHNELL, ort), permanent: true });
  }
}

// Bereits vorhandene Quellen nicht doppeln, und die alte Duesseldorf-Zeile,
// die noch auf die hierarchische Adresse zeigte, gezielt korrigieren.
const vorhanden = new Set(ver.redirects.map((r) => r.source));
ver.redirects = ver.redirects.map((r) => {
  const ziel = r.destination.replace(/\/$/, '');
  const treffer = [...umbenannt.entries()].find(([a]) => a.replace(/\/$/, '') === ziel);
  return treffer ? { ...r, destination: treffer[1] } : r;
});

const zuErgaenzen = neueRedirects.filter((r) => !vorhanden.has(r.source));
// Die spezifischen Kombi-Regeln müssen VOR die Sammelregel
// `/schnellzeichner/:rest*`, sonst greift die Sammelregel zuerst.
const sammelIdx = ver.redirects.findIndex((r) => r.source.includes(':rest*') && r.source.startsWith('/schnellzeichner/'));
if (sammelIdx >= 0) ver.redirects.splice(sammelIdx, 0, ...zuErgaenzen);
else ver.redirects.push(...zuErgaenzen);

fs.writeFileSync(verPfad, JSON.stringify(ver, null, 2) + '\n', 'utf-8');
console.log(`vercel.json: ${zuErgaenzen.length} Weiterleitungen ergänzt, ${ver.redirects.length} insgesamt`);
