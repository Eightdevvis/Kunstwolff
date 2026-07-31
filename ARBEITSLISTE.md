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

- [ ] 🔴 **C — 0.3 Google Fonts lokal hosten**
      174 von 176 Seiten laden `fonts.googleapis.com`/`fonts.gstatic.com`.
      Inter (400/500/600/700, latin + latin-ext) nach `public/fonts/inter/` wie Mayonice,
      `@font-face` mit `font-display: swap`, dann `Layout.astro:57-59` löschen.
      Abnahme: `grep -r 'googleapis\|gstatic' dist/` ist leer.

- [ ] 🔴 **C+S — 0.4 Datenschutzerklärung: drei Empfänger nachtragen**
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

- [ ] 🟠 **C — 2.3 Die Anlass-Dimension der FAQs ist tot**
      `eventKeys` entstehen nur, wenn `context.city` mit `events/` beginnt — die
      Event-Zweige übergeben aber gar keinen Kontext. Folge: `/firmenfeier/`, `/messe/`,
      `/hochzeit/`, `/private-feier/` zeigen alle dieselben 4 FAQs wie die Startseite.
      Ein im Admin gesetzter Anlass-Tag kommt nirgends an.

- [ ] 🟠 **C — 2.4 FaqManager vergleicht Label gegen Slug**
      Einziger Tag-Weg ohne `tagVocabulary.ts`. Bei **allen 70** FAQs mit Skill-Tag sind
      die Chips grau; ein Klick schreibt `skills: [schnellzeichner, Schnellzeichner]`.
      Auf `tagVocabulary.ts` + `slugifyTag` umstellen. (Admin-Repo)

- [ ] 🟠 **C — 2.5 `schnellzeichner-duesseldorf` steht als Stadt in `landings.md`**
      Erzeugt vier indexierte Seiten mit Titeln wie „Schnellzeichner
      Schnellzeichner-Duesseldorf buchen" und dem Fließtext „Bereichern".
      Zeile raus, Eintrag in `site-texts/content.json` raus, 301 auf
      `/schnellzeichner/duesseldorf/`.

- [ ] 🟠 **C — 2.6 Berlin-Intro hat vier Tippfehler in einem Satz**
      „Bereichern **Siw Ihrr** Messe, **Betreibsfeier** … **Schnellzichner**" — steht so
      auf der reichweitenstärksten Stadtseite. Zwei Minuten.

- [ ] 🟠 **C — 2.7 ReviewManager kann Tags nicht leeren**
      Sind nach dem Bearbeiten alle drei Dimensionen leer, bleibt der alte `tags`-Block
      stehen, während die Oberfläche „leer" zeigt. (Admin-Repo)

---

## Phase 3 — danach, nach Wirkung sortiert

- [ ] 🟡 **C — 3.1 Hero-Bilder ohne `srcset`** — größter Performance-Hebel.
      Die Varianten werden längst gebaut (677 pro Build), `buildSrcSet` wird aber in
      keinem Hero-Bauteil aufgerufen. 161 Seiten, Median 93 KB, 17 über 200 KB — gegen
      36 KB in der 400er-Variante. Achtung: 43 Seiten nutzen `titelbild.avif`, und der
      Varianten-Generator verarbeitet nur `.webp`. `img/why` ist derselbe Fall.

- [ ] 🟡 **C — 3.2 Barrierefreiheit, vier Befunde der Stufe A**
      Slider läuft mit 2,5 s Autoplay ohne Pause-Knopf und ignoriert
      `prefers-reduced-motion` (161 Seiten) · Slider-Pfeile sind namenlose `<div>`
      ohne Tastaturzugang (Swipers `A11y`-Modul nicht importiert) · mobiles
      Hamburger-Menü per Tastatur nicht zu öffnen (`display:none` auf der Checkbox) ·
      zehn Untermenü-Links bleiben bei `opacity:0` im Tab-Verlauf.
      Dazu: 169 von 176 Seiten ohne `<main>` und ohne Skip-Link.

- [ ] 🟡 **C — 3.3 Titel und H1 widersprechen sich auf 39 Stadtseiten**
      `landingHeadings` setzt „Schnellzeichner <Stadt>", der Titel wird als
      „Eventkünstler <Stadt> – Live-Kunst" gebaut. Der Nutzer liest im SERP etwas
      anderes als in der Überschrift.

- [ ] 🟡 **C — 3.4 Die Skill-Dimension wird nie per Tag abgefragt**
      `getSlidesByTag('skills', …)` hat in `src/` keinen einzigen Aufrufer.
      `/schnellzeichner/` zeigt 16 von 115 Bildern, `/szenenmaler/` 12 von 69.
      **Erst entscheiden, dann bauen** (siehe „Offene Fragen" im Tag-Audit).

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

- [ ] **S — Worker deployen.** `cd kunstwolff-admin && npm run worker:deploy`
      **Jetzt dringend:** die neue KI-Oberfläche liegt auf `master` und ruft
      `/api/ai/faehigkeiten` und `/api/ai/bild-tags` — beide gibt es nur im Worker.
      Bis der Deploy läuft, bekommt mom dort Fehler.
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
