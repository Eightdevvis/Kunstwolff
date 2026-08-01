#!/usr/bin/env node
/**
 * gsc-abgleich.mjs — hält den Search-Console-Export gegen die Weiterleitungskarte.
 *
 * WOZU
 * Die Adressen in `vercel.json` stammen aus den Wix-Sitemaps. Was **wirklich**
 * Klicks bringt, steht nur in der Search Console. Fehlt dort eine Adresse in der
 * Karte, läuft sie nach dem Umzug ins Leere — und genau die verliert ihren
 * Traffic. Das ist der einzige verbliebene Weg, sich beim Umzug ernsthaft zu
 * schaden; alles andere ist reparierbar.
 *
 * EXPORT HOLEN
 *   Search Console → Leistung → Seiten → Datum: letzte 12 Monate
 *   → Exportieren → CSV herunterladen → darin `Seiten.csv` (bzw. `Pages.csv`).
 *
 * AUFRUF
 *   node scripts/gsc-abgleich.mjs <pfad/zu/Seiten.csv> [--alle]
 *
 * Ohne `--alle` werden nur Adressen mit mindestens einem Klick geprüft — die
 * ohne Klicks kosten nichts, wenn sie 404 werden.
 *
 * WAS ES PRÜFT, IN DIESER REIHENFOLGE
 *   1. Gibt es die Seite im Build (`dist/`) unverändert weiter? → nichts zu tun
 *   2. Greift eine Weiterleitung aus `vercel.json`? → und existiert deren ZIEL?
 *   3. Sonst: Treffer. Nach Klicks sortiert, damit oben steht, was wehtut.
 *
 * Es prüft NICHT die Reihenfolge, in der Vercel die Regeln anwendet – dafür
 * braucht es eine Preview. Hier geht es um Abdeckung, nicht um Priorität.
 */

import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');
const vercelPath = path.join(projectRoot, 'vercel.json');

const [, , csvArg, ...flags] = process.argv;
const alle = flags.includes('--alle');

if (!csvArg) {
  console.error('Aufruf: node scripts/gsc-abgleich.mjs <Seiten.csv> [--alle]');
  console.error('CSV: Search Console → Leistung → Seiten → 12 Monate → Exportieren.');
  process.exit(2);
}
if (!fs.existsSync(csvArg)) {
  console.error(`Datei nicht gefunden: ${csvArg}`);
  process.exit(2);
}
if (!fs.existsSync(distDir)) {
  console.error('Kein dist/ vorhanden. Erst `npm run build`, sonst kann ich nicht');
  console.error('unterscheiden, ob eine Adresse noch existiert oder nur umgeleitet wird.');
  process.exit(2);
}

/** Eine CSV-Zeile in Felder zerlegen. Anführungszeichen mit Komma darin kommen vor. */
function zerlegeZeile(zeile) {
  const felder = [];
  let feld = '';
  let inAnfuehrung = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (c === '"') {
      if (inAnfuehrung && zeile[i + 1] === '"') { feld += '"'; i++; }
      else inAnfuehrung = !inAnfuehrung;
    } else if (c === ',' && !inAnfuehrung) {
      felder.push(feld); feld = '';
    } else feld += c;
  }
  felder.push(feld);
  return felder;
}

/** Pfad aus einer Adresse ziehen; Hostnamen und Query interessieren nicht. */
function nurPfad(roh) {
  let s = (roh ?? '').trim();
  if (!s) return '';
  try {
    if (/^https?:\/\//i.test(s)) s = new URL(s).pathname;
  } catch { /* kaputte Zeile → unverändert weiter */ }
  s = s.split('?')[0].split('#')[0];
  if (!s.startsWith('/')) s = '/' + s;
  return s;
}

/** Existiert der Pfad als gebaute Seite? `/x/` und `/x` sind dieselbe Seite. */
function imBuild(pfad) {
  if (pfad === '/' ) return fs.existsSync(path.join(distDir, 'index.html'));
  const rein = pfad.replace(/^\/+|\/+$/g, '');
  return (
    fs.existsSync(path.join(distDir, rein, 'index.html')) ||
    fs.existsSync(path.join(distDir, rein)) ||
    fs.existsSync(path.join(distDir, `${rein}.html`))
  );
}

/**
 * Vercel-Quellmuster gegen einen Pfad prüfen.
 * Unterstützt wird, was in dieser `vercel.json` wirklich vorkommt: wörtliche
 * Pfade und die Sammelform `:rest*` am Ende. Named-Segments (`:slug`) ohne
 * Stern werden als „ein Segment" behandelt.
 */
function trifft(muster, pfad) {
  const m = muster.replace(/\/+$/, '') || '/';
  const p = pfad.replace(/\/+$/, '') || '/';
  if (!m.includes(':')) return m.toLowerCase() === p.toLowerCase();
  const regex = new RegExp(
    '^' +
      m
        .split('/')
        .map((teil) => {
          if (teil.endsWith('*') && teil.startsWith(':')) return '(?:.*)';
          if (teil.startsWith(':')) return '[^/]+';
          return teil.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('/') +
      '/?$',
    'i'
  );
  return regex.test(p);
}

// ── Einlesen ───────────────────────────────────────────────────────────────

const redirects = (JSON.parse(fs.readFileSync(vercelPath, 'utf-8')).redirects ?? []).map((r) => ({
  ...r,
  // Für die Zielprüfung: die Sammelformen zeigen auf feste Seiten, das reicht.
  zielPfad: nurPfad(String(r.destination).replace(/:[A-Za-z]+\*?/g, '')),
}));

const zeilen = fs.readFileSync(csvArg, 'utf-8').split(/\r?\n/).filter((z) => z.trim());
if (zeilen.length < 2) {
  console.error('CSV enthält keine Datenzeilen.');
  process.exit(2);
}

const kopf = zerlegeZeile(zeilen[0]).map((h) => h.trim().toLowerCase().replace(/^﻿/, ''));
const spalteAdresse = kopf.findIndex((h) => /seite|page|url|adresse/.test(h));
const spalteKlicks = kopf.findIndex((h) => /klick|click/.test(h));

if (spalteAdresse === -1) {
  console.error(`Keine Adress-Spalte gefunden. Kopfzeile war: ${kopf.join(' | ')}`);
  process.exit(2);
}

const eintraege = [];
for (const zeile of zeilen.slice(1)) {
  const f = zerlegeZeile(zeile);
  const pfad = nurPfad(f[spalteAdresse]);
  if (!pfad) continue;
  const klicks = spalteKlicks === -1 ? 0 : Number(String(f[spalteKlicks]).replace(/[^\d]/g, '')) || 0;
  eintraege.push({ pfad, klicks });
}

// ── Prüfen ─────────────────────────────────────────────────────────────────

const zuPruefen = alle ? eintraege : eintraege.filter((e) => e.klicks > 0);

const ohneZiel = [];
const zielFehlt = [];
let bleibt = 0;
let umgeleitet = 0;

for (const e of zuPruefen) {
  if (imBuild(e.pfad)) { bleibt++; continue; }
  const regel = redirects.find((r) => trifft(r.source, e.pfad));
  if (!regel) { ohneZiel.push(e); continue; }
  umgeleitet++;
  if (regel.zielPfad.startsWith('/') && !imBuild(regel.zielPfad)) {
    zielFehlt.push({ ...e, ziel: regel.destination });
  }
}

// ── Ausgabe ────────────────────────────────────────────────────────────────

const strich = '─'.repeat(74);
const klicksVon = (liste) => liste.reduce((s, e) => s + e.klicks, 0);

console.log(strich);
console.log(`Search-Console-Abgleich  (${path.basename(csvArg)})`);
console.log(strich);
console.log(`Adressen im Export:        ${eintraege.length}`);
console.log(`davon geprüft:             ${zuPruefen.length}${alle ? '' : '  (nur mit Klicks; --alle für alle)'}`);
console.log(`existiert unverändert:     ${bleibt}`);
console.log(`wird weitergeleitet:       ${umgeleitet}`);
console.log(`OHNE Weiterleitung:        ${ohneZiel.length}   ← die verlieren ihren Traffic`);
console.log(`Weiterleitung ins Leere:   ${zielFehlt.length}`);
console.log(strich);

if (ohneZiel.length) {
  ohneZiel.sort((a, b) => b.klicks - a.klicks);
  console.log(`\nKeine Weiterleitung (${klicksVon(ohneZiel)} Klicks insgesamt), nach Klicks:\n`);
  for (const e of ohneZiel) console.log(`  ${String(e.klicks).padStart(6)}  ${e.pfad}`);
  console.log(`\n  → für jede Zeile einen Eintrag in vercel.json "redirects" anlegen`);
  console.log(`    ({ "source": "<Pfad>", "destination": "<neue Seite>", "permanent": true }).`);
}

if (zielFehlt.length) {
  console.log(`\nWeiterleitung zeigt auf eine Seite, die es im Build nicht gibt:\n`);
  for (const e of zielFehlt) console.log(`  ${String(e.klicks).padStart(6)}  ${e.pfad}  →  ${e.ziel}`);
}

if (!ohneZiel.length && !zielFehlt.length) {
  console.log('\nJede Adresse mit Klicks ist abgedeckt. Nichts zu tun.\n');
}

process.exit(ohneZiel.length || zielFehlt.length ? 1 : 0);
