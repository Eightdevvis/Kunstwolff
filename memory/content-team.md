# Team (`/team/`)

**Stand:** neu am 2026-07-30.

Zwei Profile der Künstlerinnen hinter Kunstwolff, im Menü unter **„Über uns"**.

## Dateien

| Datei | Rolle |
| :-- | :-- |
| `src/pages/team.astro` | ganze Seite: Profildaten, Markup, Styles, JSON-LD (`Person`) |
| `public/img/team/gabriele-wolff.webp` | Portrait, 680 × 850 |
| `public/img/team/jenny-wolff.webp` | Portrait, 680 × 850 |
| `public/navigation/navigation.json` | Eintrag unter „Über uns" |
| `tests/team.test.ts` | Route, Reihenfolge, Bilder, Nav-Eintrag, srcset-Falle |

## Inhalt und Reihenfolge

**Gabriele Wolff zuerst** (Mutter), dann **Jenny Wolff**. Ausdrücklicher Wunsch
und aus dem Markup allein nicht erkennbar – deshalb als Test festgehalten.

Fachliche Aufteilung, so wie sie stimmen muss:

- Beide beherrschen **alle** Kunstformen von Kunstwolff.
- Gabriele: Schwerpunkt **Karikatur / Schnellzeichnen**.
- Jenny: Schwerpunkt **Malerei**, und sie ist die **Einzige**, die die eigentliche
  **Szenenmalerei** macht.

Die Profiltexte enthalten bewusst **keine** Jahreszahlen, Ausbildungen,
Auszeichnungen oder Kundennamen – nichts davon war belegt, und erfundene
Biografie-Angaben auf einer echten Firmenseite sind schlimmer als knappe.
Dasselbe gilt fürs JSON-LD: nur `name`, `jobTitle`, `image`, `worksFor`.

## Kein eigenes Datenformat

Die Profile stehen als `const profile` **im Seitenmodul**, nicht in einer JSON
unter `public/`. Zwei Datensätze, die sich selten ändern, rechtfertigen keinen
Manager im Admin-Tool. Kommt ein drittes Profil dazu, ist der Umzug nach
`public/team/team.json` + Manager der richtige Zeitpunkt – vorher nicht.

Folge: Textänderungen laufen über Git, nicht über den Admin. Bewusst so.

## Portraits: Ausschnitte aus vorhandenen Event-Fotos

Es gab keine eigenen Portraitaufnahmen. Beide Bilder sind Zuschnitte (`sharp`,
`extract` + `resize`, Qualität 86) aus dem Slide-Bestand:

| Ziel | Quelle |
| :-- | :-- |
| `gabriele-wolff.webp` | `img/slides/luxembourg/9_une-portraitiste-souriante-est-assise-devant-un-chevalet-en-luxembourg-et-dessine-un-portrait.webp` |
| `jenny-wolff.webp` | `img/slides/mediathek/hochzeitsmalerin-praesentiert-hochtzeitsgemaelde-mit-tanzendem-brautpaar-heitlinger-genusswelten-landkreis-karlsruhe.webp` |

⚠️ **Die Zuordnung der Personen wurde erschlossen, nicht abgelesen.** Kein
Dateiname im Repo nennt „Jenny" oder „Gabriele". Die Kette war:

1. Die junge Künstlerin mit hellem Bob erscheint durchgängig an Szenenmalerei
   (`frankfurt/6_szenenmalerin-…`, `mediathek/hochzeitsmalerin-präsentiert-…`) –
   und Szenenmalerei macht nur Jenny.
2. Die ältere Künstlerin ist in den Luxemburg-Fotos ausdrücklich als Künstlerin
   benannt (`caricaturiste assise à un chevalet`, `une portraitiste souriante`) –
   also die Karikaturistin, also Gabriele.

Wenn die Fotos je getauscht werden müssen: hier steht, worauf die Zuordnung
beruht.

## ⚠️ `img/team` bekommt KEINE Bildvarianten

`scripts/generate-image-variants.mjs` verarbeitet nur `img/slides`,
`img/Titelbild` und `img/why` (`quellen`). Deshalb liefert `team.astro`
**kein `srcset`** – ein angebotener, aber nicht erzeugter Kandidat lässt das Bild
leer, ohne zweiten Versuch (siehe `responsive-images.md`). Stattdessen sind die
Dateien schon in Anzeigegröße zugeschnitten (680 × 850, ~40 kB und ~97 kB).

Wer hier `srcset` ergänzen will, muss **zuerst** `img/team` in `quellen`
aufnehmen. `tests/team.test.ts` prüft genau diese Kombination.

## Navigation

Eintrag `{ "label": "Team", "url": "/team/" }` als **erstes** Kind von „Über uns"
(vor Referenzen und Partner). `navigation.json` wird ausschließlich per Git
gepflegt – das Admin-Tool hat dafür keinen Manager (siehe
`content-navigation.md`, `admin-tool.md`).

## Admin-Tool

**Kein Cross-Repo-Bedarf.** Neuer Ordner `public/img/team/`, aber kein neues
Format und kein Pfad, den der Admin liest oder schreibt. Der Bilder-Manager
arbeitet auf `img/slides`; `img/team` liegt außerhalb und soll dort auch nicht
auftauchen (sonst stünden die Portraits als Slides zur Auswahl).
