# SEO – Technische Grundlagen

## Sitemap

Wird automatisch beim Build über `@astrojs/sitemap` generiert.

**Output nach `npm run build`:**
```
dist/sitemap-index.xml
dist/sitemap-0.xml
```

Alle statisch generierten Seiten (Homepage, Stadtseiten, Skill-Seiten, Skill+Stadt-Kombinationen, Events) werden automatisch erfasst.

**Live-URL:** `https://kunstwolff.de/sitemap-index.xml` – sollte in der **Google Search Console** eingetragen sein.

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
| Stadtseite `/berlin/` | `Eventkünstler Berlin – Live-Kunst & Performance \| Kunstwolff` | Stadtspezifisch |
| Skill-Seite `/schnellzeichner/` | `Schnellzeichner für Events buchen \| Kunstwolff` | `skills.json` (`description`) |
| Skill+Stadt `/schnellzeichner/berlin/` | `Schnellzeichner Berlin buchen \| Kunstwolff` | pro Stadt individualisiert (nicht mehr `skills.json`) |

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
| Skill+Stadt-Description/H1 (pro Stadt) | `src/pages/[skill]/[landing].astro` |
| Stadt-Anzeigename (Umlaut) | `src/utils/cityNames.ts` |
| Kontakt/FAQ/Impressum/Datenschutz-Titel | jeweilige `src/pages/*.astro` (`<Layout title=… description=…>`) |

## HTML-Sprache

`<html lang="de">` ist global gesetzt – damit weiß Google, dass der Content auf Deutsch ist.

## Open Graph Tags

Auf jeder Seite automatisch generiert (für WhatsApp, LinkedIn, Facebook, etc.):

```html
<meta property="og:title" content="Schnellzeichner Berlin buchen | Kunstwolff" />
<meta property="og:description" content="..." />
<meta property="og:url" content="https://kunstwolff.de/schnellzeichner/berlin/" />
<meta property="og:type" content="website" />
<meta property="og:image" content="https://kunstwolff.de/img/Titelbild/..." />
```

`og:image` wird automatisch aus dem Titelbild der Seite generiert. Kein manueller Aufwand.

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
| Skill-Seite `/schnellzeichner/` | `Service` |
| Stadtseite `/berlin/` | `BreadcrumbList` |
| Skill+Stadt `/schnellzeichner/berlin/` | `BreadcrumbList` |
| FAQ-Seite `/faq/` | `FAQPage` |

> ⚠ **FAQPage nur auf `/faq/`.** `FAQ.astro` emittiert das FAQPage-Schema nur bei
> `interactive={true}` (= nur die `/faq/`-Seite). Die eingebetteten FAQ-Blöcke auf
> Home/Stadt/Skill/Kombi haben **kein** Schema. Frühere Doku behauptete FAQPage
> überall – das war nie live (bis 2026-07-02 war es sogar auf `/faq/` kaputt:
> `{JSON.stringify(faqSchema)}` wurde wörtlich ausgegeben; Fix = `set:html`).
> Wer FAQ-Rich-Results breiter will, muss das Schema bewusst auf den Landingpages
> mit-emittieren.

### Was die Schemas bringen

- **`LocalBusiness`** (nur Homepage) – Unternehmensadresse, Telefon, Tätigkeitsgebiet. Basis für Google-Wissensbox und Maps.
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

⚠ **`LocalBusiness` ist hardcoded** (Telefon `+491736677229`, Adresse `Birkenstr. 3, 66121 Saarbrücken`, Logo-Pfad `https://kunstwolff.de/img/logo/logo_transparent.webp`). Änderungen sind ein Code-Change. Empfehlung aus HEALTH_CHECK §SEO-3: in eine `siteMeta.ts`/`businessProfile.json` ziehen, dann kann das Admin-Tool sie irgendwann pflegen.

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

`public/config/page-visibility.json` ist nicht mehr leer. Ausgeblendet sind **128 Pfade**;
indexierbar bleiben **41 von 170** gebauten Seiten. Die Sitemap enthält exakt dieselben 41.

**Die Regel, nach der entschieden wurde** – wichtig, weil sie sonst willkürlich aussieht:

- **Eine Stadt bleibt sichtbar, wenn sie ihre Galerie aus EIGENEN Fotos füllen kann**
  (>= `MIN_LANDING_SLIDES` = 6) **oder** einen eigenen `landingIntro` hat. Darunter füllt
  `supplementWithDefaultSlides` mit Fremdbildern auf – dann zeigt eine Stadtseite fremde
  Orte unter ihrer eigenen H1. Sichtbar bleiben damit 12: berlin (Intro), frankfurt,
  hessen, kaiserslautern, koeln, ludwigshafen, luxembourg, saarbruecken, saarland,
  schweiz, stuttgart, trier.
- **Alle 102 Skill+Stadt-Seiten sind ausgeblendet.** Nicht wegen Dünne, sondern wegen
  Kannibalisierung: 97 % des Textes von `/schnellzeichner/berlin/` stehen wörtlich auch
  auf `/berlin/`, und beide zielen auf dieselbe Suchanfrage.
- **`/aquarelle/<anlass>/`** (4 Seiten): 0 eigene Bilder. `/aquarelle/` selbst bleibt
  sichtbar – es ist eine echte Leistungsseite und hängt im Services-Menü
  (`getVisibleSharedSkills` würde sie sonst dort auch entfernen).

**Wirkung, gemessen:** einzigartiger Textanteil vorher min 0,4 % / median 0,7 %, 144 von
173 Seiten unter 5 %. Jetzt median 33,3 %, nur noch 5 Seiten unter 5 % – davon sind drei
die Startseite und die beiden Skill-Seiten (gemeinsamer Review-Block, unkritisch, eigene
Titel). Bei `/stuttgart/` und `/hessen/` bleibt echte Dopplung, die erst mit eigenem Text
verschwindet.

**Der Weg zurück ist eine Zeile:** Text für eine Stadt schreiben, ihren Pfad aus `hidden`
entfernen. Ausgeblendete Seiten werden weiterhin **gebaut** – sie sind erreichbar und
verlinkbar, nur nicht indexierbar. Das ist Absicht: ein 404 würde die URL verbrennen,
die man später füllen will.

Ebenfalls entfernt: der Slug `schnellzeichner-duesseldorf` aus `landings.md` (stand dort
als "Stadt" und erzeugte vier Seiten mit Titeln wie "Schnellzeichner
Schnellzeichner-Duesseldorf buchen"). Weiterleitung auf `/schnellzeichner/duesseldorf/`
steht in `vercel.json`.
