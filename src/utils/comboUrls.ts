/**
 * Adressen der Kombi-Seiten – an genau einer Stelle festgelegt.
 *
 * Es gibt zwei Kombi-Typen, und sie sehen seit dem 01.08.2026 **verschieden** aus:
 *
 * | Typ          | Adresse                                | Beispiel                              |
 * | :--          | :--                                    | :--                                   |
 * | Skill × Ort  | `/{ort}-{skill}/`      (flach)         | `/berlin-schnellzeichner-karikaturist/` |
 * | Skill × Anlass | `/{skill}/{anlass}/` (hierarchisch)  | `/schnellzeichner-karikaturist/hochzeit/` |
 *
 * **Warum flach bei Orten:** Wunsch der Auftraggeberin. Es kostete nichts, weil
 * zum Zeitpunkt der Umstellung *alle* 102 Skill×Ort-Seiten auf `noindex` standen
 * und die Seite noch gar nicht live war (Wix lief noch) – es gab kein Ranking,
 * das man hätte verlieren können. Ein Schlüsselwort in der URL ist ohnehin ein
 * schwaches Signal; was diese Seiten ausbremst, ist der duplizierte Text.
 * Begründung und Messung: `memory/seo.md`.
 *
 * **Warum die Anlass-Seiten NICHT mitgeflacht wurden:** Das sind die einzigen
 * 8 Kombi-Seiten, die indexierbar sind. Gewünscht war die Umstellung für Orte;
 * an den acht sichtbaren ohne Auftrag zu drehen wäre eine stille Ausweitung.
 *
 * ⚠️ **Die Falle, die diese Datei verhindert:** `page-visibility.json` blendet
 * per **Präfix** aus – wer `/aquarelle/` versteckt, versteckt auch
 * `/aquarelle/berlin/`. Bei einer flachen Adresse greift diese Regel **nicht
 * mehr**: `/berlin-aquarelle/` fängt nicht mit `/aquarelle/` an. Die Einträge
 * mussten deshalb mit umgeschrieben werden. Wer hier das Format ändert, muss
 * `public/config/page-visibility.json` mitziehen – sonst werden 34 bewusst
 * versteckte Seiten stillschweigend wieder indexierbar und landen in der
 * Sitemap. Festgehalten in `tests/combo-urls.test.ts`.
 */

/** `/schnellzeichner-karikaturist/` → `schnellzeichner-karikaturist` */
export const skillSlugFromLink = (link: string): string =>
  String(link ?? '').replace(/^\/+|\/+$/g, '');

/** Ort-Kombi, ohne Schrägstriche: `berlin-schnellzeichner-karikaturist` */
export const cityComboSlug = (skillSlug: string, citySlug: string): string =>
  `${citySlug}-${skillSlug}`;

/** Ort-Kombi als Adresse: `/berlin-schnellzeichner-karikaturist/` */
export const cityComboPath = (skillSlug: string, citySlug: string): string =>
  `/${cityComboSlug(skillSlug, citySlug)}/`;

/** Anlass-Kombi als Adresse: `/schnellzeichner-karikaturist/hochzeit/` */
export const eventComboPath = (skillSlug: string, eventSlug: string): string =>
  `/${skillSlug}/${eventSlug}/`;

/**
 * Die frühere, hierarchische Ort-Adresse.
 *
 * Wird nur noch für die 301-Weiterleitungen in `vercel.json` und für das
 * Umschreiben alter Einträge gebraucht – nicht mehr zum Verlinken.
 */
export const legacyCityComboPath = (skillSlug: string, citySlug: string): string =>
  `/${skillSlug}/${citySlug}/`;
