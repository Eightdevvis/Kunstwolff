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

`GALERIE_URL` in `src/utils/gallery.ts` ist die **eine** Quelle des Pfads
(`/galerie/`). Die Slideshow verlinkt darüber, ein Test prüft ihn gegen die
vorhandenen Routen – ein getippter Pfad war schon einmal ein site-weiter 404
(WEB-001: Link `/faq`, Route hieß `/FAQ`).

`/gallerie/` (doppeltes l, die naheliegende Fehlschreibung) ist in
`astro.config.mjs` als `redirects` auf `/galerie/` gelegt. Astro baut daraus eine
`noindex`-Seite mit Meta-Refresh; die Sitemap enthält nur `/galerie/`.

## Verlinkung

Der Link steht in **`Slideshow.astro`**, unterhalb des Sliders – und damit unter
JEDEM „Unsere Kunst"-Banner: Startseite, Skill-, Stadt- und Event-Seiten
(gemessen 162 Seiten). Er gehört bewusst in die Komponente und nicht in die
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

Das Gitter nutzt `GALLERY_SIZES` (`responsiveImages.ts`), **nicht**
`SLIDESHOW_SIZES`: Kacheln sind ~220–300 px breit, die Slideshow-Bühne ~700 px.
Mit den Slideshow-Werten lüde jede der ~230 Kacheln die große Variante. Ein Test
hält die beiden auseinander.

## Lightbox

Gemeinsam mit der Slideshow, siehe `content-slides.md` → Lightbox.

## Admin-Tool

**Kein Cross-Repo-Bedarf.** Die Galerie liest nur, was Bilder-Manager und
Tag-Chips ohnehin schreiben (`slides.meta.json`, `config/tags.json`). Kein neues
Format, kein neuer Schreibpfad. Was im Admin getaggt wird, wirkt hier ohne
weiteres Zutun.
