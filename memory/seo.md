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
| Homepage | `Kunstwolff – Eventkünstler seit über 20 Jahren` | Generisch (aus `Layout.astro`) |
| Stadtseite `/berlin/` | `Eventkünstler Berlin – Live-Kunst & Performance \| Kunstwolff` | Stadtspezifisch |
| Skill-Seite `/schnellzeichner/` | `Schnellzeichner für Events buchen \| Kunstwolff` | `skills.json` (`description`) |
| Skill+Stadt `/schnellzeichner/berlin/` | `Schnellzeichner Berlin buchen \| Kunstwolff` | `skills.json` (`description`) |

Auf jeder Seite wird ein `<link rel="canonical">` gesetzt (gegen Duplicate-Content-Strafen).

**Wo Title/Description anpassen:**

| Was | Wo |
| :-- | :-- |
| Skill-Description (Meta) | `public/skills/skills.json` Feld `description` |
| Skill-Hero-Title | `public/skills/skills.json` Feld `heroTitle` |
| Stadtseiten-Texte | direkt in `src/pages/[landing].astro` |

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
| Homepage `/` | `LocalBusiness` + `FAQPage` |
| Skill-Seite `/schnellzeichner/` | `Service` + `FAQPage` |
| Stadtseite `/berlin/` | `BreadcrumbList` + `FAQPage` |
| Skill+Stadt `/schnellzeichner/berlin/` | `BreadcrumbList` + `FAQPage` |

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
