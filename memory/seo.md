# SEO – Technische Grundlagen

## Sitemap

Wird automatisch beim Build über `@astrojs/sitemap` generiert.

**Output nach `npm run build`:**
```
dist/sitemap-index.xml
dist/sitemap-0.xml
```

Alle statisch generierten Seiten (Homepage, Stadtseiten, Skill-Seiten, Skill+Stadt-Kombinationen, Events) werden automatisch erfasst.

**Live-URL:** `https://www.kunstwolff.de/sitemap-index.xml` (kanonisch ist `www`,
der Apex leitet per 308 dorthin). In der **Google Search Console** trägt man im
Feld unter *Sitemaps* nur `sitemap-index.xml` ein – die Domain steht dort schon
davor. Das ist ein **einmaliger** Handgriff: Google holt die Datei danach von
selbst wieder ab, und `@astrojs/sitemap` erzeugt sie bei jedem Build neu.
Nicht `sitemap.xml` eintragen – die gibt es nicht.

**`lastmod` seit 2026-08-06.** Die Daten kommen aus `public/config/lastmod.json`,
erzeugt von `scripts/sync-lastmod.mjs` (Schritt 11 der Sync-Kette) und im Repo
**committet**. `astro.config.mjs` hängt sie über die `serialize`-Option an. Pfade,
für die kein Datum ermittelbar ist, bekommen schlicht keines – Weglassen ist
erlaubt, Raten nicht. Warum das eine committete Datei ist und nicht `git log`
zur Build-Zeit: siehe `sync-scripts.md`, Schritt 11.

## Stage vs. Production – `SITE_URL` & `<meta robots>`

Solange `kunstwolff.de` noch auf der alten Wix-Site liegt und Astro nur unter `https://kunstwolff.vercel.app` läuft, gibt es zwei Risiken:

1. **Sitemap/Canonical zeigen auf den falschen Host.** Astro schreibt `site` zur Build-Zeit fest in Sitemap, Canonical-Links und OG-URLs. Wenn `site` hart auf `kunstwolff.de` steht, leitet die Vercel-Stage-Sitemap Crawler in den 404-Land der Wix-Site.
2. **Stage wird indexiert.** Vercel-`*.vercel.app`-Domains schickt Vercel zwar default mit `x-robots-tag: noindex`, aber wir verlassen uns nicht darauf, sondern setzen die Meta selbst.

### Was im Repo gelöst ist

- `astro.config.mjs` liest `site` aus `process.env.SITE_URL` (Fallback: `https://kunstwolff.de`).
- `src/layouts/Layout.astro` setzt `<meta name="robots" …>`. Whitelist: nur `kunstwolff.de` und `www.kunstwolff.de` bekommen `index, follow` – alles andere `noindex, nofollow`.

### Was im Vercel-Dashboard gesetzt sein muss

In **Project Settings → Environment Variables:**

| Env | Wert (Stage, aktuell) | Wert (nach Cutover) |
| :-- | :-- | :-- |
| `SITE_URL` | `https://kunstwolff.vercel.app` | `https://www.kunstwolff.de` (kanonisch lt. `CUTOVER_PLAN.md` §0; Apex wird via Vercel-Domain-Settings auf www umgeleitet) bzw. Variable löschen → Fallback greift |

Der vollständige Cutover-Ablauf (DNS, Domain-Settings, Verifikations-Checks, Rollback) steht in `CUTOVER_PLAN.md` im Projekt-Root.

### Verifikation

```bash
# Production-Default (Fallback greift):
npm run build
grep -h 'name="robots"' dist/index.html      # → "index, follow"
head -c 200 dist/sitemap-0.xml                # → kunstwolff.de

# Stage:
SITE_URL=https://kunstwolff.vercel.app npm run build
grep -h 'name="robots"' dist/index.html      # → "noindex, nofollow"
grep -oE 'https://[^<]+' dist/sitemap-0.xml | head -1   # → kunstwolff.vercel.app
```

## Meta-Tags (Title, Description, Canonical)

Pro Seitentyp automatisch generiert:

| Seitentyp | Beispiel-Title | Description-Quelle |
| :-- | :-- | :-- |
| Homepage | `Kunstwolff – Eventkünstler seit über 25 Jahren` | Generisch (aus `Layout.astro`) |
| Stadtseite `/berlin/` | `Schnellzeichner Berlin – Live-Kunst \| Kunstwolff` (Vorlage `{landingHeading} – Live-Kunst \| Kunstwolff`; das Heading kommt aus `landingHeadings` und wird im Admin gepflegt) | Stadtspezifisch |
| Skill-Seite `/schnellzeichner-karikaturist/` | `Schnellzeichner für Events buchen \| Kunstwolff` | `skills.json` (`description`) |
| Skill+Stadt `/berlin-schnellzeichner-karikaturist/` | `Schnellzeichner Berlin buchen \| Kunstwolff` | pro Stadt individualisiert (nicht mehr `skills.json`) |

Auf jeder Seite wird ein `<link rel="canonical">` gesetzt (gegen Duplicate-Content-Strafen).

**Stadt-Anzeigenamen (Umlaute) – `src/utils/cityNames.ts`:** Slugs in `landings.md`
sind ASCII-transliteriert (`duesseldorf`, `koeln`). Für Titel/H1/Breadcrumb liefert
`getCityDisplayName(slug)` den korrekten Namen (`Düsseldorf`, `Köln`,
`Nordrhein-Westfalen`, `Belgien` …). Map dort pflegen; Fallback = jedes
Bindestrich-Wort großgeschrieben. **Nur für Anzeige, nie für URLs/Slugs.**

**Title-Längen:** Stadt-Titel bewusst kurz (`Eventkünstler {Stadt} – Live-Kunst | Kunstwolff`,
≤ 60 Zeichen) gegen SERP-Truncation. `skills.json`-`description` ≤ 155 Zeichen halten.

**Wo Title/Description anpassen:**

| Was | Wo |
| :-- | :-- |
| Skill-Description (Meta) | `public/skills/skills.json` Feld `description` (≤ 155 Zeichen) |
| Skill-Hero-Title | `public/skills/skills.json` Feld `heroTitle` |
| Stadtseiten-Texte + Titel-Template | `src/pages/[landing].astro` |
| Skill+Stadt-Description/H1 (pro Stadt) | `src/pages/[...kombi].astro` |
| Stadt-Anzeigename (Umlaut) | `src/utils/cityNames.ts` |
| Kontakt/FAQ/Impressum/Datenschutz-Titel | jeweilige `src/pages/*.astro` (`<Layout title=… description=…>`) |

## HTML-Sprache

`<html lang={lang}>` mit Default `"de"` (`Layout.astro`) – damit weiß Google, dass der
Content auf Deutsch ist. Übersetzte Seiten setzen den Wert selbst: `/fr/…` rendert
`lang="fr"`. Hat eine Seite Übersetzungen, gibt das Layout zusätzlich
`<link rel="alternate" hreflang=…>` für jede Sprachvariante aus – ohne das würde
Google die FR-Seiten als Duplikat der deutschen lesen.

## Open Graph Tags

Auf jeder Seite automatisch generiert (für WhatsApp, LinkedIn, Facebook, etc.):

```html
<meta property="og:title" content="Schnellzeichner Berlin buchen | Kunstwolff" />
<meta property="og:description" content="..." />
<meta property="og:url" content="https://kunstwolff.de/berlin-schnellzeichner-karikaturist/" />
<meta property="og:type" content="website" />
<meta property="og:image" content="https://kunstwolff.de/img/Titelbild/..." />
```

`og:image` wird automatisch aus dem Titelbild der Seite generiert. Kein manueller
Aufwand. Seiten ohne eigenes Titelbild (Kontakt, FAQ, Impressum, Datenschutz)
fallen auf `DEFAULT_OG_IMAGE` = `/img/Titelbild/default/titelbild.avif` zurück,
damit die Social-Vorschau nie leer ist. Ist `Astro.site` nicht gesetzt, wird gar
**kein** `og:image` ausgegeben – die URL wäre sonst relativ und damit nutzlos.

## robots.txt

Einzige Quelle: `public/robots.txt`. Wird beim Build 1:1 nach `dist/robots.txt` kopiert.

```
User-agent: *
Disallow: /admin/
Disallow: /testseite/

Sitemap: https://kunstwolff.de/sitemap-index.xml
```

- Crawler dürfen alles außer `/admin/` und `/testseite/`
- Sitemap-Link zeigt auf den Output von `@astrojs/sitemap` (`sitemap-index.xml`), passt also zur Realität

**Hinweis zu `.txt`-Dateien in `src/pages/`:** Astro routet nur `.astro`/`.md`/`.html`-Dateien als Pages. Eine `robots.txt` direkt in `src/pages/` würde **ignoriert** – daher gehört sie nach `public/`.

## Structured Data (Schema.org JSON-LD)

Vollautomatisch beim Build generiert. Keine manuelle Pflege.

| Seitentyp | Schema-Typen |
| :-- | :-- |
| Homepage `/` | `LocalBusiness` |
| Skill-Seite `/schnellzeichner-karikaturist/` | `Service` |
| Stadtseite `/berlin/` | `BreadcrumbList` |
| Skill+Stadt `/berlin-schnellzeichner-karikaturist/` | `BreadcrumbList` |
| FAQ-Seite `/faq/` | `FAQPage` |

> ⚠ **FAQPage nur auf `/faq/`.** `FAQ.astro` emittiert das FAQPage-Schema nur bei
> `interactive={true}` (= nur die `/faq/`-Seite). Die eingebetteten FAQ-Blöcke auf
> Home/Stadt/Skill/Kombi haben **kein** Schema. Frühere Doku behauptete FAQPage
> überall – das war nie live (bis 2026-07-02 war es sogar auf `/faq/` kaputt:
> `{JSON.stringify(faqSchema)}` wurde wörtlich ausgegeben; Fix = `set:html`).
> Wer FAQ-Rich-Results breiter will, muss das Schema bewusst auf den Landingpages
> mit-emittieren.

### Was die Schemas bringen

- **`LocalBusiness`** – **vollständig** (Adresse, Telefon, `areaServed`) nur auf der Homepage. Auf den Skill-Seiten steckt es zusätzlich als `provider` im `Service`-Schema, dort aber nur mit `name` + `url`. Basis für Google-Wissensbox und Maps.
- **`Service`** – beschreibt die Dienstleistung (Schnellzeichner/Szenenmaler). Stärkt das Signal für "XY buchen"-Suchanfragen.
- **`BreadcrumbList`** – Pfadstruktur für Google: `kunstwolff.de › Schnellzeichner › Berlin`. Erscheint unter dem Suchergebnis-Link, verbessert CTR.
- **`FAQPage`** – via `FAQ.astro`. Kann zu aufklappbaren FAQ-Blöcken direkt in Google führen.

### Wo die Daten herkommen

| Schema | Quelle |
| :-- | :-- |
| `LocalBusiness` Adresse/Telefon | **hardcoded in `src/pages/index.astro`** ⚠ |
| `Service` Name/Description | `public/skills/skills.json` |
| `BreadcrumbList` Pfade | dynamisch aus URL-Parametern (`skill`, `landing`) |
| `FAQPage` | `public/faq/` Markdown-Dateien |

⚠ **Telefon und Adresse sind hardcoded** (`+491736677229`, `Birkenstr. 3, 66121
Saarbrücken`). Änderungen sind ein Code-Change. Empfehlung aus HEALTH_CHECK §SEO-3:
in eine `siteMeta.ts`/`businessProfile.json` ziehen, dann kann das Admin-Tool sie
irgendwann pflegen.

**Die URLs sind es ausdrücklich nicht.** Host kommt überall aus `Astro.site`
(= `SITE_URL`), fest ist nur der Pfad (`/img/logo/logo_transparent.webp`). Auf der
Stage steht dort also `https://kunstwolff.vercel.app/…`. Das ist Regel **WEB-012**
und per Test festgenagelt: `tests/schema-site-url.test.ts` erlaubt pro Schema-Datei
**genau ein** Vorkommen von `https://kunstwolff.de` – den Fallback. Wer eine
absolute URL hart einträgt, macht den Test rot statt still die Stage zu vergiften.

## Cutover-Audit 2026-07-30 – was vor dem Umzug offen ist

Voller Bericht: `reports/cutover-audit-2026-07-30.md` (88 Befunde, sechs Prüfstrecken
mit Gegenprüfung). Urteil: der Umzug kann noch nicht starten, aber die Blocker sind an
einem Tag abzuarbeiten. Die vier Punkte, die man hier kennen muss:

1. **`SITE_URL` setzen reicht nicht – es muss MANUELL neu deployt werden.** Vercel
   wendet geänderte Env-Variablen nicht auf bestehende Deployments an.
   `CUTOVER_PLAN.md:126` behauptet das Gegenteil und ist an der Stelle falsch
   (Zeile 85 desselben Plans sagt es richtig). Ohne Redeploy liefert
   `www.kunstwolff.de` ab Sekunde eins 173 Seiten mit `noindex, nofollow`.
2. **Die Variable LÖSCHEN ist keine Alternative** (die frühere Formulierung oben ist
   damit überholt): der Fallback in `astro.config.mjs` ist der Apex `kunstwolff.de`,
   kanonisch ist laut `CUTOVER_PLAN.md:16` aber `www`. Explizit auf
   `https://www.kunstwolff.de` setzen.
3. **Die DNS-Zone liegt bei Wix** (`ns12/ns13.wixdns.net`), nicht beim Registrar – der
   Cutover-Plan unterstellt Registrar-DNS. Solange die Zone dort liegt, darf „Disconnect
   Domain" NICHT ausgeführt werden, sonst ist die Domain nirgends erreichbar.
4. **144 von 173 indexierbaren Seiten haben unter 5 % einzigartigen Text**
   (`/dortmund/` vs. `/giessen/`: 1493 von 1494 Wörtern gleich). Vor dem Umzug
   entscheiden: Städte ohne eigenen Text über `page-visibility.json` auf `hidden`
   (wirkt als noindex UND filtert die Sitemap) oder je Stadt echten Ortsbezug
   schreiben. Nach dem Umzug ist die Erstbewertung der Domain gelaufen.

Zwei rechtliche Punkte, die auf der Stage folgenlos sind und auf der `.de`-Domain nicht:
Google Fonts wird auf 174 Seiten von Google-Servern geladen (`Layout.astro:57-59`), und
die Datenschutzerklärung nennt keinen der drei Empfänger (Formspree, Vercel, Google).

## Sichtbarkeit: welche Seiten indexierbar sind (seit 2026-07-30)

`public/config/page-visibility.json` ist nicht mehr leer. Ausgeblendet sind **129 Pfade**
(102 flache Skill×Ort-Kombis + 22 Städte + `/aquarelle/` + 4 Aquarelle-Anlässe);
indexierbar bleiben **40 von 172** gebauten Seiten. Die Sitemap enthält exakt dieselben 40.

⚠️ **Die Präfix-Regel steht doppelt im Code.** `isPageHiddenByPath()` in
`src/utils/pageVisibility.ts` steuert `<meta robots>`; der Sitemap-Filter in
`astro.config.mjs` baut dieselbe Logik ein zweites Mal nach, weil die Astro-Konfig
kein TS-Modul importieren kann. Wer eine Stelle ändert und die andere vergisst,
baut Seiten mit `noindex`, die trotzdem in der Sitemap stehen – der schlechteste
aller Zustände, weil Google beides sieht. Festgehalten in `tests/page-visibility.test.ts`.

**Die Regel, nach der entschieden wurde** – wichtig, weil sie sonst willkürlich aussieht:

- **Eine Stadt bleibt sichtbar, wenn sie ihre Galerie aus EIGENEN Fotos füllen kann**
  (>= `MIN_LANDING_SLIDES` = 6) **oder** einen eigenen `landingIntro` hat. Darunter füllt
  `supplementWithDefaultSlides` mit Fremdbildern auf – dann zeigt eine Stadtseite fremde
  Orte unter ihrer eigenen H1. Sichtbar bleiben damit 12: berlin (Intro), frankfurt,
  hessen, kaiserslautern, koeln, ludwigshafen, luxembourg, saarbruecken, saarland,
  schweiz, stuttgart, trier.
- **Alle 102 Skill+Stadt-Seiten sind ausgeblendet.** Nicht wegen Dünne, sondern wegen
  Kannibalisierung: 97 % des Textes von `/berlin-schnellzeichner-karikaturist/` stehen wörtlich auch
  auf `/berlin/`, und beide zielen auf dieselbe Suchanfrage.
- **`/aquarelle/` ist samt seiner vier Anlass-Kombis ausgeblendet** (0 eigene Bilder).
  Der Skill-Pfad steht selbst in `hidden`, die Anlässe zusätzlich einzeln. Damit fällt
  die Aquarelle-Seite auf `noindex, nofollow`, aus der Sitemap **und** über
  `getVisibleSharedSkills` auch aus dem Services-Menü – sie ist im gebauten `dist/`
  von keiner Seite mehr verlinkt. Zurückholen = `/aquarelle/` aus `hidden` streichen;
  die vier Anlass-Kombis bleiben über ihre eigenen Einträge versteckt.

**Wirkung, gemessen:** einzigartiger Textanteil vorher min 0,4 % / median 0,7 %, 144 von
173 Seiten unter 5 %. Jetzt median 33,3 %, nur noch 5 Seiten unter 5 % – davon sind drei
die Startseite und die beiden Skill-Seiten (gemeinsamer Review-Block, unkritisch, eigene
Titel). Bei `/stuttgart/` und `/hessen/` bleibt echte Dopplung, die erst mit eigenem Text
verschwindet.

📋 **Was pro Stadt noch fehlt, steht in `STADTSEITEN.md`** (Stand 2026-08-06):
Tabelle mit eigenen Fotos/Kundenstimmen/FAQ je Stadt, die Freischalt-Regel, und
vier Punkte, die eine Entscheidung von Gabriele brauchen. Dort auch die
Begründung, warum acht Städte einen neuen Vorspanntext bekommen haben und
`fulda` bewusst keinen.

⚠️ **Der Vorspanntext allein schaltet keine Stadt frei.** `LandingIntro` ist ein
zentrierter Aufschlag (720px Satzbreite, 1,4rem) — die vorhandenen Texte sind
13–31 Wörter lang, die neuen 32–44. Auf einer Seite mit ~1500 Wörtern sind das
knapp 3 % eigener Anteil. Einzigartig macht eine Stadtseite ihre **eigenen
Fotos und eigenen Kundenstimmen**. Wer 150–250 Wörter Ortstext will, braucht
einen eigenen Abschnitt, nicht dieses Feld — das ist eine Design-Entscheidung.

**Der Weg zurück ist eine Zeile:** Text für eine Stadt schreiben, ihren Pfad aus `hidden`
entfernen. Ausgeblendete Seiten werden weiterhin **gebaut** – sie sind erreichbar und
verlinkbar, nur nicht indexierbar. Das ist Absicht: ein 404 würde die URL verbrennen,
die man später füllen will.

Ebenfalls entfernt: der Slug `schnellzeichner-duesseldorf` aus `landings.md` (stand dort
als "Stadt" und erzeugte vier Seiten mit Titeln wie "Schnellzeichner
Schnellzeichner-Duesseldorf buchen"). Weiterleitung auf
`/duesseldorf-schnellzeichner-karikaturist/` steht in `vercel.json` – seit der
Flach-Umstellung vom 2026-08-01 ist die hierarchische Adresse selbst nur noch
301-Quelle, kein Ziel mehr.

## Schriften kommen vom eigenen Server (seit 2026-07-31)

Inter lag bis dahin auf `fonts.googleapis.com`/`fonts.gstatic.com`, eingebunden über
zwei `preconnect` und ein Stylesheet in `Layout.astro`. Damit ging die IP jedes
Besuchers an Google, ohne Einwilligung. Jetzt unter `public/fonts/inter/`,
`@font-face` in `src/styles/global.css` neben Mayonice.

**Zwei Dateien statt acht:** Google liefert Inter als **variable Schrift** – die vier
früher einzeln angeforderten Gewichte (400/500/600/700) waren byteweise dieselbe Datei
(per md5 geprüft). Deshalb `font-weight: 400 700` als Bereich – bewusst eng, denn
`body` verlangt Gewicht 100, und der volle Bereich `100 900` hätte daraus echtes
Ultra-Light gemacht statt des gewollten Rückfalls auf 400. `tests/schriften-lokal.test.ts`
nagelt genau `400 700` fest. Und nur
`inter-latin.woff2` (48 KB) + `inter-latin-ext.woff2` (85 KB). `unicode-range` sorgt
dafür, dass latin-ext nur geladen wird, wenn die Seite Zeichen daraus braucht – für
Deutsch und Französisch reicht latin, die Umlaute liegen dort.

`inter-latin.woff2` wird per `preload` vorgeladen, aus demselben Grund wie Mayonice:
die `@font-face` steht hinter mehreren CSS-`@import`s und würde sonst spät entdeckt.

Lizenz SIL OFL 1.1, Kopie in `public/fonts/inter/OFL.txt` (die Lizenz verlangt, dass
sie mitgeliefert wird).

**Abnahme:** `grep -r 'googleapis\|gstatic' dist/` ist leer. Festgenagelt in
`tests/schriften-lokal.test.ts` – der Test prüft echte Verweise (`url()`, `href=`,
`preconnect`), nicht die Erwähnung in Kommentaren.

Verbleibende Fremd-Hosts im ausgelieferten HTML sind keine Verbindungen:
`www.w3.org` (XML-Namensräume), `schema.org` (JSON-LD-Kontext) und drei redaktionelle
Links in Texten.

## Datenschutzerklärung: die drei Empfänger stehen drin (seit 2026-07-31)

`src/pages/datenschutz.astro` nannte bis dahin **keinen** Datenempfänger: §2 sprach
anonym vom „Hosting-Anbieter", §3 nur von „E-Mail oder Telefon" (das Web-Formular kam
gar nicht vor), und §4 behauptete sinngemäß, es fänden keine Übertragungen statt.

Jetzt: **Vercel Inc.** (§2, Hosting), **Formspree Inc.** (§4, eigener Abschnitt
Kontaktformular), und in §5 die ausdrückliche Feststellung, dass Schriftarten lokal
ausgeliefert werden. Abschnitte wurden dadurch umnummeriert (jetzt 10 statt 9).

⚠️ **Beim Anfassen des Formulars mitpflegen:** `src/components/Contact.astro` sendet
neben Name/E-Mail/Telefon/Datum/Nachricht **sieben versteckte `cinema_*`-Felder** mit –
die Auswahlen aus dem CinemaWelcome-Konfigurator. Die sind in §4 benannt, weil Art. 13
DSGVO Transparenz über das verlangt, was tatsächlich übertragen wird. Kommt ein Feld
dazu, gehört es dort hinein.

Der Text ist ein **Entwurf und braucht Sashas Freigabe.**

### Vercel: AV-Vertrag besteht, ohne dass jemand etwas klicken muss

Kostete zwei Anläufe, deshalb hier festgehalten. Die Seite `vercel.com/legal/dpa` liest
sich, als gälte sie nur für Enterprise („forms part of Vercel Enterprise Terms and
Conditions … on an Enterprise plan") – **das ist irreführend.** Entscheidend ist
Ziff. 10.1 der Vercel-ToS: das DPA ist dort **per Verweis eingebunden**, und die ToS
sagen ausdrücklich „The Hobby plan is subject to all provisions of these Terms of
Service". Es gibt im Konto also nichts anzunehmen; der Vertrag besteht mit der
Tarifnutzung.

Im DPA-Volltext geprüft (PDF unter `assets.vercel.com/…/Vercel_Customer_DPA__032923.pdf`):
enthält die **Standardvertragsklauseln von 2021**, davon greift **Modul 2
(Verantwortlicher → Auftragsverarbeiter)** für Kundeninhalte – unser Fall – sowie die
Art.-28-Pflichten (Vertraulichkeit, Unterauftragsverarbeiter, Betroffenenanfragen,
Löschung/Rückgabe, Audits). Deshalb steht in §2 jetzt die konkrete Garantie und nicht
nur „Drittland".

### Formspree: ungeklärt – und wird abgelöst

`formspree.io/legal/dpa` existiert nicht (404), auf den öffentlichen Rechtsseiten steht
weder DPA noch GDPR-Abschnitt. In §4 steht deshalb bewusst **keine** Behauptung über
einen AV-Vertrag, nur die nachprüfbare Tatsache (Sitz USA, Drittlandübermittlung).
Entschieden am 2026-07-31: das Formular wandert auf den eigenen Worker, dann entfällt
der Abschnitt ersatzlos.


## URL-Umbenennung `/schnellzeichner/` → `/schnellzeichner-karikaturist/` (2026-07-31)

Wunsch von Gabriele: „Karikaturist" wird häufiger gesucht als „Schnellzeichner".
Der sichtbare **Titel bleibt „Schnellzeichner"** — geändert hat sich nur die
Adresse, über das `link`-Feld in `skills.json`.

Betroffen: 39 URLs (Skill + 34 Städte + 4 Anlässe). In `vercel.json` stehen zwei
301er (`/schnellzeichner` und `/schnellzeichner/:rest*`), und die 10 Wix-Ziele,
die vorher auf `/schnellzeichner/` zeigten, wurden **direkt** auf die neue
Adresse umgehängt — sonst entstünde die Kette Wix-URL → alte Astro-URL → neue.

**Der Zeitpunkt war Absicht:** die neuen URLs haben noch kein Ranking, und die
Redirect-Karte für den Wix-Umzug wurde ohnehin gerade gebaut. Nach dem Umzug
hätte dieselbe Änderung echte Signale gekostet.

Technisch heikel war nicht die URL, sondern dass sie bis dahin auch der Schlüssel
für Bilder, Why-Texte und Erinnerungen war. Siehe `content-skills.md`.

### Ort-Kombis sind flach (`/berlin-schnellzeichner-karikaturist/`) — 2026-08-01

Gabriele hält flache URLs für besser platziert. **Umgesetzt am 2026-08-01** für
die 102 Skill×Ort-Seiten. Die Anlass-Kombis bleiben hierarchisch
(`/szenenmaler/hochzeit/`) — das sind die einzigen 8 indexierbaren Kombi-Seiten,
und für sie lag kein Auftrag vor.

**Warum es nichts kostete** (geprüft am 2026-07-31, gültig geblieben):

- Die Seite war zu dem Zeitpunkt **noch gar nicht live**: die Domain zeigte auf
  Wix, kein Astro-URL hatte ein Ranking.
  ⚠️ **Korrektur vom 2026-08-01:** hier stand „ohne `SITE_URL` steht alles auf
  `noindex`". Das ist **falsch herum**. Der Fallback ist `https://kunstwolff.de`,
  und dieser Host steht in der Whitelist — ohne `SITE_URL` gebaut liefert die
  Seite `index, follow` (nachgemessen: 40 indexierbare Seiten, identisch zum
  Build mit `SITE_URL`). Der Stage-Schutz greift nur, wenn `SITE_URL` **gesetzt**
  ist. Siehe „Stage vs. Production" weiter oben — dort stand es immer richtig.
  **Am Ergebnis ändert das nichts**, der Punkt darunter trägt die Aussage allein.
- **Alle 102** Skill×Ort-Seiten standen ohnehin auf `noindex`
  (`page-visibility.json`), weil ihr Text dupliziert ist. Gemessen vorher wie
  nachher: 102 `noindex`, 8 Anlass-Kombis indexierbar, 40 Sitemap-Einträge.
- In den Wix-Sitemaps steht **genau eine** flache Skill-Stadt-URL
  (`/schnellzeichner-duesseldorf`) — die zeigt jetzt direkt aufs neue Ziel,
  ohne Zwischensprung.

**Was es NICHT bringt, und das bleibt wahr:** Ein Schlüsselwort in der URL ist
ein sehr schwaches Signal. Was diese Seiten ausbremst, ist der fehlende eigene
Text — gemessen: `/dortmund/` und `/giessen/` waren 1493 von 1494 Wörtern
gleich. Der teure Teil ist der Inhalt, nicht die Adresse. **Weiterhin offen:**
pro Stadt 150–250 Wörter Ortsbezug schreiben und die Seiten dann wieder sichtbar
schalten. Erst das lässt sie ranken.

⚠️ **Die Falle, die diese Umstellung fast gestellt hätte:**
`page-visibility.json` blendet per **Präfix** aus — `/aquarelle/` versteckt auch
`/aquarelle/berlin/`. Bei `/berlin-aquarelle/` greift das **nicht mehr**. Ohne
das Umschreiben der 102 Einträge wären genau die Seiten wieder indexierbar
geworden, die man wegen Duplicate Content versteckt hatte — und wären in der
Sitemap gelandet. Abgesichert in `tests/combo-urls.test.ts` (gegen den alten
Stand gegengeprüft: 2 von 10 Tests werden rot).

Adressen liegen an einer Stelle: `src/utils/comboUrls.ts`. Weiterleitungen
(136 Stück, ohne Ketten) in `vercel.json`, erzeugt von
`scripts/flache-kombi-urls.mjs`.

## Nach dem Cutover gerichtet (2026-08-06)

Der Umzug war zu diesem Zeitpunkt durch, am echten Ziel nachgemessen:
`kunstwolff.de` → 308 → `www.kunstwolff.de`, Vercel liefert aus, Canonical und
`og:url` stehen auf `www`, Startseite `index, follow`. Sitemap: **39 URLs**
(vorher 40, siehe FR unten). Festgenagelt in `tests/seo-meta.test.ts` (16 Tests,
davon 5 gegen das gebaute `dist/`).

### `/fr/` ist ausgeblendet — das war der einzige echte Live-Fehler

`/fr/belgique/` stand auf `index, follow`, deklarierte `<html lang="fr">` und
lieferte darunter deutsche Navigation, deutsche Fußzeile, „Häufige Fragen",
„Impressum", „Jetzt anfragen" — nach dem Mehrsprachigkeits-Plan sind ~95 % des
Textes deutsch. Ihr `hreflang="de"` zeigte auf `/belgique/`, das selbst
`noindex` ist: die einzige beworbene Alternative war für Google unerreichbar.

Zwei Änderungen:

1. `"/fr/"` steht in `page-visibility.json`. Über die Präfix-Regel trifft das
   **alle** künftigen FR-Pfade, nicht nur `belgique`. Zurückholen = eine Zeile.
2. `Layout.astro` gibt `hreflang` nur noch aus, wenn die Seite indexierbar ist
   (`showAlternates = !shouldNoindex && alternates.length > 1`). Eine
   noindex-Seite, die Sprachalternativen bewirbt, ist ein Widerspruch.

⚠️ **Cross-Repo geprüft:** Das Admin-Tool schreibt beim Sichtbarkeits-Schalter
die **ganze** Liste neu (`toggleSelectedPageVisibility` in `SiteGraphView.tsx`).
Der `/fr/`-Eintrag überlebt das, weil `normalizeUrlToId()` nur normalisiert und
nicht gegen bekannte Seiten filtert — er wird dabei nur zu `/fr` verkürzt, was
die Präfix-Regel der Website genauso trifft. Deshalb prüft der Test **beide**
Schreibweisen.

### Weitere Änderungen

| Was | Wo | Warum |
| :-- | :-- | :-- |
| `x-default` | `Layout.astro` | fehlte trotz zweier Sprachen; zeigt auf die deutsche Fassung |
| Twitter-Cards | `Layout.astro` | fehlten komplett – X zeigte einen nackten Link statt einer Vorschaukarte |
| `DEFAULT_OG_IMAGE` jetzt WebP | `Layout.astro` + `public/img/og/og-default.webp` | war `.avif`; Facebook, LinkedIn und X lesen AVIF für `og:image` nicht zuverlässig. Dieselbe Aufnahme, nur umkodiert – 1180×818, nichts beschnitten |
| `WebSite`-Schema | `src/pages/index.astro` | gab es nirgends. Mit `@id` auf das `LocalBusiness` verknüpft. **Bewusst ohne `SearchAction`** – die Sitelinks-Suchbox hat Google 2023 abgeschaltet |
| `<h1>` auf `/galerie/` | `Gallery.astro` | einzige Seite ohne H1 (hatte nur `<h2>`). CSS-Selektor mitgezogen, Optik unverändert |
| `width`/`height` in der Slideshow | `Slideshow.astro` | Das CSS lässt beide Maße auf `auto` → Seitenverhältnis erst nach dem Laden bekannt → Ruckeln bei 30+ lazy Slides. Der Slide-Leser liest beide Maße längst, die Höhe kam nur nicht am Markup an |
| `SchnellzeichnerHero.astro` gelöscht | – | von keiner Seite importiert, trug `alt="Hero Image"` |

**`width`/`height` bewusst NICHT überall:** gemessen statt geraten. `Why`,
`Eventtypes`, `CinemaWelcome` und `LandingErinnerungen` haben bereits
`aspect-ratio` im CSS, `SkillHero` setzt `width:100%; height:100%`, das
Logo-Gitter `max-height:100%` — dort entsteht kein Layout-Sprung, Attribute
wären reine Zierde. Die Slideshow war der einzige echte Fall.

### Offene Punkte, die bewusst NICHT angefasst wurden

- **`sameAs` im `LocalBusiness` fehlt weiter.** Im ganzen Repo steht keine
  einzige Profil-Adresse (Instagram/Facebook/LinkedIn). Erfundene Profile wären
  schlimmer als keine. Sobald die Adressen bekannt sind: Array in
  `index.astro` ergänzen. Es ist das stärkste Signal dafür, dass
  Google-Unternehmensprofil und Website dieselbe Firma sind.
- **`/private-feier/`: Titel 88 Zeichen, Beschreibung 157.** Der Titel kommt aus
  `heroTitle` in `events.json` — und derselbe String ist die **sichtbare H1**.
  Kürzen ist eine Textentscheidung von Gabriele, keine technische. Steht als
  benannte Ausnahme in `tests/seo-meta.test.ts`; Google schneidet ihn solange ab.
- **`title.meta.json` zeigt zweimal ins Leere** (`fulda/1000018047.webp`,
  `rheinland-pfalz/karikaturist-schloss-auel-lohmar-rheinland-pfalz.webp`).
  `tests/bild-adressen.test.ts` ist deshalb rot — **schon vor diesen Änderungen**.
  Die beiden Städte fallen aufs Standard-Titelbild zurück. Entweder Foto
  nachliefern oder Eintrag entfernen; beides eine Inhaltsentscheidung.
