# Arbeitsliste — Stand 2026-08-01

> **Am 2026-08-01 komplett gegen den Code nachgeprüft**, nicht fortgeschrieben.
> Vier Einträge waren veraltet und sind unten korrigiert: 3.1 (`srcset`) und
> `jubilaum`/`jubilaeum` waren längst erledigt, 0.5 war entschieden, und die
> Zahlen in N.1 sind überholt (besser geworden).
> **Eine Annahme war schlicht falsch — siehe 0.1: ohne `SITE_URL` steht die Seite
> NICHT auf `noindex`.** Das ändert, wogegen beim Umzug geprüft werden muss.

Zusammengeführt aus beiden Audits desselben Tages plus dem, was ohnehin offen war:

- `reports/cutover-audit-2026-07-30.md` — SEO/Funktion vor dem Domain-Umzug (88 Funde)
- `reports/tagsystem-audit-2026-07-30.md` — Tag-System, Daten, Rendering (45 Funde)

Die beiden überschneiden sich: „leere Aquarelle-Seiten", „Städte ohne eigene Bilder"
und „Duplicate Content" sind **derselbe Befund aus zwei Richtungen**. Hier stehen sie
einmal, an der Stelle, an der man sie anfasst.

**Legende:** 🔴 blockiert den Umzug · 🟠 sichtbar kaputt · 🟡 Hygiene
**S** = nur Sasha kann das (Dashboard, DNS, Geld, Rechtstext) · **C** = kann ich machen


---

## 🎯 Das Ziel: der Umzug, ohne eine kaputte oder SEO-schädliche Seite

**Entschieden am 2026-08-01.** `SITE_URL` und der DNS-Weg standen hier als
Vorher-Aufgaben. Sie sind aber **Schritte des Umzugs selbst**, kein Vorlauf —
sie gehören in Phase 1, nicht auf eine Vorher-Liste. Der Umzugstag ist das,
worauf zugearbeitet wird, kein abzuhakender Punkt.

**Vertagt (ausdrücklich, nicht vergessen):** Gemini-Guthaben · Vorschauprojekt
(funktioniert derzeit gut genug) · Barrierefreiheit · eigener Ortstext.
Der Text kommt **nach** dem Umzug — genau dafür stehen die Seiten auf `noindex`.
Die Anlass-FAQs sind abgenommen.

### Blockiert den Umzug — Stand heute: nichts auf meiner Seite

Am gebauten Stand nachgemessen: 0 tote Links, 0 tote Sprungmarken, 0 kaputte
Adressen von 1211, 40 indexierbare Seiten = 40 Sitemap-Einträge, keine
Weiterleitungsketten. Die Seite ist aus meiner Sicht umzugsbereit.

**Zwei Dinge, die vor oder beim Umzug wirklich zählen — beide brauchen dich:**

1. **Ist die Vercel-Stage gerade indexierbar?** Das ist die echte Frage hinter
   0.1 (die alte Notiz dort war falsch, siehe unten). Steht `SITE_URL` heute
   **nicht** auf der Stage-Adresse, liefert die Seite `index, follow`. Dann
   bitte in der Search Console nachsehen, ob die `.vercel.app`-Adresse bereits
   Treffer hat — die müssten beim Umzug mit weggeräumt werden.
2. **Die Weiterleitungs-Karte gegen echte Zahlen halten** (bisher 1.7). Die
   34 Adressen stammen aus den Wix-Sitemaps. Was **wirklich** rankt, steht nur
   in der Search Console. Fehlt dort eine Adresse, verliert genau die ihren
   Traffic — das ist der einzige verbliebene Weg, sich beim Umzug ernsthaft
   zu schaden. **Export: 12 Monate, nach Klicks sortiert.**
   ✅ **Das Werkzeug dafür steht seit 2026-08-01:**
   `node scripts/gsc-abgleich.mjs <Seiten.csv>` (nach einem `npm run build`).
   Es prüft je Adresse in dieser Reihenfolge: existiert sie noch im Build? →
   greift eine Weiterleitung aus `vercel.json`, und existiert deren Ziel? →
   sonst Treffer, nach Klicks sortiert. Adressen ohne Klicks werden
   übersprungen (`--alle` nimmt sie mit), Wildcards wie
   `/portfolio-collections/:rest*` werden aufgelöst. Exit 1, wenn etwas fehlt.
   **Du brauchst nur den Export zu ziehen und mir den Pfad zu nennen.**

### Beim Umzug selbst nicht verwechseln

`SITE_URL` muss auf **`https://www.kunstwolff.de`** stehen *und* der
Apex→www-Redirect in den Vercel-Domain-Settings gesetzt sein. Ohne `SITE_URL`
baut Astro auf den **Apex** — dann zeigt jedes Canonical auf `kunstwolff.de`,
während die Domain auf `www` umleitet. Das ist genau die Art doppelter
Signale, die man beim Umzug nicht gebrauchen kann.

---

## 🧍 Nur du (S)

**1 und 2 sind Schritte des Umzugs, keine Vorarbeit** (klargestellt 2026-08-01) —
sie stehen hier nur, weil niemand sonst an Vercel und DNS herankommt.

1. [ ] 🚚 **`SITE_URL` setzen und MANUELL neu deployen** — **Umzugsschritt** (Phase 0.1/1)
       ⚠️ **Korrigiert am 2026-08-01:** die alte Notiz „ohne das bleibt alles auf
       `noindex`" war **falsch herum**. Der Schutz greift nur, wenn `SITE_URL`
       *gesetzt* ist (auf die Stage-Adresse). Ist sie **nicht** gesetzt, baut
       Astro mit `https://kunstwolff.de` und liefert `index, follow`. Details in 0.1.
       **Vorher zu klären ist nur eins:** ob die Stage deshalb gerade schon
       indexiert wird (siehe „Das Ziel" oben, Punkt 1).
2. [x] ✅ **DNS-Weg entschieden 2026-08-01: Weg B — Zone zu Cloudflare.**
       Gemessen statt vermutet (`dig`): Zone liegt bei Wix
       (`ns12/ns13.wixdns.net`), **keine MX-, keine TXT-Records**. Über die
       Domain läuft keine E-Mail — damit fällt das übliche Risiko von Weg B
       (vergessene Einträge) weg, es gibt nur die Website zu übernehmen.
       Cloudflare, weil dort schon der Admin-Worker läuft.
       **Ausführung: `CUTOVER_PLAN.md` §2.3**, zehn Schritte, Reihenfolge ist
       entscheidend (erst Zone bauen und prüfen, dann Nameserver umstellen).
       24–48 h Propagation, kein Ausfall dabei.
       ⚠️ Im alten Cutover-Plan standen **vier falsche Aussagen**, zwei davon
       gefährlich („Disconnect Domain" bei Wix, und die umgedrehte
       `noindex`-Behauptung). Alle vier oben im Plan korrigiert.
3. [x] ~~**Worker deployen**~~ ✅ erledigt (Aufgabe #9)
4. [x] ~~**Datenschutzerklärung freigeben**~~ ✅ freigegeben 2026-07-31 („sieht gut aus").
       AV Vercel geklärt (ToS 10.1, SCC Modul 2); AV Formspree entfällt mit dem
       Worker-Formular nach dem Umzug.
5. [x] **Umzugstag** — das ist das ZIEL, kein Listenpunkt (Phase 1, sieben Schritte) — Redirects testen, DNS, Wix auf
       „Coming Soon", Apex→www, Search Console, 48 h beobachten.
6. [x] ~~**Entscheiden: `/private-feier/` und 9 Städte**~~ ✅ entschieden 2026-07-30/31
       (am 2026-08-01 nachgemessen: 18 Städte + `/aquarelle/` ausgeblendet,
       `/private-feier/` steht **nicht** in `page-visibility.json` und ist indexierbar —
       genau wie beschlossen. Damit ist auch **0.5 erledigt**, dort stand es noch offen):
       9 Städte ausgeblendet (128 Pfade in `page-visibility.json`), `/private-feier/`
       **bleibt sichtbar** — gemessen 37,5 % einzigartiger Text, genau wie die drei
       Geschwister-Anlässe. Der Seite fehlen Fotos, nicht Text.
7. [ ] ⏸️ **KI-Guthaben** — vertagt 2026-08-01 — kleine Gemini-Aufladung, damit es zwei finanzierte Anbieter gibt.
8. [ ] ⏸️ **Vercel-Vorschauprojekt** — vertagt 2026-08-01 — sonst bleibt „Entwurf bauen" im Admin tot.

## 🤖 Ich (C) — noch offen

**Alles hier ist auf NACH dem Umzug vertagt** (Entscheidung 2026-08-01). Nichts
davon macht die Seite kaputt oder schadet der Platzierung — gemessen, nicht
vermutet. Nach Wirkung sortiert, am 2026-08-01 einzeln gegen den Code geprüft:

1. [ ] ⏸️ **Eigener Text für die 8 Skill×Anlass-Kombis** (N.1, Rest) — **nach dem
       Umzug.** Genau dafür stehen die Dubletten auf `noindex`. Deutlich
       entschärft: keine indexierbare Seite mehr unter 5 %.
2. [ ] ⏸️ **Barrierefreiheit, vier Befunde Stufe A** (3.2) — **nach dem Umzug.**
       Nachgemessen und weiterhin offen: kein `A11y`-Import bei Swiper, `<main>`
       und Skip-Link auf der Startseite je **0**, `prefers-reduced-motion` fehlt
       im Hauptslider (nur in BrandStripe, BrandGrid, MiniReviews, Navigation).
       **Kein Umzugs-Hindernis:** es macht nichts kaputt und schadet der
       Platzierung nicht. Auch rechtlich drängt es hier nicht — das BFSG greift
       für Dienstleistungen von Kleinstunternehmen nicht. Bleibt trotzdem
       richtig, nur eben danach.
3. [ ] ⏸️ **Rest-Hygiene** (3.5) — **nach dem Umzug**, geprüft und noch offen.
       **Neu am 2026-08-01 dazu:**
       `sync-faq-tags.mjs` überspringt jede Datei, die *irgendeinen* `tags:`-
       Schlüssel hat — auch einen unvollständigen (Zeile 156). Das Admin-Tool
       schreibt aber Teilblöcke: eine FAQ im `bw/`-Ordner hatte nur einen
       Skill-Tag und erschien deshalb **nicht** auf der BW-Seite, sondern galt
       als allgemeine FAQ. Datei von Hand ergänzt; **das Skript gehört zum
       Branch `tag-sweep-2026-07-31`**, der es ohnehin ändert — dort gehört der
       Fix hin. ·
       Der pre-push-Hook schreibt während des Pushes in `public/`. Läuft
       gleichzeitig die Testsuite, wird sie davon rot — dreimal beobachtet,
       jedes Mal ein Fehlalarm. Wer Tests laufen lässt, sollte nicht zeitgleich
       pushen.
       ✅ ~~`EventManager.createEvent` legt keinen Anlass-Tag an~~ **erledigt
       2026-08-01** (Branch `tag-sweep-2026-07-31`): `createTag('events', title,
       'events.json', slug)` ergänzt — derselbe Aufruf, den das
       Dashboard-Schnellanlegen seit jeher macht. Vorher bekam ein hier
       angelegtes Event eine Seite, tauchte in keiner Tag-Auswahl auf und blieb
       ohne ein einziges Bild, ohne Fehlermeldung. Der NFD-Teil des Befunds war
       schon vorher gegenstandslos — `slugify` (`utils/encoding.ts:77`) macht das
       seit je, 21 Tests halten es fest. Nachgeprüft, nicht vermutet.
       **Weiterhin offen:**
       `pre-push` committet alles Gestagete in einen `chore:`-Commit ·
       zwei FAQ-Dateien ohne `.md` (`default/kosten-schnellzeichner`,
       `kaiserslautern/wann-buchen`) · vier stille `catch`-Blöcke in
       `services/tagVocabulary.ts`.
       ✅ ~~`jubilaum`/`jubilaeum`~~ **war schon erledigt** — `jubilaum` ohne `ae`
       kommt in `public/` und `src/` **nirgends** mehr vor.
4. [ ] ⏸️ **Zwei dünne indexierbare Seiten** — **nach dem Umzug**
       (neu am 2026-08-01 aufgefallen)
       `/referenzen/` hat **64 Wörter**, `/impressum/` **69**. Beim Impressum ist das
       richtig so. `/referenzen/` ist ein reines Logo-Gitter — entweder ein paar Sätze
       dazu oder ausblenden. *(Achtung: am Branch `referenzen-static-grid` arbeitet
       gerade jemand anderes an genau dieser Seite.)*

- [x] ~~**Hero-Bilder ohne `srcset`** (3.1)~~ ✅ **war schon erledigt** — stand hier
      fälschlich noch offen. `SkillHero` nutzt `heroSrcSet`, `Opener` und `EventHero`
      setzen die Varianten als CSS-Variablen.
- [x] ~~**URL-Umbenennung `/schnellzeichner/`**~~ ✅ erledigt 2026-07-31 (N.2)
- [x] ~~**Ort-Kombis flach ziehen**~~ ✅ erledigt 2026-08-01 (N.3)
- [x] ~~**Anlass-Dimension der FAQs ist tot**~~ ✅ erledigt 2026-07-31 (2.3)
- [x] ~~**ReviewManager kann Tags nicht leeren**~~ ✅ erledigt 2026-07-31 (2.7)
- [x] ~~**Datenschutz-Entwurf schreiben**~~ ✅ erledigt (Zuarbeit zu S-4)
- [x] ~~**Bild-Adressen mit `%2F`**~~ ✅ erledigt 2026-08-01 (N.4)
- [x] ~~**Bild-Metadaten überleben das Umbenennen nicht**~~ ✅ erledigt 2026-08-01 (N.5)

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

      **🔄 Neu gemessen am 2026-08-01 — die Zahlen oben sind überholt, es ist besser
      geworden:** von 40 indexierbaren Seiten liegt jetzt **keine einzige unter 5 %**
      (vorher `/contact` mit 0 %). Die 8 Skill×Anlass-Kombis stehen bei **41–47 %**
      statt 28–33 %; die 12 neuen Anlass-FAQs vom 31.07. haben sie auseinandergezogen.
      Am unteren Ende stehen jetzt `/impressum/` (40 %, 69 Wörter — bei einem
      Rechtstext richtig so) und `/referenzen/` (46 %, 64 Wörter — das ist dünn).
      Oberes Ende unverändert: `/faq/` 80 %, `/kaiserslautern/` 73 %.
      Die Empfehlung bleibt trotzdem stehen: 100–150 Wörter eigener Text je Kombination,
      und pro Stadt 150–250 Wörter Ortsbezug. Das ist der Hebel, nicht die Adressform.

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

- [x] 🟠 **C — N.4 141 Bild-Adressen liefen ins Leere (`%2F`)** ✅ **erledigt 2026-08-01**
      Beim vollständigen HTTP-Durchlauf gegen den gebauten Stand aufgefallen.
      Verschachtelte Ordnerschlüssel (`events/hochzeit`, `mediathek/somfot`) liefen
      am Stück durch `encodeURIComponent`; aus dem Trenner wurde `%2F`. Das ist laut
      RFC 3986 **kein** Pfadtrenner, sondern ein Zeichen im Segment — die Adresse traf
      keine Datei mehr. Nachgemessen: korrekter Pfad `200`, die Form aus dem HTML `500`.
      Betroffen waren `/galerie/`, `/hochzeit/`, `/messe/`, `/firmenfeier/`, `/mainz/`
      und mehrere Skill×Anlass-Seiten — also **indexierbare** Seiten.
      **Warum es niemandem auffiel:** die Dateien existieren ja, nur der Weg dorthin war
      falsch geschrieben. `validate-image-refs.mjs` prüft die Verweise in den Quellen,
      nicht die erzeugte Adresse — und meldete brav „alle gültig".
      Vorher **141 von 1140** Adressen kaputt, nachher **0 von 1139**.
      Dieselbe Falle steckte latent in `skills.ts`, `events.ts` und `heroBg.ts`.

- [x] 🟠 **C — N.5 Bild-Metadaten überlebten das Umbenennen nicht** ✅ **erledigt 2026-08-01**
      Der Optimierer macht beim Push aus `x.gif` ein `x.webp`. Die Metadaten schlüsseln
      auf den Dateinamen — der alte Schlüssel zeigte danach ins Leere. **Ohne jede
      Fehlermeldung:** die Seite rendert weiter, nur mit Standardwerten.
      Genau das ist passiert, während dieser Durchlauf lief: ein frisch über den Admin
      hochgeladenes Titelbild (szenenmaler, Schloss Kronberg) wurde konvertiert, und die
      eben eingestellten Werte `focus 49% 60%` / `frame 0` fielen weg. Zurückgeholt.
      Bisher zog **nur** `slides.meta.json` mit, `title.meta.json` nie.
      ⚠️ **Das traf jeden Nicht-WebP-Upload** — es ist also nicht einmalig passiert,
      sondern war der Normalfall, bis heute.
      Umschlüsselung jetzt in `scripts/bild-metadaten-schluessel.mjs`, in beiden
      Optimierern, plus ein Test, der jeden Schlüssel gegen die Platte hält.

- [x] 🟠 **C — N.6 „FAQ" und „Anfrage" zeigten auf 13 Seiten ins Leere** ✅ **erledigt 2026-08-01**
      Beim zweiten Link-Durchlauf gefunden (diesmal: sind Links überhaupt
      anklickbar?). `navigation.json` führt „FAQ" auf `#faq` und „Anfrage" auf
      `#contact`. Diese Abschnitte gibt es aber nur auf einem Teil der Seiten —
      auf **13** (u. a. `/branding/`, `/team/`, `/galerie/`, `/impressum/`,
      `/partner/`, `/referenzen/`, und `/faq/` bzw. `/contact/` selbst) tat ein
      Klick **nichts**.
      Es gab einen Klick-Handler, der auf die richtige Seite umleitete — der griff
      aber nur beim normalen Linksklick mit aktivem JavaScript. Ohne JS, bei
      Mittelklick, „in neuem Tab öffnen" und für Suchmaschinen blieb `#faq`
      stehen: ein Selbstverweis auf 13 Seiten, davon 12 indexierbar.
      **Jetzt umgekehrt:** im HTML steht das echte Ziel, das Skript wertet zur
      Sprungmarke auf, wenn der Abschnitt da ist. Die Regel liegt in
      `navigation.ts` — `navigation.json` wird im Admin gepflegt, ein künftig
      ergänzter `#`-Eintrag landet damit automatisch auf der Startseite statt im
      Nichts. Gemessen: 7157 Links auf 172 Seiten, tote Sprungmarken 24 → **0**.

- [x] 🟠 **C — N.7 Zwei Wix-Adressen zeigten auf ausgeblendete Seiten** ✅ **erledigt 2026-08-01**
      Gefunden beim Abfragen der **echten** Weiterleitungen gegen die Live-Stage.
      Eine Weiterleitung gibt den Wert der alten Adresse ans Ziel weiter — steht
      das Ziel auf `noindex`, verpufft er. Technisch fällt nichts auf: 308, Ziel
      antwortet 200.
      `/aquarelle-galerie` → `/aquarelle/` (ausgeblendet) → jetzt `/galerie/` ·
      `/schnellzeichner-duesseldorf` → Düsseldorf (ausgeblendet) → jetzt
      `/schnellzeichner-karikaturist/`. Beide live nachgeprüft.
      Die übrigen ~100 Regeln auf ausgeblendete Ziele bleiben: ihre Quellen sind
      die internen Adress-Umstellungen und waren nie öffentlich.
      Test über die 24 Wix-Adressen mit Regel; war rot (2 von 50).

- [x] 🟠 **C — N.8 Breadcrumb der FR-Seite mit doppeltem Schrägstrich** ✅ **erledigt 2026-08-01**
      `localizePath` baute `` `/${slug}/` `` — bei leerem Slug also `//`. Im
      BreadcrumbList-Schema von `/fr/belgique/` zeigte „Accueil" auf
      `https://kunstwolff.de//`. Im Browser geht das durch, in strukturierten
      Daten ist es eine Adresse, die es nicht gibt.
      Unsichtbar geblieben, weil alle **HTML**-Links stimmten — der Fehler saß
      nur *innerhalb* der JSON-LD-Blöcke.

- [x] 🔴 **C — N.10 Zwei ausgelieferte Seiten ohne Impressum** ✅ **erledigt 2026-08-01**
      Das Impressum muss von **jeder** Seite erreichbar sein (§ 5 DDG: „leicht
      erkennbar, unmittelbar erreichbar und ständig verfügbar"). Es hängt am
      Fußbereich, der am Layout hängt — wer am Layout vorbeikommt, hat keins.
      Zwei Seiten kamen vorbei:
      - `public/fonts/mayonice/demo.html` — die Beispielseite des Schriften-
        Konverters (Transfonter). Lag unter `public/` und wurde damit 1:1
        ausgeliefert, an Astro vorbei. Nirgends verlinkt, aber abrufbar.
        **Entfernt**, sie war nie Inhalt der Website.
      - `/gallerie/` — Astros Weiterleitungs-Stummel (Meta-Refresh, 310 Bytes).
        Die 301-Regel fing nur `/gallerie` **ohne** Schrägstrich ab; mit
        Schrägstrich kam der Stummel mit **200** durch (live nachgemessen).
        Die Adresse ist inzwischen **ganz gestrichen**: sie stand in keiner
        Wix-Sitemap, war nirgends verlinkt und liefert auf Wix selbst 404 —
        nachgemessen, nicht vermutet. Weder `vercel.json` noch
        `astro.config.mjs` kennen sie noch.
      Gemessen: Seiten ohne Impressum-Link vorher 2, nachher **0** (von 170).
      Festgehalten in `tests/impressum-ueberall.test.ts` — der prüft die drei
      Wege, auf denen das wiederkommen kann: eine HTML-Datei unter `public/`,
      eine Seite ohne Layout, ein Fußbereich ohne den Link. Die vierte Prüfung
      hält den `redirects`-Block in `astro.config.mjs` leer: jeder Eintrag dort
      wird zu einer Seite ohne Layout und damit ohne Impressum. War rot (2 von 4),
      und jede der vier einzeln gegen ihren kaputten Zustand nachgewiesen.

- [x] 🟡 **C — N.12 Das Wix-Inventar im Test war unvollständig** ✅ **erledigt 2026-08-01**
      Beim Streichen von `/gallerie` aufgefallen: die Liste in
      `tests/wix-weiterleitungen.test.ts` hatte **24** Einträge, davon zwei
      erfundene (`/gallerie`, `/schnellzeichner-duesseldorf` stehen in keiner
      Wix-Sitemap), und es fehlten **neun** echte. Ein Test, der nur prüft, was
      ohnehin abgedeckt ist, prüft nichts.
      Jetzt stehen alle **33** Pfade aus den fünf Wix-Sitemaps drin, frisch
      gezogen. Der Test bildet außerdem Vercels Reihenfolge **inklusive der
      Sammelregeln** nach — ein reiner Abgleich auf exakte Quellen meldet sonst
      Adressen als tot, die `/template/:rest*` längst abfängt (genau der Irrtum,
      dem ich beim Suchen selbst aufgesessen bin).
      Sachlich gefunden: drei Adressen landeten über die Sammelregel pauschal auf
      `/galerie/`, obwohl sie von Schnellzeichnen handeln —
      `…/karikaturen-schwarz-weiß`, `…/veranstaltungen` und
      `/template/fuer-evente-aller-art` zeigen jetzt auf
      `/schnellzeichner-karikaturist/`. Eine eigene Prüfung hält fest, dass die
      Sammelregel sie nicht wieder verschluckt.

- [ ] 🟡 **S — N.11 Die Original-Schriftdateien liegen öffentlich** (neu 2026-08-01)
      Beim Aufräumen daneben aufgefallen: `public/fonts/mayonice/mayonice_original/`
      enthält `Mayonice.otf`, `Mayonice.ttf`, ein JPG-Muster, „More Info.txt" und
      eine 536 KB große „Read Me.pdf" — zusammen ~900 KB, alles **frei
      herunterladbar**. Für die Website gebraucht werden nur `.woff2`/`.woff`.
      Ob die Lizenz das Weitergeben der Originaldateien erlaubt, kann ich nicht
      beurteilen — deshalb nicht eigenmächtig gelöscht. Wenn es Archiv sein soll,
      gehört es außerhalb von `public/`.

- [ ] 🟡 **C+S — N.9 `/fr/belgique/` hängt in der Luft** (neu 2026-08-01, **Entscheidung nötig**)
      Die Seite ist indexierbar und steht in der Sitemap, aber **kein Klickpfad
      führt hin**. Ihr einziger eingehender Link kommt von `/belgique/` — und die
      ist ausgeblendet und steht auf `noindex, **nofollow**`. Die beiden
      verlinken nur sich gegenseitig, ein geschlossenes Paar ohne Anschluss.
      Auch die hreflang-Verknüpfung läuft damit ins Leere: die deutsche Hälfte
      des Paares ist für Google nicht da.
      Es ist die **einzige** französische Seite. Wohin sie verlinkt werden soll,
      ist eine inhaltliche Entscheidung — deshalb nicht eigenmächtig geändert.

---

## Phase 0 — bevor DNS angefasst wird

Ohne diese fünf geht der Umzug schief. Reihenfolge egal, außer 0.1 muss vor 0.2.

- [ ] 🔴 **S — 0.1 `SITE_URL` setzen und MANUELL neu deployen**
      Vercel → Settings → Environment Variables: `SITE_URL=https://www.kunstwolff.de`,
      nur Environment **Production**. Danach Production-Deployment von Hand neu bauen —
      geänderte Env-Variablen wirken nicht auf bestehende Deployments.
      Variable *löschen* ist **keine** Alternative (Fallback ist der Apex, kanonisch ist www).

      ⚠️ **Am 2026-08-01 nachgemessen und korrigiert.** Hier stand, ohne `SITE_URL`
      bleibe alles auf `noindex`. **Das stimmt nicht und war nie so.**
      `astro.config.mjs` fällt auf `https://kunstwolff.de` zurück — und dieser Host
      steht in der `PRODUCTION_HOSTS`-Whitelist in `Layout.astro`. Ohne `SITE_URL`
      gebaut liefert die Seite also `index, follow` und Canonical
      `https://kunstwolff.de/` (Apex, **nicht** www). Gemessen: 40 indexierbare
      Seiten, identisch zum Build mit `SITE_URL`.

      Der Schutz greift **nur, wenn `SITE_URL` gesetzt ist** — auf die Stage-Adresse.
      Ein `X-Robots-Tag`-Header existiert nicht (`vercel.json` setzt nur Cache-Header).
      **Zu prüfen, bevor irgendetwas anderes passiert:** steht im Vercel-Projekt der
      Website heute `SITE_URL` auf der Stage-Adresse? Wenn nein, ist die Stage seit
      jeher indexierbar und zeigt per Canonical auf die Wix-Seite.

      Abnahme (unverändert richtig, aber sie beweist weniger als gedacht):
      `curl -s <deployment-url>/ | grep -E 'robots|canonical'`
      → muss `index, follow` und `https://www.kunstwolff.de/` zeigen. **Das `www`
      ist hier der eigentliche Beweis** — `index, follow` allein zeigt sich auch,
      wenn gar nichts gesetzt ist.

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

- [x] 🔴 **S — 0.5 Entscheidung: was bleibt indexierbar?** ✅ **erledigt** — stand hier
      noch offen, war aber am 30./31.07. entschieden und umgesetzt. Am 2026-08-01
      am gebauten Stand nachgemessen: **129 Einträge** in `page-visibility.json`,
      **0 Karteileichen**, **0** als versteckt markierte Seite ist noch indexierbar,
      **0** `noindex`-Seite steht in der Sitemap. Von 170 gebauten Seiten sind
      **40 indexierbar**, und die Sitemap hat genau diese 40.
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
      ✅ **Der statische Teil ist am 2026-08-01 gegen den echten Build geprüft:**
      30 Redirects, **keine** doppelten Quellen, **keine** Ketten (kein Ziel ist
      selbst wieder Quelle), alle `permanent`, jedes wörtliche Ziel existiert als
      gebaute Seite. Einziger scheinbarer Treffer war das Wildcard
      `/schnellzeichner/:rest*` — kein Pfad, kein Fehler.
      **Was das nicht beweist:** die Reihenfolge, in der Vercel die Regeln
      anwendet, und den Apex→www-Redirect — der steht in den Domain-Settings,
      nicht in `vercel.json` (siehe 1.4). Dafür braucht es die Preview.
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
      ⚠️ **Nachtrag 2026-08-01 — der Fix vom 30.07. war die halbe Miete.**
      Die Zeile war raus, der Slug nicht: `tags.json` **wächst nur** (siehe
      `mergeVocabulary` in `scripts/tags.mjs`), also blieb der Eintrag im Admin
      auswählbar, behauptete weiter `source: "landings.md"` und taggte Bilder auf
      eine Seite, die es nicht mehr gab. Vier Tage lang. Jetzt vollständig raus —
      **9 Fundstellen in 7 Dateien plus 3 Ordner**: `tags.json`,
      `slides.meta.json` (4 fremde Bilder + 1 Schlüssel), `title.meta.json`,
      `gallery.ts`, `why/*.json`, `erinnerungen/*.json`, `img/slides/`,
      `img/Titelbild/`, `reviews/`.
      **Inhalt ist umgezogen, nicht gelöscht:** die zwei echten
      Rheinkirmes-Bilder liegen unter `duesseldorf/`, die vier Köln-Bilder tragen
      jetzt `duesseldorf`. `/duesseldorf/` hatte vorher **kein einziges eigenes
      Bild** und fiel auf `default/` zurück. Gelöscht wurden nur leere Hüllen.
      Gemessen: `dist` enthält den Slug 0×, `tags.json` 34 statt 35 Orte,
      `tag-parity-check` 0 Lücken.
      **Damit sich das nicht wiederholt:** `sync-tags.mjs` meldet seit 2026-08-01
      jeden Eintrag, dessen Quelldatei ihn nicht mehr kennt — mit Namen und mit
      dem `grep`, der die Fundstellen zeigt. Bewusst nur eine Meldung, kein
      Auto-Löschen: an so einem Slug hängen Ordner und Bilder, die jemand erst
      umziehen muss. Der Aufräum-Aufwand steht in
      `kunstwolff-admin/memory/manager-staedte.md`.

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
      ✅ ~~`jubilaum` vs. `jubilaeum`~~ **erledigt** (am 2026-08-01 nachgesehen:
      `jubilaum` ohne `ae` kommt in `public/` und `src/` nirgends mehr vor) ·

      **Noch offen, am 2026-08-01 im Code bestätigt:**
      `EventManager.createEvent` schreibt nur Meta und `content.json`, keinen
      Anlass-Tag · `pre-push` committet alles Gestagete in einen `chore:`-Commit
      (`git diff --cached` als Auslöser — wer nebenher etwas anderes gestaged hat,
      findet es in diesem Commit wieder) · zwei FAQ-Dateien ohne `.md`-Endung
      (`kaiserslautern/wann-buchen` umbenennen, `default/kosten-schnellzeichner`
      löschen) · vier stille `catch`-Blöcke in `services/tagVocabulary.ts`, die
      leere Ergebnisse zurückgeben statt zu melden.

---

## Läuft unabhängig weiter

- [x] ~~**S — Worker deployen.**~~ ✅ erledigt. Wichtig bleibt: der Worker wird
      **nicht** automatisch mitdeployt. Nach jeder Änderung unter `worker/`
      wieder `npm run worker:deploy`.
- [ ] ⏸️ **S — KI-Guthaben.** **Vertagt am 2026-08-01** — wird gerade nicht gebraucht.
      Kleine Gemini-Aufladung (5–10 €), damit es zwei finanzierte Anbieter gibt.
- [ ] ⏸️ **S — Vercel-Vorschauprojekt.** **Vertagt am 2026-08-01** — der jetzige
      Stand reicht. Projekt aus `Eightdevvis/Kunstwolff` mit Production Branch
      `vorschau`, dann `VITE_VORSCHAU_BASE` (Admin) und `PREVIEW_EXTRA_BASES`
      (Worker) setzen. Erst damit funktioniert der „Entwurf bauen"-Knopf.

---

## Was NICHT auf der Liste steht

Damit niemand es erneut jagt — geprüft und in Ordnung:

Build (**170** Seiten fehlerfrei) · keine toten internen Links · Sitemap und Canonicals ·
`<html lang>`/charset/viewport · FAQPage-Schema (valide seit dem Merge vom 02.07.) ·
`og:image`-Fallback · Navigation (Services aus `skills.json`, Events aus `events.json`) ·
Cache-Header · `/seite` und `/seite/` · echte 404 · Tag-Vokabular und
Slug-Normalisierung · Testsuiten beider Repos.

⚠️ **„Keine toten Bildverweise" stand hier zu Unrecht** und ist am 2026-08-01
gestrichen worden: **141 Bild-Adressen** waren tot (N.4). Der Punkt stützte sich auf
`validate-image-refs.mjs` — das prüft die Verweise in den *Quelldateien*, nicht die
daraus *erzeugte* Adresse. Genau in dieser Lücke saß der Fehler.
**Lehre für diese Liste:** „geprüft" heißt nur so viel wie das, womit geprüft wurde.
Was am gebauten `dist/` per HTTP nachgemessen ist, steht seit heute dabei.

**Drei Prüfrunden über die Links am 2026-08-01**, jede mit anderen Fragen:

1. *Erreichbarkeit* — jede Seite und jedes Linkziel per HTTP: **0 von 1211 kaputt.**
2. *Klickbarkeit* — 7214 `<a>` auf 172 Seiten: kein `<a>` ohne oder mit leerem
   `href`, kein `href="#"`, kein `javascript:`, keins ohne erkennbaren Namen,
   keins per Style unsichtbar im Tab-Verlauf, keine verschachtelten `<a>`, keine
   doppelten `id`, keine kaputten `mailto:`/`tel:`, **0 tote Sprungmarken**
   (vorher 24). Alle 5 externen Ziele abgerufen, alle erreichbar.
3. *Konsistenz und Signale* — Groß-/Kleinschreibung (die WEB-001-Falle): 0 ·
   fest verdrahtete Absolut-Links: 0 · Mixed Content: 0 · `target="_blank"`
   ohne `rel="noopener"`: 0 · Canonical-Ketten: 0 · `og:url` ≠ Canonical: 0 ·
   `og:image` tot: 0 · Adressen in JSON-LD: 0 tot · Breadcrumb-Positionen: 0
   Fehler · hreflang: 0 tot, 0 einseitig · Links auf per robots.txt gesperrte
   Pfade: 0 · Links auf Weiterleitungs-Quellen: 0.

**Zusätzlich gegen die Live-Stage geprüft:** alle **165** Weiterleitungen
abgefragt — jede springt einmal, landet beim gemeinten Ziel, das mit 200
antwortet. Keine Ketten. Unsinns-Adressen geben sauber 404.

Drei Auffälligkeiten, geprüft und **bewusst so gelassen**:
**840** interne Links ohne Schrägstrich am Ende (`/contact` statt `/contact/`) —
Vercel liefert beide mit **200 ohne Umleitung**, und beide Formen tragen dasselbe
Canonical `/contact/`. Kostet nichts. ·
**25** Links von sichtbaren auf ausgeblendete Seiten — das ist die Städteliste
auf den Skill-Seiten, so gewollt. ·
(Der frühere Punkt „`/gallerie/` und die Schriften-Demo ohne Impressum-Link"
steht hier nicht mehr: beide Seiten gibt es nicht mehr, siehe N.10.)

**Frühere Messung** (jede Seite und jedes interne Linkziel): Dazu statisch:
0 tote Links · 0 `noindex`-Seite in der Sitemap · 0 Sitemap-Eintrag ohne Seite ·
166 Weiterleitungen ohne Ketten, alle Ziele existieren · 102 flache Ort-Adressen
vollständig, 0 Reste der alten Form, 0 alte Adresse ohne 301.

Die damals notierten „zwei Kleinigkeiten" (`/gallerie/` wird gebaut ·
`public/fonts/mayonice/demo.html` ohne Canonical) haben sich erledigt: beide
Seiten sind gelöscht.

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
