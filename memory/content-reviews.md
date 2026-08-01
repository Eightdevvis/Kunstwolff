# Reviews

## Ablage

```
public/reviews/_vorlage.md              # Vorlage (wird beim Einlesen übersprungen)
public/reviews/<stadt>/*.md             # Reviews, nach Stadt abgelegt
```

**Der Ordner entscheidet seit 2026-07-28 nichts mehr.** Er liefert beim Anlegen den
Ort-Tag (`scripts/sync-reviews-tags.mjs`), danach ist er reine Ablage – die Auswahl läuft
über `tags.landings`. Ein Review kann damit an **mehreren** Städten hängen, ohne als
Kopie zweimal im Repo zu liegen (gleiche Umstellung wie bei Bildern und FAQs).

Einen `public/reviews/default/`-Ordner gibt es nicht und gab es nie – der alte
Default-Zweig im Code lief also ins Leere und die Auffüllung sprang direkt zu fremden
Städten. „Allgemein" heißt jetzt: **kein** Ort-Tag.

Das Admin-Tool zieht seit 2026-08-01 nach: bei **(Standard)** liest der `ReviewManager`
alle Ordner und zeigt genau die Bewertungen ohne Ort-Tag – dieselbe Menge, die
`istAllgemein()` hier auswählt. Neu angelegte landen in `public/reviews/default/`,
aus dem `sync-reviews-tags.mjs` (`landingFromPath`) ausdrücklich **keinen** Ort ableitet;
der Ordner ist damit die vorgesehene Ablage für „gilt überall", falls er je entsteht.

## Format

```md
---
author: "Max Mustermann"
categories:
  - Schnellzeichner
rating: 5
tags:
  skills:
    - schnellzeichner
  events:
    - firmenfeier
  landings:
    - berlin
---
Das war ein großartiges Event.
```

## Frontmatter-Felder

| Feld | Pflicht | Zweck |
| :-- | :-- | :-- |
| `author` | ja | Name des Reviewers |
| `categories` | nein | Skill-Filter (Array, **Label**) |
| `rating` | nein | Sterne-Bewertung |
| `city` | nein | Überschreibt den Ordnernamen (Stadt-Zuordnung) |
| `tags` | faktisch ja | Objekt mit `skills` / `events` / `landings` – **die** Ortsauswahl läuft über `tags.landings`. Fehlt der Block, ergänzt ihn `scripts/sync-reviews-tags.mjs` beim nächsten Build |

**Body:** Der Review-Text – Pflicht.

## Auswahl- und Auffüll-Logik (`reviewsForLanding`, `src/utils/reviews.ts`)

- Die Website zeigt **mindestens 7 Reviews** pro Seite
- Reihenfolge der Quellen:
  1. Reviews mit passendem **`tags.landings`** (früher: passender Ordner)
  2. Reviews **ohne** Ort-Tag (= allgemein; ersetzt den nie existierenden `default/`-Ordner)
  3. Reviews anderer Orte (alphabetisch zirkulär um den aktuellen Ort, aus den
     **vergebenen Ort-Tags** statt aus den Ordnernamen – sonst käme ein Ort, den es nur
     per Tag gibt, in der Auffüllung nie vor)

⚠️ **Diese Kette gilt nicht für jede Seite.** `reviewsForLanding` wird nur über
`getReviewsByLandingAndSkill` erreicht, und das ruft genau eine Stelle auf: die
Skill×Ort-Kombiseiten (`[...kombi].astro`). Startseite und Stadtseiten rendern
`HomepageReviews.astro`, das `getAllReviews()` **ungefiltert** durchreicht (alle, Stand 2026-08-01: 41),
`[skill].astro` ebenso. Minimum 7 und Auffüllung greifen also nur auf den Kombiseiten.
Der zweite Export `getReviewsByLanding` hat derzeit gar keinen Aufrufer.

## Filter

Auf den **Kombiseiten** zählen `categories` **oder** `tags.skills` (`filterBySkill`).
Beide zu prüfen kostet nichts und verhindert, dass ein Review durchfällt, dessen
Tag-Block noch fehlt.

⚠️ Der Filter der **Skill-Seiten** ist ein anderer: er sitzt in `MiniReviews.astro`
(`filteredCategories`, gesetzt von `SkillHero`/`SchnellzeichnerHero`) und prüft
**nur** `review.categories`, zeichengenau gegen den Skill-**Titel**. Ein Review, dessen
Skill allein im Tag-Block steht, fällt im Hero durch. Das ist derselbe Label-Rest, der
auch die Kombi-Slideshow noch am `categories`-Spiegel hängen lässt (`tag-system.md`).

## Warum die Umstellung nichts verlieren konnte

Vorher gemessen und als Test festgehalten (`tests/content-tags.test.ts`): **alle 38 Reviews**
tragen den Ort-Tag ihres Ordners, keine Datei weicht ab. Die Tag-Auswahl ist damit eine
Obermenge der Ordner-Auswahl. Zusätzlich nach dem Build geprüft: über **39 Landing-Seiten**
`dist` gegen die Live-Seite verglichen – kein einziger Review-Autor verschwunden.

(Die früher notierten „74 Review-Dateien" waren inklusive 36 `_vorlage.md`; echte Reviews: 38.)

## Anzeige (MiniReviews.astro)

`src/components/reviews-references/MiniReviews.astro` zeigt immer genau **einen** Review als
Slide: Das aktive `.review-slide` ist `display:flex` (`.is-active`), alle anderen sind
`display:none` und nehmen keinen Platz weg (kein absolutes Stapeln). Die Höhe ergibt sich
allein aus dem sichtbaren Review im normalen Fluss – **kein JS-Höhenmessen, kein
`track.style.height`, keine `transition: height`**. `.review-track` hat nur `width:100%`.
Slide-Wechsel togglet lediglich die `is-active`-Klasse (mit `review-fade-in`-Opacity-Animation),
`applyReviewTheme` (Hell/Dunkel aus dem Hintergrund) läuft initial und bei `resize`.

**Seit Umbau: manuelles Durchklicken, KEIN Autoplay mehr** (vorher `setInterval` alle 4,5 s).
Steuerung pro Rotator via zwei Pfeilen (`.review-prev`/`.review-next`, direkt unter dem Review)
und Pfeiltasten links/rechts. Bewusst **keine** Positions-Punkte/Dots. Das `<script>` ist Astro-hoisted (läuft einmal global) und
iteriert über alle `[data-review-rotator]` – Controls sind pro Rotator gescoped. Bei ≤1 Slide
werden keine Controls gerendert (`filteredItems.length > 1`). Theme (hell/dunkel) wird weiter
automatisch aus dem Hintergrund abgeleitet (`data-review-theme`).

## Admin-Tool

ReviewManager schreibt nach `public/reviews/<city>/review*.md`. Der Manager zeigt seit dem
Umbau eine **Erklär-Infobox** (sky-farben), die die Fallback-/Auffüll-Logik im UI sichtbar
macht (vorher null Kontext beim leeren `default`-Streifen).


## Auswahl je Seitenart (2026-07-31)

| Seite | Funktion | Vorher |
| :-- | :-- | :-- |
| Startseite | `getAllReviews()` | unverändert, alle 38 |
| Stadtseite | `getReviewsByLanding(slug)` | **alle 38** – die Funktion hatte null Aufrufer |
| Anlass-Seite | `getReviewsByEvent(slug)` | gab es nicht, Seite hatte keinen Review-Block |
| Skill × Stadt | `getReviewsByLandingAndSkill` | unverändert |

`[landing].astro` reichte `homepageReviews: {}` durch; `HomepageReviews.astro`
holte sich daraufhin selbst den kompletten Bestand. `/berlin/` und `/trier/`
zeigten dieselben 38 Bewertungen, der Ort-Tag hatte nirgends eine Wirkung.
Gemessen nach der Reparatur: berlin 7, trier 7 (die eigenen), saarland 8,
Startseite 38.

**Auffüllung hat einen Deckel.** `minLandingReviews = 7` ist ein Minimum, kein
Freibrief: eigene Treffer bleiben vollständig, aufgefüllt wird nur bis zum
Minimum. Ohne den Deckel zeigte `/hochzeit/` 36 von 38 Bewertungen — 33 tragen
keinen Anlass-Tag und gelten damit überall.

**Der Review-Block auf Anlass-Seiten ist neu** und steht in
`public/config/components.json` unter `event._default._order`. Eine Zeile dort
raus nimmt ihn wieder weg.


## `tagOnly` — der Schalter pro Bewertung (2026-07-31)

Bewertungen folgen **absichtlich nicht** der strengen Regel von FAQs und
Bildern (Entscheidung Sasha). Sie sind unspezifischer — „nett, schnell, tolles
Bild" passt überall — und eine Stadtseite ohne eigene Bewertungen soll keinen
leeren Slider zeigen. Deshalb dürfen sie fremde Seiten auffüllen. Ohne das
stünden heute 9 Städte ohne Bewertungen da.

Neues Frontmatter-Feld:

```yaml
tagOnly: true    # erscheint nur da, wo ihr Tag sitzt
```

- **Fehlt das Feld → frei.** Das ist der Standard und das bisherige Verhalten
  aller 38 Dateien. Nur ein ausdrückliches `true` beschränkt; `false`,
  Tippfehler oder ein String zählen als frei — der Standard darf nicht von
  einem kaputten Wert abhängen.
- `darfAuffuellen()` greift in **allen drei** Auffüll-Schritten (allgemein,
  fremder Ort, anlassneutral) und **nie** beim eigenen Treffer: wo der Tag
  sitzt, erscheint die Bewertung immer.
- Gedacht für alles Ortsgebundene („die Location in Trier war perfekt"), das
  auf einer Berliner Seite peinlich wäre.

**Cross-Repo:** Der `ReviewManager` hat dafür eine Checkbox („Nur da zeigen, wo
der Tag sitzt"). Sie schreibt einen **echten Boolean** — dafür musste
`markdown.ts` im Admin Booleans lernen, sonst wäre `tagOnly: "true"` als String
in der Datei gelandet und die Website prüft `=== true`. Abwählen **löscht** das
Feld, statt `false` zu schreiben.
