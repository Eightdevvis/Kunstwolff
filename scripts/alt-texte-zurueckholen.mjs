#!/usr/bin/env node
/**
 * Holt die Alt-Texte zurueck, die der Sync-Filter geloescht hat.
 *
 * Das Admin-Tool schrieb Alt-Texte in das Feld \`alt\`. \`sync-slides-metadata.mjs\`
 * uebernahm beim Neuschreiben aber nur eine feste Feldliste, auf der \`alt\` nicht
 * stand - also loeschte der pre-commit-Hook bei jedem lokalen Commit saemtliche
 * von Hand getippten Beschreibungen. Sichtbar wurde danach der maschinelle
 * \`altOverride\` aus migrate-slide-meta.mjs ("automatische Namen").
 *
 * Die Texte unten stammen aus der Dateihistorie von slides.meta.json (168
 * Commits durchsucht). Wo ein Bild seither umbenannt wurde (.jpg -> .webp),
 * ist der Text auf den heutigen Dateinamen umgehaengt.
 *
 * Idempotent und vorsichtig: schreibt NUR, wo heute gar kein Alt-Text steht
 * oder wo der vorhandene exakt die maschinelle Ableitung aus dem Dateinamen
 * ist. Von Hand gepflegte Texte werden nie ueberschrieben.
 *
 * Ohne Argument: Trockenlauf (zeigt nur, was passieren wuerde).
 * Mit --schreiben: uebernimmt die Aenderungen.
 *
 * Zwei Texte liessen sich NICHT retten, ihre Bilder gibt es nicht mehr:
 *   mainz/schnellzeichnerin-von-tisch-zu-tisch-betreibsfeier-alte-lokhalle-mainz
 *   mainz/cartoon-by-speed-painter-alte-lokhalle-mainz
 */
import fs from 'fs';
import path from 'path';

const META = path.resolve('./public/img/slides/slides.meta.json');
const schreiben = process.argv.includes('--schreiben');

/** Wiederhergestellte Alt-Texte: Bild-Key -> Text. */
const TEXTE = {
  "mediathek/1000046554.webp": "Szenenmalerei Geisterbahn Bad Vilbeler Markt",
  "mediathek/1000046570.webp": "Live-painting-fairground-drawing",
  "default/3_schnellzeichner-schweiz.webp": "Live-Karikaturen von Gästen bei einem Event in der Schweiz",
  "default/4_Hochzeit_schnellzeichner_maler.webp": "Schnellzeichner zeichnet Gäste bei einer Hochzeit live",
  "hessen/schnellzeichner-dinner-event-alte-lokhalle-mainz.webp": "karikaturistin mit zeichenbrett zeichnet mitarbeiter an tisch bei betriebsfeier in alte lokhalle mainz",
  "kaiserslautern/1_caricature-of-a-couple-by-speedpainter-event-umgc-rheinland-pfalz.webp": "paar mit lustiger paarzeichnung im armstrongs club",
  "kaiserslautern/2_colleagues-present-their-funny-quick-portrait-of-a-caricature-artist-at-a-party-pfalz.webp": "2 kollegen paesentieren iher witzige karikatur als elfe und frosch",
  "kaiserslautern/3_speedpainter-event-armstrong´s-club-kaiserslautern.webp": "schnellzeichnerin zeichnet bei event im armstrongs club kaiserslautern",
  "kaiserslautern/4_karikaturist-betriebsfeier-kleine-alm-landgasthaus-bremerhof-kaiserslautern.webp": "karikaturistin zeichnet surealistische zeichnung von mitarbeiter als kubus",
  "mainz/schnellzeichner-dinner-event-alte-lokhalle-mainz.webp": "karikaturistin mit zeichenbrett zeichnet mitarbeiter an tisch bei betriebsfeier in alte lokhalle mainz",
  "mainz/walking-act-company-party-mainz.webp": "schnellzeichnerin mit zeichenbrett vor paar an tisch bei firmenparty in alter lokhalle mainz",
  "mediathek/1000031508.webp": "Aqzarell-zeichnung-Q6Q7-Event-Mannheim",
  "mediathek/1000031531.webp": "Aquarell-Portrait-Maedchen",
  "saarbruecken/1_live-karikatur-zeichnen-paar-sylvester-spielbank-saarbruecken-schnellzeichnerin.webp": "paerchen sitzt mit seiner sylvester karikatur in spielbank saarbruecken",
  "saarbruecken/2_live-karikaturen-syvlvester-saarbruecken.webp": "schnellzeichnung von paarr mit hintergrund von sylvester und roulette",
  "saarbruecken/3_live-portraetzeichnen-im-forsthaus-neuhaus-kuenstlerin-zeichnet-gaeste.webp": "schnellzeichnerin zeichnet 2 mitarbeiterinnen am tisch bei betriebsfeier in scheune neuhaus saarbruecken",
  "saarbruecken/4_paarzeichnung-von-schnellzeichner-kunst-aktion-europa-galerie-saarbruecken.webp": "paar zeigt seine lustigen schnellportraets in europa galerie saarbruecken",
  "saarland/brautpaar-zeigt-hochzeits-zeichnung-von-schnellzeichner-bistro-bagatelle-saarland.webp": "brautpaar mit hochzeitskarikatur im bistro bagat",
  "saarland/frau-zeigt-lachend-ihr-schnell-portrtraet-betriebsfest-saarland.webp": "lustiges frauenportrait saarland",
  "saarland/frau-zeigt-zeichnung-von-karikaturistin-betriebsfeier-angelweiher-gresaubach-schmelz-saarland.webp": "witzige frauenkarikatur saarland",
  "saarland/grosseltern-mit-baby-familien-portraet-hochzeitsfeier-linslerhof-saarland.webp": "grosseltern mit enkel und familienkarikatur bei hochzeit linslerhof",
  "wiesbaden/ehepaar-karikatur-von-schnellzeichner-geburtstag-feier-mainz.webp": "karikatur von ehepaar in bilderrahmen",
  "wiesbaden/karikatur-chef-und-zwei-engel-event-geburtstag-domaene-mechthildshausen.webp": "chef mit karikatur als weinkenner und mitarbeiterinnen als engel in domaene mechthildshausen in wiesbaden",
  "wiesbaden/lustige-zeichnung-familienportraet-familienfeier-wiesbaden.webp": "funny picture family caricature",
  "wiesbaden/witziges-schnell-portrait-als-fussballer-und-cheerleader-von-event-zeichner-wiesbaden-domaene-mechthildshausen.webp": "karikatur von ehepaar als fussballer und cheerleader"
};

/** Die maschinelle Ableitung aus dem Dateinamen - so baut die Website den Fallback. */
const maschinell = (key) => {
  const datei = key.slice(key.indexOf('/') + 1);
  const roh = decodeURIComponent(datei)
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[_-]+/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return roh ? roh.charAt(0).toUpperCase() + roh.slice(1) : roh;
};

const meta = JSON.parse(fs.readFileSync(META, 'utf-8'));

const gesetzt = [];
const uebersprungen = [];
const fehlt = [];

for (const [key, text] of Object.entries(TEXTE)) {
  const eintrag = meta[key];
  if (!eintrag || typeof eintrag !== 'object') {
    fehlt.push(key);
    continue;
  }
  const vorhanden = (
    (typeof eintrag.altOverride === 'string' && eintrag.altOverride.trim()) ||
    (typeof eintrag.alt === 'string' && eintrag.alt.trim()) ||
    ''
  );
  if (vorhanden && vorhanden !== maschinell(key)) {
    uebersprungen.push({ key, vorhanden });
    continue;
  }
  if (vorhanden === text) {
    continue;
  }
  eintrag.altOverride = text;
  delete eintrag.alt;
  gesetzt.push({ key, text, ersetzt: vorhanden });
}

for (const g of gesetzt) {
  console.log(`\n${g.key}`);
  if (g.ersetzt) console.log(`   vorher (maschinell): ${g.ersetzt}`);
  console.log(`   nachher:             ${g.text}`);
}
for (const u of uebersprungen) {
  console.log(`\nuebersprungen (schon von Hand gepflegt): ${u.key}\n   ${u.vorhanden}`);
}
for (const f of fehlt) {
  console.log(`\nnicht im Repo (Bild geloescht oder umbenannt): ${f}`);
}

console.log(
  `\nalt-texte-zurueckholen: ${gesetzt.length} gesetzt, ${uebersprungen.length} uebersprungen, ${fehlt.length} ohne Bild.`,
);

if (!schreiben) {
  console.log('Trockenlauf - nichts geschrieben. Mit --schreiben uebernehmen.');
} else if (gesetzt.length > 0) {
  const sortiertesMeta = Object.fromEntries(
    Object.entries(meta).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(META, `${JSON.stringify(sortiertesMeta, null, 2)}\n`, 'utf-8');
  console.log('slides.meta.json geschrieben.');
} else {
  console.log('Nichts zu tun.');
}
