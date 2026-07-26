// EINE Quelle für die Bild-Deckelung. Wird von beiden Optimierungs-Skripten
// benutzt (pre-commit `optimize-staged-images`, pre-push `optimize-all-images`)
// und spiegelt `kunstwolff-admin/src/utils/imageWebp.ts` (`MAX_EDGE`), das die
// Admin-Uploads browser-seitig deckelt.
//
// ⚠️ Wer hier etwas ändert, muss `imageWebp.ts` im Admin-Repo mitziehen –
// sonst laufen Admin-Uploads und lokale Pushes wieder auseinander.
//
// Historie: Bis 2026-07-26 deckelten alle drei Stellen nur die BREITE
// (`if (width > maxWidth)`). Bei Hochformat 3:4 – dem Normalfall dieser Fotos –
// wurde daraus 1600×2133 statt der gemeinten Fläche. 139 von 295 Bildern lagen
// über 1600px und machten 71 % des ausgelieferten Volumens aus.

/** Längste zulässige Kantenlänge. Gilt für BEIDE Achsen. */
export const MAX_EDGE = 1600;

/** WebP-Qualität für konvertierte/neu gerechnete Bilder. */
export const WEBP_QUALITY = 75;

/**
 * sharp-Resize-Optionen, die die LÄNGERE Kante deckeln.
 *
 * `fit: 'inside'` mit gleichem width UND height passt das Bild in ein Quadrat
 * von `maxEdge` ein – bei Querformat greift die Breite, bei Hochformat die Höhe.
 * Nur `width` zu setzen (der alte Weg) deckelt eben nur die Breite.
 * `withoutEnlargement` verhindert, dass kleine Bilder hochskaliert werden.
 */
export const resizeToMaxEdge = (maxEdge = MAX_EDGE) => ({
  width: maxEdge,
  height: maxEdge,
  fit: 'inside',
  withoutEnlargement: true,
});

/** true, wenn eine der beiden Kanten über dem Deckel liegt. */
export const exceedsMaxEdge = (width, height, maxEdge = MAX_EDGE) =>
  Number.isFinite(width) &&
  Number.isFinite(height) &&
  Math.max(width, height) > maxEdge;
