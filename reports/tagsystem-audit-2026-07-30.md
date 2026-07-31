# Tag-System-Audit 2026-07-30 — Befundliste zum Abarbeiten

**Ampel: gelb.** Das Fundament ist nachweislich sauber (Slugs, Vokabular,
Tag-Abdeckung). Was hängt, hängt an drei Stellen daneben: am Admin-Schreibweg,
an der Reihenfolge „erst auffüllen, dann filtern" im Rendering, und an der
Skill-Dimension, die website-seitig gar nicht über Tags läuft.

**Umfang:** sechs Ebenen (Vokabular/Slugs, Daten, Rendering, Sync-Kette,
Admin-Schreibwege, Doku), 48 Funde, **45 bestätigt**, 3 widerlegt. Jeder Fund
wurde von einem zweiten Durchgang angegriffen, dessen Auftrag „widerlegen" war.

> ⚠️ **Zeilennummern sind Anhaltspunkte, keine Anker.** Die Prüfer lasen
> verschiedene Arbeitsstände (Abweichungen 1–26 Zeilen). Inhaltlich wurde jede
> Behauptung am Code verifiziert — vor dem Anfassen die Fundstelle einmal per
> `grep` auflösen.

---

## Reihenfolge

Empfohlen: **A → B → C**. A ist Datensicherheit, B macht Seiten sichtbar
kaputt, C ist Hygiene und kann jederzeit dazwischen.

---

## A. Datenverlust & Korrektheit

- [x] **A1 — kritisch — Lesefehler schrieb `slides.meta.json` als Torso.**
      `kunstwolff-admin/src/services/mediaLibrary.ts`
      `ladeMeta()` fing mit nacktem `catch` **jeden** Fehler ab — 404 („gibt es
      nicht") und 403 („GitHub drosselt") waren ununterscheidbar. `saveSlideTags`
      baute daraus den **vollständigen** neuen Dateiinhalt: ein Klick im
      Umsortieren-Modus während einer Drosselung hätte 232 Einträge durch 1
      ersetzt — mit Erfolgsmeldung. `priority` (136 Einträge ≠ 1),
      `altOverride`/`title` (je 85) und alle Tags wären weg;
      `sync-slides-metadata.mjs` legt Keys zwar neu an, **rät** die Tags aber aus
      dem Dateinamen.
      **✅ Erledigt am 2026-07-30** (Commit „Datenverlust verhindert…"): nur echtes
      404 heißt leer, kaputtes JSON wirft, zweiter Riegel gegen Schrumpfen,
      Rollback der optimistischen Haken. `mediaLibrary.save.test.ts` nagelt es
      fest (gegengeprüft: gegen den alten Stand fallen 2 von 5 Tests um).

- [ ] **A2 — mittel — Derselbe Fehlerschlucker in `tagVocabulary.ts`.**
      `kunstwolff-admin/src/services/tagVocabulary.ts` (`loadVocabulary`)
      Kann `tags.json` von 50 auf 42 Einträge kürzen — die 8 `source: extra`-
      Anlässe kennt der Admin nicht, sie kämen beim Schreiben nicht wieder mit.
      Folgenlos, **weil** `sync-tags.mjs` die Datei im nächsten Build vollständig
      rekonstruiert. Trotzdem dieselbe Korrektur wie A1: nur 404 heißt leer.

- [x] **A3 — hoch — FaqManager vergleicht Label gegen Slug.** ✅ **erledigt 2026-07-30**
      `kunstwolff-admin/src/components/FaqManager.tsx`
      Einziger Tag-Weg **ohne** `tagVocabulary.ts` (grep: 0 Treffer), mit eigenem
      Seed-Parser und abweichender Landing-Regel (`!endsWith(':')` statt
      `!includes(':')`). Die Skill-Optionen kommen aus `s.title`
      (`Schnellzeichner`), verglichen wird zeichengenau gegen den Dateiinhalt
      (`schnellzeichner`). Folge: bei **allen 70** FAQs mit Skill-Tag sind die
      Chips grau, ein Klick schreibt `skills: [schnellzeichner, Schnellzeichner]`.
      Die zweite Chip-Reihe zeigt den echten Slug — zwei Wahrheiten nebeneinander.
      **Schritt:** auf `tagVocabulary.ts` + `slugifyTag` umstellen (Optionen als
      `{slug,label}`, Vergleich über den Slug, Anzeige über das Label). Damit
      fällt der zweite Seed-Parser weg.
      **Erledigt:** genau so. Getippte Tags laufen jetzt durch `slugifyTag`
      (sonst landet das Label in der Datei). Der Guard
      `managers-draft-aware.test.ts` prüft die Draft-Anforderung an der
      verschobenen Stelle weiter — nicht abgeschwächt.

- [ ] **A4 — mittel — ReviewManager kann Tags nicht leeren.**
      `kunstwolff-admin/src/components/ReviewManager.tsx`
      `{ ...frontmatter, ...(hatTags(tags) ? { tags } : {}) }`: sind nach dem
      Bearbeiten alle drei Dimensionen leer, entfällt der Spread — und der alte
      `tags`-Block aus dem roh geparsten Frontmatter bleibt stehen, während die
      Oberfläche „leer" zeigt. Genau „diese Bewertung soll wieder überall gelten"
      schlägt still fehl. Teiländerungen funktionieren.
      **Schritt:** beim Leerfall aktiv entfernen
      (`const { tags: _weg, ...rest } = review.frontmatter`).

---

## B. Sichtbar kaputte Seiten

- [x] **B1 — hoch — 38 von 105 Skill×Stadt-Seiten zeigen eine leere Galerie.** ✅ **erledigt 2026-07-30**
      `src/pages/[skill]/[landing].astro` · `src/utils/slideImages.ts`
      (`supplementWithDefaultSlides`, `MIN_LANDING_SLIDES = 6`) ·
      `src/components/slideshows/Slideshow.astro`
      Aufgefüllt wird **vor** dem Filtern: `getCitySlides` → auf 6 auffüllen →
      erst danach `filteredCategories: [skillData.title]`. Da 93 von 232 Slides
      und 11 von 30 Auswahl-Slides gar keine `categories` haben, sieben sich die
      Nachfüller selbst wieder aus.
      **Gemessen:** 93 der 105 Seiten landen unter 6, **38 bei exakt 0** (35×
      Aquarelle + `schnellzeichner/karlsruhe`, `/neunkirchen`, `/fulda`). Ohne
      Aquarelle: 58 von 70 unter 6, 3 bei 0. Karlsruhe hat 7 eigene Ortsbilder →
      kein Auffüllen → Filter wirft alle 7 weg, obwohl 115 Schnellzeichner-Bilder
      im Repo liegen.
      **Schritt:** erst nach Skill filtern, dann mit **ebenfalls gefilterten**
      Default-Bildern auffüllen.
      **Erledigt:** `getSkillSlidesForCity()` in `slideImages.ts`, benutzt in
      beiden Zweigen von `[skill]/[landing].astro` (Stadt UND Event — der
      Event-Zweig hatte denselben Fehler). Am gebauten `dist/` gegengeprüft:
      `karlsruhe`/`neunkirchen`/`fulda` von 0 auf je 6 Bilder, 0 Nicht-Aquarelle-
      Seiten ohne Bilder. Test: `tests/skill-slides-order.test.ts`.

- [x] **B2 — mittel — Leere Sektionen rendern trotzdem Überschrift und Rahmen.** ✅ **erledigt 2026-07-30**
      `Slideshow.astro` (rendert `<section>` + `<h2>Unsere Kunst</h2>`
      unbedingt) · `SkillHero.astro` (guardet gegen die **ungefilterte**
      Review-Liste, 38 statt 0) · `MiniReviews.astro` (Wrapper bleibt leer,
      ~44 px Leerraum auf `/aquarelle/`).
      **Schritt:** `{gefilterte.length > 0 && …}` um Galerie-Sektion und
      MiniReviews-Wrapper. Unabhängig von B1 — auch nach B1 gibt es leere Fälle.
      **Erledigt:** beide Guards gesetzt. Am `dist/` gegengeprüft: **0** leere
      Galerie-Sektionen (vorher 38) und **0** leere Bewertungs-Slider.

- [x] **B3 — hoch (redaktionell) — 40 Aquarelle-Seiten ohne Inhalt sind live.** ✅ **ausgeblendet 2026-07-30**
      `public/skills/skills.json` · `public/config/page-visibility.json`
      0 von 232 Bildern, 0 von 38 Reviews, 1 von 71 FAQs. `page-visibility.json`
      ist `{"hidden":[]}` und `getSkillSlugs()` filtert nicht darüber → `/aquarelle/`
      + 35 Skill×Stadt + 4 Skill×Event = **40 gebaute, indexierte, in Navigation
      und Sitemap gelistete Seiten** mit leerer Galerie und leerem Review-Slider.
      **Zwei Wege:** entweder Bilder taggen — die neue Bild-Erkennung kann die
      Aquarell-Motive aus den 232 vorhandenen Fotos heraussuchen — oder bis dahin
      über `page-visibility.json` ausblenden. **Entscheidung nötig** (siehe „Offene
      Fragen").
      **Erledigt:** ausgeblendet. Dafür musste `isPageHiddenByPath` erst
      **präfix-fähig** werden — es prüfte exakt, also hätte `/aquarelle/` nur
      **eine** der 40 Seiten erwischt und 39 wären weiter indexierbar geblieben.
      Dieselbe Regel steckt ein zweites Mal im Sitemap-Filter in
      `astro.config.mjs` (die Konfig kann das TS-Modul nicht importieren) und ist
      dort nachgezogen. Am `dist/` gemessen: 40/40 `noindex`, 0 von 134
      Sitemap-URLs, raus aus der Navigation. Zurückholen = die eine Zeile aus
      `page-visibility.json` entfernen.

- [ ] **B4 — mittel — `/private-feier/` ist leer, 9 Städte haben 0 eigene Bilder.**
      `/private-feier/`: 0 Bilder (Ordner `events/private-feier/` leer), 0 Reviews,
      0 FAQs; zeigt die ersten 6 der kuratierten Auswahl, die Kombiseiten 4/5/0.
      Zum Vergleich: firmenfeier 28, messe 31, hochzeit 34.
      **Städte:** 9 von 35 Landing-Slugs haben 0 eigene Bilder (berlin, hamburg,
      nord-rhein-westfalen, main-taunus-kreis, neuwied, tuebingen, heidelberg,
      giessen, dortmund — nur `.gitkeep`), 12 weitere liegen bei 1–5, nur 14 von 35
      erreichen 6 ohne Füller. `/berlin/` zeigt 2× belgique, 2× bw, 1× default,
      1× frankfurt unter einer Berlin-H1 — SEO-seitig „thin/doorway".
      **Schritt:** redaktionell (Bilder taggen) oder ausblenden. Dauerhaft messbar
      machen: Zähler im `tag-parity-check.mjs` („Slug X: 0 eigene Inhalte",
      „Stadt Y: 0 eigene, 6 Fremdbilder").

- [ ] **B5 — mittel — Die Anlass-Dimension der FAQs ist tot.**
      `src/utils/faq.ts` (`kontextSchluessel`) · `src/pages/[landing].astro` ·
      `src/pages/[skill]/[landing].astro`
      `eventKeys` entstehen **nur**, wenn `context.city` mit `events/` beginnt —
      die drei Aufrufer setzen aber `city: landing` bzw. `city: slug`, und die
      Event-Zweige übergeben gar keinen Kontext (`faq: {}`). Datenseitig haben
      **0 von 71** FAQs einen Anlass-Tag.
      Folge: auf `/firmenfeier/`, `/messe/`, `/hochzeit/`, `/private-feier/` passen
      71 von 71 FAQs mit Treffergüte 0 — es entscheidet die Lesereihenfolge, alle
      vier zeigen dieselben 4 FAQs wie die Startseite. Ein im Admin gesetzter
      Anlass-Tag kann nie einschränken; die Bedienung suggeriert eine Zuordnung,
      die nirgends ankommt.
      **Schritt:** in den Event-Zweigen `faq: { city: \`events/${slug}\` }` übergeben
      — sauberer wäre eine echte `event`-Eigenschaft am `FAQFilterContext`, statt
      den Anlass durchs city-Feld zu schmuggeln.

- [ ] **B6 — mittel — Die Skill-Dimension wird nie per Tag abgefragt.**
      `src/pages/[skill].astro` · `src/utils/slideImages.ts` · `Slideshow.astro` ·
      `MiniReviews.astro`
      `getSlidesByTag('skills', …)` hat in `src/` **keinen einzigen Aufrufer**.
      Stattdessen zieht `[skill].astro` `getHomepageSlides()` = die 30 kuratierten
      Einträge aus `default-selection.json`: `/schnellzeichner/` zeigt **16 von
      115**, `/szenenmaler/` **12 von 69**; 11 der 30 haben keine `categories` und
      können auf keiner Skill-Seite je erscheinen. Der categories-Filter ist in
      `memory/tag-system.md` dokumentiert und gewollt — **die 30er-Quelle
      nirgends.** Verglichen wird zusätzlich als roher String gegen
      `skillData.title`, während `reviews.ts` und `faq.ts` beide Seiten
      normalisieren.
      **Erst entscheiden, dann bauen** (siehe „Offene Fragen"). Wenn Bug:
      auf `getSlidesByTag('skills', slug)` umstellen und `filteredCategories`
      fallenlassen — dann gibt es nur noch eine Identität und `categories` ist
      reine Anzeige.

- [ ] **B7 — mittel — `categoriesFromSkillSlugs` fällt auf den Slug zurück.**
      `kunstwolff-admin/src/services/tagVocabulary.ts`
      Bei fehlendem Vokabular schreibt der Admin `categories: ['schnellzeichner']`
      statt `['Schnellzeichner']`. Auslöser sind drei Stellen mit
      unterschiedlichem Vokabular-Stand: `TagChips` lädt mit `force`,
      `ImageManager` einmalig beim Mount (bleibt stale), `MediaLibrary` setzt im
      catch ausdrücklich ein leeres Vokabular. Solange die Website über
      `categories` filtert, verschwindet das Bild damit still von bis zu **120
      Seiten** — in der Mediathek sieht es korrekt getaggt aus.
      Heute **0 von 232** Einträgen betroffen.
      **Schritt:** kurzfristig nicht auf den Slug zurückfallen (lieber leer lassen
      und melden); dauerhaft erledigt sich das mit B6.

---

## C. Kette, Hygiene, Doku

- [x] **C1 — mittel — Der harte Event-Guard wird im Build geschluckt.** ✅ **erledigt 2026-07-30**
      `scripts/sync-content-safe.mjs` · `scripts/sync-tags.mjs`
      Gemessen mit `{title:'Abiball', slug:'abi-party'}`: `sync-tags.mjs` bricht
      korrekt ab (EXIT 1, `tags.json` unverändert) — `sync-content-safe.mjs`
      darüber gibt **EXIT 0**. `predev`/`prebuild` hängen ausschließlich an
      `:safe`. Die Toleranz ist als bewusst dokumentiert mit der Begründung „hart
      blockiert über den pre-commit-Hook" — **die trägt nicht: der Admin
      veröffentlicht über die GitHub-API, dort läuft kein git-Hook.**
      **Schritt:** `sync:tags` als harten Schritt behandeln (exit 1).
      **Erledigt:** `hart: true` in `sync-content-safe.mjs`, Schleife bricht ab,
      Exit 1. Gemessen mit `{title:'Abiball', slug:'abi-party'}`: vorher Exit 0,
      jetzt Exit 1; Normallauf weiterhin Exit 0.

- [ ] **C2 — mittel — `EventManager.createEvent` legt keinen Anlass-Tag an.**
      `kunstwolff-admin/src/components/EventManager.tsx`
      Einziger Anlege-Weg ohne `createTag` — `Dashboard.tsx` macht es richtig mit
      `slugOverride`. Zusätzlich wirft `readEventLabels()` in `sync-tags.mjs` den
      Slug per `.map(e => e.label)` weg, obwohl der Kommentar daneben „Titel als
      Label, Slug als Identität" behauptet. Heute 0 von 4 Events betroffen (alle
      Titel slugifizieren exakt auf ihr slug-Feld).
      **Schritt:** `createTag('events', title, 'events.json', slug)` ergänzen;
      `readEventLabels` den Slug durchreichen und `mergeVocabulary` einen
      expliziten Seed-Slug akzeptieren lassen.

- [x] **C3 — mittel — `public/config` fehlt in beiden `git add`-Listen.** ✅ **erledigt 2026-07-30**
      `.githooks/pre-commit` · `.github/workflows/sync-landings.yml`
      Beide stagen zeichengleich dieselben 7 Pfade — `public/config` ist in
      **keinem**, obwohl `tags.json` getrackt ist und die Action genau bei
      `landings.md`/`skills.json` läuft, also bei den Seeds, die es neu erzeugen.
      Die Handnachpflege ist belegt (Commit `6b38e3e`). Nebeneffekt: ändert sich
      **nur** `tags.json`, ist `git status --porcelain` nicht leer, `git add`
      staged nichts, `git commit` läuft unter `bash -e` auf → Job rot.
      **Schritt:** `public/config` in beide Listen; `public/events/events.json` in
      die Trigger-Pfade der Action (triggert heute gar nicht).
      **Erledigt:** beide Listen um `public/config`, `public/erinnerungen` und
      `public/events` ergänzt, Trigger-Pfad nachgezogen. Der Commit-Schritt prüft
      jetzt gegen den **Index** (`git diff --cached --quiet`) statt gegen
      `git status` — das war die Ursache des roten Jobs bei Änderungen außerhalb
      der add-Liste.

- [ ] **C4 — niedrig — `pre-push` committet den gesamten Index.**
      `.githooks/pre-push`
      Committet unter „chore: optimize images to webp" **alles**, was gestaged ist
      — auch wenn `optimize-all-images.mjs` mit „Nichts zu tun" aussteigt. Der
      Commit geht mit dem laufenden Push nicht mehr mit.
      **Schritt:** `git commit -m "…" -- public/img/`. Außerdem läuft dort
      `sync:slides` ohne vorheriges `sync:tags`.

- [ ] **C5 — niedrig — `jubilaum` vs. `jubilaeum`.**
      `scripts/tags.mjs` (EVENT_KEYWORDS-Schlüssel) — einziger von 12 Schlüsseln
      außerhalb des Vokabulars. Heute 0 von 232 Dateien betroffen.
      `sync-slides-metadata.mjs` filtert die events-Dimension nicht gegen das
      Vokabular (die landings-Dimension schon).
      **Schritt:** Tippfehler korrigieren **und** den Filter nachziehen.

- [ ] **C6 — niedrig — Verlorener FAQ-Inhalt ohne Endung.**
      `public/faq/kaiserslautern/wann-buchen` (366 B, kein `.md`, **kein**
      `.md`-Gegenstück im Ordner) → **umbenennen, nicht löschen.**
      `public/faq/default/kosten-schnellzeichner` (257 B) ist dagegen eine ältere
      Fassung → löschen.

- [ ] **C7 — niedrig — Sammelposten Hygiene.**
      - `invalidateVocabulary` hat genau einen Treffer im Repo: die Definition.
        Der Cache lebt die ganze Sitzung — nach dem Veröffentlichen nicht geleert.
      - `CityManager.tsx` ruft `void createTag(…)` ohne `await`/`catch`
        (Rennen + stummer Fehler). Heute folgenlos (0 custom-Tags).
      - `landings.ts` macht aus **jeder** Zeile ohne `#` eine Landingpage, während
        beide Tag-Seeder zusätzlich `:`-Zeilen überspringen. Guard: jeder
        `getLandingSlugs()`-Slug muss im Vokabular stehen.
      - `skills.ts` slugifiziert **ohne** ae/oe/ue/ss (`Ölmalerei` → Seite
        `/olmalerei/`, Tag `oelmalerei`; 10 von 15 Testeingaben weichen ab). Heute
        0 von 3 Skills. Folge wäre ein toter Link, keine kaputte Auswahl.
      - `tag-parity-check.mjs` ist in **keinem** npm-Script verdrahtet, obwohl
        `memory/tag-system.md` es als Prüfung führt; es prüft nur Orte und
        Anlässe, keine Skills.
      - `sync-slides` meldet konstant „66 bestehende Einträge aktualisiert" bei
        bytegleicher Datei (abweichende Schlüsselreihenfolge, verglichen per
        `JSON.stringify`). Der Zähler wird nie 0.
      - `mediathek/somfot/` enthält 3 Firmenlogos (obi, samsung, saarlandtherme),
        die die Mediathek als Slide-Kandidaten anbietet.

- [ ] **C8 — hoch (Doku) — Die Pflichtlektüre-Pfade existieren nicht.**
      `Kunstwolffwebsite/CLAUDE.md` nennt `…/Kunstwolff/Kunstwolff-admin/kunstwolff-admin/`
      (großes K + erfundenes Wrapper-Verzeichnis), `kunstwolff-admin/CLAUDE.md`
      nennt `/home/sasha/codicus/Kunstwolffwebsite/…` (Segment `Kunstwolff/`
      fehlt) und verweist auf das gelöschte `../BUGS_TODO.md`. Die als „MUSST du
      laden" markierte Regel schlägt damit in **100 % der Sessions beider Repos**
      fehl. Die jeweiligen `memory/admin-tool.md` und `memory/cross-repo.md` haben
      die Pfade richtig.

- [ ] **C9 — mittel (Doku) — Memory beschreibt teilweise das alte Modell.**
      - `memory/pfadstruktur.md` verspricht „vollständige Übersicht", kennt
        `public/config/` aber mit **0 Treffern** — die zentrale Vokabular-Datei
        fehlt. Beschreibt `getFAQsByCity` als aktiven Loader (existiert nur noch
        als Wort in einem Kommentar), listet `slides.meta`-Felder ohne `tags`,
        sagt „~21 Städte" (real 20 + default).
      - `memory/content-events.md` behauptet „separater Namespace, nicht mit
        Stadtslides vermischt" — real kommen 27/24/24 Bilder aus Fremdordnern. Der
        Anlege-Workflow erwähnt Tags mit keinem Wort, obwohl `sync-tags.mjs` hart
        abbricht; „Event entfernen" nennt weder tags-Blöcke noch Vokabular-Eintrag.
      - `memory/tag-system.md`: Zahlen überholt — 234→**232** Einträge,
        87→**84** Bilder mit Ort UND Anlass, 15→**14** FAQs ohne Ort-Tag,
        35→**36** Vorlagen, Erinnerungen/Why je 37→**39**, skills 2→**3**,
        landings 34→**35**. Korrekt: events 12, FAQs 71, Reviews 38. Außerdem
        `EXTRA_ANLAESSE` → heißt `EXTRA_EVENTS`.
      - Kleiner: `sync-scripts.md` und `cross-repo.md` dokumentieren die
        git-add-Lücke und lassen ausgerechnet `public/config/` weg;
        `content-skills.md` sagt „via categories" statt „categories ODER
        tags.skills"; `content-slides.md` führt `tags.skills` nicht in der
        Feld-Tabelle (139 von 232 Slides betroffen); `manager-images.md` und
        `manager-reviews.md` haben 0 Treffer für „Tag", obwohl beide `TagChips`
        rendern; `einschraenkungen.md` beschreibt einen `public/reviews/default/`-
        Ordner, den es nie gab; `ANLEITUNGEN/…` behauptet an einer Stelle
        `köln → koln` und an anderer das Gegenteil (real `koeln`).

---

## Offene Fragen (Entscheidung nötig, keine Messung)

1. **Ist die 30er-Auswahl als Quelle der Skill-Seiten Absicht?** (B6) Kein
   Memory-File erwähnt `getHomepageSlides` für `/<skill>/`, während
   `memory/tag-system.md` die Erwartung formuliert, ein im Admin gesetzter
   Skill-Tag ändere die Skill-Seite. Ist es Kuration: in `content-skills.md`
   festschreiben, damit es nicht erneut als Defekt gemeldet wird. Ist es ein Bug:
   B6 bauen.
2. **Aquarelle ausblenden oder befüllen?** (B3) Ausblenden ist eine Zeile,
   Befüllen braucht Material — oder die Bild-Erkennung findet Aquarell-Motive
   unter den 232 vorhandenen Fotos.
3. **Ist der Torso-Fall (A1) je eingetreten?** Das Audit hat den Codepfad
   bewiesen, keinen echten 403 provoziert. Messung:
   `git log --follow -p public/img/slides/slides.meta.json` und pro Commit
   `Object.keys().length` auswerten — jeder Einbruch ohne begleitende Löschung
   ist ein Treffer. Entscheidet, ob zusätzlich repariert werden muss.

---

## Gesund — nicht erneut prüfen

| Bereich | Messung |
| :-- | :-- |
| Slug-Identität | `slugifyTag` Website vs. Admin: **0 Abweichungen** bei 40 Sonderfällen + allen 50 echten Labels |
| Vokabular | 3 Skills / 12 Anlässe / 35 Orte, byte-genau reproduzierbar; auch aus leerem Ausgangsstand JSON-identisch; 0 Dubletten, 0 quellenlose Einträge |
| Verwaiste Tags | **0 unbekannte Slugs** in 341 getaggten Inhalten, alle drei Dimensionen |
| Daten-Integrität | 232 Meta-Einträge = 232 Bilddateien, 0 Leichen, 0 ungetaggte Dateien, 0 Byte-Duplikate; 30/30 Einträge in `default-selection.json` existieren |
| categories ↔ tags.skills | **0 Divergenz** über alle 232 Einträge |
| Tag-Abdeckung | 232/232 Bilder, 38/38 Reviews, 71/71 FAQs haben einen tags-Block; 36 `_vorlage.md` sauber ausgefiltert |
| Ort-Identität | Landing-Seiten-Slug == Landing-Tag-Slug für alle 35 Städte |
| Event-Guard | greift wirklich: künstliches Event ohne Anlass-Tag → EXIT 1 (gemessen) |
| Idempotenz | voller 11-Schritt-Sync in Wegwerf-Kopie: `diff -rq` = 0 Zeilen |
| Bild-Guard | `validate-image-refs.mjs`: 339 Dateien, alle Verweise gültig |
| Reine Stadtseiten | `[landing].astro` filtert **nicht** über categories — dort kommen alle getaggten Bilder an |
| FAQ-Auswahl (Städte) | keine der 35 Stadtseiten bekommt 0 FAQs (min. 14, max. 17) |
| Reviews | 38/38 mit `tags.landings`; `filterBySkill` normalisiert und deckt Tag UND categories ab |
| Event-Umbau | hat geliefert: firmenfeier 1→28, messe 7→31, hochzeit 10→34 |
| `/fr/belgique/` | 2 getaggte + 4 Default; FR-FAQ-Overlay wird über locale durchgereicht |
| Nebenläufigkeit | zwei schnelle Klicks im Umsortieren-Modus überschreiben sich nicht |

---

## Widerlegt — nicht erneut jagen

- **„27 von 232 Bildern sind nirgends erreichbar"** — die Zahl stimmt, die
  Folgerung nicht: `/galerie` rendert den kompletten Bestand ohne Auswahl und ist
  unter jedem „Unsere Kunst"-Banner verlinkt. Wahr bleibt: 27 Bilder (11,6 %)
  erscheinen in keiner Slideshow.
- **„Optimistische Haken werden bei Schreibfehler nicht zurückgenommen"** — war
  richtig beobachtet, aber vor A1 konnte in der Kette **nichts werfen**; der catch
  war toter Code. Mit A1 wurde beides zusammen erledigt.
- **„Nur die Mediathek schreibt Seed-Tags ins Vokabular fort"** — `ensureTagStored`
  wird an zwei Stellen gerufen, und über ImageManager/TagChips können nur
  Seed-Tags durchlaufen, die doppelt abgesichert sind.
- Teil-Widerlegungen innerhalb bestätigter Funde: „FAQs/Reviews mit Umlaut-Skill-
  Tag erscheinen nie" (falsch — beide prüfen Tag **und** categories); „Admin
  schreibt einen unbekannten Inhalts-Tag ins Vokabular fort" (falsch —
  `ensureTagStored` steigt vorher aus); „sync-tags schreibt nie ins Repo zurück"
  (falsch — jeder dev/build heilt die Datei lokal).
