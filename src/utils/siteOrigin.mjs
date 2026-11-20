/**
 * siteOrigin.mjs – die kanonische Adresse der Website, an EINER Stelle.
 *
 * Kanonisch ist `www` (der Apex `kunstwolff.de` leitet per 308 dorthin).
 * Vorrang hat immer die Env-Variable `SITE_URL` – sie landet über
 * `astro.config.mjs` in `Astro.site`. Diese Konstante ist nur der Rückfall,
 * falls `SITE_URL` fehlt.
 *
 * Bewusst `.mjs` und nicht `.ts`: `astro.config.mjs` liest sie mit, und die
 * Konfig kann kein TS-Modul importieren.
 *
 * Bis 2026-11-20 stand der Rückfall an acht Stellen als `?? 'https://kunstwolff.de'`
 * (Apex) im Code. Bewacht von `tests/schema-site-url.test.ts`.
 */
export const SITE_ORIGIN = 'https://www.kunstwolff.de';
