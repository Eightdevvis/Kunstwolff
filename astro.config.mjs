// @ts-check
import { defineConfig } from 'astro/config';
import fs from 'fs';
import path from 'path';

import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";

// ─── Site-Host pro Umgebung ───────────────────────────────────────────────────
// `site` wird zur BUILD-Zeit fest in Sitemap, Canonical-Links und OG-URLs
// reingeschrieben. Damit der Build auf der Vercel-Stage NICHT auf die Wix-
// Domain (kunstwolff.de) verweist (was Crawler in 404-Land schicken würde,
// solange dort noch Wix läuft), liest die Konfig die Env-Variable SITE_URL.
//
// Vercel-Env (Project Settings → Environment Variables):
//   SITE_URL=https://kunstwolff.vercel.app   (Stage)
// Beim Cutover dann auf https://www.kunstwolff.de stellen, alternativ
// Variable löschen → Fallback unten greift.
const siteUrl = process.env.SITE_URL ?? "https://kunstwolff.de";

// ─── Page-Visibility ──────────────────────────────────────────────────────────
// `public/config/page-visibility.json` listet Pfade die aus der Sitemap
// rausgefiltert werden sollen (vom Admin-Tool gepflegt). Wird zur Build-Zeit
// einmal eingelesen. Layout.astro liest dieselbe Liste runtime via
// `isPageHiddenByPath()` für `<meta robots noindex>`.
const visibilityConfigPath = path.resolve('./public/config/page-visibility.json');

/**
 * Normalisiert einen Pfad-String: Query/Hash entfernen, trailing Slashes
 * weg, leerer Pfad → "/". Gibt null zurück, wenn die Eingabe ungültig ist.
 * @param {unknown} input
 * @returns {string | null}
 */
const normalizePagePath = (input) => {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const noQuery = raw.split('?')[0]?.split('#')[0] ?? raw;
  if (!noQuery.startsWith('/')) return null;
  const trimmed = noQuery.replace(/\/+$/g, '');
  return trimmed === '' ? '/' : trimmed;
};

/**
 * Liest die Liste der hidden Pfade aus page-visibility.json.
 * Bei fehlender Datei oder Parse-Fehler: leeres Set (defensive).
 * @returns {Set<string>}
 */
const readHiddenSet = () => {
  /** @type {Set<string>} */
  const out = new Set();
  if (!fs.existsSync(visibilityConfigPath)) return out;
  try {
    const raw = fs.readFileSync(visibilityConfigPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const hidden = Array.isArray(parsed?.hidden) ? parsed.hidden : [];
    for (const item of hidden) {
      if (typeof item !== 'string') continue;
      const normalized = normalizePagePath(item);
      if (!normalized) continue;
      out.add(normalized);
    }
    return out;
  } catch {
    return out;
  }
};

const hiddenPaths = readHiddenSet();

/**
 * Responsive Bildvarianten als INTEGRATION statt als nachgelagerter Befehl.
 *
 * Vorgeschichte (2026-07-28): das Skript hing als `astro build && node …` am
 * Build-Befehl. Lokal lief es, in der PRODUKTION nicht – Vercel führt seinen
 * eigenen Astro-Build aus und übersprang den zweiten Teil. Ergebnis: das
 * ausgelieferte Markup versprach Varianten, die es dort nie gab, und srcset
 * kennt keinen Rückfall. Es war live und zeigte leere Bilder.
 *
 * Als Integration hängt die Erzeugung am Build selbst und kann nicht mehr
 * abgeschnitten werden – egal, wer den Build anstößt und wie.
 */
const bildVarianten = () => ({
  name: 'kunstwolff-bild-varianten',
  hooks: {
    'astro:build:done': async () => {
      const { generateVariants } = await import('./scripts/generate-image-variants.mjs');
      await generateVariants();
    },
  },
});

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  // Die Galerie liegt unter `/galerie/` – deutsche Schreibweise, weil die URL
  // öffentlich sichtbar ist und in der Suche steht. `/gallerie/` (doppeltes l)
  // ist die naheliegende Fehlschreibung und landet per Weiterleitung am Ziel,
  // statt auf der 404-Seite.
  redirects: {
    '/gallerie': '/galerie/',
  },
  integrations: [
    preact(),
    bildVarianten(),
    sitemap({
      // page kommt von @astrojs/sitemap als string ODER {url, …}-Objekt,
      // je nach Astro-Version. Beide Formen unterstützen.
      filter: (/** @type {string | { url?: string }} */ page) => {
        const url = typeof page === 'string' ? page : page?.url;
        if (!url) return true;
        try {
          const pathname = new URL(url).pathname;
          const normalized = normalizePagePath(pathname);
          if (!normalized) return true;
          // Präfix-Regel, zeichengleich zu `isPageHiddenByPath` in
          // src/utils/pageVisibility.ts: wer /aquarelle/ ausblendet, meint auch
          // /aquarelle/berlin/. Ohne das stünden 39 der 40 Seiten mit `noindex`
          // trotzdem in der Sitemap — ein widersprüchliches Signal an Google.
          if (hiddenPaths.has(normalized)) return false;
          for (const hidden of hiddenPaths) {
            if (hidden !== '/' && normalized.startsWith(`${hidden}/`)) return false;
          }
          return true;
        } catch {
          return true;
        }
      },
    }),
  ],
});
