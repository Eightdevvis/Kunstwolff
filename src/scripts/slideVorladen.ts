/**
 * Rollendes Vorladefenster für die Slideshow.
 *
 * ## Das Problem
 *
 Die Slides werden erst kurz vor ihrem Auftritt geladen, und das ist richtig: es
 * sind bis zu 57 Bilder, die niemand alle ansieht.
 *
 * In einem Karussell bedeutet „erst beim Hereinfahren laden" aber: zu spät.
 * Der Autoplay wechselt alle 2,5 s, der Browser fängt also
 * erst dann an; bis die Datei da ist, steht die Bühne schwarz
 * (`.swiper-slide { background: #000 }`). Das ist die lange gesuchte „langsame"
 * Slideshow — **kein Bandbreiten-, sondern ein Zeitpunktproblem**: das Bild
 * wird zu spät angefordert, nicht zu langsam geliefert. Wer hier misst, schaut
 * auf den Startzeitpunkt der Anfrage, nicht auf die Dateigrösse.
 *
 * ## Die Lösung
 *
 * Das Fenster läuft dem Autoplay um `vorlauf` Slides voraus. „Freigeben" heisst
 * seit 2026-11-20: die echte Adresse aus `data-src`/`data-srcset` einsetzen.
 *
 * Vorher stand `src` von Anfang an im Markup, mit `loading="lazy"`, und
 * Freigeben hiess `lazy` → `eager`. Gemessen hat Chrome die lazy-Slides im
 * seitlichen Karussell aber trotzdem ALLE beim Seitenaufruf geladen (auch ohne
 * dieses Skript, auch am Desktop): `/firmenfeier/` 57 Slides, 5,2 MB, bevor
 * jemand die Slideshow überhaupt sieht. Jetzt trägt jedes Slide nur einen
 * Platzhalter (leeres SVG in den Maßen des Bildes, kein Netzwerk) – Swiper
 * rechnet damit dieselben Breiten wie mit dem echten Bild, nichts springt.
 * Ohne JavaScript greift ein `<noscript>`-Bild.
 *
 * Neben dem Fenster gibt `liegtNahe()` alles frei, was gerade auf der Bühne
 * steht oder eine Bühnenbreite daneben liegt: am Desktop sind mehrere Slides
 * zugleich sichtbar, und wer rückwärts wischt, landet im Loop beim LETZTEN
 * Slide – beides deckt ein reines Vorwärts-Fenster nicht ab.
 *
 * Der Stand ist **monoton**: einmal freigegeben, bleibt freigegeben. Das ist
 * nötig, weil `realIndex` im Loop-Modus wieder bei 0 anfängt — ohne Monotonie
 * würde das Fenster bei jedem Durchlauf von vorn beginnen und dieselbe Arbeit
 * wiederholen.
 *
 * Bewusst ohne DOM-Abhängigkeit: der Prüfling ist die Reihenfolge-Logik, und
 * die lässt sich nur so ohne Browser testen (`tests/slide-vorladen.test.ts`).
 */

/**
 * Alles, was dieses Modul von einem Slide-Bild braucht. Im Browser liefert
 * `ausImg()` das Objekt; im Test reicht ein einfaches Objekt.
 */
export type LadbaresBild = {
  /** true, solange das Bild nur den Platzhalter zeigt. */
  readonly wartend: boolean;
  /** Setzt die echte Adresse – startet den Ladevorgang. */
  freigeben(): void;
};

/**
 * Das `<img>` als `LadbaresBild`. `srcset` VOR `src` setzen: sonst beginnt der
 * Browser mit dem Original und bricht dann für die passende Variante ab.
 */
export function ausImg(img: HTMLImageElement): LadbaresBild {
  return {
    get wartend() {
      return img.dataset.src !== undefined;
    },
    freigeben() {
      const { src, srcset } = img.dataset;
      if (src === undefined) return;
      if (srcset) img.srcset = srcset;
      img.src = src;
      delete img.dataset.src;
      delete img.dataset.srcset;
    },
  };
}

/**
 * Steht ein Slide auf der Bühne oder höchstens `vorlauf` Pixel daneben?
 * Waagerecht, in beide Richtungen.
 */
export function liegtNahe(
  slide: { left: number; right: number },
  buehne: { left: number; right: number },
  vorlauf: number,
): boolean {
  return slide.right > buehne.left - vorlauf && slide.left < buehne.right + vorlauf;
}

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
        if (bilder[i].wartend) {
          bilder[i].freigeben();
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
