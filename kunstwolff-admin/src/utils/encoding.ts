/** Text → base64 (UTF-8-sicher) */
export function encodeText(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}

/** base64 → Text */
export function decodeText(base64: string): string {
  return decodeURIComponent(escape(atob(base64.replace(/\n/g, ''))));
}

/** ArrayBuffer (Bild-Binärdaten) → base64 */
export function encodeArrayBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Dateinamen normalisieren: lowercase, Leerzeichen → Bindestriche */
export function normalizeFilename(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Stadt-Namen zu URL-sicheren Slugs normalisieren.
 * Umlaute werden transliteriert (ä→ae, ö→oe, ü→ue, ß→ss),
 * Leerzeichen zu Bindestrichen, alle anderen Sonderzeichen entfernt.
 * Beispiele: "München" → "muenchen", "Köln-Bonn" → "koeln-bonn"
 */
export function normalizeSlug(input: string): string {
  return input
    .trim()
    .replace(/ä/g, 'ae').replace(/Ä/g, 'ae')
    .replace(/ö/g, 'oe').replace(/Ö/g, 'oe')
    .replace(/ü/g, 'ue').replace(/Ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, ''); // alle verbleibenden Nicht-ASCII-Zeichen entfernen
}
