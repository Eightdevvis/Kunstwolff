/**
 * Rollendes Vorladefenster für die Slideshow.
 *
 * ## Das Problem
 *
 * Alle Slides tragen `loading="lazy"` im Markup, und das ist richtig: es sind
 * bis zu 24 Bilder à ~55 KB, die niemand alle ansieht.
 *
 * In einem Karussell bedeutet `lazy` aber „lade das Bild in dem Moment, in dem
 * es hereinfährt". Der Autoplay wechselt alle 2,5 s, der Browser fängt also
 * erst dann an; bis die Datei da ist, steht die Bühne schwarz
 * (`.swiper-slide { background: #000 }`). Das ist die lange gesuchte „langsame"
 * Slideshow — **kein Bandbreiten-, sondern ein Zeitpunktproblem**: das Bild
 * wird zu spät angefordert, nicht zu langsam geliefert. Wer hier misst, schaut
 * auf den Startzeitpunkt der Anfrage, nicht auf die Dateigrösse.
 *
 * ## Die Lösung
 *
 * Das Fenster läuft dem Autoplay um `vorlauf` Slides voraus. „Freigeben" heisst
 * dabei: `loading` von `lazy` auf `eager` setzen — das startet den Ladevorgang
 * sofort. `src` wird bewusst NICHT angefasst; ein neu gesetztes `src` würde den
 * Ladevorgang stattdessen von vorn beginnen.
 *
 * Der Stand ist **monoton**: einmal freigegeben, bleibt freigegeben. Das ist
 * nötig, weil `realIndex` im Loop-Modus wieder bei 0 anfängt — ohne Monotonie
 * würde das Fenster bei jedem Durchlauf von vorn beginnen und dieselbe Arbeit
 * wiederholen.
 *
 * Bewusst ohne DOM-Abhängigkeit: der Prüfling ist die Reihenfolge-Logik, und
 * die lässt sich nur so ohne Browser testen (`tests/slide-vorladen.test.ts`).
 */

/** Alles, was dieses Modul von einem `<img>` braucht. */
export type LadbaresBild = { loading: string };

export type Vorladefenster = {
  /**
   * Gibt alle Bilder bis `index + vorlauf` frei und meldet, wie viele dabei
   * NEU umgeschaltet wurden (0 = nichts zu tun).
   */
  bisSlide(index: number): number;
  /** Höchster bereits freigegebener Index; -1 solange nichts freigegeben ist. */
  readonly stand: number;
};

export function erzeugeVorladefenster(
  bilder: LadbaresBild[],
  vorlauf: number,
): Vorladefenster {
  let freigegebenBis = -1;

  return {
    bisSlide(index: number): number {
      // Ein negativer Index (defensiv: Swiper meldet bei leerem Loop -1)
      // darf das Fenster nicht rückwärts ziehen.
      const ziel = Math.min(Math.max(index, 0) + vorlauf, bilder.length - 1);
      let neu = 0;

      for (let i = freigegebenBis + 1; i <= ziel; i++) {
        if (bilder[i].loading === 'lazy') {
          bilder[i].loading = 'eager';
          neu++;
        }
      }

      if (ziel > freigegebenBis) freigegebenBis = ziel;
      return neu;
    },

    get stand() {
      return freigegebenBis;
    },
  };
}
