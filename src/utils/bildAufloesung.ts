import fs from 'fs';
import path from 'path';

/**
 * Bildpfade, die zur Bauzeit gegen die echten Dateien geprüft werden.
 *
 * Warum es das gibt: mehrere `content.json` halten **Kopien** von Bildpfaden,
 * deren Originale woanders gepflegt werden (`/img/why/<stadt>/benefit-N/`,
 * `/img/slides/<stadt>/`). Tauscht Mom im Admin ein Bild aus, wird die alte
 * Datei gelöscht – die Kopie zeigt danach ins Leere. Genau so entstanden am
 * 2026-07-30 vier tote Bilder auf den Why-Detailseiten.
 *
 * Der Pre-Commit-Hook (`validate:images`) fängt das nur ab, wenn jemand LOKAL
 * committet. Mom veröffentlicht über den Admin, also ohne Hook. Deshalb heilt
 * der Build selbst: er liefert nie einen Pfad aus, hinter dem keine Datei liegt.
 */

const publicRoot = path.resolve('./public');

const istBild = (name: string): boolean => /\.(webp|jpe?g|png|avif|gif|svg)$/i.test(name);

const existiert = (webPfad: string): boolean => {
  const datei = path.join(publicRoot, webPfad.replace(/^\//, ''));
  // Kein Ausbruch aus public/ – ein "../"-Pfad in einer JSON darf nicht
  // plötzlich Dateien ausserhalb des Auslieferungsordners bestätigen.
  if (!datei.startsWith(publicRoot + path.sep)) return false;
  return fs.existsSync(datei) && fs.statSync(datei).isFile();
};

/**
 * Das erste Bild im selben Ordner – alphabetisch, damit der Build
 * reproduzierbar bleibt.
 *
 * Das ist der Ersatz-Fall: der Ordner ist die gepflegte Einheit, die Datei
 * darin nur ihr aktueller Inhalt. Wurde `benefit-4/altes.webp` durch
 * `benefit-4/neues.webp` ersetzt, ist `neues.webp` genau das, was gemeint war.
 */
const ersterOrdnerinhalt = (webPfad: string): string => {
  const ordnerWeb = webPfad.slice(0, webPfad.lastIndexOf('/'));
  if (!ordnerWeb) return '';
  const ordner = path.join(publicRoot, ordnerWeb.replace(/^\//, ''));
  if (!ordner.startsWith(publicRoot + path.sep)) return '';
  if (!fs.existsSync(ordner) || !fs.statSync(ordner).isDirectory()) return '';

  const treffer = fs
    .readdirSync(ordner)
    .filter(istBild)
    .sort((a, b) => a.localeCompare(b, 'de'));

  return treffer.length > 0 ? `${ordnerWeb}/${treffer[0]}` : '';
};

/**
 * Liefert einen Bildpfad, hinter dem garantiert eine Datei liegt – oder `''`.
 *
 * `''` heisst „kein Bild": die Seite lässt das Bild dann weg. Ein leeres
 * `src=""` wäre schlimmer als kein Bild (der Browser lädt die Seite selbst
 * nochmal), deshalb müssen Aufrufer auf den Leerstring prüfen.
 */
export const aufloesenBildpfad = (webPfad: unknown): string => {
  if (typeof webPfad !== 'string') return '';
  const pfad = webPfad.trim();
  if (!pfad.startsWith('/')) return '';
  if (existiert(pfad)) return pfad;
  return ersterOrdnerinhalt(pfad);
};
