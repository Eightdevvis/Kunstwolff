# Galerie (`/galerie/`)

**Stand:** neu am 2026-07-30.

Eine Seite mit dem **vollständigen** Bildbestand, filterbar über Tag-Chips und
durchsuchbar. Vorbild ist `/faq/`: eine Seite, die den kompletten Inhalt eines
Typs zeigt, mit Suchfeld und Chips davor.

## Warum

Jede Slideshow zeigte nur einen Ausschnitt – die Startseite die kuratierte
Auswahl aus `default-selection.json`, Stadt- und Event-Seiten die Bilder mit dem
passenden Tag (`getSlidesByTag`, siehe `tag-system.md`). Den gesamten Bestand
konnte niemand sehen, obwohl er seit Phase 5b durchgängig beschriftet ist.

## Dateien

| Datei | Rolle |
| :-- | :-- |
| `src/pages/galerie.astro` | Seite, JSON-LD (`ImageGallery`), liest die Daten und gibt sie als Prop weiter |
| `src/components/Gallery.astro` | Oberfläche: Suchfeld, Chips, Gitter, Client-Filter |
| `src/utils/gallery.ts` | Auswahl-/Anzeigelogik, `GALERIE_URL`, Chip-Aufbau, Labels |
| `src/utils/slideImages.ts` | neu: `getAllSlidesWithTags()` |
| `tests/gallery.test.ts` | Route, Chip-Invarianten, Labels, `sizes` |

## URL

`GALERIE_URL` in `src/utils/gallery.ts` ist die Quelle des Pfads (`/galerie/`) für
den Slideshow-Link, und ein Test prüft ihn gegen die vorhandenen Routen – ein
getippter Pfad war schon einmal ein site-weiter 404 (WEB-001: Link `/faq`, Route
hieß `/FAQ`).

⚠️ **Zwei Handeingaben gibt es trotzdem noch:** das JSON-LD in `galerie.astro`
(`${site}/galerie/` – die Seite importiert `GALERIE_URL` gar nicht) und der
Textlink in `team.astro`. Wer den Pfad ändert, muss beide mitziehen.

`/gallerie/` (doppeltes l, die naheliegende Fehlschreibung) ist in
`astro.config.mjs` als `redirects` auf `/galerie/` gelegt. Astro baut daraus eine
`noindex`-Seite mit Meta-Refresh; die Sitemap enthält nur `/galerie/`.

## Verlinkung

Der Link steht in **`Slideshow.astro`**, unterhalb des Sliders – und damit unter
JEDEM „Unsere Kunst"-Banner: Startseite, Skill-, Stadt- und Event-Seiten. Gemessen
am aktuellen Build sind das **118 von 172** HTML-Seiten – nicht alle, weil der
Leer-Guard in `Slideshow.astro` Sektion **und** Link auf Seiten ohne passende
Bilder gar nicht erst rendert (allein die 39 `aquarelle/*`-Seiten fallen so weg).
Er gehört bewusst in die Komponente und nicht in die
einzelnen Seiten, sonst fehlt er beim nächsten neuen Seitentyp.

## Auswahl-Logik

`getAllSlidesWithTags()` liefert **alles**, ohne Vorauswahl – `enabled: false`
bleibt ausgesiebt (der Admin-Schalter muss auch hier wirken). Gefiltert wird im
**Browser**:

- Ein aktiver Tag **pro Dimension**, Dimensionen mit **UND** verknüpft – dieselbe
  Semantik wie `matchesFAQContext` und `getSlidesByTag`. „Szenenmaler" +
  „Hochzeit" + „Trier" heißt genau das.
- Klick auf den aktiven Chip hebt den Filter auf, „Alle" setzt die Dimension zurück.
- Das Suchfeld prüft `data-search`: Alt-Text, Titel, Metadaten-Key (Dateipfad) und
  alle Tag-Slugs **plus deren Labels**. Ohne die Labels fände „Köln" nichts, weil
  der Slug `koeln` heißt – und genau die ausgeschriebene Form tippt ein Besucher.

**Warum nicht serverseitig:** das wären 3 Dimensionen × ~50 Tags als je eigene
gebaute Seite (plus Kombinationen), nur damit jemand zwei Chips klicken kann. Der
Bestand (~230 Bilder) passt auf eine Seite; die Bytes holt der Browser über
`loading="lazy"` erst beim Scrollen.

## Oberfläche: eingeklappte Filter + Mosaik (2026-07-30, zweiter Durchgang)

Die erste Fassung hatte zwei Fehler in der Anmutung, beide von Jenny gemeldet:

**1. Filter fraßen den ersten Viewport.** Suchfeld und drei Chip-Reihen standen
offen untereinander – der Ort allein hat 20+ Chips. Man landete auf einer
Bilder-Seite, ohne ein Bild zu sehen.

Jetzt: eine schmale Reihe aus vier `<details>`-Pillen (Suche, Kunstform, Anlass,
Ort), alle **zu**. Aufgeklappt nimmt eine Pille die volle Breite
(`flex: 1 0 100%`), sonst wäre ihr Inhalt auf Pillenbreite eingesperrt.

- `<details>` statt eigenem Zustand: Verhalten kommt vom Browser, geht ohne JS
  und ist per Tastatur bedienbar.
- **Bewusst ohne `name`-Attribut**: ein exklusives Akkordeon würde beim Öffnen
  eines Tag-Panels die gerade getippte Suche zuklappen.
- Ein aktiver Filter steht **in der zugeklappten Pille** (`Ort · Trier`, Pille
  wird golden). Ohne das wäre er unsichtbar und die Galerie sähe einfach
  unvollständig aus.
- Ein **Zurücksetzen**-Knopf erscheint, sobald etwas filtert. Bei zugeklappten
  Panels wäre der Weg zurück sonst: jedes Panel einzeln öffnen und „Alle" suchen.

**2. Bilder zu klein und beschnitten.** Das Gitter zwang jedes Bild in 4:3 mit
`object-fit: cover` – bei jedem Hochformat fehlte Kopf oder Signatur.

Jetzt: **Mosaik über `column-count`** (3 Spalten, ab 900px 2). Jedes Bild behält
sein Seitenverhältnis, nichts wird beschnitten, und eine Spalte ist bei 1200px
Container rund 390px breit statt 220.

- **Nicht** `grid-template-rows: masonry` – noch nicht überall verfügbar, und der
  Fallback wäre wieder das beschnittene Gitter.
- Preis: die Reihenfolge läuft spaltenweise von oben nach unten statt zeilenweise.
  Für eine Galerie ohne Rangfolge kein Verlust.
- `.gallery-tile` ist `inline-block` mit voller Breite, sonst reißt eine Kachel
  am Spaltenumbruch auseinander.

### Dafür nötig: die Bildhöhe

`src/utils/webpSize.ts` liest seit diesem Umbau **beide** Maße
(`readWebpSize` → `{width, height}`). `SlideItem` hat entsprechend ein `height`.
Den Wrapper `readWebpWidth` gibt es noch, er hat aber **keinen Produktiv-Aufrufer
mehr** – `buildSrcSet` und der Slide-Reader lesen direkt `readWebpSize(...)?.width`;
benutzt wird er nur noch von `tests/responsive-images.test.ts`.

⚠️ Das ist keine Kosmetik: ohne `width`/`height` am `<img>` kennt der Browser
das Seitenverhältnis erst nach dem Laden. Bei ~230 lazy geladenen Bildern in
Spalten springt die Seite dann beim Scrollen dauernd. Fehlt ein Maß, wird
**keines** ausgegeben – ein halbes Paar ergäbe ein falsches Verhältnis.

Tests dazu in `tests/gallery.test.ts`: beide Maße zu jedem Bild, nur paarweise,
plausible Verhältnisse, und es müssen **Hoch- UND Querformate** vorkommen
(sonst wäre das Mosaik sinnlos – und ein Header-Leser-Fehler „Höhe = Breite"
sähe genau so aus). Stand 2026-08-01: 98 quer, 131 hoch, 9 quadratisch – zusammen
die 238 Bilder, die `getAllSlidesWithTags()` damals lieferte, alle mit beiden Maßen.
Der Bestand wächst laufend (Stand Nachmittag: 266 Metadaten-Einträge) – die Verteilung
ist der Punkt, nicht die Summe.

## Chips kommen aus dem BESTAND, nicht aus dem Vokabular

Gezählt wird, was an Bildern hängt; `config/tags.json` liefert nur die
Beschriftung. Das ist kein Detail:

- Das Vokabular **entfernt nie** einen Tag (siehe `tag-system.md`). Käme die
  Chip-Liste daraus, führte jeder verwaiste Tag – etwa eine aus `landings.md`
  entfernte Stadt – in eine leere Galerie.
- Umgekehrt wäre ein Tag an einem Bild, der im Vokabular fehlt, nicht anklickbar.

Beide Richtungen sind als Test festgenagelt.

## Labels

`tagLabel(slug, vokabularLabel)`, Rangfolge:

1. Label aus `tags.json`, **wenn es sich vom Slug unterscheidet** (dann ist es
   gepflegt – Jenny kann es im Admin geändert haben).
2. Ausnahmeliste `LABEL_AUSNAHMEN` in `gallery.ts`.
3. Titelfall des Slugs, Bindestriche bleiben (`rhein-main-gebiet` →
   `Rhein-Main-Gebiet`).

Schritt 2 existiert, weil Ort-Slugs Umlaute **ausschreiben** (`koeln`,
`saarbruecken`) und `landings.md` als Label nur den kleingeschriebenen Slug
liefert. Die Abbildung ist **nicht umkehrbar**: eine generische Regel `ue → ü`
würde aus `neuwied` ein `neüwied` machen. Deshalb kurze, ausdrückliche Liste
statt Ratens – mit Test.

Neue Stadt mit Umlaut → Eintrag in `LABEL_AUSNAHMEN` ergänzen (oder das Label im
Admin setzen, das gewinnt ohnehin).

## Chip-Sortierung

- Kunstform (`skills`) und Anlass (`events`): Vokabular-Reihenfolge, die ist
  kuratiert (Seeds aus `skills.json`/`events.json` zuerst).
- Ort (`landings`): alphabetisch – eine Liste mit 20+ Städten ist zum Suchen da.

## Bilder ohne Tag

Derzeit ~24 Bilder tragen keinen Tag (u. a. `mediathek/somfot/`, darin auch ein
Logo). Sie sind über die Chips **nicht** erreichbar, nur über „Alle" und die
Suche; die Seite weist die Zahl unten aus. Wer ein Bild aus der Galerie
herausnehmen will, setzt im Admin `enabled: false` – das ist der vorhandene
Schalter, kein neuer.

## `srcset`

Das Mosaik nutzt `GALLERY_SIZES` (`responsiveImages.ts`), **nicht**
`SLIDESHOW_SIZES`: eine Spalte ist ~390 px breit, die Slideshow-Bühne ~700 px.
Mit den Slideshow-Werten lüde jede der ~230 Kacheln die große Variante. Ein Test
hält die beiden auseinander.

⚠️ `GALLERY_SIZES` muss zu den **Spaltenzahlen in `Gallery.astro`** passen (bis
900 px zwei Spalten, darüber drei). Wer die Spalten ändert, ändert auch die
`sizes` – sonst lädt jede Kachel die falsche Stufe, und das sieht man dem
Ergebnis nicht an.

## Lightbox

Gemeinsam mit der Slideshow, siehe `content-slides.md` → Lightbox.

## Admin-Tool

**Kein Cross-Repo-Bedarf.** Die Galerie liest nur, was Bilder-Manager und
Tag-Chips ohnehin schreiben (`slides.meta.json`, `config/tags.json`). Kein neues
Format, kein neuer Schreibpfad. Was im Admin getaggt wird, wirkt hier ohne
weiteres Zutun.
