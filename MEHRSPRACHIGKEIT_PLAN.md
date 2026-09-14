# Mehrsprachigkeit – Planung und Durchführung

**Anlass:** Die englische Fassung von kunstwolff.de wird gebraucht, jetzt wo die Seite richtig live ist.
**Anspruch:** Nicht „Englisch dazubauen", sondern ein **Skelett**, in das jede weitere Sprache eingehängt wird, ohne dass die Arbeit sich wiederholt.
**Zweiter Teil:** Ein **Content-Sprach-Umschalter im Admin** – die Oberfläche bleibt deutsch, aber Gabriele wählt aus, *welche Sprachfassung der Website* sie gerade bearbeitet.

> **Status dieses Dokuments: Planung. Es wurde kein Code geändert.**
> Alle Fundstellen sind mit `datei:zeile` belegt und am echten Code geprüft, nicht aus der Doku übernommen.

---

## Inhalt

1. [Wie dieses Dokument entstanden ist](#1-wie-dieses-dokument-entstanden-ist)
2. [Kurzfassung](#2-kurzfassung)
3. [Ausgangslage: was heute wirklich existiert](#3-ausgangslage-was-heute-wirklich-existiert)
4. [Die Blocker – was vor allem anderen repariert werden muss](#4-die-blocker--was-vor-allem-anderen-repariert-werden-muss)
5. [Das Skelett: Zielarchitektur für N Sprachen](#5-das-skelett-zielarchitektur-für-n-sprachen)
6. [Der Admin-Sprach-Umschalter](#6-der-admin-sprach-umschalter)
7. [Architektur-Entscheidungen](#7-architektur-entscheidungen)
8. [Arbeitspakete und Reihenfolge](#8-arbeitspakete-und-reihenfolge)
9. [Checkliste: eine neue Sprache aufnehmen](#9-checkliste-eine-neue-sprache-aufnehmen)
10. [Tests und Schutzgeländer](#10-tests-und-schutzgeländer)
11. [Bewusst nicht geplant](#11-bewusst-nicht-geplant)
12. [Offene Fragen](#12-offene-fragen)
13. [Anhang A: Befundregister](#anhang-a-befundregister)
14. [Anhang B: Methodik und Lücken](#anhang-b-methodik-und-lücken)

---

## 1. Wie dieses Dokument entstanden ist

Vierzehn parallel arbeitende Prüfer haben den Bestand rein lesend aufgenommen: zehn Inventar-Achsen (Loader, Routen, UI-Strings, Content, SEO, Admin-Kern, Admin-Manager, Build/Sync/CI, Tags/Medien, Sektions-Sichtbarkeit), drei adversarische Gegenprüfer und eine Synthese. Zusammen 596 Werkzeugaufrufe über beide Repos.

Die Gegenprüfer hatten ausdrücklich den Auftrag, die Inventar-Befunde zu **widerlegen**. Das hat sich gelohnt: 14 Behauptungen wurden am Code widerlegt oder präzisiert, und drei der schwersten Blocker in diesem Dokument stammen aus der Gegenprüfung, nicht aus dem Inventar. Wo Befunde sich widersprachen, steht unten die am Code belegte Fassung.

**Zahlen mit Vorsicht:** Verschiedene Prüfer haben `public/`-Literale im Admin unterschiedlich gezählt (61 / 119 / 156 Treffer in 21–29 Dateien), je nachdem ob Kommentare, Tests und Templates mitzählen. Die Größenordnung ist belastbar, die exakte Zahl nicht. Wo unten eine Spanne steht, ist sie so gemeint.

---

## 2. Kurzfassung

### Was gut ist

Das i18n-Fundament aus Phase 1 (`src/i18n/config.ts`) ist **richtig entworfen und trägt N Sprachen bereits**. `LOCALE_META` ist als `Record<Locale, …>` typisiert – eine neue Sprache in `LOCALES` erzwingt per TypeScript den Meta-Eintrag. `PREFIXED_LOCALES` ist abgeleitet statt aufgezählt. Der Test `tests/i18n-pfade.test.ts` iteriert über `LOCALES` statt über `'de'`/`'fr'` zu prüfen.

Das Overlay-Prinzip – übersetzte Inhalte unter `public/i18n/<locale>/` spiegeln `public/` – ist ebenfalls tragfähig und risikoarm: die deutschen Pfade werden nie angefasst.

**Die Zweisprachigkeits-Annahmen sitzen nicht in der Registry, sondern rundherum:** in den Routendateien, den Sperrlisten, den Admin-Pfaden und den Sync-Skripten.

### Was fehlt

Phase 1 ist ein **Machbarkeitsnachweis, keine halbfertige Sprache**. Belegt an einer Sprache und einer Seite (`/fr/belgique/`). Konkret:

| Bereich | Locale-fähig | Nicht locale-fähig |
| :-- | --: | --: |
| Loader (`src/utils/`) | 3 von 30 | 27 |
| Sync-Skripte (`scripts/`) | 1 von 26 | 25 |
| Seiten mit Sprach-Umschalter | 2 von 169 | 167 |
| Admin-Dateien mit Sprachbegriff | 0 | alle |

Und: **rund 265 deutsche Zeichenketten stehen im Code statt in `public/`**. Das ist kein theoretisches Risiko, das ist bereits live. `/fr/belgique/` liefert heute unter `<html lang="fr">` deutsche Navigation, deutschen Footer, „Häufige Fragen (FAQ)", „Anfrage senden", „Datum des Events" und das komplette deutsche Kontaktformular. 21 der 22 internen Links auf dieser Seite führen zurück ins Deutsche.

### Was jetzt zu tun ist

**Der Reihe nach, und Reihenfolge ist hier keine Geschmacksfrage** (Begründung in [Abschnitt 8](#8-arbeitspakete-und-reihenfolge)):

1. **Erst reparieren, was heute schon falsch ist.** Vier Blocker betreffen den deutschen Bestand, nicht Englisch. Einer davon veröffentlicht bereits Seiten, die Deutsch bewusst zurückhält. Einer zerstört bei jedem Tastendruck Redaktionsdaten.
2. **Dann das Skelett bauen** – UI-Wörterbuch, einheitlicher Fallback, `[locale]`-Route, lokalisierte interne Links. Das ist die einmalige Investition.
3. **Dann Englisch als erste Sprache durch das Skelett schieben.**
4. **Parallel dazu der Admin-Umschalter**, der ohne zentrale Pfadschicht ein Umbau quer durch alle Manager wäre.

**Ehrliche Erwartung:** Der Weg zu einer englischen Seite, die keine deutschen Wortfetzen zeigt, ist deutlich länger als „Texte übersetzen". Der Übersetzungsaufwand (~9.000 Wörter) ist der kleinere Teil. Der größere Teil ist, dass 27 Loader, 25 Skripte und der komplette Admin heute nicht wissen, dass es Sprachen gibt.

### Zwei Funde, die nichts mit Englisch zu tun haben

Beim Audit sind zwei Dinge aufgefallen, die **unabhängig von diesem Vorhaben** repariert gehören:

- **Datenverlust im Startseiten-Texte-Tab.** `SiteTextsManager.tsx:35-41` reduziert die geladene `content.json` beim Speichern auf `{contact, eventtypes, why}`. Jeder Tastendruck in diesem Tab löscht damit die 34 `landingHeadings` und 4 `landingIntros` aus `public/site-texts/content.json` – also alle per Admin und per KI-Chat gepflegten Überschriften und Einführungstexte. Sichtbar ist nur „1 ungespeicherte Änderung".
- **Die Doku glaubt, die Seite sei nicht live.** `CUTOVER_PLAN.md`, `ARBEITSLISTE.md` und `memory/seo.md` behaupten übereinstimmend, der DNS-Weg sei gescheitert. Tatsächlich liefert `www.kunstwolff.de` Vercel, der Apex leitet mit 308 auf `www`, und `robots` steht auf `index, follow`. Der Cutover ist passiert.

---

## 3. Ausgangslage: was heute wirklich existiert

### 3.1 Der Seitenbestand

169 echte Routen aus 17 Seiten-Dateien:

| Seitentyp | Anzahl | Quelle |
| :-- | --: | :-- |
| Ort × Skill / Skill × Anlass (Kombis) | 114 | `src/pages/[...kombi].astro` |
| Stadt-/Regionsseiten | 38 | `src/pages/[landing].astro` |
| Statische Standalone-Seiten | 12 | je eigene `.astro` |
| Skill-Seiten | 3 | `src/pages/[skill].astro` |
| Startseite | 1 | `src/pages/index.astro` |
| **Fremdsprachig** | **1** | `src/pages/fr/[landing].astro` |

**129 der deutschen Pfade stehen bewusst auf `noindex`** (`public/config/page-visibility.json`) – der Großteil der Kombiseiten ist absichtlich unsichtbar. Das ist für den Umfang der englischen Fassung entscheidend: volle Parität hieße, Seiten zu übersetzen, die niemand sehen soll.

### 3.2 Das i18n-Fundament

`src/i18n/config.ts` ist die eine Quelle:

| Export | Zweck | N-tauglich? |
| :-- | :-- | :-- |
| `DEFAULT_LOCALE` | `'de'`, bleibt unpräfigiert | ja |
| `LOCALES` | `['de', 'fr']` | ja, aber Code-Konstante |
| `LOCALE_META` | Label, hreflang, htmlLang | ja (typerzwungen) |
| `PREFIXED_LOCALES` | abgeleitet | ja |
| `localizePath(locale, slug)` | URL-Bau | ja |
| `localeContentRoot(locale)` | `de` → `public/`, sonst Overlay | ja |
| `resolveLocalizedFile` / `resolveLocalizedDir` | Overlay mit Rückfall | ja, aber uneinheitlich benutzt |
| `getTranslatedLandingSlugs(locale)` | Slug-Registry je Sprache | **nur Landings** |
| `getAvailableLocalesForSlug(slug)` | für den Umschalter | **nur Landings** |

**Die Registry trägt N Sprachen. Alles darum herum nicht.**

### 3.3 Vier Schichten, die heute vermischt sind

Der wichtigste Ordnungsgedanke dieses Plans: Inhalte zerfallen in vier Schichten mit **völlig unterschiedlichem Sprachverhalten**. Heute liegen sie teils in denselben Dateien, und genau daraus entstehen die meisten Risiken.

| Schicht | Was | Verhalten | Beispiele |
| :-- | :-- | :-- | :-- |
| **S – Struktur** | Identität und Beziehungen | **Nie pro Sprache forken.** Eine Wahrheit für alle. | Slugs, Tag-Slugs, `components.json` `_order`, `page-visibility.json`, `enabled`/`priority`, Bildpfade |
| **N – Sprachneutral** | Binärdaten | **Nie duplizieren.** Gemeinsame Quelle. | 355 Bilder, Fonts, Referenzlogos, `calendar/` |
| **C – Content** | Redaktioneller Text | **Overlay pro Sprache**, von Gabriele pflegbar | FAQ-Texte, Why-Texte, `site-texts`, Reviews, Bild-`alt`/`title`, Tag-**Labels** |
| **U – Interface** | Text im Code | **Wörterbuch pro Sprache**, von Entwicklern gepflegt | Buttons, Formularlabels, aria-labels, Breadcrumb-Namen, Seitentitel-Vorlagen |

**Das heutige Problem in einem Satz:** Es gibt für S/N eine korrekte Regel (nicht forken), für C ein funktionierendes Overlay – und für U überhaupt nichts. Deshalb ist `/fr/belgique/` halb deutsch.

**Die gefährliche Vermischung:** `partners.json`, `events.json`, `cinema.json`, `skills.json`, `slides.meta.json`, `tags.json` und die vier Why-Seiten-`content.json` enthalten **S und C im selben Objekt**. Ein naives „ganze Datei ins Overlay kopieren" erzeugt dort eine zweite Wahrheit über Struktur, die beim nächsten deutschen Edit lautlos auseinanderläuft.

### 3.4 Der Übersetzungsumfang

| Content-Typ | Bestand | Wörter (ca.) | Schicht |
| :-- | --: | --: | :-- |
| `faq/**` | 87 MD | 3.100 | C |
| `why/*.json` | 38 Dateien | 2.650 | C |
| `reviews/**.md` | 41 echt + 35 Vorlagen | 1.750 | C |
| 4 Standalone-Seiten | 4 `content.json` | 1.220 | C |
| `site-texts/content.json` | 1 Datei | ~500 | C |
| **UI-Strings im Code** | ~265 Strings | ~800 | **U** |
| **Summe je Sprache** | | **~10.000** | |

Zum Vergleich: das **heutige FR-Overlay umfasst 7 Dateien mit 606 Wörtern** – rund 5 % dessen, was eine vollwertige Sprache braucht.

Sprachneutral und niemals zu duplizieren: alle 355 Bilder, `config/components.json`, `config/page-visibility.json`, `img/Titelbild/title.meta.json`, `img/slides/default-selection.json`, `landings/landings.md` (reine Slugs), `img/referenzenLogos/` und `public/calendar/**` – letzteres wird von `src/` nachweislich gar nicht gelesen und ist reines Admin-Datenmaterial.

### 3.5 Der Admin

Ein Grep über `kunstwolff-admin/src/` nach `i18n|locale|Sprache` liefert **exakt zwei Treffer, beide `toLocaleDateString('de-DE')`**. Das Admin-Tool hat null Sprachbewusstsein.

Zwei Nadelöhre existieren aber, und das ist die gute Nachricht:

- **Lesen:** `services/github.ts` `getFile` / `listDirectory` / `getFileRespectingDraft` – ca. 71 Aufrufe
- **Schreiben:** `services/state.ts` `addPendingFile(path, …)` – 44 Aufrufstellen

Der Worker erlaubt bereits **jeden** Schreibpfad unterhalb `public/` (`worker/src/security.ts:84`, `:118-121`). `public/i18n/en/…` ginge heute schon durch – **es braucht keinen Worker-Umbau. Es gibt umgekehrt aber auch keine Sicherung, die einen Schreibzugriff in den falschen Sprachbaum verhindern würde.**

Der Veröffentlichen-Weg schreibt **nicht** sequenziell (anders als `CLAUDE.md` und der Kommentar in `Dashboard.tsx:236` behaupten), sondern als **ein atomarer GraphQL-`createCommitOnBranch`**. `sammlePending()` (`publish.ts:111`) übernimmt die Draft-Schlüssel wortwörtlich als Commit-Pfade – im gesamten Publish-Weg gibt es keinerlei Pfad-Transformation.

---

## 4. Die Blocker – was vor allem anderen repariert werden muss

Neun Befunde, die **den Start verhindern oder Schaden anrichten**, unabhängig vom Aufwand. Vier davon betreffen den deutschen Bestand *heute*, ohne dass eine einzige Zeile für Englisch geschrieben wurde.

---

### B1 · Versteckte Seiten werden in der Übersetzung wieder sichtbar `LIVE FALSCH`

`isPageHiddenByPath` (`src/utils/pageVisibility.ts:68-78`) prüft exakte Treffer und deutsche Präfixe. `/belgique/` steht in `page-visibility.json` – die deutsche Seite ist bewusst `noindex` und aus der Sitemap gefiltert. `/fr/belgique/` matcht weder exakt noch als Präfix und ist deshalb **`index, follow` und steht in der Sitemap**.

Die Regel steht **zweimal** im Repo, in zwei Sprachen: als TS-Modul und noch einmal im Sitemap-Filter in `astro.config.mjs:110-135`. Die Konfiguration kann das TS-Modul nicht importieren. Wer nur eine Kopie anfasst, erzeugt für **deutsche** Seiten den widersprüchlichen Zustand „noindex im HTML, aber in der Sitemap".

> **⚠ Die naheliegende Reparatur ist eine Falle.** Ein generisches Abstreifen des Sprachpräfixes per Zeichenmuster `^/[a-z]{2}(/|$)` macht aus dem **deutschen Landing-Slug `/bw/`** (Baden-Württemberg, `public/landings/landings.md:35`) die Wurzel `/`. Der Treffer entfällt, und `/bw/` kippt von `noindex` auf indexierbar – *und* landet in der Sitemap, weil dieselbe Regel dort ein zweites Mal steht. Betroffen wären zusätzlich `/bw-aquarelle/`, `/bw-schnellzeichner-karikaturist/` und `/bw-szenenmaler/`, die ebenfalls in der Sperrliste stehen.
>
> *Selbst nachgeprüft: `landings.md:35` = `bw`; `page-visibility.json:43` = `"/bw/"`.*
>
> **Abgeglichen werden darf ausschließlich gegen `PREFIXED_LOCALES`, niemals gegen ein Zeichenmuster.**

Nebenbefund: Gabriele kann eine Seite im Site-Graph auf „nicht indexiert" schalten, der Admin bestätigt das – aber in der Übersetzung wirkt es nicht, und sie hat weder Anzeige noch Hebel dafür.

---

### B2 · Der Bildverweis-Wächter blockiert deutsche Commits wegen englischer Fehler

`scripts/validate-image-refs.mjs:34-45` scannt `public/` **rekursiv ohne i18n-Ausnahme** und prüft jeden literalen `/img/`-Verweis. Die FR-Overlays enthalten bereits solche Verweise.

Ein einziger toter Bildpfad in einer künftigen EN-Overlay-Datei lässt `npm run sync:content` mit Exit 1 abbrechen und damit den `pre-commit`-Hook (`.githooks/pre-commit:5`). **Gabriele kann dann keinen deutschen Commit mehr machen, obwohl am deutschen Bestand nichts falsch ist.**

Verschärfend ist die Asymmetrie: auf dem Vercel-Build ist derselbe Schritt nur eine Warnung (`scripts/sync-content-safe.mjs:19-21`), lokal ist er ein Riegel. Ein Overlay-Fehler schlägt also nicht dort zu, wo er entsteht, sondern im Arbeitsablauf der Redakteurin.

> **Memory-Korrektur:** Die Notiz „4 vorbestehende tote Bildverweise blockieren jeden Commit" ist **veraltet**. *Selbst nachgeprüft am 2026-08-04 auf sauberem `main`:* `node scripts/validate-image-refs.mjs` meldet „364 Dateien gescannt – alle Bildverweise gültig ✓", Exit 0. Wer der alten Notiz folgt und gewohnheitsmäßig mit `--no-verify` committet, umgeht genau den Riegel, der bei EN-Overlays anschlagen würde.

---

### B3 · `public/i18n/de/` ist ein toter Pfad

`localeContentRoot('de')` zeigt auf `public/`. `resolveLocalizedFile` und `resolveLocalizedDir` überspringen das Overlay für `DEFAULT_LOCALE`. `getTranslatedLandingSlugs('de')` gibt immer `[]` zurück.

Ein Admin-Sprachumschalter, der **symmetrisch** `locale → public/i18n/<locale>/` abbildet, würde deutsche Redaktionsarbeit lautlos verlieren: die Datei würde erfolgreich committet, wäre im Admin sichtbar – und auf der Website nie zu sehen. `sync-faq-tags.mjs` würde diesen Geister-Baum sogar mittaggen und den Eindruck der Korrektheit bestätigen.

> **Regel für das Skelett: Der Umschalter auf „Deutsch" MUSS in `public/` schreiben, niemals in `public/i18n/de/`.** Das ist die zentrale Asymmetrie des ganzen Entwurfs und gehört in jeden Pfad-Builder als erste Zeile.

---

### B4 · Der Skill-Titel ist gleichzeitig URL und Inhalts-Schlüssel

`src/utils/skills.ts:186` leitet den **Inhalts-Schlüssel** aus dem deutschen **Titel** ab (`skillContentKey(title)`). `skills.ts:64` leitet zusätzlich die **URL** aus dem Titel ab, wenn kein `link`-Feld gesetzt ist – und **nur einer der drei Skills hat ein `link`-Feld** (`Schnellzeichner`). `/szenenmaler/` und `/aquarelle/` hängen an einem einzigen deutschen String.

Übersetzt jemand `title` zu „Quick sketch artist", zeigt der Schlüssel auf `quick-sketch-artist` – und damit ins Leere für `why/`, `erinnerungen/`, die Bild-Tags und den Bildordner. **Ohne Fehlermeldung, nur mit leeren Sektionen.** Der bestehende Guard-Test `tests/skill-url-vs-inhalt.test.ts:28` deckt nur `Schnellzeichner` ab.

**Vorbedingung für jede Sprache:** `skills.json` braucht ein sprachneutrales `id`-Feld, das Titel, URL und Inhalts-Schlüssel entkoppelt. Solange das fehlt, darf **kein Skill-Titel je übersetzt werden.**

---

### B5 · Drei verschiedene Fallback-Regeln, dokumentiert als eine

`src/i18n/config.ts:13-15` verspricht: „Fehlt eine übersetzte Datei, greift automatisch die deutsche Originaldatei." **Das stimmt für genau einen der drei Loader.**

| Loader | Tatsächliches Verhalten | Folge |
| :-- | :-- | :-- |
| `siteTexts.ts:43` | `resolveLocalizedFile` – **dateigenau**, dann **feldweise** über `mergeSection` (`:46-56`) | Korrekt, aber Deutsch sickert feldweise ein, ohne Warnung |
| `faq.ts:25-26` | `resolveLocalizedDir` – **verzeichnisweit** | Sobald `public/i18n/en/faq/` **eine** Datei enthält, sind **alle 87 deutschen FAQs weg** |
| `why.ts:59-61` | **gar kein Datei-Fallback** – baut den Pfad selbst | Fällt auf eine **hartkodierte Liste im Code** (`why.ts:62-87`) |

Der Why-Fall ist der schlimmste. Die Code-Liste trägt **andere Titel** als die gepflegte Datei: „Echte Künstler – keine Agentur" / „Interaktiv & unvergesslich" / „Digital & klassisch" gegen „Ihr Geschmack" / „Kreativ & persönlich" / „Das Format das sie brauchen" in `public/why/default.json`. Nur die Titel der *Datei* enthalten die Schlüsselwörter, auf die `getWhyDetailLinkByTitle` matcht. Der Code-Fallback ist also nicht bloß veraltet, sondern **Text, den der Rest des Systems nicht wiedererkennt** – und genau der greift in jeder Fremdsprache ohne Why-Overlay.

Zusatz: `getHomeIntro` (`siteTexts.ts:132-146`) nimmt als einzige Funktion in einem sonst lokalisierten Modul **keinen** Locale-Parameter und liest die Konstante `FILE` direkt. Eine englische Startseite bekäme den deutschen Intro.

---

### B6 · Das Muster „leerer Ladefehler + Ganzdatei-Schreiben" im Admin

**Der Kern des Admin-Risikos.** Sechs Manager fangen einen fehlgeschlagenen `getFile` still ab, setzen ihren State auf leer/Default und schreiben beim nächsten Klick die **komplette Datei** aus diesem leeren State zurück.

Heute ist der Auslöser selten (403-Drosselung, Netz weg). **Mit einem Sprach-Umschalter ist „Overlay-Datei existiert noch nicht" der Normalfall beim ersten Öffnen jeder neuen Sprache.** Jeder dieser Manager würde dann beim ersten Tastendruck die Zieldatei mit einem Rumpf überschreiben – ohne Rückfrage, ohne Fehlermeldung.

Betroffen: `SiteGraphView.tsx:457` + `:415-427`, `ImageManager.tsx:237` + `:276-286` + `:536-547`, `SiteTextsManager.tsx:68-74` + `:77-85`, `IntroManager.tsx:58-62` + `:68-91`.

**Richtig gemacht und als Vorlage brauchbar:** `CleanupManager.tsx:257-263` prüft `metaKey in updatedMeta` statt auf Wahrheitswert.

Verwandt und **heute schon schädlich**: `SiteTextsManager.withDefaults()` (`:35-41`) reduziert die Datei auf drei Schlüssel und löscht damit bei jedem Tastendruck 34 `landingHeadings` und 4 `landingIntros`.

---

### B7 · Die erste englische FAQ nimmt der englischen Seite 86 Antworten weg

Die Verkettung aus B5 und dem Admin-Verhalten ergibt ein konkretes, wahrscheinliches Szenario:

1. Website ohne `public/i18n/en/faq/`: die EN-Seite zeigt **87 deutsche FAQs** (Verzeichnis-Fallback).
2. Admin zeigt für EN **„Noch keine FAQs"** – `FaqManager.tsx:116-121` fängt das fehlende Verzeichnis still ab.
3. Gabriele legt eine englische FAQ an (`FaqManager.tsx:284-312`) und veröffentlicht.
4. Website liest jetzt ausschließlich den Overlay-Ordner: **genau 1 FAQ**.

Keine Rückfrage, kein Hinweis, kein Test deckt es ab. Zusatz: der Modus „Seiten-FAQs" liest fest `ladeTagDateien('public/faq')` (`FaqManager.tsx:109`) und würde auch im EN-Modus die **deutschen** Dateien listen und **an Ort und Stelle überschreiben**.

---

### B8 · Der Publish-Weg umgeht die gesamte Sync-Kette – bereits einmal passiert

Das Admin-Tool schreibt über die GitHub-API. **Dort läuft kein Git-Hook.** Overlay-FAQs, die im Admin entstehen, bekommen deshalb nie einen Tag-Block – aber `getFAQsForContext` wählt seit 2026-07-28 allein über Tags aus.

**Genau so verschwanden die FR-FAQs schon einmal**, und `/fr/belgique/` zeigte still den deutschen Notnagel. Der Vorfall ist im Repo protokolliert (`scripts/sync-faq-tags.mjs:50-60`, wörtlich: „und niemandem fiel es auf").

Verschärfend: `sync-faq-tags.mjs` **schreibt** in `public/i18n/*/faq` – aber die `git add`-Listen in `.githooks/pre-commit:8` und `.github/workflows/sync-landings.yml:52` enthalten `public/i18n` **nicht**. Lokal bleibt ein schmutziger Arbeitsbaum, in der GitHub-Action werden die Änderungen **aktiv verworfen**.

Dass `/fr/belgique/` heute überhaupt funktioniert, hängt an einem Zufall: `belgique` ist auch ein *deutscher* Landing-Slug und steht deshalb in `tags.json`. Bei einer englischen Seite mit übersetztem Slug (`/en/cologne/`) fällt derselbe Mechanismus in `sync-faq-tags.mjs:165` durch und die Inhalte verschwinden lautlos.

---

### B9 · Gabriele kann Seiten übersetzen, die sie in dieser Sprache nie anlegen kann

Die Quick-Add-Funktion (`Dashboard.tsx:278-505`) schreibt ausschließlich **deutsche** Registries: `skills.json`, `events.json` + `events/<slug>/content.json` mit deutschen Vorlagetexten, `landings.md`. Nichts davon kennt `public/i18n/<locale>/landings.json` – die **einzige** Quelle, aus der die Fremdsprach-Route ihre Seiten baut.

Ein Sprach-Umschalter ohne Gegenstück hier gäbe ihr einen Editor für Seiten, die in dieser Sprache nicht existieren – und ein „+ Neu hinzufügen" im EN-Modus legt kommentarlos eine **deutsche** Seite an.

Zusatzweg, den keine Achse gefunden hat: **Der KI-Chat ist ein zweiter, völlig unabhängiger Schreibweg** mit fest verdrahteten deutschen Zielpfaden (`worker/src/aiTools.ts:118-131` `set_landing_heading`, `:133-148` `set_site_text`, `:150-164` `set_skill_description`, `:186-200` `set_page_visibility`). Im Englisch-Modus würde „ändere die Überschrift" die **deutsche** Seite ändern, während die Oberfläche daneben Englisch anzeigt. `propose_edit` (`aiTools.ts:98-113`) lässt zudem jeden beliebigen `public/`-Pfad zu.

---

## 5. Das Skelett: Zielarchitektur für N Sprachen

### 5.1 Leitsätze

1. **Deutsch bleibt unberührt.** Kein Umbau darf deutsche URLs, deutsches Ranking oder Gabrieles Arbeitsablauf verändern. Wo ein Umbau deutsche Aufrufer berührt, wird die Signatur rückwärtskompatibel gehalten (`locale` als letzter Parameter mit Default `de`).
2. **Struktur hat genau eine Wahrheit.** Slugs, Tags, Sektionsreihenfolge und Sichtbarkeit gabeln sich nie pro Sprache.
3. **Jede Sprache ist gleich teuer – nämlich fast nichts.** Was pro Sprache Handarbeit im *Code* erfordert, ist ein Entwurfsfehler. Erlaubt ist Handarbeit an *Inhalten*.
4. **Kein stiller Zustand.** Fehlende Übersetzungen fallen sichtbar auf, nicht erst auf der Live-Seite.
5. **Eine Sprache geht als Ganzes live, nicht scheibchenweise.**

### 5.2 Sprach-Registry und Sprach-Status

Die Registry bleibt im Code (Typsicherheit: eine neue Sprache erzwingt den `LOCALE_META`-Eintrag). Neu dazu kommt ein **Status pro Sprache** als Inhaltsdatei, damit eine Sprache aufgebaut werden kann, ohne dass Zwischenstände veröffentlicht werden:

```
public/i18n/status.json
{
  "fr": { "status": "entwurf" },
  "en": { "status": "entwurf" }
}
```

- `entwurf` → **die ganze Sprache** ist `noindex, nofollow` und steht nicht in der Sitemap
- `live` → normale Indexierung, hreflang aktiv

Das ist die Antwort auf „darf eine halb übersetzte Seite indexiert werden?": **nein, und die Entscheidung fällt auf Sprach-Ebene, nicht pro Seite.** Google wertet Mischsprachen-Seiten als Doorway ab – der heutige Zustand von `/fr/belgique/` ist genau das.

### 5.3 Die Fallback-Regel – eine statt drei

**Eine einzige, dokumentierte Regel für alle Loader:**

> Für jeden Inhalt wird zuerst die Overlay-Datei der Zielsprache gesucht. Fehlt sie, greift **dateigenau** das deutsche Original. Innerhalb einer Datei wird **feldweise** ergänzt. Jeder so ergänzte Fall wird beim Build **gezählt und gemeldet**.

Konkret heißt das:

- `why.ts` auf `resolveLocalizedFile` umstellen; die hartkodierte Liste `why.ts:62-87` gegen `public/why/default.json` abgleichen oder streichen.
- `faq.ts` von Verzeichnis- auf Datei-Ebene bringen: je Slug erst Overlay, dann deutsche Datei.
- `getHomeIntro` locale-fähig machen.

Der Zähler ist der wichtige Teil. Er ist die Grundlage für den Übersetzungsfortschritt im Admin **und** für die Freigabeentscheidung „diese Sprache ist fertig". Ohne ihn ist „teilweise übersetzt" ein Zustand, den niemand messen kann.

**Ausnahme:** Für Rechtstexte gilt nicht Fallback, sondern Ausblenden bzw. bewusste Verlinkung (siehe E10).

### 5.4 Routen-Topologie

Statt einer Datei pro Sprache ein **`[locale]`-Segment**:

```
src/pages/[locale]/[landing].astro        ersetzt  src/pages/fr/[landing].astro
```

Heute erzwingt Astro das Literal `'fr'` in `getStaticPaths` (`fr/[landing].astro:53`), weil `getStaticPaths` über die Frontmatter-Konstanten gehoben wird und `LOCALE` dort nicht sichtbar ist. **Mit `params.locale` entfällt dieser Sonderfall vollständig.**

Die heutige Routendatei hat **vier voneinander unabhängige Änderungsstellen pro Sprache**: das `getStaticPaths`-Literal (`:53`), die Sperrliste `LOCALE_READY_SECTIONS` (`:48`), die SEO-Literale (`:71-75`) und den Breadcrumb-Namen (`:89`). Das sind ~142 Zeilen, die pro Sprache kopiert und an vier Stellen korrigiert werden müssten – vergisst man das Literal in `:53`, baut `/en/` stillschweigend die *französische* Slug-Liste.

> **Geprüfte Gegenrede:** Ein Prüfer hatte behauptet, `[locale]` kollidiere mit der Rest-Route `[...kombi].astro`. Das wurde widerlegt: `[...kombi].astro:74-96` gibt nur einsegmentige flache Slugs und `<skill>/<event>` aus, mit `skill ∈ {schnellzeichner-karikaturist, szenenmaler, aquarelle}`. Eine Doppelbelegung setzte voraus, dass ein Locale-Code identisch mit einem dieser drei Skill-Slugs ist. Im statischen Output emittiert Astro ohnehin nur, was `getStaticPaths` zurückgibt; Rest-Routen haben die niedrigste Priorität.
> **Aber:** Nicht per Build verifiziert (das Audit war rein lesend). **Vor der Umstellung in einem Branch experimentell prüfen.**

Astros eingebautes i18n-Routing (`astro.config.mjs` `i18n`-Block) scheidet aus: die Konfiguration hat heute weder `i18n` noch `trailingSlash` noch `output`, der Sitemap-Filter ist selbstgebaut, und `defaultLocale`/`routing` greifen in die Erzeugung **aller** bestehenden deutschen Adressen ein – während 177 Vercel-Redirects und die Sitemap auf der heutigen Form mit abschließendem Schrägstrich stehen.

### 5.5 Slug-Strategie

Der Slug ist heute der **Primärschlüssel für alles**: Bilder (`img/slides/<slug>/`), Titelbilder, Erinnerungen, Why-Overrides, Tags, Reviews. Übersetzte Slugs ohne Vorbereitung brechen das alles gleichzeitig und lautlos.

**Empfehlung: Slug-Map, ausgeliefert mit Identitäts-Abbildung.**

```
public/i18n/<locale>/landings/landings.md    (gespiegelte Struktur, siehe E16)
public/i18n/<locale>/slugs.json              { "koeln": "cologne", … }   optional
```

Stufe 1 liefert die Map leer aus – dann verhält sich alles wie heute (`/en/koeln/`). Der Gewinn ist, dass **Anzeige-Slug und Daten-Schlüssel einmalig getrennt** werden. Danach ist die Entscheidung „übersetzte URLs ja/nein" pro Sprache reversibel, statt eine 301-pflichtige Einbahnstraße.

> **Bestandsfalle:** Der deutsche Landing-Slug **`bw`** ist zwei Zeichen lang und damit formgleich mit einem Locale-Code. Zusammen mit `en`, `fr` und dem vorgesehenen `nl` braucht das Skelett einen Build-Test: **kein Landing-, Skill- oder Event-Slug darf je ein `LOCALES`-Eintrag sein oder wie einer aussehen.**

### 5.6 Übersetzungs-Registry pro Seitentyp

Heute gibt es **nur eine Registry, und die kennt nur Landings**. `getAvailableLocalesForSlug` fragt ausschließlich `landings.json` ab. Folge: der Sprach-Umschalter existiert auf **2 von 169 Seiten**, und hreflang ebenso.

Für eine vollwertige Sprache braucht es eine **Matrix Seitentyp × Sprache** statt einer Liste:

```
public/i18n/<locale>/registry.json
{
  "landings": ["belgique", "koeln"],
  "skills":   [],
  "events":   [],
  "seiten":   ["team", "galerie", "contact", "faq"]
}
```

Damit wächst die Sichtbarkeit des Umschalters mit den eingetragenen Seiten, nicht mit der Zahl der Sprachen.

### 5.7 UI-Wörterbuch

Rund 265 deutsche Strings im Code. Präsenzzahlen zeigen, wie breit das wirkt:

| String | auf … Seiten |
| :-- | --: |
| „Navigation umschalten" | 170 / 170 |
| „Impressum" / „Zur Startseite" | 169 |
| „Häufige Fragen (FAQ)" + Kontaktformular | 158 |
| „Referenzlogo" | 141 |
| „Warum Kunstwolff?" | 140 |
| Review-Pfeil-`aria-label` | 105 |

**Entwurf: Schlüssel-Registry im Code, Werte als Overlay-JSON.**

```
src/i18n/ui-keys.ts              Schlüsselliste + deutsche Referenz (typsicher)
public/i18n/<locale>/ui.json     Werte je Sprache (Admin-pflegbar)
```

So bekommt man beides: einen **Build-Guard** („jeder Schlüssel der Registry existiert je Locale oder fällt bewusst auf `de`") und die Möglichkeit, dass Gabriele Interface-Texte selbst korrigiert.

**Zwei erfreuliche Befunde:** Es gibt **null** Datums-, Zahlen- oder Währungsformatierung im Code (kein `toLocaleDateString`, kein `Intl.*`) – diese Achse ist sauber. Und `styles/global.css` / `styles/lightbox.css` sind vollständig textfrei.

**Nicht mitzählen:** Sechs Komponenten mit deutschen Strings sind toter Code ohne Importeur – `Reviews.astro`, `References.astro`, `SkillBanner.astro`, `AboutSchnellzeichner.astro`, `SchnellzeichnerHero.astro` und `header/LanguageMenu.astro` – plus `Aboutsection.astro` (Import vorhanden, Aufruf auskommentiert).

> **`header/LanguageMenu.astro` gehört gelöscht, bevor jemand Englisch einbaut.** Sie trägt bereits eine britische Flagge und `href="#"`, wird aber von **keiner** Datei importiert. Ein Entwickler, der „Englisch einbauen" liest, findet mit hoher Wahrscheinlichkeit die falsche der beiden Umschalter-Fassungen.

### 5.8 Interne Links

**21 der 22 internen Links auf der gebauten FR-Seite zeigen auf deutsche Seiten.** Kein URL-Bauer außer `localizePath` kennt eine Locale.

Zu lokalisieren: `Footer.astro:11-13`, `FAQ.astro:128` und `:134`, `404.astro:12-13`, `whyDetailLinks.ts:6-11`, `navigation.ts`, `Slideshow.astro:71` (Galerie-Link), `EventTeaser.astro:17`, `EventSkills.astro:56`.

Dazu die **Regel für nicht existierende Ziele**: Zeigt ein Link auf eine Seite, die es in der Zielsprache nicht gibt, fällt er auf die deutsche Fassung zurück – aber sichtbar markiert, nicht stillschweigend.

> **Falle in der Navigation:** `navigation.ts:73` und `:123` erkennen das Services- und Events-Dropdown am **literalen Label-Text** „Services" bzw. „Events". Wird das Label übersetzt, findet `fillServicesWithSkills` nichts mehr und die Skill-Liste fällt still auf eine Handliste zurück. Die Dropdown-Zuordnung muss vor der Übersetzung auf einen sprachneutralen Schlüssel umgestellt werden.

### 5.9 Sektions-Sichtbarkeit statt `LOCALE_READY_SECTIONS`

`LOCALE_READY_SECTIONS` ist ein Provisorium und trägt eine vollständige Seite nicht:

- Dieselbe Aussage steht **dreimal redundant** in der Routendatei (Sperrliste `:48`, `registry` `:95-102`, `sectionProps` `:103-116`).
- Sie ist **pro Route** definiert, nicht pro Locale – bei 5 Sprachen liegen 5 unabhängige Set-Literale in 5 Dateien, die niemand nebeneinander lesen kann.
- Sie kennt **keine Abstufung** zwischen „ausblenden" und „deutschen Fallback zeigen" – während das Overlay genau das gleichzeitig und widersprechend tut.
- Sie deckt **Header und Footer gar nicht ab**, weil die außerhalb des Sektions-Stacks im Layout hängen.
- Ihre eigene Beschreibung stimmt nicht: `faq` und `contact` stehen darin als „übersetzt", liefern aber nachweislich deutschen Text. **Sie filtert Datenquellen, nicht Beschriftungen.**

**Ersatz: ein aus dem Overlay-Dateibestand *abgeleiteter* Übersetzungsstatus** statt einer handgepflegten Sperrliste. Eine Sektion gilt als übersetzt, wenn ihre Overlay-Dateien vorhanden sind – das ist dieselbe Zählung, die 5.3 für den Fallback-Report braucht.

`components.json` bleibt **eine** Struktur für alle Sprachen (eine Datei pro Sprache wäre ein Drift-Generator). Nötig ist höchstens eine dritte, optionale Ebene für Übersteuerungen.

> **Achtung Guardrail:** Die FR-Route benutzt bewusst `getSectionOrder` statt `resolveSectionOrder` und umgeht damit den Build-Guard, der `components.json` und die Komponenten-Registry zusammenhält (`componentConfig.ts:108-124`). Alle deutschen Routen hängen an diesem Guard. Eine Vereinheitlichung muss ihn **locale-abhängig machen, nicht aufgeben** – sonst verliert Deutsch den einzigen Build-Abbruch, der einen Tippfehler in `_order` bemerkt.

### 5.10 SEO

| Punkt | Heute | Ziel |
| :-- | :-- | :-- |
| `hreflang`-Wert | `a.locale` → `"fr"` (`Layout.astro:69`) | `LOCALE_META[loc].hreflang` – das Feld existiert (`"fr-BE"`) und wird von **niemandem gelesen** |
| Selbstreferenz | fehlt (Bedingung `alternates.length > 1`) | immer ausgeben |
| `x-default` | fehlt komplett | auf die deutsche Fassung |
| Sitemap-Alternates | 0 `xhtml:link` | `sitemap()` mit `i18n`-Option |
| Reziprozität | nur `[landing]`-Route | alle Seitentypen mit Registry |

**Wichtiger als der falsche Code:** Der hreflang-Cluster zeigt heute auf eine `noindex`-Seite. Google **verwirft** eine hreflang-Gruppe, deren Gegenstück `noindex` ist – die gesamte Annotation ist damit wirkungslos. Erst B1 reparieren, dann hreflang polieren.

**Zielarchitektur: Unterverzeichnis `/en/`**, nicht Subdomain, nicht eigene Domain. Begründung: kleines Unternehmen ohne separate Länder-Organisation, die Domain-Autorität soll gebündelt bleiben, und `/en/` ist heute frei (die vier Wildcards in `vercel.json` fangen es nicht ab, `/en/` liefert 404).

**Zeitpunkt:** Der Wix→Astro-Cutover ist gerade erst passiert. Ein zweiter großer Struktureingriff *während* Google die neue Seite noch neu bewertet, ist ein vermeidbares Risiko. Der Sprach-Status `entwurf` (5.2) löst das: bauen ja, veröffentlichen später.

> **`vercel.json` ist ein Nadelöhr:** 177 Redirects, davon der große Block für die deutschen Kombi-Adressen und eine Wildcard `/schnellzeichner/:rest*`. Keine Quelle trägt heute ein Sprachpräfix. Jede Locale-Erweiterung editiert dieselbe Datei, an der der komplette deutsche Wix-Umzug hängt. Die Wildcard ist an der Wurzel verankert – `/fr/schnellzeichner/…` ist also **nicht** betroffen.

### 5.11 Medien und Tags

Die Auswahl-Mechanik ist **bereits sprachneutral**: alle drei Tag-Dimensionen matchen über kleingeschriebene ASCII-Slugs, und kein einziger Media-Loader importiert `src/i18n/config`.

Die Tag-**Slugs** sind deutsche Wörter (`schnellzeichner`, `hochzeit`, `koeln`), taugen aber als stabile IDs – sie sind zugleich URL-Segmente und Ordnernamen in `public/img/slides/`. **Ein Umbenennen wäre ein Site-weiter Bruch, und sie dürfen deshalb nie übersetzt werden.** Übersetzt wird die **Anzeige-Schicht**:

- `tags.json` führt genau **ein** `label`-Feld je Slug → braucht ein Label-Overlay
- `gallery.ts:72-76` hält die Facetten-Überschriften „Kunstform/Anlass/Ort" hart im Code
- `Gallery.astro` ist von Zeile 15 bis 149 durchgängig deutsch verdrahtet, ohne Locale-Prop
- `slides.meta.json` hält pro Bild **ein** `alt`/`altOverride` und **ein** `title`; 81 von 272 Einträgen sind gefüllt

Der Bestand beweist das Problem bereits: `public/img/slides/luxembourg/1_caricaturiste-….webp` trägt französisches `altOverride`, aber deutschen `title` „Szenenmaler Luxembourg".

**Die Bilddateien selbst und alles darauf Aufbauende (Varianten, srcset, Größen) sind echte gemeinsame Quelle und dürfen NIE ins Overlay.**

---

## 6. Der Admin-Sprach-Umschalter

### 6.1 Bedienkonzept

Gabriele wählt in der Kopfzeile eine Sprache. Die Oberfläche bleibt deutsch. Alles, was sie danach bearbeitet, gehört zu dieser Sprachfassung.

**Drei Anforderungen, die nicht verhandelbar sind:**

1. **Der Modus muss unübersehbar sein.** Ein Sprach-Umschalter würde sich optisch als vierte, identisch gestylte graue Auswahlliste in dieselbe Kopfzeile einreihen wie Seitentyp/Skill/Stadt/Event (`Dashboard.tsx:526-624`). In der gesamten Kopfzeile gibt es kein Mittel, das einen **Modus** von einer **Auswahl** unterscheidet – der einzige vorhandene Warnbalken ist bereits für den Entwurfsstand belegt. Für eine nicht-technische Nutzerin bleibt „ich bearbeite gerade Englisch" damit faktisch unsichtbar. **Nötig ist eine durchgehende farbliche Rahmung der gesamten Oberfläche, nicht ein Dropdown.**
2. **Deutscher Text ist Referenz, nie Vorbefüllung.** Fehlt eine Übersetzung, steht der deutsche Text **grau daneben**, das Eingabefeld bleibt **leer**. Eine Vorbefüllung erzeugt genau den Zustand, den das Overlay vermeiden soll: eine Overlay-Datei mit deutschem Inhalt schaltet den Fallback ab und ist nicht mehr von echter Übersetzung unterscheidbar.
3. **Der Entwurf muss die Sprache kennen.** Siehe 6.3.

### 6.2 Pfad-Auflösungsschicht

**Zentral, nicht verteilt.** Eine Funktion:

```ts
inhaltsPfad(locale: Locale, relPath: string): string
```

mit drei Regeln:

1. `locale === 'de'` → **immer** `public/<relPath>` (nie `public/i18n/de/`, siehe B3)
2. `relPath` in der Liste **sprachneutraler Bereiche** → **immer** `public/<relPath>`, unabhängig von der Locale
3. sonst → `public/i18n/<locale>/<relPath>`

Die Liste unter (2) ist der eigentliche Entwurfsaufwand, nicht die Funktion: `public/img/**`, `config/tags.json`, `config/components.json`, `config/page-visibility.json`, `landings/landings.md`, `events/events.json`, `img/Titelbild/title.meta.json`, `calendar/**`.

> **Eine Injektion tief in `github.ts` `putFile` wäre falsch.** Sie würde blind alles präfigieren und damit die Mediathek pro Sprache duplizieren. Die Locale muss **oberhalb** des Transports aufgelöst werden.

Danach die 44 `addPendingFile`-Aufrufstellen und die ~71 Lesestellen darauf umstellen. Schwerpunkte: `SiteGraphView.tsx`, `ImageManager.tsx`, `CleanupManager.tsx`, `EventManager.tsx`, `ReviewManager.tsx`, `CinemaManager.tsx`.

### 6.3 Entwurf, Rückgängig und Veröffentlichen

**Geprüfte Gegenrede zu einer verbreiteten Annahme:** Ein Sprachwechsel mit ungespeicherten Änderungen verliert **nichts**. `pendingFiles` ist eine globale, nur nach Repo-Pfad geschlüsselte Map oberhalb aller Manager (`state.ts:12`), und jeder Manager stagt bei **jedem** Tastendruck. Solange die Locale Teil des Dateipfads ist, kann ein Wechsel gar nichts verwerfen.

**Die echte Gefahr ist die Umkehrung: der Entwurf überlebt unsichtbar in der anderen Sprache.**

- Ein Publish schickt **immer den gesamten Entwurf über alle Sprachen als einen Commit** (`publish.ts:111-144`).
- Die Commit-Nachricht wird aus Manager-Strings gebaut, die keine Locale kennen (`publish.ts:25-31`).
- `beforeunload` und die Logout-Rückfrage (`Dashboard.tsx:80-101`) zählen nur `pendingCount` und nennen nie eine Sprache.
- **Rückgängig** arbeitet auf einem globalen Schnappschuss über alle Sprachen (`state.ts:64-71`) – ein „Rückgängig" nach einem Sprachwechsel nimmt die letzte Aktion der *anderen* Sprache zurück.

**Nötig:** `PendingFile` (`state.ts:3-9`) bekommt ein `locale`-Feld. Das Pending-Band, der Veröffentlichen-Dialog, die Commit-Nachricht und der Rückgängig-Knopf nennen die Sprache. Weder Oberfläche noch Git-Historie sagen heute jemals, welche Sprachfassung veröffentlicht wurde.

**Kein Schreibkonflikt-Schutz je Datei:** Der `sha` wandert beim Veröffentlichen gar nicht mit (`publish.ts:134-140`, `github.ts:496-507`). Geprüft wird allein der Repo-Head. Pro Datei gilt „wer zuletzt schreibt, gewinnt", ohne Warnung. Sobald an Übersetzungen **außerhalb** des Admin gearbeitet wird (Übersetzerin, Entwicklerin, Git), überschreibt ein älterer Entwurf im Browser die neuere Fassung lautlos. Das wird durch Mehrsprachigkeit erst wahrscheinlich.

**Löschungen sind doppelt uneindeutig:** Beim Veröffentlichen entscheidet ausschließlich das Feld `sha`; ohne `sha` wird die Löschung kommentarlos **verworfen** (`publish.ts:124-131`). Genau der `sha` ist aber in den Fehlerpfaden aus B6 `null`. Ergebnis: mal wird die Overlay-Datei gelöscht (Website fällt lautlos auf Deutsch zurück), mal passiert nichts, obwohl „gelöscht" quittiert wurde.

### 6.4 Manager-Klassifikation

Was jeder Manager im Fremdsprach-Modus tut. **A** = ins Overlay schreiben · **B** = unverändert nach `public/` (sprachneutral) · **C** = im Fremdsprach-Modus sperren.

| Manager | Verhalten | Begründung / Auflage |
| :-- | :-: | :-- |
| `SiteTextsManager` | **A** | Kernfall. **Vorher B6 fixen** – zerstört heute schon `landingHeadings` |
| `IntroManager` | **A** | Kernfall. Leerschreib-Muster fixen |
| `FaqManager` | **A** | Kernfall. **Vorher B5 + B7 fixen**, sonst Datenverlust auf der Live-Seite |
| Why-Editor (in `ImageManager`) | **A** | **Vorher B5 fixen.** Zeigt heute deutschen Fallback als eigenen Inhalt |
| `ReviewManager` | **A** | Texte übersetzbar; Tag-Block strukturell |
| `EventManager` | **A**/**B** gemischt | `content.json` gemischt S+C – Feldebene nötig, nicht Dateiebene |
| `CinemaManager` | **A**/**B** gemischt | dito |
| `BrandStripeManager` | **A**/**B** gemischt | Logos N, Labels C |
| Bild-Metadaten (`slides.meta.json`) | **A** nur `alt`/`title` | Datei enthält S+C. **Ganzdatei-Schreiben ist hier gefährlich** (`ImageManager.tsx:516-523`) |
| Bild-Upload | **B** | Bilder sind sprachneutral. Uploadziel bleibt der deutsche Baum |
| `CityManager` / Quick-Add | **C** + Erweiterung | Legt heute nur deutsche Registries an (B9). Braucht ein Gegenstück für `registry.json` |
| `SiteGraphView` | **C** | Schreibt globale Struktur (`page-visibility.json`) ohne Locale-Dimension |
| `InterfaceView` | **C** | Schreibt `components.json` – eine Struktur für alle Sprachen. Der Dialog spricht heute von „dieser Seite", ändert aber **alle** Sprachen |
| `CleanupManager` | **C** | **Löscht echte Binärdateien.** Filtert per `startsWith('public/img/slides/')` – Overlay-Referenzen fallen durch, Dateien könnten fälschlich als verwaist gelten |
| `CalendarView` | **B** | Termine sprachneutral; wird von `src/` gar nicht gelesen |
| `AiChat` / `SeoHelper` | **C** bis umgebaut | Zweiter Schreibweg mit fest verdrahteten deutschen Zielpfaden (B9) |

> **Ein Glücksfall:** `CleanupManager` benutzt `dir||sha` als Duplikatschlüssel (`:194`). Overlay- und Originaldatei würden deshalb **nicht** fälschlich als Duplikat gemeldet – der einzige Ort, an dem die heutige Blindheit gegenüber `public/i18n/` zufällig schützt statt schadet.

### 6.5 Der Cache-Fallstrick

`utils/loadCache.ts:9-26` schlüsselt den „last known good"-Cache im `localStorage` nach **Inhaltsart** (`cities`, `events`, `skills`, `components`), **nicht nach Sprache**. Nach einem fehlgeschlagenen Laden zeigt der Editor die Liste der zuletzt geöffneten *Sprache* als aktuellen Stand – inklusive des Bandes „Es wird der zuletzt geladene Stand (Cache) angezeigt", das die Verwechslung als normal quittiert.

**Cache-Schlüssel müssen die Locale enthalten.**

### 6.6 Live-Vorschau

`livePreviewPath` (`LivePreview.tsx:51-78`) kennt keine Locale und baut nur unpräfigierte Pfade. Die Vorschau ist laut eigenem Kopfkommentar der „Nordstern" gegen falsche Annahmen – **im Sprachbetrieb würde sie zum genauen Gegenteil: sie bestätigt visuell einen Stand, den Gabriele gar nicht bearbeitet.**

### 6.7 Übersetzungsfortschritt

Aufbauend auf dem Zähler aus 5.3: „Sprache EN: 34 von 87 FAQ, 12 von 38 Why-Texten, 0 von 41 Reviews." Das ist die Grundlage für die bewusste Freigabe einer Sprache – statt halbfertig live zu gehen.

---

## 7. Architektur-Entscheidungen

Jede Zeile ist eine Weggabelung, an der ein Mensch wählen muss. **Tragweite** sagt, wie teuer eine spätere Korrektur wird.

| # | Frage | Empfehlung | Tragweite |
| :-- | :-- | :-- | :-- |
| **E1** | Slugs unter `/en/`: deutsch, übersetzt, oder Map? | **Slug-Map, Stufe 1 als Identität ausgeliefert** – trennt Anzeige von Schlüssel einmalig, hält die Entscheidung reversibel | 🔴 irreversibel |
| **E2** | Routen-Topologie | **`[locale]`-Segment.** Vor Umsetzung im Branch verifizieren | 🟠 teuer |
| **E3** | Interface-Strings | **Schlüssel im Code, Werte als Overlay-JSON** – Build-Guard *und* Admin-pflegbar | 🟠 teuer |
| **E4** | Verhalten bei fehlender Übersetzung | **Eine Regel: dateigenau + feldweise + gezählt.** Ausblenden nur für Rechtstexte | 🟠 teuer |
| **E5** | Sprach-Registry | **Liste im Code** (Typsicherheit), **Status als Inhaltsdatei** (`entwurf`/`live`) | 🟠 teuer |
| **E6** | `page-visibility` in Fremdsprachen | **Vererbt aus Deutsch**, Abgleich **nur gegen `PREFIXED_LOCALES`**, nie per Zeichenmuster | 🟢 leicht |
| **E7** | Admin-Pfadaufbau | **Zentraler `inhaltsPfad(locale, relPath)`**, keine Injektion im Transport | 🟠 teuer |
| **E8** | Welche Manager bekommen den Modus | **Stufe 1 nur Text-Manager**, Struktur-Manager gesperrt; Nebeneinander-Ansicht als Zielbild | 🟢 leicht |
| **E9** | Leeres Feld oder deutsche Vorbefüllung | **Leeres Feld, deutscher Text grau daneben** | 🟢 leicht |
| **E10** | Impressum / Datenschutz auf Englisch | **Übersetzt mit Vorrang-Klausel der deutschen Fassung.** Rechtserklärung, keine Marketingseite – juristische Abnahme nötig | 🟠 teuer |
| **E11** | Kontaktformular | **Ein Formspree-Endpunkt**, Sprache als verstecktes Feld, Betreff und Meldungen lokalisiert | 🟢 leicht |
| **E12** | `hreflang` | **`LOCALE_META`-Wert + Selbstreferenz + `x-default`.** Erst nach B1 | 🟢 leicht |
| **E13** | Sprach-Umschalter | **In den Header.** Auto-Weiterleitung nach Browsersprache **ausdrücklich nicht** (statischer Build, Crawler-Probleme) | 🟢 leicht |
| **E14** | Umfang für Englisch | **Landings + statische Seiten.** Die 114 Kombiseiten explizit ausschließen – 129 deutsche Pfade stehen ohnehin auf `noindex` | 🟠 teuer |
| **E15** | Reviews / Navigation / Events | **Overlay**, konsistent mit dem bestehenden Prinzip – kein `lang`-Feld pro Datensatz | 🟠 teuer |
| **E16** | Ablage der Slug-Registry | **Gespiegelt** (`i18n/<locale>/landings/landings.md`) statt der heutigen Sonderdatei an der Wurzel | 🟢 leicht |
| **E17** | Darf eine halb übersetzte Sprache indexiert werden | **Nein – Status auf Sprach-Ebene** (E5) | 🟢 leicht |
| **E18** | Skill-Identität | **Sprachneutrales `id`-Feld in `skills.json`** einführen, das Titel, URL und Inhalts-Schlüssel entkoppelt. **Vorbedingung für jede Übersetzung** | 🔴 irreversibel |
| **E19** | Tag-System | **Slugs nie übersetzen** (sie sind URL-Segmente und Ordnernamen), **Labels als Overlay** | 🟠 teuer |
| **E20** | `components.json` | **Eine Struktur für alle Sprachen**, optionale dritte Übersteuerungs-Ebene. Kein Fork pro Sprache | 🟢 leicht |

**E1 und E18 zuerst entscheiden.** Beide sind irreversibel und beide betreffen Slugs bzw. Schlüssel, an denen alles andere hängt.

---

## 8. Arbeitspakete und Reihenfolge

### 8.1 Warum die Reihenfolge zwingend ist

- **B1 vor allem anderen**, weil einmal indexierte Fremdsprachen-URLs nur mit 410/301 wieder loszuwerden sind.
- **Fallback-Vereinheitlichung vor dem EN-Aufbau**, sonst testet man gegen ein Phantom: eine neue Sprache zeigt Texte, die selbst auf der deutschen Seite nicht mehr stehen.
- **UI-Wörterbuch und interne Links vor der englischen Route**, sonst entsteht exakt der heutige FR-Zustand noch einmal.
- **`[locale]`-Route vor der Aktivierung von `en`**, sonst wird `en` eine Kopie und die Schritte davor müssen zweimal eingebaut werden.
- **Admin-Pfadschicht vor dem Admin-Umschalter**, sonst wird die Locale durch 44+ Stellen einzeln eingefädelt.

### 8.2 Phasen

#### Phase 0 – Reparatur (vor allem anderen, unabhängig von Englisch)

| Paket | Größe | |
| :-- | :-: | :-- |
| B1: `pageVisibility.ts` + `astro.config.mjs` locale-bewusst, **`bw`-Test** | S | einmalig |
| B2: `validate-image-refs` und die beiden `git add`-Listen um `public/i18n` ergänzen | S | einmalig |
| B6: Leerschreib-Muster in 6 Managern; `SiteTextsManager.withDefaults` **Datenverlust** | M | einmalig |
| B4/E18: `id`-Feld in `skills.json`, Guard-Test auf alle drei Skills | M | einmalig |
| Toten Code entfernen: `header/LanguageMenu.astro` + 6 importlose Komponenten | S | einmalig |

#### Phase 1 – Fundament (einmalig, trägt alle Sprachen)

| Paket | Größe | |
| :-- | :-: | :-- |
| B5/E4: Fallback vereinheitlichen (`why.ts`, `faq.ts`, `getHomeIntro`) + Zähler | M | einmalig |
| E3: UI-Wörterbuch, Locale durch Layout/Header/Footer/FAQ/Contact/404/Gallery | **L** | einmalig |
| Interne Links lokalisieren (5.8) inkl. Navigation-Dropdown-Schlüssel | M | einmalig |
| E2: `[locale]`-Route, SEO-Literale ins Wörterbuch, Sperrliste → abgeleiteter Status | **L** | einmalig |
| E5/E6/E17: Sprach-Status, vererbte Sichtbarkeit | S | einmalig |
| E1: Slug-Map-Schicht (Identität) · E15: Registry pro Seitentyp | M | einmalig |
| Sync-Skripte i18n-fähig – Vorbild `sync-faq-tags.mjs:62-71` | **L** | einmalig |

#### Phase 2 – Admin

| Paket | Größe | |
| :-- | :-: | :-- |
| E7: `inhaltsPfad(locale, relPath)` + Klassifikation + Umstellung der Aufrufstellen | **XL** | einmalig |
| `locale` in `PendingFile`, Publish-Dialog, Commit-Nachricht, Rückgängig | M | einmalig |
| Umschalter in der Kopfzeile + durchgehende Modus-Kennzeichnung | **L** | einmalig |
| Cache-Schlüssel und Live-Vorschau locale-fähig | S | einmalig |
| Übersetzungsfortschritt je Sprache | M | einmalig |
| Quick-Add / KI-Chat locale-bewusst (B9) | M | einmalig |

#### Phase 3 – Englisch

| Paket | Größe | |
| :-- | :-: | :-- |
| UI-Wörterbuch füllen (~800 Wörter) | S | **pro Sprache** |
| Landing-Inhalte: `site-texts`, `why`, FAQ (~7.000 Wörter) | **L** | **pro Sprache** |
| Statische Seiten (12 Stück) | **XL** | **pro Sprache** |
| Reviews / Eventtypes / Landingsection | **L** | **pro Sprache** |
| Rechtstexte inkl. juristischer Abnahme | M | **pro Sprache** |
| Qualitätssicherung: Sprachbrüche, interne Links, hreflang, Sitemap | M | **pro Sprache** |
| `hreflang`/`x-default`/Sitemap-Annotation scharfstellen, Status auf `live` | S | einmalig |

### 8.3 Die Kennzahl, auf die es ankommt

Der Wert dieses Plans steckt in der Spalte ganz rechts:

- **Einmalig:** 18 Pakete – das gesamte Skelett
- **Pro Sprache:** 6 Pakete, und **alle sechs sind Übersetzungs- und Prüfarbeit, kein Code**

Genau das war die Vorgabe. Wenn nach Phase 2 noch ein Paket „pro Sprache" Code erfordert, ist das Skelett an dieser Stelle unfertig.

---

## 9. Checkliste: eine neue Sprache aufnehmen

*Der Zielzustand nach Phase 2. Heute ist keiner dieser Schritte so einfach.*

1. `LOCALES` und `LOCALE_META` in `src/i18n/config.ts` ergänzen (TypeScript erzwingt den Meta-Eintrag).
2. `public/i18n/<locale>/status.json` auf `entwurf` setzen → die Sprache ist gebaut, aber `noindex`.
3. `public/i18n/<locale>/registry.json` anlegen: welche Seiten es in dieser Sprache gibt.
4. `public/i18n/<locale>/ui.json` füllen – der Build meldet fehlende Schlüssel.
5. Inhalte im Admin übersetzen, Sprache im Umschalter wählen. Fortschrittsanzeige führt.
6. Prüfen: keine deutschen Wortfetzen, kein interner Link führt aus der Sprache heraus, `hreflang` reziprok, Sitemap deckt sich mit der Sichtbarkeitsliste.
7. Status auf `live` setzen.

**Kein Schritt erfordert eine neue Routendatei, keine Kopie einer Sperrliste und keine Änderung im Admin-Code.**

---

## 10. Tests und Schutzgeländer

### 10.1 Bestehende Tests, die brechen werden

Sie dürfen nicht einfach entfernt werden – sie sichern Zusagen ab.

| Test | Bricht bei | Maßnahme |
| :-- | :-- | :-- |
| `tests/impressum-ueberall.test.ts:41-45` | Lokalisierung des Footers – prüft **wörtlich** `href="/impressum"` | Im **selben Commit** auf `localizePath` umstellen. Sichert §5 DDG ab |
| `tests/nav-routes.test.ts:31-40` | Lokalisierter Navigationslink – `routeExists()` sucht `<seg>.astro`, bei `/fr/faq/` entsteht `seg='fr/faq'` | Um Locale-Präfixe erweitern |
| `tests/page-visibility.test.ts` | B1-Reparatur | Um `bw`- und Präfix-Fälle erweitern; **beide Kopien** der Regel prüfen |
| `tests/skill-url-vs-inhalt.test.ts:28` | E18 | Auf alle drei Skills ausdehnen |
| `tests/wix-weiterleitungen.test.ts` | Änderungen an `vercel.json` | Unverändert lassen, als Regressionsnetz nutzen |

Von 32 Testdateien wurden im Audit nur wenige vollständig gelesen – **vor Phase 1 einmal komplett durchsehen.**

### 10.2 Neue Schutzgeländer

1. **Slug-Kollision:** Kein Landing-/Skill-/Event-Slug darf einem `LOCALES`-Eintrag gleichen oder wie ein Locale-Code aussehen (`bw`!).
2. **UI-Vollständigkeit:** Jeder Schlüssel der Registry existiert je Locale oder fällt bewusst auf `de` – als Build-Warnung mit Zähler.
3. **Sprachbruch-Erkennung:** Es gibt heute **keine** Prüfung, die erkennen würde, dass eine fremdsprachige Seite deutschen Inhalt zeigt. `tests/i18n-pfade.test.ts` prüft ausschließlich die Pfad-Arithmetik von `localizePath`. Nötig ist ein Test über den gebauten Stand: kein `lang="en"`-Dokument enthält Strings aus der deutschen UI-Referenz.
4. **hreflang-Reziprozität:** Jede in einer Alternative genannte Seite nennt ihrerseits alle Alternativen.
5. **Sichtbarkeits-Gleichlauf:** Kein Pfad ist gleichzeitig `noindex` im HTML und in der Sitemap – über **beide** Kopien der Regel.
6. **Overlay-Struktur:** Keine Overlay-Datei enthält Struktur-Felder (Slug, Tags, `enabled`, `priority`, Bildpfade).

### 10.3 Was der Publish-Weg nicht absichert

Für alles, was das Admin-Tool schreibt, ist der `pre-commit`-Hook **kein Sicherheitsnetz** – der Weg läuft über die GitHub-API, dort läuft kein Hook. Overlay-Dateien landen ungeprüft im Build. Die Prüfungen müssen deshalb entweder in den Worker oder in den Vercel-Build, nicht in den Hook.

---

## 11. Bewusst nicht geplant

- **Volle Parität der 114 Kombiseiten.** Größenordnung ~170 Seiten pro Sprache, und 129 deutsche Pfade stehen ohnehin auf `noindex`.
- **Astros eingebautes i18n-Routing.** Greift in die Erzeugung aller bestehenden deutschen Adressen ein (5.4).
- **Auto-Weiterleitung nach Browsersprache.** Statischer Build ohne SSR-Adapter; Crawler-Probleme.
- **Maschinelle Übersetzung als Standardweg.** Der KI-Weg im Admin könnte Vorschläge liefern, ist aber ungeprüft – und laut Notiz sind dort nur ~47 Cent Restguthaben. Für Rechtstexte scheidet er ohnehin aus.
- **Übersetzte Bilder.** Bilder bleiben gemeinsame Quelle. Nur ihre `alt`/`title`-Metadaten werden übersetzt.

---

## 12. Offene Fragen

**An Sasha – vor Phase 0:**

1. **E1 und E18** sind irreversibel. Sollen englische URLs übersetzt werden (`/en/cologne/`) oder deutsche Slugs behalten (`/en/koeln/`)? Die empfohlene Slug-Map hält das offen, kostet aber Vorarbeit.
2. **E14:** Landings + statische Seiten – oder ist ein kleinerer Anfang gewünscht (nur Startseite + Kontakt + eine Landing als Beweis)?
3. Soll der **`SiteTextsManager`-Datenverlust** (B6) sofort separat repariert werden, unabhängig von diesem Vorhaben? Er zerstört heute Daten.
4. Die **Doku behauptet, die Seite sei nicht live** (`CUTOVER_PLAN.md`, `ARBEITSLISTE.md`, `memory/seo.md`) – soll ich das im Zuge dessen richtigstellen?

**An Gabriele:**

5. **Wer übersetzt?** Sie selbst, ein Büro, oder maschinell vorbereitet und von ihr geprüft? Alle „pro Sprache"-Schätzungen betreffen nur die *technische* Arbeit – die ~10.000 Wörter sind darin nicht enthalten.
6. **Wer ist die englische Zielgruppe?** Internationale Firmenkunden in Deutschland, oder Anfragen aus dem Ausland? Das entscheidet über den `hreflang`-Regionalcode (`en` vs. `en-GB`) und darüber, ob Städteseiten in Englisch überhaupt sinnvoll sind.
7. **Welche Sprachen sollen realistisch folgen?** `nl` steht schon als Kommentar im Code. Die Antwort ändert am Skelett nichts, aber an der Priorität von Phase 2.

---

## Anhang A: Befundregister

Die wichtigsten Fundstellen, nach Datei sortiert. Alles am Code geprüft.

### Website – `src/`

| Fundstelle | Befund |
| :-- | :-- |
| `i18n/config.ts:13-15` | Verspricht **einen** Fallback; es sind **drei** |
| `i18n/config.ts:31-32` | `LOCALES` ist Code-Konstante, `Locale` ein Literal-Union |
| `i18n/config.ts:35-38` | `hreflang`-Feld (`fr-BE`) ist **tote Konfiguration** |
| `i18n/config.ts:67-70,78,91,104` | `de` hat definitionsgemäß **kein** Overlay (B3) |
| `i18n/config.ts:103-117` | Kein Cache; O(Seiten × Sprachen) fs-Zugriffe zur Bauzeit |
| `i18n/config.ts:118-133` | Registry kennt **nur Landings** |
| `layouts/Layout.astro:10-11` | Deutsche Default-`title`/`description` |
| `layouts/Layout.astro:68-70` | `hreflang={a.locale}`; keine Selbstreferenz, kein `x-default` |
| `layouts/Layout.astro:83,86` | Header und Footer **unbedingt und locale-blind** |
| `pages/fr/[landing].astro:48` | `LOCALE_READY_SECTIONS` – dateilokal, Provisorium |
| `pages/fr/[landing].astro:53-56` | Literal `'fr'` in `getStaticPaths` – Astro hebt über Konstanten |
| `pages/fr/[landing].astro:71-75,89` | Französische SEO- und Breadcrumb-Literale im Routen-Code |
| `pages/fr/[landing].astro:121` | `getSectionOrder` statt `resolveSectionOrder` – umgeht den Build-Guard |
| `utils/pageVisibility.ts:68-78` | **B1.** Präfixregel locale-blind, zweite Kopie in `astro.config.mjs:110-135` |
| `utils/faq.ts:25-26,232-243` | **B5/B7.** Verzeichnisweiter Fallback |
| `utils/why.ts:59-61` | **B5.** Kein Datei-Fallback |
| `utils/why.ts:62-87` | Hartkodierte Liste mit **anderen Titeln** als `public/why/default.json` |
| `utils/siteTexts.ts:12-30` | `SITE_TEXT_DEFAULTS` – deutsche Originale liegen im **Code**, nicht in `public/` |
| `utils/siteTexts.ts:46-56` | `mergeSection` – stiller feldweiser Deutsch-Einsickerkanal |
| `utils/siteTexts.ts:132-146` | `getHomeIntro` ohne Locale-Parameter |
| `utils/skills.ts:64,186` | **B4/E18.** URL **und** Inhalts-Schlüssel aus dem deutschen Titel |
| `utils/navigation.ts:73,123` | Dropdown-Zuordnung am **literalen Label-Text** |
| `utils/gallery.ts:72-76` | Facetten-Überschriften hart im Code |
| `utils/componentConfig.ts:108-124` | `resolveSectionOrder` – Build-Guard, den die FR-Route umgeht |
| `components/LangSwitcher.astro:25,37-45` | Auf zwei Einträge ausgelegt; `aria-label` „Sprache / Langue" |
| `components/header/LanguageMenu.astro` | **Toter Zweitumschalter** mit britischer Flagge, kein Importeur |
| `components/Contact.astro:39,49-72` | Formular + Betreff + Erfolgsmeldung deutsch |
| `components/FAQ.astro:62,92,95,128,134` | Überschrift, Suchhinweis, zwei interne Links |
| `components/Slideshow.astro:38,71` | „Unsere Kunst"; Galerie-Link auf deutsche Route |
| `scripts/formspree.js:20,23` | Deutsche `alert`-Texte |

### Website – Build und Konfiguration

| Fundstelle | Befund |
| :-- | :-- |
| `scripts/sync-faq-tags.mjs:62-71` | **Das einzige i18n-fähige Skript** – und die Vorlage für die anderen 25 |
| `scripts/sync-faq-tags.mjs:50-60` | Protokoll des FR-FAQ-Ausfalls: „und niemandem fiel es auf" |
| `scripts/sync-faq-tags.mjs:165` | Tag-Zuordnung über deutschen Slug – bricht bei übersetzten Slugs |
| `scripts/validate-image-refs.mjs:22,34-45` | **B2.** Läuft rekursiv über `public/i18n/**` |
| `scripts/sync-content-safe.mjs:19-21` | `validate:images` beim Build **weich**, beim Commit **hart** |
| `scripts/remove-landing.mjs:326-333` | Entfernt aus 8 deutschen Wurzeln, kennt `public/i18n` nicht |
| `.githooks/pre-commit:5,8-9` | Ruft die **harte** Variante; `git add`-Liste ohne `public/i18n` |
| `.github/workflows/sync-landings.yml:52` | Verwirft Overlay-Änderungen **aktiv** |
| `astro.config.mjs:107-135` | Sitemap ohne `i18n`-Option; zweite Kopie der Präfixregel |
| `vercel.json` | 177 Redirects, 4 Wildcards, kein Sprachpräfix; **kein** `rewrites` |
| `public/landings/landings.md:32` | Slug **`bw`** – zwei Zeichen, formgleich mit Locale-Code |
| `public/skills/skills.json` | Nur `Schnellzeichner` hat `link`; kein `id`/`slug` |
| `public/config/page-visibility.json` | 129 Einträge, darunter `/belgique/` |
| `public/i18n/fr/landings.json` | Bricht das Spiegel-Prinzip (Wurzel statt `landings/landings.md`) |
| `public/img/slides/luxembourg/1_caricaturiste-….webp` | FR-`altOverride`, deutscher `title` |

### Admin

| Fundstelle | Befund |
| :-- | :-- |
| `services/state.ts:3-9,12,64-71` | `PendingFile` ohne `locale`; Undo global über alle Sprachen |
| `services/publish.ts:25-31,111-144` | Ein atomarer Commit, keine Pfad-Transformation, sprachlose Nachricht |
| `services/publish.ts:124-131,134-140` | Löschung ohne `sha` wird **verworfen**; kein Konfliktschutz je Datei |
| `services/github.ts:496-507,522-534` | `additions` ohne `sha`; nur Repo-Head geprüft |
| `worker/src/security.ts:84,118-121` | Erlaubt **jeden** Pfad unter `public/` – kein Worker-Umbau nötig, aber auch keine Sicherung |
| `worker/src/aiTools.ts:98-113,118-200` | **B9.** Zweiter Schreibweg mit fest verdrahteten deutschen Zielpfaden |
| `components/SiteTextsManager.tsx:14-32,35-41,68-85` | **Datenverlust heute** + deutsche Defaults als „Übersetzung" |
| `components/FaqManager.tsx:88-97,109,116-121,284-312` | **B7.** „Seiten-FAQs" liest fest `public/faq` |
| `components/ImageManager.tsx:237,276-286,428-476,516-547,707-724` | Leerschreib-Muster; Why-Fallback als eigener Inhalt; Ganzdatei-`meta` |
| `components/SiteGraphView.tsx:414-427,457` | Leerschreib-Muster; 129-Zeilen-Normalisierungs-Diff beim ersten Klick |
| `components/CleanupManager.tsx:106-140,194,252-263` | Löscht Binärdateien; `dir||sha` schützt zufällig; **`:257-263` ist die richtige Vorlage** |
| `components/InterfaceView.tsx:47,248-299` | Dialog spricht von „dieser Seite", ändert **alle** Sprachen |
| `components/Dashboard.tsx:56,80-101,278-505,526-624,692-709` | Stadt-Dropdown taugt nicht als Vorbild; Quick-Add nur deutsch; kein Modus-Merkmal |
| `components/CityManager.tsx:1-14,103-108` | **Toter Code** – wird nicht gerendert, es gibt keinen Tab „Städte" |
| `components/interface/LivePreview.tsx:51-78,106-107` | Vorschau ohne Locale-Präfix |
| `utils/loadCache.ts:9-26` | Cache nach Inhaltsart, **nicht nach Sprache** |
| `services/tagVocabulary.ts:41-46` | Ein `tags.json` mit deutschen Labels versorgt alle Chips |

---

## Anhang B: Methodik und Lücken

### Was geprüft wurde

Beide Repos vollständig lesend: 30 Loader, 17 Seiten-Dateien, 36 Komponenten, 26 Skripte, `astro.config.mjs`, `vercel.json`, `.githooks/`, `.github/workflows/`, der Admin-Quelltext inkl. Worker, und der Content-Bestand unter `public/`.

### Was ausdrücklich **nicht** geprüft wurde

Diese Liste ist Teil des Ergebnisses – sie sagt, wo dieser Plan blind ist:

1. **Kein Build ausgeführt.** Das Audit war rein lesend. Aussagen über ausgeliefertes HTML stammen aus dem Quelltext oder aus einem `dist/`-Stand vom **2026-07-31**, der bereits veraltet ist (alte hierarchische Kombi-URLs). **Wo `dist/` als Beleg diente, ist der Befund am Code gegengeprüft.**
2. **Die `[locale]`-Route ist nicht experimentell verifiziert** (E2). Das Kollisionsargument wurde am Code widerlegt, aber ein Build hat es nicht bestätigt. **Vor der Umsetzung in einem Branch prüfen.**
3. **Die tatsächliche Qualität der bestehenden französischen Übersetzungen** wurde nicht bewertet – nur Existenz und Struktur.
4. **Die 119–156 `public/`-Vorkommen im Admin wurden gezählt, aber nicht einzeln klassifiziert** in „muss locale-bewusst werden" vs. „ist sprachneutral". Die Größe **XL** für den Pfad-Builder ist deshalb eine **Obergrenze, keine Messung**.
5. **`vercel.json` nur teilweise durchgesehen** (~60 der 177 Redirects).
6. **Von 32 Testdateien wurden wenige vollständig gelesen.** Es können weitere Guardrails brechen.
7. **Die KI-Anbindung im Admin** wurde nicht auf i18n-Tauglichkeit gelesen – nur ihre Schreibpfade (B9). Sie könnte der naheliegende Hebel für Übersetzungsvorschläge sein oder umgekehrt deutschen Text in englische Dateien schreiben.
8. **Der Entwurfs-/Vorschau-Branch-Mechanismus** (`services/publish.ts`, `resetBranch`) wurde nicht gegen eine Locale-Dimension durchdacht. Möglicherweise wäre „Sprache" dort ein besserer Aufhänger als im Pfad – **das ist die eine Alternative zu E7, die dieser Plan nicht bewertet hat.**
9. **Der Übersetzungsaufwand in Personenstunden** ist nicht geschätzt, nur in Wörtern.

### Divergenzen zwischen Doku und Code

Beim Prüfen sind sieben Stellen aufgefallen, an denen die Projektdokumentation etwas anderes sagt als der Code. Sie gehören unabhängig von diesem Vorhaben korrigiert:

1. `memory/i18n.md` und `src/i18n/config.ts:13-15`: **ein** Fallback dokumentiert, **drei** implementiert.
2. `src/i18n/config.ts:17-19`: „Neue Sprache = Eintrag in `LOCALES`, keine Code-Änderung nötig" – für eine neue **Seite** stimmt das, für eine neue **Sprache** nicht.
3. `src/i18n/config.ts:12-13`: „Overlay spiegelt `public/`" – `public/i18n/fr/landings.json` tut das nicht, und die deutschen `contact`/`eventtypes`/`why`-Originale liegen gar nicht in `public/`, sondern in `siteTexts.ts:12-29`. Das Overlay **erweitert** dort, statt zu spiegeln.
4. `fr/[landing].astro:44-46`: `LOCALE_READY_SECTIONS` filtert **Datenquellen**, nicht Beschriftungen – `faq` und `contact` stehen als „übersetzt" darin und sind es nicht.
5. `CLAUDE.md` und `Dashboard.tsx:236`: Publish schreibt **nicht** sequenziell, sondern als ein atomarer GraphQL-Commit.
6. `CUTOVER_PLAN.md`, `ARBEITSLISTE.md`, `memory/seo.md`: behaupten, die Seite sei nicht live. **Sie ist es.**
7. Nutzer-Notiz „4 tote Bildverweise blockieren jeden Commit": **veraltet**, auf sauberem `main` läuft der Wächter grün durch.

---

*Erstellt am 2026-08-04. Grundlage: vollständige lesende Bestandsaufnahme beider Repos durch 14 parallele Prüfer, davon 3 mit adversarischem Auftrag. Kein Code geändert.*
