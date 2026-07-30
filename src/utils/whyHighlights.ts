import { aufloesenBildpfad } from './bildAufloesung';
import { getWhyBenefits } from './why';
import { WHY_DETAIL_LINKS, getWhyDetailLinkByTitle } from './whyDetailLinks';

export type WhyOtherHighlight = {
  title: string;
  text: string;
  image: string;
  alt: string;
  linkUrl: string;
  linkLabel: string;
};

/**
 * „Andere Besonderheiten von Kunstwolff" – der Abschnitt am Fuss der vier
 * Why-Detailseiten.
 *
 * Diese Karten SIND die Why-Karten der Startseite, nur ohne die eigene. Ihre
 * Bildpfade standen bisher als Kopie in jeder der vier `content.json`. Vier
 * Kopien von etwas, das der Admin an einer einzigen Stelle austauscht – jeder
 * Bildwechsel hinterliess also bis zu vier tote Verweise, und niemand merkte
 * es, weil die Detailseiten selten aufgerufen werden.
 *
 * Jetzt kommt das Bild aus `getWhyBenefits()`, also aus derselben Quelle, die
 * auch die Startseite rendert. Die Zuordnung läuft über die Detailseite, auf
 * die eine Karte zeigt: `WHY_DETAIL_LINKS[i]` gehört zu Karte `i`.
 *
 * Texte bleiben, was in der `content.json` steht – die sind dort bewusst
 * gekürzt und werden von Hand gepflegt. Nur der Bildpfad war das Problem.
 */
export const aufgeloesteHighlights = (
  highlights: readonly WhyOtherHighlight[],
): WhyOtherHighlight[] => {
  const benefits = getWhyBenefits();

  return highlights.map((item) => {
    const ziel = item.linkUrl?.trim() || getWhyDetailLinkByTitle(item.title);
    const position = WHY_DETAIL_LINKS.indexOf(ziel as (typeof WHY_DETAIL_LINKS)[number]);
    const benefit = position >= 0 ? benefits[position] : undefined;

    // Reihenfolge mit Absicht: erst das gepflegte Bild der Why-Karte, dann der
    // in der JSON hinterlegte Pfad (falls die Karte nicht zuzuordnen war), und
    // beides nochmal gegen die echten Dateien geprüft.
    const image = aufloesenBildpfad(benefit?.image) || aufloesenBildpfad(item.image);

    return {
      ...item,
      image,
      alt: item.alt?.trim() || benefit?.alt || item.title,
    };
  });
};
