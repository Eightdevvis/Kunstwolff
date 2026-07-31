## Der gemeinsame Konstruktionsfehler

Es gibt genau einen, und er erklärt 30 der 40 geprüften Funde: **die Website ist im Juli auf "der Tag entscheidet" umgestellt worden, alle Werkzeuge daneben nicht.** Der Admin, der SiteGraph und teilweise die Sync-Skripte fragen weiterhin den Ablageort. Damit existiert jede Zuordnung zweimal — einmal als Tag (was der Besucher sieht) und einmal als Ordner (was die Redakteurin sieht) — und niemand hält die beiden zusammen.

Daraus folgen drei Klassen von Schäden, die in den Befunden immer wieder auftauchen:

- **Sichtlücke:** der Admin zeigt weniger, als die Seite zeigt (Bilder, FAQs, Reviews — alle drei).
- **Erzeugerlücke:** je nachdem, ob ein Inhalt über den Admin, über git oder über den Build entsteht, bekommt er andere Tags.
- **Regellücke:** die drei Datentypen deuten "kein Tag" und "Dimension nicht abgefragt" nach drei verschiedenen Regeln, obwohl die Code-Kommentare behaupten, sie seien gleich.

Pfad-Kürzel in allen Belegen: `website/` = `/home/sasha/codicus/Kunstwolff/Kunstwolffwebsite/.claude/worktrees/tag-sweep/`, `admin/` = `/home/sasha/codicus/Kunstwolff/kunstwolff-admin/.claude/worktrees/tag-sweep/`.

## Befunde

### 1. Der Admin-Parser liest keinen Tag-Block und löscht ihn beim Speichern
**Wirkung:** Datenverlust, läuft jetzt.

**Was passiert:** Gemessen mit dem echten Admin-Parser über alle FAQ-Dateien: 83 von 83 Dateien mit `tags:`-Block liefern `tags = []`. Ursache ist die Schreibweise `  skills: []`, die die Sync-Skripte erzeugen und die der handgeschriebene Parser weder als Unterblock noch als Listenelement erkennt; da `skills` immer zuerst steht und in allen 83 Dateien leer ist, bricht der Sub-Key-Loop sofort ab. Folge 1: der Editor zeigt bei jeder FAQ null Chips. Folge 2: `hasAnyTags` ist false, der Block wird beim Speichern weggelassen. Bei den 57 Stadt-FAQs kaschiert der nächste Build den Verlust (Ordner → `landings` wird neu abgeleitet), bei den 12 Anlass-FAQs in `public/faq/default` **nicht** — dort leitet nichts nach, der Anlass-Tag ist weg. Derselbe Fehler trifft Reviews: 33 von 38 verlieren beim Lesen ihren `landings`-Tag, weil `events: []` davorsteht.

**Beleg:** `admin/src/utils/markdown.ts:92` (`isNestedBlock`-Regex), `admin/src/utils/markdown.ts:101` (`if (!subKey) break;`), `admin/src/components/FaqManager.tsx:133-140` (`parseTags` nimmt ein Array klaglos als Objekt), `admin/src/components/FaqManager.tsx:181` (`if (hasAnyTags(faq.tags)) frontmatter.tags = faq.tags;`), Gegenseite `website/scripts/sync-faq-tags.mjs:134` (`lines.push(\`  ${dim}: []\`)`).

**Zusatzschaden aus demselben Loch:** Ein bewusst geleerter Tag-Block lässt sich nicht durchsetzen — `website/scripts/sync-faq-tags.mjs:156-158` überspringt nur Dateien, die einen `tags:`-Block haben, und leitet sonst aus dem Pfad wieder `landings: [stadt]` ab (`sync-faq-tags.mjs:110-127`). Weil der Admin nach Befund 1 bei *jeder* FAQ leere Tags im Speicher hat, ist "Tag löschen" nicht der Sonderfall, sondern der Normalfall jedes Speicherns.

**Ursache:** Zwei Schreiber für denselben YAML-Block, ein Leser, der nur seine eigene Schreibweise kennt. Der Admin hat einen eigenen Frontmatter-Parser statt YAML/gray-matter.

**Reparatur:** In `admin/src/utils/markdown.ts:92` die Regex auf `^\s+\w+:\s*(\[\s*\])?$` erweitern und in `:101` bei leerer Dimension nicht abbrechen, sondern die leere Liste übernehmen. Dazu `saveFaq` (`FaqManager.tsx:181`) einen vorhandenen Block auch dann schreiben lassen, wenn alle drei Dimensionen leer sind — so wie `ReviewManager.tsx:167-170` es bereits tut; `admin/src/utils/markdown.ts:168` (`subVal.length === 0 -> continue`) muss dafür weg.

**Messpunkt:** Round-Trip über alle 85 FAQ- und 38 Review-Dateien: `parseFrontmatter` → `serializeFrontmatter` muss byte-identisches Frontmatter liefern. Zweitens: im FAQ-Editor trägt `default/anlass--firmenfeier--ablauf.md` sichtbar den Chip "Firmenfeier"; nach Speichern ohne Änderung steht `events:\n  - firmenfeier` noch in der Datei.

---

### 2. Stadtseiten zeigen alle Bewertungen, Anlass-Seiten keine — die Review-Auswahl ist nur zur Hälfte verdrahtet
**Wirkung:** Besucher sieht falsch.

**Was passiert:** Der Slider auf jeder Stadtseite ist `HomepageReviews`, und die holt den kompletten Bestand. Am Build gezählt (`review-slide `): `/` = 38, `/berlin/` = 38, `/trier/` = 38 — identisch, obwohl Trier eigene Bewertungen hat und Berlin keine. Die einzige ortsbezogene Funktion hat null Aufrufer. Zweite Ausprägung derselben Halbfertigkeit: die `events`-Dimension der Reviews wird geparst, aber von keiner Funktion je abgefragt, und die Anlass-Seiten haben gar keinen Review-Block — `/messe/`, `/firmenfeier/`, `/hochzeit/`, `/private-feier/` enthalten 0 Review-Slides. Die 5 Bewertungen mit Anlass-Tag (u. a. `frankfurt/review0.md` = messe) erscheinen dadurch auf 60 bzw. 38 Seiten statt auf einer.

**Beleg:** `website/src/pages/[landing].astro:181` und `:199` (`homepageReviews: {}`), `website/src/components/HomepageReviews.astro:5` (`getAllReviews()`), `website/src/utils/reviews.ts:248` (`getReviewsByLanding` — grep über `src/`, `tests/`, `scripts/`: null Aufrufer), `website/src/utils/reviews.ts:216-246` (`reviewsForLanding` nutzt nur `hatOrtTag` und `filterBySkill`), `website/src/pages/[landing].astro:210-219` (Event-Registry ohne Review-Block).

**Ursache:** `reviewsForLanding` wurde gebaut und nur an den Skill-Kombiseiten verdrahtet (`/schnellzeichner/berlin/` zeigt korrekt 9). Die Stadtseite hatte den Homepage-Slider schon vorher im Stack, und ein prop-loser Aufruf fällt nicht auf.

**Reparatur:** In `website/src/pages/[landing].astro:181` den Review-Block mit `getReviewsByLanding(landing)` speisen. Für den Anlass: `reviewsForLanding` um einen `event`-Parameter erweitern (analog `FAQFilterContext.event`) und dem Event-Zweig `[landing].astro:210-219` einen Review-Block geben.

**Messpunkt:** `grep -c 'review-slide ' dist/berlin/index.html` und `dist/trier/index.html` unterscheiden sich, und Trier enthält die Trier-Reviews. `dist/hochzeit/index.html` enthält die drei Hochzeits-getaggten Bewertungen.

**Nicht in `fr/`:** `website/src/pages/fr/[landing].astro:48` führt `homepageReviews` gar nicht in `LOCALE_READY_SECTIONS`; `dist/fr/belgique/index.html` hat 0 Review-Slides. Dort ist nichts zu tun.

---

### 3. Die französische Landingpage zeigt vier hartkodierte deutsche FAQs
**Wirkung:** Besucher sieht falsch.

**Was passiert:** Alle 3 FR-FAQ-Dateien tragen noch `categories:` und keinen `tags:`-Block. `faq.ts:167` mischt `categories` in die Skill-Dimension; die FR-Seite fragt die Skill-Dimension nicht ab, also greift die Ausschlussregel und wirft alle drei raus. `getFAQsForContext` liefert `[]`, und `FAQ.astro:57` fällt auf einen hartkodierten deutschen Block zurück. Am Build nachgemessen: `dist/fr/belgique/index.html` enthält genau 4 `<details>`, wörtlich aus `FAQ.astro:36/40/44/48` ("Wie buche ich einen Schnellzeichner von Kunstwolff?" usw.). 3 von 3 FR-FAQs kommen nirgends an.

**Beleg:** `website/src/pages/fr/[landing].astro:115` (`faq: { city: slug, locale: LOCALE }` — ohne `categories`), `website/src/utils/faq.ts:133` (`if (gesucht.length === 0) return false;`), `website/src/utils/faq.ts:167`, `website/src/components/FAQ.astro:31`, `:34-55` (`DEFAULT_FAQS`), `:57`, `website/public/i18n/fr/faq/belgique/branding.md` (Frontmatter mit `categories`, kein `tags`), `website/scripts/sync-faq-tags.mjs:32` (`faqRoot` fest auf `public/faq`).

**Ursache:** Die Migration hat nur `public/faq` angefasst; das i18n-Overlay `public/i18n/<locale>/faq` wurde nie mitgezogen. Der stumme deutsche Fallback verdeckt den Fehler vollständig.

**Reparatur:** `sync-faq-tags.mjs:32` zusätzlich über `public/i18n/*/faq` laufen lassen (Wurzel je Locale, gleiche `tagsFromPath`-Regel), damit die drei Dateien `landings: [belgique]` bekommen. Zweitens `FAQ.astro:57`: leerer Kontext bleibt leer, statt deutschen Text nachzuschieben — mindestens locale-abhängig.

**Messpunkt:** `dist/fr/belgique/index.html` enthält 3 `<details>` mit französischem Text und keine Zeichenkette aus `FAQ.astro:36-48`.

---

### 4. Jede Seite zeigt dieselben vier FAQs; zehn FAQs erscheinen nur im Archiv
**Wirkung:** Besucher sieht falsch (Duplicate Content), Redaktionsarbeit ohne Effekt.

**Was passiert:** Nach der Sortierung schneidet der Deckel hart bei 4 ab, und kein Aufrufer setzt ihn je anders. Gemessen: 158 der 170 gebauten Seiten haben eine FAQ-Sektion mit exakt 4 `<details class="faq-item">`, `dist/faq/index.html` hat 83. 60 dieser 158 Seiten zeigen exakt dieselben vier Fragen. 10 Dateien landen ausschließlich auf `/faq/` (u. a. `default/kosten.md`, `default/speedpainting.md`, `default/was-ist-schnellzeichner.md`).

**Beleg:** `website/src/components/FAQ.astro:11` (`maxItems = 4`), `:58` (`finalList.slice(0, maxItems)`), Aufrufer ohne `maxItems`: `website/src/pages/index.astro:54`, `[landing].astro:205`, `[landing].astro:251`, `[skill].astro:79`, `[skill]/[landing].astro:227`, `:265`, `fr/[landing].astro:115`.

**Ursache:** Der Deckel stammt aus der Ordner-Zeit, als pro Ordner ohnehin nur wenige Dateien lagen. Mit der Tag-Auswahl passen jetzt 14 allgemeine FAQs auf jede Seite, es bleiben aber 4 Plätze, und die Lesereihenfolge entscheidet alphabetisch nach Dateiname.

**Reparatur:** `maxItems` pro Seitentyp setzen (6–8) und die Reihenfolge unterhalb der Treffergenauigkeit nicht dem Dateinamen überlassen. Klein und sofort: `maxItems` an den Stadt- und Anlass-Aufrufern hochsetzen.

**Messpunkt:** Die Zahl der Seiten, die exakt dieselben vier Fragen zeigen, sinkt (heute 60 von 158); `default/kosten.md` erscheint auf mindestens einer Nicht-Archiv-Seite.

---

### 5. Die Galerie zeigt den Mediathek-Zwischenspeicher inklusive Firmenlogos
**Wirkung:** Besucher sieht falsch.

**Was passiert:** `public/img/slides/mediathek` enthält 36 Bilder (14 direkt, 22 in `mediathek/somfot`), 22 davon ohne jeden Tag. Alle 36 sammelt `getAllSlidesWithTags` ein, und `/galerie/` gibt sie aus — im Build nachweisbar: `/img/slides/mediathek%2Fsomfot/obi_logo.webp`, `samsung-logo-1993.webp`, `saarlandtherme-logo-150px.webp`. Der Admin-Code verspricht ausdrücklich das Gegenteil.

**Beleg:** `website/src/utils/slideImages.ts:329-342` (Sammler ohne jeden Ausschluss), `website/src/utils/gallery.ts:185` (`getAllSlidesWithTags()`), Gegenbeispiel im selben Repo `website/scripts/tags.mjs:188` (`NON_PLACE_FOLDERS = new Set(['default','mediathek','events'])`), Widerspruch `admin/src/services/mediaLibrary.ts:29-32` ("Er ist auf der Website inert … keine Seite rendert ihn; nur Homepage, falls ein Bild EXPLIZIT in default-selection.json aufgenommen wird").

**Ursache:** Der Pool-Ordner ist eine Konvention, die nur Sync-Skripte und Admin kennen. Die Galerie fragt gar keinen Tag ab, sie zeigt den kompletten Bestand.

**Reparatur:** In `gallery.ts:185` nur Bilder mit mindestens einem Tag zeigen — das hält die 22 taglosen automatisch draußen und passt zum Zielbild besser als eine zweite Ordner-Sonderregel. Kommentar in `mediaLibrary.ts:29-32` mitkorrigieren.

**Messpunkt:** `grep -c 'obi_logo\|samsung-logo\|saarlandtherme-logo' dist/galerie/index.html` = 0; Gesamtzahl der Galerie-Kacheln sinkt um 22.

---

### 6. Der Admin navigiert nach Ordner, die Seite wählt nach Tag — in allen drei Datentypen
**Wirkung:** Redakteurin sieht nicht; bei zwei Ausprägungen zusätzlich Datenverlust.

**Was passiert:** Ein Befund, fünf Ausprägungen, eine Ursache: `resolveEditorProps` reicht eine Ordner-Zeichenkette an jeden Editor durch, und jeder Editor listet ein Verzeichnis.

- **Bilder / Anlass und Stadt:** `/firmenfeier/` zeigt 28 Slides, der Ordner `public/img/slides/events/firmenfeier` enthält 1 Datei; `/messe/` 31 vs. 7; `/hochzeit/` 34 vs. 10; `/private-feier/` 6 (alles Auffüller aus `getDefaultSlides`) vs. 0. Über alle Seiten: **126 Tag-Zuordnungen liegen außerhalb des Ordners, den der Admin-Tab listet; 107 davon betreffen eine gebaute Seite** (75 Anlass, 32 Ort). Die Lücke ist strikt einseitig — kein Bild im Seitenordner ist ohne den passenden Tag.
- **Bilder / Skill:** `/schnellzeichner/` und `/szenenmaler/` zeigen je 24 Slides; der Editor öffnet `public/img/slides/schnellzeichner` — den Ordner gibt es nicht (38 Ordner auf erster Ebene, keiner heißt nach einem Skill). Der leere Tab zeigt zudem die falsche Erklärung "Wird mit default zur Zeit aufgefüllt!", obwohl `getSkillSlides` gar nicht auffüllt. **Ein Upload dort erzeugt ein Bild ohne jeden Tag** (siehe Befund 9) — es ist danach auf keiner Seite.
- **FAQs:** Der FAQ-Tab einer Anlass-Seite öffnet `public/faq/events/firmenfeier`; unter `public/faq` gibt es 21 Verzeichnisse (default + 20 Städte), keinen `events/`-Ordner. Die 12 Anlass-FAQs liegen flach in `default/` und tragen den Anlass nur als Tag. Der Ladefehler wird geschluckt.
- **Reviews:** derselbe Pfad `public/reviews/events/firmenfeier` existiert nicht; einen Modus-Umschalter wie beim FaqManager gibt es hier nicht, der Tab bleibt für jede Anlass-Seite leer. Zusätzlich listet der ReviewManager nur `review*.md` in der obersten Ebene, während die Website jede `.md` rekursiv liest (heute latent: alle 38 echten Dateien heißen `reviewN.md`).
- **Globale Komponenten:** mit `city="default"` liefern beide Modi denselben Pfad; Jenny sieht zwei Reiter ("Standard-FAQs" und "default-FAQs") mit identischen 26 Dateien und zwei sich widersprechenden Erklärbändern.

**Beleg:** `admin/src/components/interface/pageTypes.ts:195` (`let city = isEvent ? \`events/${subSlug}\` : (subSlug || 'default');`), `:212-213`, `:228-234`; `admin/src/components/ImageManager.tsx:103` (`dirs: (city) => [\`public/img/slides/${city}\`]`), `:220-222` (geschluckter Ladefehler), `:965` (falscher Hinweistext); `admin/src/components/FaqManager.tsx:66`, `:75-78`, `:80`, `:275`; `admin/src/components/ReviewManager.tsx:80`, `:88-89`, `:257`; `admin/src/components/GlobalComponentsView.tsx:66`; Gegenseite: `website/src/utils/events.ts:262` (`getSlidesByTag('events', slug)`), `website/src/utils/slideImages.ts:431`, `:488`, `website/src/utils/faq.ts:227`, `website/src/utils/reviews.ts:163`.

**Ursache:** Die Umstellung wurde auf der Leseseite gemacht, auf der Schreibseite blieb die Ordnerlogik. Der Admin hat mit `services/mediaLibrary.ts` bereits einen tag-fähigen Sammler — er hängt nur an einem eigenen Tab statt am Editor, den man von einer Seite aus öffnet.

**Reparatur (ein Schnitt, drei Manager):** Die drei Manager laden nicht mehr ein Verzeichnis, sondern den ganzen Baum (`public/img/slides/**`, `public/faq/**`, `public/reviews/**`) und filtern nach `tags[dimension]` — dieselbe Frage, die die Seite stellt. Die Bausteine liegen fertig: `admin/src/services/mediaLibrary.ts` (rekursiver Walk + Tag-Lesen). `IMAGE_TYPE_CONFIG.slides.dirs` bleibt nur noch Upload-Ziel. Voraussetzung: Befund 1 muss vorher sitzen, sonst liest der Filter überall leere Tags.

**Messpunkt:** Pro Seite muss die Kachelzahl im Editor der Slide-Zahl im Build entsprechen: Firmenfeier 28, Messe 31, Hochzeit 34, Schnellzeichner 24. FAQ-Tab der Firmenfeier-Seite zeigt die 3 Fragen, die `dist/firmenfeier/index.html` rendert. Review-Tab von `/trier/` zeigt die Trier-Reviews.

---

### 7. Der SiteGraph rechnet mit FAQ-Ordnern, die es nicht gibt, und verfälscht damit die Duplicate-Content-Prozente
**Wirkung:** Redakteurin sieht Falsches (schlimmer als nichts).

**Was passiert:** Die Schlüssel sind Ordnerpfade (`schnellzeichner`, `events/firmenfeier`), die im Website-Repo nicht existieren. Der Fallback zieht daraufhin den **gesamten** `default`-Ordner (26 lesbare Dateien) in die Signatur. Real zeigt `/firmenfeier/` 3 Anlass-FAQs plus 1 Default, `/schnellzeichner/` 4 Defaults. Auch Städte ohne FAQ-Ordner (berlin, hamburg) werden mit 26 Dateien gerechnet statt mit 4. Dieser Text geht direkt in die Ähnlichkeitsprozente.

**Beleg:** `admin/src/components/SiteGraphView.tsx:580-583` (Schlüsselbildung), `:594-596` (Fallback auf `public/faq/default`), `:1073-1084`, `:1275` (`parts.push`), `:1334` (`buildContentSignature`).

**Ursache:** Zweite, unabhängige Nachbildung der Auswahl — noch im alten Ordner-Modell samt der Ordner-Treppe, die `getFAQsForContext` abgeschafft hat, und ohne den Deckel von 4.

**Reparatur:** Den FAQ-Anteil der Signatur aus derselben Tag-Auswahl speisen (Portierung von `matchesFAQContext` plus `maxItems`). Bis das steht: FAQ-Anteil aus der Signatur nehmen, statt ihn falsch zu füllen — eine Zeile in `:1275`.

**Messpunkt:** Für den Knoten `/firmenfeier/` enthält `faqTextByKey` genau die 4 Fragen, die im Build auf dieser Seite stehen; die Ähnlichkeitswerte der Skill- und Anlass-Knoten ändern sich messbar.

---

### 8. Drei Metadatenfelder steuern die Website, haben im Admin aber keine Oberfläche
**Wirkung:** Redakteurin sieht nicht / arbeitet folgenlos; bei `alt` direkt SEO und Screenreader.

**Was passiert:** Drei Ausprägungen desselben Musters "halb gebautes Feld".

- **`altOverride` vs. `alt`:** In `slides.meta.json` (232 Einträge) haben 85 einen `altOverride`, 85 einen `title`, und **genau 0 ein `alt`**. Der Admin liest und schreibt aber `alt`. Bei diesen 85 Bildern ist das Alt-Feld im Admin leer, obwohl im Quelltext ein Alt-Text steht; tippt Jenny dort etwas hinein, schreibt der Admin `alt` zusätzlich, und die Website nimmt weiter `altOverride`, weil das Vorrang hat. Das Feld `title` (Lightbox-Überschrift, 85 Einträge) hat gar keine Oberfläche.
- **`priority`:** 155 von 232 Einträgen tragen eine Priorität ungleich 0 (bis 146). Die Website sortiert danach, der Admin sortiert gar nicht (Reihenfolge = `listDirectory`). In 20 von 31 Ordnern weichen beide Reihenfolgen voneinander ab. Es gibt kein Eingabefeld, kein Drag&Drop, keine Anzeige. Ein Upload bekommt `images.length + 1` — im Startseiten-Tab landet er damit vorn, im Stadt-Tab (z. B. mainz, 3 Dateien → priority 4) hinter allem.
- **`enabled: false`:** blendet ein Bild website-weit aus, auch aus der Galerie. Im Admin existiert das Feld nur im TypeScript-Typ; kein Schreib- und kein Anzeigezugriff. Aktuell 0 von 232 betroffen, also latent — aber auch nicht bedienbar: Jenny kann ein Bild nicht ausblenden, nur löschen.

**Beleg:** `admin/src/components/ImageManager.tsx:1119-1127` (Alt-Feld, `value` in `:1122`, `onInput` in `:1123`), `admin/src/services/mediaLibrary.ts:124`, dagegen `website/src/utils/slideImages.ts:193-198` (Vorrang `altOverride`) und `website/scripts/sync-slides-metadata.mjs:274,300` (schreibt ausschließlich `altOverride`); `admin/src/components/ImageManager.tsx:316` und `:616` gegen `website/src/utils/slideImages.ts:377-383`; `website/src/utils/slideImages.ts:245,259` gegen `admin/src/components/ImageManager.tsx:59`.

**Reparatur:** (a) Der Admin liest `meta.altOverride ?? meta.alt` und **schreibt** `altOverride` — dann passt er zum Sync-Skript und zur Vorrangregel; `title` als zweites Feld daneben. (b) Das Grid nach `priority` absteigend, dann Pfad sortieren (dieselbe Regel wie `slideImages.ts:377-383`) und den Wert sichtbar machen. (c) `enabled` entweder als Schalter bauen oder website-seitig streichen — der Zwischenzustand ist die schlechteste Variante.

**Messpunkt:** (a) Bei `frankfurt/10_digitale-schnellzeichnung-….webp` steht im Admin derselbe Text wie im `alt`-Attribut von `dist/frankfurt/index.html`; nach Änderung im Admin ändert sich das Attribut im nächsten Build. (b) Erste Kachel im Admin = erste Slide im Build, für alle 31 Ordner.

---

### 9. Ein Upload bekommt je nach Weg unterschiedliche Tags — und in zwei Tabs gar keine
**Wirkung:** Datenverlust (stille Unsichtbarkeit).

**Was passiert:** Zwei Ausprägungen.
- **Zu wenig:** `inferTagsFromKey` kennt nur die Dimensionen `events` und `landings`. Der Ordnername `default` steht in keiner der beiden Listen, `schnellzeichner` auch nicht → Rückgabe `{}`. Ein Foto, das Jenny in die Startseiten- oder eine Skill-Slideshow lädt, bekommt `tags: {}` und wird von `getSlidesByTag` nie gefunden. Im Bestand liegen heute 24 Slides ganz ohne Tag (22 im Pool, 2 in `default/`), sie erscheinen nur unter `/galerie/`. `presetCategories` wird nur gesetzt, wenn das Bild aus der Mediathek übernommen wird — beim normalen Drag&Drop nie.
- **Eingefroren:** Schreibt der Admin eine Dimension als Array vor (auch mit nur einem Wert), ergänzt kein späterer Sync mehr etwas, denn `sync-slides-metadata.mjs` leitet nur ab, wenn die Dimension **fehlt**. Der Kommentar im Admin behauptet das Gegenteil ("die Stichwort-Erkennung im Dateinamen macht scripts/tags.mjs … und die läuft beim nächsten Sync ohnehin über alles"). Ein Bild "weihnachtsfeier-koeln" im Trier-Tab bekommt so `landings: ['trier']` und erreicht Köln nie; über git eingespielt bekäme dieselbe Datei beide Orte. In den echten Daten gibt es einen solchen Fall: `schnellzeichner-duesseldorf/karikaturist-rheinkirmes-duesseldorf.webp` trägt `landings: ['schnellzeichner-duesseldorf']`, obwohl der Dateiname "duesseldorf" enthält — dessen Vorgeschichte ist allerdings **unsicher** (der Pseudo-Ort stand bis 30.07. in `landings.md`, der Tag kann auch vom Sync stammen und erst durch das Entfernen verwaist sein).

**Beleg:** `admin/src/components/ImageManager.tsx:607-620` (`vorbelegteSkills` / `ortUndAnlass`), `:685` (`handleFiles([file], item.categories)`), `admin/src/utils/tagSlug.ts:87-104` (`return {}`), `:78-83` (der falsche Kommentar), `website/scripts/sync-slides-metadata.mjs` (Tag-Block: `Array.isArray(existingTags.landings) ? … : inferLandingsFromKey(…)`), `admin/src/components/ImageManager.tsx:594` (`config.uploadDir(city)`).

**Reparatur:** Beim Upload die Zielseite mitgeben, statt sie aus dem Pfad zu raten — der ImageManager kennt `city` und `imageType`. Für Skill-Tabs `tags.skills = [<skill-slug>]` setzen, für `default` bewusst leer lassen **und** die Kachel sichtbar markieren ("ohne Tag – erscheint nur in der Galerie"). Solange der tag-basierte Editor (Befund 6) nicht steht, den Upload-Ordner für Skills auf `mediathek` umlenken, damit kein Phantom-Ordner entsteht. Zusätzlich: eine Dimension, die der Admin nicht wirklich kennt, gar nicht schreiben — dann bleibt sie für den Sync offen.

**Messpunkt:** Ein Testupload im Schnellzeichner-Tab erscheint danach in `dist/schnellzeichner/index.html`. Und: Zahl der Slides mit `tags: {}` außerhalb des Pools bleibt bei 2 oder sinkt, statt zu wachsen.

---

### 10. Die drei Sync-Skripte haben unterschiedliche Nachbelege-Regeln, obwohl sie behaupten, gleich zu sein
**Wirkung:** Redakteurin kann es nicht erklären; langfristig wachsende Schieflage.

**Was passiert:** Bei Bildern ergänzt jeder Lauf eine fehlende **Dimension**. Bei Reviews und FAQs blockiert ein einziger vorhandener `tags:`-Block die **ganze Datei** für immer, auch wenn zwei von drei Dimensionen leer sind. Wächst das Vokabular um eine Stadt, holen die Bilder sie beim nächsten Lauf auf, Reviews und FAQs nie.

**Beleg:** `website/scripts/sync-slides-metadata.mjs` (pro Dimension: `skills: Array.isArray(existingTags.skills) ? … : normalizeTagList(categories)`) gegen `website/scripts/sync-reviews-tags.mjs:136-139` und `website/scripts/sync-faq-tags.mjs:156-158` (zeichengleich, ganze Datei), Selbstbeschreibung `website/scripts/sync-faq-tags.mjs:9-20` ("bewusst identisch").

**Reparatur:** Die Überspring-Bedingung in beiden Text-Skripten auf Dimensionsebene ziehen: fehlende Dimension nachtragen, vorhandene nie anfassen — dieselbe Regel wie bei Bildern. Achtung Reihenfolge: das darf erst nach Befund 1 kommen, sonst zementiert es die vom Admin geleerten Blöcke.

**Messpunkt:** Eine Review-Datei mit `landings: [trier]` und ohne `events`-Zeile bekommt beim nächsten Lauf `events: []` ergänzt und behält `trier`. Zähler `skipped` des Skripts sinkt von "alle" auf "nur vollständige".

---

### 11. Zwei Anlege-Wege füllen das Vokabular nicht — einer kann den Build zum Absturz bringen
**Wirkung:** Redakteurin arbeitet ins Leere; im Grenzfall Build-Abbruch.

**Was passiert:**
- `EventManager.createEvent` legt keinen Anlass-Tag an (der `CityManager` tut es für Orte). Der neue Anlass ist bis zum nächsten Build nicht als Chip verfügbar.
- Schlimmer: Der Seiten-Slug entsteht mit `slugify` (kein NFD), das Vokabular wird beim Build aus dem **Titel** über `slugifyTag` (mit NFD) geseedet. Titel "Gala Liège" → Admin-Slug `gala-li-ge`, Vokabular-Slug `gala-liege`. Der harte Guard in `sync-tags.mjs` bricht dann mit Exit 1 ab, und da `sync:tags` seit 30.07. harter Build-Schritt ist, baut die Website gar nicht mehr. Ohne Akzent passt es zufällig; alle 4 bestehenden Events sind unauffällig.
- Der FaqManager ruft weder `createTag` noch `ensureTagStored`: ein dort getippter Anlass steht in der FAQ-Datei, aber nicht in `tags.json` — beim nächsten Bild ist derselbe Tag nicht anwählbar.

**Beleg:** `admin/src/components/EventManager.tsx:176-188` (kein `createTag`) gegen `admin/src/components/CityManager.tsx:84` (`void createTag('landings', slug, 'landings.md')`); `admin/src/components/EventManager.tsx:347` → `admin/src/utils/encoding.ts:58-64` (kein NFD) gegen `admin/src/utils/tagSlug.ts:35` (NFD); Guard `website/scripts/sync-tags.mjs:83-89`; `admin/src/components/FaqManager.tsx:498-506` (`addCustom` ohne `createTag`) gegen `admin/src/components/TagChips.tsx:62-77`.

**Reparatur:** In `createEvent` `createTag('events', title, 'events.json', slug)` mit explizitem Slug-Override aufrufen (Dashboard macht das für andere Wege bereits richtig) und den Event-Slug im Formular über `slugifyTag` bilden — oder beim Speichern hart prüfen, dass `slugifyTag(slug) === slug`. `FaqTagInputs` durch die gemeinsame `TagChips` ersetzen.

**Messpunkt:** Ein Testanlass "Gala Liège" im Admin: `npm run sync:tags` läuft ohne Exit 1 durch, und der Chip "Gala Liège" ist sofort im Bild- und im Review-Editor anwählbar, ohne Build.

---

### 12. Die Stichwort-Ableitung trifft ohne Wortgrenzen und ohne Vokabular-Prüfung
**Wirkung:** Datenqualität; bei Bildern heute schon produktiv.

**Was passiert:** Der Anlass-Ableiter ist ein reiner Substring-Test. Nachgemessen: `eventsFromText('Wir haben die Wirkung gemessen und waren begeistert.')` → `['messe']`; `inferEventsFromKey('trier/angemessen-preis.webp')` → `['messe']`. Für Orte macht dasselbe Repo es ausdrücklich anders (Wortgrenzen). Der Bild-Pfad ist produktiv im Einsatz, der Review-Pfad ist nur deshalb heute harmlos, weil die Anlass-Dimension der Reviews nirgends gelesen wird (Befund 2). Dazu ein Tippfehler: der Schlüssel `jubilaum` erzeugt einen Slug, den das Vokabular (`jubilaeum`) nicht kennt — von 12 Schlüsseln der einzige. Und die `events`-Dimension wird beim Sync nicht gegen das Vokabular gefiltert, während `landings` genau dafür `knownLandings` mitführt.

**Beleg:** `website/scripts/sync-reviews-tags.mjs:98-109` und `website/scripts/tags.mjs:238-240` (`includes`) gegen `website/scripts/tags.mjs:213-217` (`-${slug}-`); `website/scripts/sync-slides-metadata.mjs:512-513` (produktiver Aufruf); `website/scripts/tags.mjs:182` (`jubilaum: […]`) gegen `website/scripts/tags.mjs:96-105` / `public/config/tags.json` (`jubilaeum`); `website/scripts/sync-slides-metadata.mjs:15-24` (Vokabular-Filter nur für `landings`). Bekannt als C5 / ARBEITSLISTE 3.5.

**Reparatur:** Beide Ableiter auf die Wortgrenzen-Form aus `tags.mjs:213-217` bringen, das Ergebnis gegen `slugSet(tags.json.events)` filtern, Schlüssel auf `jubilaeum` korrigieren (die Schreibweise `jubilaum` in der Stichwortliste stehen lassen).

**Messpunkt:** Ein Test, der jeden `EVENT_KEYWORDS`-Schlüssel gegen `slugSet(tags.json.events)` prüft, ist grün; `inferEventsFromKey('trier/angemessen-preis.webp')` liefert `[]`.

---

### 13. "Kein Tag" und "Dimension nicht abgefragt" bedeuten bei jedem Datentyp etwas anderes
**Wirkung:** Redakteurin kann das System nicht lernen; bei FAQs heute wirksamer Ausschluss.

**Was passiert:** Derselbe Sachverhalt "trägt in Dimension X keinen Tag" heißt bei Bildern "erscheint nirgends", bei Reviews "erscheint überall, aber nachrangig", bei FAQs "erscheint überall, gleichrangig". Und "die Seite fragt Dimension X nicht ab" heißt bei Reviews "egal", bei FAQs "Ausschluss". Zwei Folgen der strengen FAQ-Regel:
- Eine FAQ mit zwei Tags aus verschiedenen Dimensionen (z. B. `events: [firmenfeier]` + `landings: [trier]`) landet auf **keiner** Seite: `/trier/` fragt nur den Ort ab, der Anlass-Tag blockt; `/firmenfeier/` umgekehrt. Es gibt keine Seite, die Ort und Anlass zugleich abfragt. Gemessen: 0 von 85 FAQs nutzen mehr als eine Dimension — das System heißt "Skill x Anlass x Ort", und eine der drei Kreuzungen ist unerreichbar.
- Stadt- und Anlass-Seiten übergeben die Skill-Dimension nicht, ihre Kombiseiten schon. Ein Skill-Tag entfernt die FAQ deshalb von 35 Stadtseiten, 4 Anlass-Seiten und der Startseite. Genau das ist auf den FR-Seiten passiert (Befund 3).

Die Kommentare in `faq.ts:214-222` behaupten "Dieselbe Umstellung wie bei den Bildern und den Reviews" — das trifft für keine der beiden Regeln zu. `ARBEITSLISTE.md:307-312` behauptet, seit 31.07. verhielten sich alle drei gleich; auch das stimmt nicht, `slideImages.ts` hat gar keinen Default-Zweig über Tags (`supplementWithDefaultSlides` füllt aus dem **Ordner** `default`).

**Beleg:** `website/src/utils/faq.ts:129` (`if (vorhanden.length === 0) return true;`) und `:133` (`if (gesucht.length === 0) return false;`) gegen `website/src/utils/reviews.ts:185` (`if (!skill) return reviews;`) und `:175` (`istAllgemein`) gegen `website/src/utils/slideImages.ts:367-376` (`tags[dimension].includes(gesucht)`) sowie `:296-301` (`readFolderSlides('default')`); Aufrufer-Matrix `index.astro:54`, `[landing].astro:205`, `:251`, `[skill].astro:79`, `[skill]/[landing].astro:227`, `:265`, `fr/[landing].astro:115`.

**Reparatur:** Erst die Regel in einem Satz entscheiden, dann eine gemeinsame Funktion (ARBEITSLISTE 307). Vorschlag: (a) kein Tag in einer Dimension = gilt dort überall, (b) nicht abgefragte Dimension schränkt nicht ein, sondern punktet nur nicht, (c) Rangfolge über Trefferzahl. Konkret kleinster Schritt: `faq.ts:133` umdrehen — das deckt sich mit `reviews.ts:185` und spart das Nachziehen an sieben Aufrufstellen. Danach die falsche Behauptung in `ARBEITSLISTE.md:308` korrigieren.

**Messpunkt:** Eine Test-FAQ mit `events:[firmenfeier] + landings:[trier]` erscheint nach dem Build auf `/trier/` **und** `/firmenfeier/`, auf beiden auf Platz 1. Ein Build-Guard listet FAQs, die auf 0 Seiten landen — die Liste ist leer (heute: 10 nur im Archiv, 2 gar nicht).

---

### 14. Die Skill-Dimension existiert zweimal: als Tag und als Label `categories`
**Wirkung:** Latente Bombe plus eine heute schon schädliche Bedienung.

**Was passiert:** Die Skill-Seite fragt seit 30.07. den Tag ab, die 105 Skill+Stadt- und 12 Skill+Anlass-Seiten filtern weiter über das Anzeige-Label — zeichengenauer String-Vergleich gegen `skillData.title`, ohne Normalisierung, während `faq.ts` und `reviews.ts` beide Felder prüfen und kleinschreiben. Heute fällt nichts aus (0 Slides mit Tag ohne Label und 0 umgekehrt), aber die Spiegelung hängt an einer einzigen Admin-Zeile mit leerem catch beim Vokabular-Laden. Sobald einmal ein Skill-Tag ohne Label geschrieben wird, verschwindet das Bild von bis zu 117 Kombiseiten und sieht in der Mediathek weiterhin korrekt aus.

Die schädliche Ausprägung sitzt im FAQ-Editor: zwei hartkodierte Checkboxen "Schnellzeichner"/"Szenenmaler" (schreiben `categories`) stehen direkt über den Skill-Chips aus dem Vokabular (schreiben `tags.skills`). Beide landen im selben Topf. Ein Haken entfernt die FAQ von fast allen Seiten (Befund 13). Die Checkbox-Liste kennt zudem nur 2 der 3 Skills (Aquarelle fehlt), und `FaqManager.tsx:179` schreibt bei jedem Speichern einen `categories:`-Schlüssel zurück.

**Beleg:** `website/src/utils/slideImages.ts:522-523` (`matchesSkill` über `categories`), `:536-546`, `website/src/pages/[skill]/[landing].astro:118`, `:168`, `website/src/components/slideshows/Slideshow.astro:19-25` mit `filteredCategories` aus `[skill]/[landing].astro:223`, `:255`; Gegenbeispiel `website/src/utils/slideImages.ts:488`; Sync-Zeile `admin/src/components/ImageManager.tsx:557` mit leerem catch in `:538`; Checkboxen `admin/src/components/FaqManager.tsx:317` und `:461`, Chips `:325`/`:468`, `:179`; Vermischung `website/src/utils/faq.ts:167`. Teilweise bekannt (Audit B6/B7).

**Reparatur:** `matchesSkill` auf `slide.tags?.skills` mit `skillTagSlug`-Vergleich umstellen und `filteredCategories` in den beiden Kombi-Zweigen fallenlassen. Im Admin die Checkboxen entfernen und vorhandene `categories` beim Laden in `tags.skills` umschreiben; danach `faq.ts:167` auf `faq.tags?.skills` reduzieren. Reihenfolge beachten: die Migration erst nach Befund 1, sonst schreibt der Editor sie ins Leere.

**Messpunkt:** `grep -c 'swiper-slide' dist/schnellzeichner/berlin/index.html` bleibt unverändert, nachdem `categories` aus einer Testdatei entfernt wurde (heute fiele das Bild raus). Und: keine FAQ-Datei enthält nach der Migration noch `categories:`.

---

### 15. Vier Slug-Regeln für dieselbe Zeichenkette
**Wirkung:** Latent — der erste Skill mit Umlaut bricht die Seite still.

**Was passiert:** `skillTagSlug` in `slideImages.ts` normalisiert ohne deutsche Umschrift: "Ölmalerei" → `olmalerei`, Tag heißt `oelmalerei`; "Straßenmalerei" → `stra-enmalerei`; "Airbrush für Kinder" → `airbrush-fur-kinder`. `faq.ts` vergleicht den Titel roh kleingeschrieben (also `ölmalerei`), `reviews.ts` genauso. Heute 0 von 3 Skills betroffen (alle ASCII). Der erste Skill mit Umlaut bekäme: Seite mit 24 Slots und 0 Bildern, dazu die falschen FAQs. Der vierte abweichende Weg ist `encoding.ts:slugify` aus Befund 11.

**Beleg:** `website/src/utils/slideImages.ts:501-508` (`skillTagSlug`, kein ae/oe/ue/ss), Aufruf `:489`; `website/src/utils/faq.ts:28` (`normalize`) und `:145`; `website/src/utils/reviews.ts:189` (`const skillKey = normalize(skill);`); Gegenseite `website/scripts/tags.mjs:60-63` (`transliterateGerman`) und `admin/src/utils/tagSlug.ts:35-40`. Teilweise bekannt (Audit C7, dort nur als toter Link bewertet — mit `slideImages.ts:501` ist es jetzt auch eine kaputte Auswahl).

**Reparatur:** `slugifyTag` in ein von `src/` und `scripts/` gemeinsam genutztes Modul heben, `skillTagSlug` löschen, `faq.ts:145` und `reviews.ts:189` darauf umstellen, `skills.ts`/`events.ts` nachziehen.

**Messpunkt:** Ein Tabellentest mit ~15 Sonderfällen ("Ölmalerei", "Straßenmalerei", "Airbrush für Kinder", "Gala Liège") liefert für **alle** Slug-Funktionen beider Repos dasselbe Ergebnis.

---

### 16. Vier Sammler, zwei Verzeichnistiefen — 40 Slides sind für die Startseiten-Auswahl unerreichbar
**Wirkung:** Redakteurin sieht nicht; dazu ein totes Fallenstück.

**Was passiert:** 40 von 232 Slides liegen zwei Ebenen tief (`mediathek/somfot` 22, `events/hochzeit` 10, `events/messe` 7, `events/firmenfeier` 1). Die Tag-Abfrage hat einen eigenen zweistufigen Sammler bekommen; die drei älteren nicht. Im `default`-Tab des Admin erscheinen die 40 nicht, können also nicht für die Startseite angehakt werden — und stünde ein solcher Schlüssel in `default-selection.json`, verschwände er beim Bauen kommentarlos (heute alle 28 Einträge einstufig, also noch kein Verlust). Dazu: `getAllCitySlides` ist exportiert, ordnerbasiert, mit hartkodiertem `default`-Ausschluss — und hat null Aufrufer. Die letzte vollständige Kopie des alten Modells und die nächstliegende Falle.

**Beleg:** `website/src/utils/slideImages.ts:449-462` (`getAllSlidesFlat`, eine Ebene), benutzt von `:296-315` und `:433`; `website/src/utils/slideImages.ts:433-446` (`getAllCitySlides`, keine Aufrufer); `admin/src/components/ImageManager.tsx:210` und `:306-315` (zweite Welle listet nur eine Ebene, Datei-Filter `:288`); Gegenstück `website/src/utils/slideImages.ts:329-355` (`collectAllSlidesWithKeys`).

**Reparatur:** `getAllSlidesFlat` auf `collectAllSlidesWithKeys` umstellen, `getAllCitySlides` löschen, im ImageManager den Default-Zweig durch den rekursiven Walk aus `services/mediaLibrary.ts` ersetzen. Eine Sammelfunktion, nicht vier.

**Messpunkt:** Der Startseiten-Tab zeigt 232 statt 192 Kacheln; ein Hochzeitsbild lässt sich anhaken und erscheint in `dist/index.html`.

---

### 17. Hygiene: verwaiste Dateien, fehlender Vorlagenschutz, toter Ordner-Rest
**Wirkung:** Hygiene, teils kleiner Inhaltsverlust.

- **Zwei FAQ-Dateien ohne `.md`** werden von keinem der drei Werkzeuge gesehen: `public/faq/kaiserslautern/wann-buchen` (kein `.md`-Gegenstück — Inhalt verloren, Jenny sieht 4 statt 5 Fragen) und `public/faq/default/kosten-schnellzeichner` (Duplikat, `.md`-Fassung existiert). `dist/faq/index.html` zeigt 83 von 85. Beleg: `website/src/utils/faq.ts:36`, `admin/src/components/FaqManager.tsx:80`. Bekannt als C6. Reparatur: `wann-buchen` umbenennen, `kosten-schnellzeichner` löschen, Warnung in `sync-faq-tags.mjs` bei Dateien ohne Endung. Messpunkt: `dist/faq/index.html` = 84 Einträge, Kaiserslautern zeigt 5.
- **Neun Why-Bilder ohne JSON-Verweis** (`public/img/why/{bw,dortmund,duesseldorf,fulda,giessen,hanau,neunkirchen,stuttgart}/benefit-1/hochzeitsmaler.webp` und `frankfurt/benefit-1/schnellzeichnerin-…webp`) liegen im Repo und auf keiner der 172 Seiten; `public/why/bw.json` hat bei allen vier Benefits `"image": ""`. **Unsicher**, ob der heutige Code das noch erzeugt — `saveWhyBenefits` (`admin/src/components/ImageManager.tsx:406-423`, `:635-644`) schreibt die JSON mit; es fehlt die git-Historie von `public/why/*.json`, um Altlast von aktivem Fehler zu unterscheiden. Reparatur: erst `git log -p public/why/` prüfen, dann nachtragen oder löschen; dauerhaft `validate-image-refs.mjs` um die Gegenrichtung erweitern ("Datei ohne Verweis"). Messpunkt: das Skript meldet 0 verwaiste Why-Dateien.
- **Kein Vorlagen-Ausschluss bei FAQs:** `website/src/utils/faq.ts:33-43` und `website/scripts/sync-faq-tags.mjs:51-59` kennen kein `_vorlage.md`, während `website/src/utils/reviews.ts:31,47` und der Admin es doppelt abfangen. Im Review-Baum liegen 36 solche Dateien, das Muster ist etabliert. Reparatur: `TEMPLATE_NAMES` nach `scripts/tags.mjs` ziehen und in beiden FAQ-Pfaden anwenden. Messpunkt: eine testweise `public/faq/default/_vorlage.md` erscheint in keinem Build-Artefakt.
- **Toter Ordner-Rest:** `website/src/utils/faq.ts:57-62` (`cityFromPath`) und `:78` hängen jedem FAQItem ein `city` an, das `matchesFAQContext` (`:161-174`) nie liest. Sieht im Typ wie ein wirksames Ordner-Gate aus. Reparatur: löschen oder als "nur Anzeige" kennzeichnen.

---

### 18. 19 Bilder tragen Anlass-Tags, zu denen es keine Seite gibt (bekannt)
**Wirkung:** Hygiene / Erwartungsbruch.

**Was passiert:** `tags.json` führt 12 Anlässe: 4 aus `events.json` (mit Seite) und 8 aus `EXTRA_EVENTS` (ohne Seite). Getaggt sind: weihnachtsfeier 10, geburtstag 3, silvester 2, sommerfest 2, gartenparty 1, stadtfest 1 = 19 Zuordnungen in eine Dimension, die keine Seite abfragt. Erreichbar nur über die Galerie-Chips, wo ein Chip "Weihnachtsfeier" von einem Chip "Messe" nicht zu unterscheiden ist. Umgekehrt hat `private-feier` 0 getaggte Bilder; die 6 Slides auf `/private-feier/` sind reine Auffüller.

**Beleg:** `website/public/config/tags.json` (4 × `source: events.json`, 8 × `source: extra`), Seitenerzeugung nur aus `website/src/utils/events.ts:199`, benutzt in `[landing].astro:69` und `[skill]/[landing].astro:64`; Chips aus `website/src/utils/gallery.ts:215-244`. Bekannt, ARBEITSLISTE S-6.

**Reparatur (Oberfläche, nicht Inhalt):** Die 8 `EXTRA_EVENTS` in Admin und Galerie sichtbar als "nur Galerie-Filter" kennzeichnen. Ob Seiten dafür entstehen, ist Produktentscheidung (siehe "Nicht anfassen").

**Messpunkt:** Im Tag-Chip-Bereich sind Anlässe mit Seite von Anlässen ohne Seite unterscheidbar; die Zahl 19 taucht in keinem Audit mehr als Fehler auf.

## Reihenfolge der Reparatur

1. **Befund 1 (Parser).** Zuerst, ohne Ausnahme: solange er offen ist, zerstört jedes Speichern im Admin Tags — und jede spätere Admin-Reparatur schreibt kaputte Dateien schneller. Alles andere baut darauf auf.
2. **Befund 2 und 3 (Stadt-Reviews, FR-FAQs).** Klein, isoliert, sofort am Build messbar, und das Einzige, was der Besucher heute nachweislich falsch sieht. Kein Umbau nötig.
3. **Befund 13 (Auswahlregel entscheiden und vereinheitlichen).** Muss vor dem Admin-Umbau stehen, weil der Admin genau diese Regel spiegeln soll. Eine Zeile Code, aber eine Entscheidung davor.
4. **Befund 6 (Admin auf Tag-Auswahl).** Der große Brocken und der eigentliche Auftrag. Erst danach zeigt der Admin, was die Website zeigt — und erst danach sind die Zahlen 126/107/28/24 gegenstandslos.
5. **Befund 9, 10, 11, 12 (Erzeuger-Verträge).** Sobald die Anzeige ehrlich ist, fällt auf, welcher Weg welche Tags erzeugt. Vorher wäre die Wirkung nicht messbar.
6. **Befund 14, 15, 16 (Doppelidentitäten, Slugs, Sammler).** Heute alle latent, aber billig und je einer Zeile Testabdeckung zugänglich. Vor dem nächsten Skill mit Umlaut oder dem nächsten Event mit Akzent erledigen.
7. **Befund 4, 5, 7, 8 (maxItems, Galerie, SiteGraph, Metadatenfelder).** Unabhängig voneinander, jederzeit einschiebbar; Befund 8a (alt/altOverride) darf gern früher, wenn SEO drängt.
8. **Befund 17, 18 (Hygiene).** Zum Schluss, in einem Rutsch, mit den ergänzten Prüfskripten.

## Nicht anfassen

- **Titelbild, why- und hero-Bilder tag-fähig machen (74 von 306 Bilddateien).** Das Zielbild "Tags entscheiden" gilt heute nur für `slides/`; `IMAGE_TYPE_CONFIG` hat nur dort `hasMeta: true`, `website/src/utils/titleImages.ts:128-150` ist rein ordnerbasiert, `why.ts`/`heroBg.ts` kennen `tags` gar nicht. Ob "Bild" künftig alles oder nur Slides meint, ist eine Grundsatzentscheidung des Auftraggebers, kein Loch. Bis sie fällt, sollte sie **aufgeschrieben** werden, sonst wird die Ausnahme in jedem Audit erneut als Fehler gemeldet.
- **Seiten für weihnachtsfeier, geburtstag, silvester usw. anlegen** (Befund 18) und die Zukunft von `/private-feier/`. Reine Produktentscheidung mit SEO-Folgen.
- **Die `%2F`-Kodierung verschachtelter Ordner** (`slideImages.ts:249` in Verbindung mit `:59`). Sieht falsch aus, ist es nicht: live gegen Vercel mit HTTP 200 geprüft (`reports/cutover-audit-2026-07-30.md:797`). Nur das Inventar-Skript muss über `decodeURIComponent` vergleichen.
- **Die 36 `_vorlage.md` und 35 `.gitkeep` unter `public/reviews`** sowie die 4 Bilder mit Apostroph/Klammern im Namen. Alle als "nirgends sichtbar" gemeldet, alle Messartefakte: der Vorlagen-Ausschluss ist beabsichtigt und getestet (`website/src/utils/reviews.ts:31`, `:47`), die vier Bilder stehen nachweislich im Build. Nicht hinterherjagen.
- **`priority`-Werte selbst umsortieren.** Die Reihenfolge einer Slideshow ist redaktionelle Entscheidung; Befund 8 macht sie nur sichtbar und bedienbar, ändert aber keinen Wert.
- **`categories` aus den Dateien entfernen, bevor Befund 1 sitzt und die Migration steht.** Einzeln durchgeführt ist das genau der Datenverlust, den wir gerade abstellen — `faq.ts:167` und `matchesSkill` lesen das Feld noch.
- **Den `enabled`-Schalter ersatzlos aus der Website streichen**, ohne zu fragen: heute ist 0 von 232 betroffen, aber das Feld ist die schonende Alternative zum Löschen. Ob Bauen oder Streichen — das entscheidet der Auftraggeber, nicht die Reparatur.