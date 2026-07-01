/**
 * comboContent.ts – einzigartiger Text für Skill×Event-Kombiseiten
 * (z.B. /schnellzeichner/messe). Bricht die ~93%-Duplikation gegenüber der
 * reinen Event-Seite (/messe) auf: jede Kombi bekommt einen eigenen Lead-Text
 * + skill-/anlass-spezifische Benefit-Punkte.
 *
 * PHASE 1 bewusst als Code-Datei (kein Admin/Sync), damit wir die Qualität
 * schnell sehen. Migration nach public/ + Admin-Editor folgt in Phase 2
 * (globale Tag-/Medien-Bibliothek).
 *
 * Key = `${skillSlug}/${eventSlug}`. Fehlt eine Kombi, greift ein
 * skill-/anlass-bewusster Default (nie leer, nie „thin").
 */

export interface ComboBenefit {
  title: string;
  text: string;
}

export interface SkillEventContent {
  lead: string; // Absätze durch Leerzeile getrennt (wie LandingIntro)
  benefitsTitle: string;
  benefits: ComboBenefit[];
}

const CONTENT: Record<string, SkillEventContent> = {
  'schnellzeichner/messe': {
    lead:
      'Auf einer Messe zählt jede Sekunde Aufmerksamkeit – und genau die zieht ein Live-Schnellzeichner an Ihren Stand. Während ringsum Roll-ups und Bildschirme um Blicke kämpfen, bildet sich bei uns eine Traube neugieriger Besucher, die zuschauen, lachen und bleiben. Aus Laufkundschaft werden Gespräche, aus Gesprächen Leads.\n\n' +
      'Jedes Porträt entsteht in zwei bis drei Minuten, trägt auf Wunsch Ihr Logo und wandert als Mitnahme-Geschenk in die Tasche – Ihr Messeauftritt reist im Handgepäck nach Hause und wird noch Wochen später am Schreibtisch gezeigt.',
    benefitsTitle: 'Warum ein Schnellzeichner auf Ihrer Messe überzeugt',
    benefits: [
      { title: 'Besuchermagnet am Stand', text: 'Live-Zeichnen stoppt den Laufweg. Statt vorbeizugehen, bleiben Besucher stehen – die ideale Eröffnung für ein Verkaufsgespräch.' },
      { title: 'Branding, das mitgenommen wird', text: 'Ihr Logo wird dezent ins Porträt eingebunden. Jedes Bild ist ein personalisierter Werbeträger, der freiwillig aufbewahrt wird.' },
      { title: 'Leads statt Wartezeit', text: 'Während gezeichnet wird, entsteht Zeit für Smalltalk, Visitenkarte und Kontaktdaten – Unterhaltung und Lead-Generierung in einem.' },
    ],
  },
  'schnellzeichner/firmenfeier': {
    lead:
      'Eine Firmenfeier lebt davon, dass Kollegen ins Gespräch kommen, die sich sonst nur per Mail kennen. Ein Schnellzeichner ist dafür der perfekte Eisbrecher: Wer Modell sitzt, wird zum Mittelpunkt, der Rest schaut zu, kommentiert und lacht – Abteilungsgrenzen lösen sich ganz nebenbei auf.\n\n' +
      'Am Ende des Abends geht niemand mit leeren Händen: Jedes Teammitglied nimmt sein eigenes Porträt mit – ein persönliches Andenken an einen Abend, der in Erinnerung bleibt, statt im nächsten Newsletter unterzugehen.',
    benefitsTitle: 'Warum ein Schnellzeichner Ihre Firmenfeier trägt',
    benefits: [
      { title: 'Eisbrecher fürs Team', text: 'Gemeinsames Zuschauen verbindet. Der Schnellzeichner bringt Menschen aus verschiedenen Abteilungen ungezwungen zusammen.' },
      { title: 'Persönliches Geschenk für alle', text: 'Statt Streuartikel bekommt jeder Gast sein individuelles Porträt – wertschätzend und garantiert ein Unikat.' },
      { title: 'Unterhaltung ohne Bühne', text: 'Kein Programmpunkt, der den Abend unterbricht – das Zeichnen läuft nebenher, vom Sektempfang bis in den späten Abend.' },
    ],
  },
  'schnellzeichner/hochzeit': {
    lead:
      'Zwischen Sektempfang und Hochzeitstanz gibt es diese Stunden, in denen die Gäste auf das Brautpaar warten – ein Live-Schnellzeichner füllt sie mit Leichtigkeit. Er geht von Tisch zu Tisch, verewigt Paare, Familien und Trauzeugen und sorgt für Lacher, während die Fotografin noch unterwegs ist.\n\n' +
      'Die Zeichnungen sind mehr als Zeitvertreib: Sie werden zum Gästebuch zum Anfassen und zum Mitbringsel, das Ihre Gäste an einen Tag erinnert, an dem alles gestimmt hat – charmant, persönlich und ganz ohne Kitsch.',
    benefitsTitle: 'Warum ein Schnellzeichner auf Ihrer Hochzeit begeistert',
    benefits: [
      { title: 'Unterhaltung in den Wartezeiten', text: 'Fotoshooting, Buffetwechsel, Programmpausen – der Schnellzeichner überbrückt die Leerlaufmomente, in denen sonst Langeweile aufkommt.' },
      { title: 'Andenken statt Wegwerf-Gastgeschenk', text: 'Jeder Gast nimmt sein Porträt mit nach Hause – ein persönliches Erinnerungsstück mit echtem Aufbewahr-Wert.' },
      { title: 'Gästebuch zum Anfassen', text: 'Auf Wunsch zeichnen wir auf ein gemeinsames Blatt oder eine Leinwand – ein Kunstwerk, das das ganze Fest einfängt.' },
    ],
  },
  'schnellzeichner/private-feier': {
    lead:
      'Ob runder Geburtstag, Jubiläum oder einfach ein Fest mit den Liebsten – ein Schnellzeichner macht aus einer netten Feier ein Erlebnis, über das noch lange geredet wird. Die Gäste werden selbst zu Hauptdarstellern, statt nur Zuschauer zu sein.\n\n' +
      'In wenigen Minuten entsteht für jeden ein Porträt mit Augenzwinkern: Hobbys, Lieblingsdrink oder der typische Spruch des Geburtstagskinds fließen mit ein. So wird das Gastgeschenk zum Gesprächsthema – und Sie als Gastgeber zum Held des Abends.',
    benefitsTitle: 'Warum ein Schnellzeichner Ihre Feier zum Erlebnis macht',
    benefits: [
      { title: 'Jeder Gast wird zum Star', text: 'Persönliche Porträts mit liebevollen Details holen jeden ins Rampenlicht – ein Spaß für Jung und Alt.' },
      { title: 'Das Geschenk, das bleibt', text: 'Statt Tischdeko zum Wegwerfen nimmt jeder ein Unikat mit nach Hause, das an Ihren Abend erinnert.' },
      { title: 'Stimmung ohne Aufwand', text: 'Sie müssen nichts organisieren – der Schnellzeichner sorgt von allein für Lacher und volle Tische rund ums Geschehen.' },
    ],
  },
  'szenenmaler/messe': {
    lead:
      'Ein Szenenmaler verwandelt Ihren Messestand in eine Bühne: Live und in Großformat entsteht ein Bild, das Ihre Marke, Ihr Produkt und die Atmosphäre der Messe in einem einzigen Kunstwerk bündelt. Besucher bleiben stehen, um dem Bild beim Wachsen zuzusehen – Ihr Stand wird zum Gesprächsthema der Halle.\n\n' +
      'Am Ende der Messe halten Sie kein Wegwerf-Banner in den Händen, sondern ein Originalgemälde, das Ihren Auftritt dokumentiert und im Foyer oder Empfang weiterlebt – Markeninszenierung, die bleibt.',
    benefitsTitle: 'Warum ein Szenenmaler auf Ihrer Messe überzeugt',
    benefits: [
      { title: 'Blickfang in Großformat', text: 'Ein wachsendes Gemälde zieht über Stunden Aufmerksamkeit – ein Standmagnet, der sich von Roll-ups und Bildschirmen abhebt.' },
      { title: 'Ihre Marke als Kunstwerk', text: 'Produkt, Logo und Messe-Motive werden geschmackvoll ins Bild komponiert – Markenbotschaft, die als Kunst wahrgenommen wird.' },
      { title: 'Ein Original, das bleibt', text: 'Das fertige Werk schmückt nach der Messe Ihr Büro oder Foyer – Ihr Messeauftritt bekommt ein dauerhaftes Zuhause.' },
    ],
  },
  'szenenmaler/firmenfeier': {
    lead:
      'Während Ihre Firmenfeier in vollem Gange ist, hält ein Szenenmaler sie in Echtzeit auf der Leinwand fest: die volle Tanzfläche, das Anstoßen, die Lacher. Aus vielen einzelnen Momenten entsteht ein einziges Bild, das den Geist des Abends einfängt – und die Gäste sehen ihm dabei gebannt zu.\n\n' +
      'Das fertige Gemälde ist mehr als Dekoration: Es hängt später im Büro, erinnert das Team an einen gemeinsamen Abend und erzählt neuen Kollegen, was Ihre Unternehmenskultur ausmacht.',
    benefitsTitle: 'Warum ein Szenenmaler Ihre Firmenfeier trägt',
    benefits: [
      { title: 'Der Abend in einem Bild', text: 'Statt hunderter Handyfotos entsteht ein einziges Kunstwerk, das die Stimmung Ihrer Feier verdichtet.' },
      { title: 'Live-Erlebnis für die Gäste', text: 'Dem Bild beim Entstehen zuzusehen wird selbst zum Programmpunkt – ganz ohne Bühne und Mikrofon.' },
      { title: 'Identität zum Aufhängen', text: 'Das Gemälde lebt im Unternehmen weiter und macht Teamgeist sichtbar – für Mitarbeiter wie für Besucher.' },
    ],
  },
  'szenenmaler/hochzeit': {
    lead:
      'Ein Szenenmaler malt Ihre Hochzeit, während sie geschieht: den ersten Tanz, die lachende Tafel, das Licht des Abends. Auf einer großen Leinwand wächst Stunde um Stunde ein Gemälde heran, das die Atmosphäre Ihres Tages einfängt, wie es kein Foto kann – und Ihre Gäste schauen verzaubert zu.\n\n' +
      'Wenn das Fest vorbei ist, nehmen Sie ein Originalkunstwerk mit nach Hause: ein Erinnerungsstück fürs Wohnzimmer, das Ihren schönsten Tag jeden Tag aufs Neue lebendig macht.',
    benefitsTitle: 'Warum ein Szenenmaler auf Ihrer Hochzeit begeistert',
    benefits: [
      { title: 'Ihr Tag als Originalgemälde', text: 'Kein Bild von der Stange, sondern ein Unikat, das genau Ihre Hochzeit zeigt – Atmosphäre statt Pose.' },
      { title: 'Magisches Live-Erlebnis', text: 'Das Entstehen des Bildes begleitet das Fest und gibt den Gästen etwas Wundervolles zum Zuschauen.' },
      { title: 'Erinnerung fürs Wohnzimmer', text: 'Das Gemälde hängt später bei Ihnen zu Hause – ein Andenken mit Seele, statt im Fotobuch zu verschwinden.' },
    ],
  },
  'szenenmaler/private-feier': {
    lead:
      'Ein besonderer Geburtstag oder ein Jubiläum verdient mehr als Luftballons – ein Szenenmaler hält Ihre Feier live auf der Leinwand fest und macht das Fest selbst zum Kunstwerk. Während gefeiert wird, wächst ein Bild, das die Menschen, die Stimmung und den Anlass für immer bewahrt.\n\n' +
      'Ihre Gäste erleben, wie aus ihrem Abend Kunst wird, und Sie als Gastgeber halten am Ende ein Originalgemälde in den Händen – ein Andenken, das Ihre Feier weit über den letzten Gast hinaus weiterleben lässt.',
    benefitsTitle: 'Warum ein Szenenmaler Ihre Feier zum Erlebnis macht',
    benefits: [
      { title: 'Die Feier wird zur Kunst', text: 'Ihr Anlass entsteht live als Gemälde – ein außergewöhnlicher Mittelpunkt, der jede private Feier aufwertet.' },
      { title: 'Zuschauen, das verbindet', text: 'Gäste verfolgen gebannt, wie das Bild wächst – ein gemeinsames Erlebnis, das Gesprächsstoff liefert.' },
      { title: 'Ein bleibendes Andenken', text: 'Das fertige Originalwerk erinnert Sie zu Hause an einen Abend, der zu schön war, um ihn zu vergessen.' },
    ],
  },
};

/**
 * Anlass-bewusster Default, falls eine Kombi (noch) nicht ausformuliert ist –
 * variiert nach Skill + Event, damit die Seite nie leer oder „thin" ist.
 */
function fallbackContent(skillTitle: string, eventLabel: string): SkillEventContent {
  return {
    lead:
      `Ein ${skillTitle} macht aus ${eventLabel} ein Erlebnis, das Ihren Gästen im Gedächtnis bleibt. ` +
      `Live und vor aller Augen entsteht Kunst – als Unterhaltung, die verbindet, und als Andenken, das den Anlass weiterleben lässt.\n\n` +
      `Erzählen Sie uns von ${eventLabel} – wir gestalten den Auftritt passend zu Stimmung, Gästen und Rahmen.`,
    benefitsTitle: `Warum ein ${skillTitle} zu ${eventLabel} passt`,
    benefits: [
      { title: 'Live-Erlebnis', text: `Beim Zuschauen, wie Kunst entsteht, kommen Ihre Gäste ins Gespräch und ins Staunen.` },
      { title: 'Persönliches Andenken', text: 'Statt Wegwerf-Deko bleibt ein Unikat, das an Ihren Anlass erinnert.' },
      { title: 'Passt zu Ihrem Rahmen', text: `Ob klein oder groß – der Auftritt wird auf ${eventLabel} abgestimmt.` },
    ],
  };
}

export function getSkillEventContent(
  skillSlug: string,
  eventSlug: string,
  skillTitle: string,
  eventLabel: string,
): SkillEventContent {
  return CONTENT[`${skillSlug}/${eventSlug}`] ?? fallbackContent(skillTitle, eventLabel);
}
