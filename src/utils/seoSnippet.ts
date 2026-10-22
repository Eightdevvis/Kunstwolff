/**
 * seoSnippet.ts – Meta-Beschreibung und Titel auf Suchergebnis-Länge bringen.
 *
 * Die Texte kommen aus dem Admin (Event-„Beschreibung / Untertitel (SEO)",
 * Skill-Beschreibung, Seiten-JSONs). Dort sind sie oft gleichzeitig der
 * SICHTBARE Untertitel und dürfen deshalb lang sein. Google schneidet aber bei
 * rund 155 Zeichen (Beschreibung) bzw. 60 Zeichen (Titel) mitten im Wort ab.
 *
 * Deshalb wird hier nur die META-Fassung gekürzt — der Text im Admin und auf
 * der Seite bleibt unverändert. Es wird nichts dazuerfunden, nur weggelassen.
 */

export const MAX_DESCRIPTION = 155;
export const MAX_TITLE = 60;

/** Kürzeste brauchbare Beschreibung aus ganzen Sätzen — darunter lieber Wortschnitt. */
const MIN_SAETZE = 100;

const normalisieren = (s: string): string => s.replace(/\s+/g, ' ').trim();

/**
 * Kürzt auf höchstens `max` Zeichen. Bevorzugt ganze Sätze; reichen die nicht
 * für eine brauchbare Länge, wird am letzten Wortende geschnitten und „…"
 * angehängt.
 */
export function metaDescription(text: string | undefined | null, max = MAX_DESCRIPTION): string {
  const t = normalisieren(text ?? '');
  if (t.length <= max) return t;

  const saetze = t.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [t];
  let ganz = '';
  for (const satz of saetze) {
    const kandidat = normalisieren(ganz + ' ' + satz);
    if (kandidat.length > max) break;
    ganz = kandidat;
  }
  if (ganz.length >= MIN_SAETZE) return ganz;

  const roh = t.slice(0, max - 1);
  const wortende = roh.lastIndexOf(' ');
  const geschnitten = (wortende > max * 0.6 ? roh.slice(0, wortende) : roh).replace(/[\s,;:–-]+$/, '');
  return `${geschnitten}…`;
}

/**
 * Seitentitel mit Marke, aber nie über `max`: erst „Text | Kunstwolff", dann
 * ohne Marke, dann der Teil vor einem Gedankenstrich/Doppelpunkt/Ausrufezeichen
 * (z. B. „Live-Zeichnungen für Ihre private Feier - ein großer Spaß …" →
 * „Live-Zeichnungen für Ihre private Feier | Kunstwolff"). Passt nichts davon,
 * bleibt der volle Titel — dann kürzt Google, was besser ist als ein erfundener.
 */
export function pageTitle(text: string, marke = 'Kunstwolff', max = MAX_TITLE): string {
  const t = normalisieren(text);
  const mitMarke = `${t} | ${marke}`;
  if (mitMarke.length <= max) return mitMarke;

  const teil = t.split(/\s+[-–—]\s+|:\s+|!\s*/)[0]?.trim() ?? '';
  if (teil && teil !== t && teil.length >= 20) {
    const teilMitMarke = `${teil} | ${marke}`;
    if (teilMitMarke.length <= max) return teilMitMarke;
    if (teil.length <= max) return teil;
  }
  if (t.length <= max) return t;
  return mitMarke;
}
