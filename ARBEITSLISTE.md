# Arbeitsliste — Stand 2026-07-30

Zusammengeführt aus beiden Audits desselben Tages plus dem, was ohnehin offen war:

- `reports/cutover-audit-2026-07-30.md` — SEO/Funktion vor dem Domain-Umzug (88 Funde)
- `reports/tagsystem-audit-2026-07-30.md` — Tag-System, Daten, Rendering (45 Funde)

Die beiden überschneiden sich: „leere Aquarelle-Seiten", „Städte ohne eigene Bilder"
und „Duplicate Content" sind **derselbe Befund aus zwei Richtungen**. Hier stehen sie
einmal, an der Stelle, an der man sie anfasst.

**Legende:** 🔴 blockiert den Umzug · 🟠 sichtbar kaputt · 🟡 Hygiene
**S** = nur Sasha kann das (Dashboard, DNS, Geld, Rechtstext) · **C** = kann ich machen


---

## 🧍 Nur du (S) — zum Abarbeiten

Reihenfolge: 1 und 2 blockieren den Umzug, 3 blockiert die KI im Admin.

1. [ ] **`SITE_URL` in Vercel setzen und MANUELL neu deployen** (Phase 0.1)
       Ohne das bleibt **alles** auf `noindex` — der Stage-Host wird erkannt.
2. [ ] **DNS-Weg entscheiden** (Phase 0.2) — Zone liegt bei Wix, zwei Wege (A/B).
3. [x] ~~**Worker deployen**~~ ✅ erledigt (Aufgabe #9)
4. [x] ~~**Datenschutzerklärung freigeben**~~ ✅ freigegeben 2026-07-31 („sieht gut aus").
       AV Vercel geklärt (ToS 10.1, SCC Modul 2); AV Formspree entfällt mit dem
       Worker-Formular nach dem Umzug.
5. [ ] **Umzugstag** (Phase 1, sieben Schritte) — Redirects testen, DNS, Wix auf
       „Coming Soon", Apex→www, Search Console, 48 h beobachten.
6. [x] ~~**Entscheiden: `/private-feier/` und 9 Städte**~~ ✅ entschieden 2026-07-30/31:
       9 Städte ausgeblendet (128 Pfade in `page-visibility.json`), `/private-feier/`
       **bleibt sichtbar** — gemessen 37,5 % einzigartiger Text, genau wie die drei
       Geschwister-Anlässe. Der Seite fehlen Fotos, nicht Text.
7. [ ] **KI-Guthaben** — kleine Gemini-Aufladung, damit es zwei finanzierte Anbieter gibt.
8. [ ] **Vercel-Vorschauprojekt** — sonst bleibt „Entwurf bauen" im Admin tot.

## 🤖 Ich (C) — noch offen

Nach Wirkung sortiert:

1. [ ] **Die 144 Seiten mit nicht-einzigartigem Text** — genauer anschauen (neu, siehe unten)
2. [ ] **URL-Umbenennung `/schnellzeichner/` → `/schnellzeichner-karikaturist/`** (neu, Wunsch mom)
3. [ ] **Hero-Bilder ohne `srcset`** (3.1) — größter Performance-Hebel
4. [ ] **Barrierefreiheit, vier Befunde Stufe A** (3.2)
5. [x] ~~**Anlass-Dimension der FAQs ist tot**~~ ✅ erledigt 2026-07-31 (2.3)
6. [x] ~~**ReviewManager kann Tags nicht leeren**~~ ✅ erledigt 2026-07-31 (2.7)
7. [x] ~~**Datenschutz-Entwurf schreiben**~~ ✅ erledigt (Zuarbeit zu S-4)
8. [ ] **Rest-Hygiene** (3.5): `EventManager` legt keinen Anlass-Tag an · `pre-push`
       committet den gesamten Index · `jubilaum`/`jubilaeum` · zwei FAQ-Dateien ohne
       `.md` · Fehlerschlucker in `tagVocabulary.ts`

## ✅ Heute erledigt

`SITE_URL`-unabhängig, alles gemessen statt gehofft:

- Fonts lokal (0.3) · 129 Seiten ausgeblendet inkl. `/aquarelle/` selbst (0.5, Teil)
- 38 leere Skill×Stadt-Galerien → 0 (2.1) · leere Sektionen rendern nicht mehr (2.2)
- FaqManager-Chips funktionieren wieder (2.4) · Pseudo-Stadt `schnellzeichner-duesseldorf`
  raus (2.5) · Berlin-Tippfehler (2.6)
- Titel folgt jetzt der H1 statt sie zu widersprechen (3.3)
- **Skill-Seiten nutzen endlich die Tags** (3.4) · `sync:tags` bricht hart ab und
  `public/config` kommt zurück ins Repo (Teil 3.5)
- Im Admin-Repo: Datenverlust-Pfad in `slides.meta.json` geschlossen, KI-Fähigkeitenliste,
  Bild-Erkennung

---

## Neu dazugekommen (2026-07-30, aus dem Gespräch)

- [ ] 🟠 **C — N.1 Die 144 Seiten mit nicht-einzigartigem Text**
      Aus dem Cutover-Audit: 144 von 173 Seiten unter 5 % einzigartigem Text,
      `/dortmund/` und `/giessen/` auf 1493 von 1494 Wörtern gleich. Ein Teil ist mit
      dem Ausblenden vom Tisch (129 Seiten sind jetzt `noindex`), der Rest nicht.
      **Zu klären:** wie viele der verbliebenen ~41 indexierbaren Seiten sind noch
      Dubletten? Welcher Textbaustein erzeugt die Gleichheit — Intro, Why, FAQ oder
      Kontakt? Und was ist der billigste Hebel: pro Stadt 150–250 Wörter Ortsbezug,
      oder die dublizierenden Bausteine auf Stadtseiten weglassen?

      **✅ Gemessen am 2026-07-30 (nach dem Ausblenden), und es sieht viel besser aus
      als befürchtet:** von 170 gebauten Seiten sind **41 indexierbar**, 129 ausgeblendet.
      Von diesen 41 liegt **genau eine** unter 5 % einzigartigem Text: `/contact`
      (103 Wörter, 0 % — eine Kontaktseite, die naturgemäß nur Bausteine hat).
      Die 129 Dubletten waren also genau die, die jetzt draußen sind.

      Messmethode: Anteil der Wörter, die auf höchstens der Hälfte der indexierbaren
      Seiten vorkommen (also nicht Boilerplate). Andere Definition als im Cutover-Audit,
      dieselbe Frage.

      Was übrig bleibt, nach Dringlichkeit:
      - ✅ `/contact` — **erledigt 2026-07-31**, eigener Text: 103 → 310 Wörter.
      - ✅ `/partner` — **erledigt 2026-07-31**, eigener Text: 53 → 260 Wörter.
        (Beide bleiben ausdrücklich indexierbar — ausblenden war keine Option.)
      - Die 8 Skill×Anlass-Kombis liegen bei 28–33 % (`/szenenmaler/private-feier` am
        niedrigsten) und teilen sich ~470 Wörter Gerüst. Kein Notfall, aber der nächste
        sinnvolle Hebel: pro Kombination 100–150 Wörter eigener Text.
      - Zum Vergleich das obere Ende: `/kaiserslautern` 63 %, `/fr/belgique` 77 %.

- [x] 🟠 **C+S — N.2 `/schnellzeichner/` → `/schnellzeichner-karikaturist/`** ✅ **erledigt 2026-07-31**
      Technisch klein: `skills.json` erlaubt ein eigenes `link`-Feld, der Titel
      („Schnellzeichner") bleibt unverändert. Betrifft **40 URLs** (Skill + 35 Städte
      + 4 Anlässe).
      ⚠️ **Zwei Fallen:** (1) Die Tags an den Bildern hängen am TITEL, nicht an der URL —
      das ist seit heute im Code abgesichert (`skillTagSlug`), sonst hätte die
      umbenannte Seite 0 Bilder gezeigt. (2) Die alten URLs brauchen 301er, und die
      Redirect-Karte für den Wix-Umzug wird gerade gebaut — **beides zusammen planen**,
      sonst entstehen Ketten (Wix-URL → alte Astro-URL → neue Astro-URL).
      **Am besten VOR dem Cutover**, solange die URLs noch kein Ranking haben.
      **Erledigt:** `link` in `skills.json`, dazu Navigation, Sichtbarkeit (34 Pfade),
      SkillBanner-Fallback und drei `linkUrl` in Why-Detail-Inhalten. Die alten
      Adressen bleiben als **301** (`/schnellzeichner` und `/schnellzeichner/:rest*`);
      die 10 Wix-Ziele zeigen direkt auf die neue URL, also keine Ketten.

- [x] 🟠 **C — N.3 Ort-Kombis flach: `/berlin-schnellzeichner-karikaturist/`** ✅ **erledigt 2026-08-01**
      Zweiter Wunsch von mom, direkt im Anschluss. **Kostenlos, weil die Seite noch
      nicht live ist** (ohne `SITE_URL` steht alles auf `noindex`, Wix läuft noch) —
      kein Astro-URL hatte ein Ranking. Betrifft **102 URLs**.
      **Anlass-Kombis bleiben hierarchisch** (`/szenenmaler/hochzeit/`): das sind die
      einzigen 8 indexierbaren Kombi-Seiten, dafür lag kein Auftrag vor.
      ⚠️ **Die Falle:** `page-visibility.json` blendet per **Präfix** aus — `/aquarelle/`
      versteckt auch `/aquarelle/berlin/`. Bei `/berlin-aquarelle/` greift das **nicht
      mehr**; ohne Umschreiben der 102 Einträge wären genau die wegen Duplicate Content
      versteckten Seiten wieder indexierbar geworden und in der Sitemap gelandet.
      **Gemessen vorher/nachher, identisch:** 170 Seiten, 102 Kombis auf `noindex`,
      8 Anlass-Kombis indexierbar, 40 Sitemap-Einträge, 0 tote interne Links.
      Adressen an einer Stelle (`src/utils/comboUrls.ts`), 136 Weiterleitungen ohne
      Ketten, 10 neue Tests (2 davon gegen den alten Stand rot gegengeprüft).
      **Bleibt offen und ist der eigentliche Hebel:** pro Stadt 150–250 Wörter
      Ortsbezug — die URL-Form ändert an der Platzierung nichts (siehe N.1).
      Der eigentliche Umbau war Falle (1): die URL war zugleich der Schlüssel für
      Titelbild, hero-bg, Why, Erinnerungen und Kombitexte. Jetzt trennt
      `skillContentKey()` beides, `tests/skill-url-vs-inhalt.test.ts` hält es fest.

---

## Phase 0 — bevor DNS angefasst wird

Ohne diese fünf geht der Umzug schief. Reihenfolge egal, außer 0.1 muss vor 0.2.

- [ ] 🔴 **S — 0.1 `SITE_URL` setzen und MANUELL neu deployen**
      Vercel → Settings → Environment Variables: `SITE_URL=https://www.kunstwolff.de`,
      nur Environment **Production**. Danach Production-Deployment von Hand neu bauen —
      geänderte Env-Variablen wirken nicht auf bestehende Deployments.
      Variable *löschen* ist **keine** Alternative (Fallback ist der Apex, kanonisch ist www).
      Abnahme: `curl -s <deployment-url>/ | grep -E 'robots|canonical'`
      → muss `index, follow` und `https://www.kunstwolff.de/` zeigen.

- [ ] 🔴 **S — 0.2 DNS-Weg entscheiden**
      Die Zone liegt bei **Wix** (`ns12/ns13.wixdns.net`), nicht beim Registrar.
      **(A)** Records in der Wix-DNS-Verwaltung ändern, Wix als DNS-Provider behalten —
      dann „Disconnect Domain" **niemals** ausführen, nur „Coming Soon".
      **(B)** NS beim Registrar wegmigrieren, Zone nachbauen (nur `A` + `CNAME www`,
      sonst ist die Zone leer), 24–48 h propagieren — muss **vor** den Cutover-Tag.

- [x] 🔴 **C — 0.3 Google Fonts lokal hosten** ✅ **erledigt**
      174 von 176 Seiten laden `fonts.googleapis.com`/`fonts.gstatic.com`.
      Inter (400/500/600/700, latin + latin-ext) nach `public/fonts/inter/` wie Mayonice,
      `@font-face` mit `font-display: swap`, dann `Layout.astro:57-59` löschen.
      Abnahme: `grep -r 'googleapis\|gstatic' dist/` ist leer.

- [x] 🔴 **C+S — 0.4 Datenschutzerklärung: drei Empfänger nachtragen** ✅ **erledigt,
      freigegeben 2026-07-31.** Kontaktadresse `info@artelines.com` statt der nicht
      existierenden `datenschutz@kunstwolff.de`.
      Heute null Treffer für „Formspree", „Kontaktformular", „Google Fonts", „Drittland".
      Fehlt: Formspree Inc. (Name/E-Mail/Telefon/Datum/Freitext), Vercel Inc. (Hosting),
      Google (IP — entfällt mit 0.3). Ich schreibe den Entwurf, **Wortlaut gibt Sasha frei**.
      Dazu AV-Verträge bei Vercel und Formspree (je ein Klick im Kundenkonto).

- [ ] 🔴 **S — 0.5 Entscheidung: was bleibt indexierbar?**
      144 von 173 Seiten haben unter 5 % einzigartigen Text; `/dortmund/` und `/giessen/`
      sind 1493 von 1494 Wörtern gleich. **Zwei Wege:**
      **(a)** Städte/Skills ohne eigenen Inhalt über `public/config/page-visibility.json`
      auf `hidden` (wirkt als noindex **und** filtert die Sitemap), später einzeln zurück.
      **(b)** je Stadt 150–250 Wörter Ortsbezug schreiben.
      Empfehlung: (a) jetzt, (b) danach stadtweise. **Sobald du (a) sagst, setze ich es um.**
      Betrifft zusammen: 40 Aquarelle-Seiten (0 Bilder, 0 Reviews, 1 FAQ), `/private-feier/`
      (0 Bilder), 9 Städte mit 0 eigenen Bildern.
      ✅ **Aquarelle ist erledigt (2026-07-30):** über `page-visibility.json`
      ausgeblendet, gemessen 40/40 `noindex`, 0 Sitemap-Einträge, raus aus der Navigation.
      Dafür wurde die Ausblende-Regel präfix-fähig (vorher hätte sie nur die Skill-Seite
      selbst erwischt, nicht die 39 Kombiseiten). **Offen bleiben** `/private-feier/`
      und die 9 Städte — sag Bescheid, dann blende ich sie im selben Zug aus.

---

## Phase 1 — der Umzugstag selbst

- [ ] **S — 1.1** Redirect-Karte gegen eine Vercel-Preview durchtesten
      (liegt fertig in `vercel.json`, Tabelle in `reports/cutover-audit-…` Anhang A)
- [ ] **S — 1.2** DNS umstellen nach dem in 0.2 gewählten Weg
- [ ] **S — 1.3** Wix-Site auf „Coming Soon" — **nicht** „Disconnect Domain"
- [ ] **S — 1.4** Apex → www als Redirect in den Vercel-Domain-Settings (nicht in `vercel.json`)
- [ ] **S — 1.5** Search Console: Property für `www.kunstwolff.de`, Sitemap
      `https://www.kunstwolff.de/sitemap-index.xml` einreichen, Adressänderung beantragen
- [ ] **S — 1.6** 48 h die Abdeckungsberichte beobachten — 404-Spitzen = fehlende Redirects
- [ ] **S — 1.7** GSC-Export der alten Property (12 Monate, nach Klicks) gegen die
      Redirect-Karte halten. Die 34 URLs kommen aus den Wix-Sitemaps; was **wirklich**
      rankt, steht nur in der Search Console.

---

## Phase 2 — sichtbar kaputt (unabhängig vom Umzug)

- [x] 🟠 **C — 2.1 38 von 105 Skill×Stadt-Seiten zeigen eine leere Galerie** ✅ **erledigt 2026-07-30**
      Aufgefüllt wird **vor** dem Filtern: `getCitySlides` → auf 6 auffüllen →
      dann `filteredCategories`. Da 93 von 232 Slides keine `categories` haben, sieben
      sich die Nachfüller selbst aus. Karlsruhe hat 7 eigene Bilder → kein Auffüllen →
      Filter wirft alle 7 weg, obwohl 115 Schnellzeichner-Bilder im Repo liegen.
      **Schritt:** erst filtern, dann mit ebenfalls gefilterten Bildern auffüllen.
      (`slideImages.ts`, `[skill]/[landing].astro`)
      **Erledigt:** `getSkillSlidesForCity()`, in beiden Zweigen (Stadt UND Event —
      der Event-Zweig hatte denselben Fehler). Am `dist/` gemessen:
      `karlsruhe`/`neunkirchen`/`fulda` von 0 auf je 6 Bilder, 0 Nicht-Aquarelle-
      Seiten ohne Bilder. Test: `tests/skill-slides-order.test.ts`.

- [x] 🟠 **C — 2.2 Leere Sektionen rendern trotzdem Überschrift und Rahmen** ✅ **erledigt 2026-07-30**
      `Slideshow.astro` rendert `<h2>Unsere Kunst</h2>` unbedingt; `SkillHero.astro`
      guardet gegen die ungefilterte Review-Liste; `MiniReviews.astro` hinterlässt
      ~44 px Leerraum. Unabhängig von 2.1 — auch danach gibt es leere Fälle.
      **Erledigt:** beide Guards gesetzt. Am `dist/` gemessen: **0** leere
      Galerie-Sektionen (vorher 38), **0** leere Bewertungs-Slider.

- [x] 🟠 **C — 2.3 Die Anlass-Dimension der FAQs ist tot** ✅ **erledigt 2026-07-31**
      `eventKeys` entstehen nur, wenn `context.city` mit `events/` beginnt — die
      Event-Zweige übergeben aber gar keinen Kontext. Folge: `/firmenfeier/`, `/messe/`,
      `/hochzeit/`, `/private-feier/` zeigen alle dieselben 4 FAQs wie die Startseite.
      Ein im Admin gesetzter Anlass-Tag kommt nirgends an.
      **Erledigt:** eigenes `event`-Feld im Kontext, und die Auswahlregel vereinheitlicht —
      *ein Tag gilt dort, wo danach gefragt wird; Defaults füllen auf*, genau wie bei
      Bildern und Reviews. Dabei kam heraus, dass `sync-faq-tags.mjs` 82 von 83 FAQs
      automatisch einen Skill-Tag verpasst hatte; die sind raus. Gemessen: jede
      Anlass-Seite 3 eigene + 1 Default, Köln 2 + 2, Start/Stadt/Skill 4 Defaults,
      `/faq/` 87. Dazu 12 neue Anlass-FAQs (`public/faq/default/anlass--*.md`),
      **die Gabriele noch gegenlesen sollte**.

- [x] 🟠 **C — 2.4 FaqManager vergleicht Label gegen Slug** ✅ **erledigt 2026-07-30**
      Einziger Tag-Weg ohne `tagVocabulary.ts`. Bei **allen 70** FAQs mit Skill-Tag sind
      die Chips grau; ein Klick schreibt `skills: [schnellzeichner, Schnellzeichner]`.
      Auf `tagVocabulary.ts` + `slugifyTag` umstellen. (Admin-Repo)

- [x] 🟠 **C — 2.5 `schnellzeichner-duesseldorf` steht als Stadt in `landings.md`** ✅ **erledigt**
      Erzeugt vier indexierte Seiten mit Titeln wie „Schnellzeichner
      Schnellzeichner-Duesseldorf buchen" und dem Fließtext „Bereichern".
      Zeile raus, Eintrag in `site-texts/content.json` raus, 301 auf
      `/schnellzeichner/duesseldorf/`.

- [x] 🟠 **C — 2.6 Berlin-Intro hat vier Tippfehler in einem Satz** ✅ **erledigt**
      „Bereichern **Siw Ihrr** Messe, **Betreibsfeier** … **Schnellzichner**" — steht so
      auf der reichweitenstärksten Stadtseite. Zwei Minuten.

- [x] 🟠 **C — 2.7 ReviewManager kann Tags nicht leeren** ✅ **erledigt 2026-07-31**
      Sind nach dem Bearbeiten alle drei Dimensionen leer, bleibt der alte `tags`-Block
      stehen, während die Oberfläche „leer" zeigt. (Admin-Repo)
      **Erledigt:** leerer Block wird geschrieben, wenn vorher einer da war — sonst
      bleibt die Bewertung ungetaggt und damit Default. Nebenbei: `vite.config.ts`
      zählte Tests aus einem Worktree mit (58/664 statt echter 28/326).

**→ Phase 2 ist damit vollständig abgearbeitet.**

---

## Phase 3 — danach, nach Wirkung sortiert

- [x] 🟡 **C — 3.1 Hero-Bilder ohne `srcset`** ✅ **erledigt 2026-07-31**
      Die Varianten werden längst gebaut (677 pro Build), `buildSrcSet` wird aber in
      keinem Hero-Bauteil aufgerufen. 161 Seiten, Median 93 KB, 17 über 200 KB — gegen
      36 KB in der 400er-Variante. Achtung: 43 Seiten nutzen `titelbild.avif`, und der
      Varianten-Generator verarbeitet nur `.webp`. `img/why` ist derselbe Fall.
      **Erledigt:** `SkillHero` bekommt echtes `srcset`; `Opener` und `EventHero`
      zeigen ihr Bild als CSS-Hintergrund und bekommen die Varianten als
      CSS-Variablen plus Media-Queries (mit Pixeldichte, sonst wird es auf
      Retina-Handys weich). Gemessen: 5139 Kandidaten, **0 fehlend**;
      Hintergrund-Heroes 132 → 55 KB Median (60 %).
      Zwei Fallen, beide erst am gebauten `dist/` sichtbar: `hero-bg` liegt
      ausserhalb der drei Ordner mit Varianten (Riegel jetzt in `buildSrcSet`
      selbst), und die Stufen aus dem `srcset`-String zurückzulesen zählt das
      ORIGINAL mit — 13 tote Kandidaten. Beides hat jetzt einen Test.
      Das eine AVIF (`titelbild.avif`, 39 KB) bleibt bewusst ohne Varianten:
      es ist kleiner als jede, die daraus entstünde.

- [ ] 🟡 **C — 3.2 Barrierefreiheit, vier Befunde der Stufe A**
      Slider läuft mit 2,5 s Autoplay ohne Pause-Knopf und ignoriert
      `prefers-reduced-motion` (161 Seiten) · Slider-Pfeile sind namenlose `<div>`
      ohne Tastaturzugang (Swipers `A11y`-Modul nicht importiert) · mobiles
      Hamburger-Menü per Tastatur nicht zu öffnen (`display:none` auf der Checkbox) ·
      zehn Untermenü-Links bleiben bei `opacity:0` im Tab-Verlauf.
      Dazu: 169 von 176 Seiten ohne `<main>` und ohne Skip-Link.

- [x] 🟡 **C — 3.3 Titel und H1 widersprechen sich auf 39 Stadtseiten** ✅ **erledigt 2026-07-30**
      `landingHeadings` setzt „Schnellzeichner <Stadt>", der Titel wird als
      „Eventkünstler <Stadt> – Live-Kunst" gebaut. Der Nutzer liest im SERP etwas
      anderes als in der Überschrift.

- [x] 🟡 **C — 3.4 Die Skill-Dimension wird nie per Tag abgefragt** ✅ **erledigt 2026-07-30**
      `getSlidesByTag('skills', …)` hat in `src/` keinen einzigen Aufrufer.
      `/schnellzeichner/` zeigt 16 von 115 Bildern, `/szenenmaler/` 12 von 69.
      **Entschieden (2026-07-30): war ein Bug, kein Kuratieren.** Die 30 Bilder aus
      `default-selection.json` sind für die STARTSEITE handverlesen (im Admin, über den
      ImageManager) — sie als Quelle der Skill-Seiten zu nehmen war nie beabsichtigt;
      11 davon tragen gar keinen Skill und konnten dort nie erscheinen.
      **Erledigt:** `getSkillSlides()` fragt `getSlidesByTag('skills', …)`, gedeckelt auf
      24 Bilder (nach `priority`), Rest über den Galerie-Link. Die handverlesene Auswahl
      bleibt, wo sie gemeint war: auf der Startseite. Der Tag-Slug kommt dabei aus dem
      TITEL, nicht aus der URL — sonst bricht die geplante Umbenennung N.2 die Seite.

- [ ] 🟡 **C — 3.5 Kette und Hygiene** (Sammelposten aus dem Tag-Audit, Abschnitt C)
      ✅ ~~`sync:tags` als harten Schritt~~ **erledigt 2026-07-30** (`hart: true` in
      `sync-content-safe.mjs`; mit `{title:'Abiball', slug:'abi-party'}` gemessen:
      vorher Exit 0, jetzt Exit 1) ·
      ✅ ~~`public/config` fehlt in beiden `git add`-Listen~~ **erledigt 2026-07-30**
      (plus `public/erinnerungen`, `public/events`, Trigger-Pfad und der rote Job bei
      Änderungen außerhalb der add-Liste) ·
      `EventManager.createEvent` legt keinen Anlass-Tag an · `pre-push` committet den
      gesamten Index · `jubilaum` vs. `jubilaeum` · zwei FAQ-Dateien ohne `.md`-Endung
      (`kaiserslautern/wann-buchen` umbenennen, `default/kosten-schnellzeichner` löschen).

---

## Läuft unabhängig weiter

- [x] ~~**S — Worker deployen.**~~ ✅ erledigt. Wichtig bleibt: der Worker wird
      **nicht** automatisch mitdeployt. Nach jeder Änderung unter `worker/`
      wieder `npm run worker:deploy`.
- [ ] **S — KI-Guthaben entscheiden.** Kleine Gemini-Aufladung (5–10 €), damit es zwei
      finanzierte Anbieter gibt statt einen.
- [ ] **S — Vercel-Vorschauprojekt.** Projekt aus `Eightdevvis/Kunstwolff` mit Production
      Branch `vorschau`, dann `VITE_VORSCHAU_BASE` (Admin) und `PREVIEW_EXTRA_BASES`
      (Worker) setzen. Erst damit funktioniert der „Entwurf bauen"-Knopf.

---

## Was NICHT auf der Liste steht

Damit niemand es erneut jagt — geprüft und in Ordnung:

Build (176 Seiten fehlerfrei) · keine toten internen Links · keine toten Bildverweise ·
Sitemap und Canonicals · `<html lang>`/charset/viewport · FAQPage-Schema (valide seit
dem Merge vom 02.07.) · `og:image`-Fallback · Navigation (Services aus `skills.json`,
Events aus `events.json`) · Cache-Header · `/seite` und `/seite/` · echte 404 ·
Tag-Vokabular und Slug-Normalisierung · Testsuiten beider Repos.

---

## Nach dem Umzug (2026-07-31 vertagt, drängt nicht)

- [ ] **E-Mail/Formular vom Worker statt Formspree.** Braucht Cloudflare als
      DNS-Anbieter, und den Nameserver-Wechsel macht bei einer Wix-Domain nur der
      Wix-Support (Live-Chat, ~2 Tage). Deshalb nach dem Umzug. Fertig geplant:
      öffentlicher `POST /api/kontakt` mit Feldprüfung, Honeypot, Zeitfalle,
      Rate-Limit pro IP, Versand über Cloudflare Email Routing.
      Wenn das steht, fällt §4 der Datenschutzerklärung ersatzlos weg.
- [ ] **AV-Vertrag Formspree** — bis dahin ungeklärt; `formspree.io/legal/dpa` gibt es
      nicht. Erledigt sich mit dem Punkt darüber.
      (Vercel ist geklärt: DPA per Verweis in Ziff. 10.1 der ToS, SCC Modul 2.)
- [ ] 🟡 **Eine gemeinsame Auswahl-Funktion für FAQs, Bilder und Reviews.**
      Seit 2026-07-31 verhalten sich alle drei gleich — *spezifisch zuerst, Defaults
      füllen auf* — aber der Code steht dreimal da: `faq.ts` (`dimensionPasst`),
      `reviews.ts` (`landings.length === 0`), `slideImages.ts`
      (`supplementWithDefaultSlides`). Solange das so ist, driftet es wieder
      auseinander. Eine Funktion, drei Aufrufer.
