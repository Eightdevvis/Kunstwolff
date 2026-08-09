# Pfadstruktur – `public/`

Vollständige Übersicht aller dateibasierten Content-Pfade. Bei Änderungen an dieser Struktur **zwingend** prüfen: wird der Pfad vom Admin-Tool geschrieben (siehe `admin-tool.md`)? Welcher Sync-Script erzeugt ihn (siehe `sync-scripts.md`)?

---

## Cities / Landings

```
public/landings/
└── landings.md            # primäre Quelle: eine Stadt pro Zeile, lowercase
```

**`public/landings/landings.json`** wird vom Loader (`landings.ts`) als 2. Fallback abgefragt, existiert aber **physisch nicht im Repo**. Auto-Discovery aus `slides/`/`reviews/`/`landings/`-Ordnern ist der eigentliche 2. Fallback.

Pro Stadt werden automatisch erzeugt:
```
public/img/slides/<stadt>/          # sync:landings (+ .gitkeep)
public/reviews/<stadt>/             # sync:landings (+ .gitkeep, _vorlage.md)
public/img/Titelbild/<stadt>/       # sync:title-images
public/img/why/<stadt>/benefit-{1-4}/   # sync:why
public/why/<stadt>.json             # sync:why (mit LEEREN Benefits)
public/erinnerungen/<stadt>.json    # sync:erinnerungen
```

⚠️ **`public/faq/<stadt>/` wird NICHT automatisch angelegt.** Kein Sync-Skript legt
FAQ-Stadt-Ordner an – `sync-landings.mjs` fasst `faqRoot` nur beim Zusammenführen
von Slug-Kollisionen an, `sync-faq-tags.mjs` taggt ausschließlich vorhandene
Dateien. Deshalb haben derzeit nur 21 der 36 Städte einen FAQ-Ordner; die anderen
bekommen ihre Fragen über die Tags. Anlegen geht von Hand oder über das Admin-Tool.

## Skills

```
public/skills/
└── skills.json            # Skill-Registry
public/img/UnsereFähigkeitenBilder/
└── <Skill-Titel>/         # Skill-spezifische Bilder (erstes alphabetisch wird verwendet)
```

## Events

```
public/events/
├── events.json            # Event-Registry
└── <event-slug>/
    └── content.json       # Per-Event-Content (Ablauf, Pakete, Sektionen)
public/img/slides/events/<event-slug>/
public/img/Titelbild/events/<event-slug>/
```

## Slides

```
public/img/slides/
├── default/                       # Fallback-Slides
├── <stadt>/                       # Stadt-Slides
├── <skill>/ bzw. <skill>-<stadt>/ # z.B. szenenmaler/, schnellzeichner-duesseldorf/
├── events/<event-slug>/           # Event-Slides
├── mediathek/                     # Sammelordner der Mediathek
├── slides.meta.json               # Metadaten (categories, priority, alt, title, enabled, tags)
├── default-selection.json         # kuratierte Startseiten-Auswahl
└── category-matching.md           # Optionale Zusatzregeln für Auto-Kategorisierung
```

Drei Dinge, die man dem Baum nicht ansieht:

- **Der Ordner ist nur noch Ablage.** Welche Seite ein Bild zeigt, entscheidet
  `tags` in `slides.meta.json`, nicht der Ordner – „events/" ist deshalb kein
  getrennter Namensraum mehr, Bilder aus Stadtordnern erscheinen auf
  Event-Seiten und umgekehrt (`tag-system.md`).
- **`default-selection.json`** ist die kuratierte Startseiten-Auswahl. Ist sie
  gefüllt (derzeit 28 Einträge aus allen Ordnern), wird der Ordner `default/`
  beim Auffüllen **gar nicht gelesen**; erst bei leerer Datei greift er wieder.
- **`mediathek/`** und `events/` gelten in `scripts/tags.mjs` ausdrücklich nicht
  als Orte (`NON_PLACE_FOLDERS`) – aus ihren Namen wird kein Ort-Tag abgeleitet.

## Titelbild

```
public/img/Titelbild/
├── default/                       # Fallback
├── <stadt>/                       # Stadt-Titelbilder
├── <skill>/                       # Skill-Titelbilder (z.B. schnellzeichner/, szenenmaler/)
├── events/<event-slug>/           # Event-Titelbilder
├── landings/                      # ARTEFAKT mit Stadt-Subordnern (alte Struktur, ignorieren – nicht löschen, nicht befüllen)
├── skills/                        # ARTEFAKT mit Skill-Subordnern (alte Struktur, ignorieren – nicht löschen, nicht befüllen)
└── title.meta.json                # Metadaten (gleiches Format wie slides.meta.json)
```

**Wichtig:** Sowohl Stadt- als auch Skill-Slugs werden als Top-Level-Ordner in `Titelbild/` erwartet. `titleImages.ts` löst bei einer Skill-Seite zuerst `Titelbild/<skill>/`, dann `Titelbild/default/` auf.

⚠️ Der Ordnername ist der **Inhalts-Schlüssel aus dem Titel**, nicht die URL. Die
Seite liegt unter `/schnellzeichner-karikaturist/`, der Ordner heisst
`Titelbild/schnellzeichner/`. Seit die beiden auseinanderfallen, muss der
Schlüssel über `skillContentKey(title)` kommen – siehe `content-skills.md`.

## Reviews

```
public/reviews/
├── _vorlage.md
└── <stadt>/*.md
```

Es gibt **kein** `public/reviews/default/`-Verzeichnis. `default` bleibt in `reviews.ts` (`defaultCityKey = 'default'`) ein unterstützter City-Key (per Ordnername oder `city:`-Frontmatter), ist aktuell aber leer/ungenutzt.

## FAQs

```
public/faq/
├── default/*.md           # generische Fallback-FAQs
└── <stadt>/*.md           # stadt-spezifische FAQs (21 Städte, NICHT auto-erzeugt)
```

Neben `default/` existieren 21 Stadt-Ordner (belgique, bw, duesseldorf, frankfurt,
heidelberg, kaiserslautern, karlsruhe, koblenz, koeln, ludwigshafen, luxembourg,
mainz, mannheim, rhein-main-gebiet, rheinland-pfalz, saarbruecken, saarland,
schweiz, trier, wiesbaden, wuppertal) mit eigenen `.md`-Dateien.

⚠️ **Der Ordner entscheidet nichts.** `getFAQsByCity` gibt es nicht mehr; seit
2026-07-28 wählt allein `getFAQsForContext()` in `faq.ts` aus, und zwar über die
Tag-Blöcke (`tags.landings` / `tags.events` / `tags.skills`, Alt-Feld `categories`
zählt mit). Eine FAQ ohne Tag in einer Dimension gilt dort überall – das ersetzt
den früheren `default/`-Rückfall. Der Ordner bestimmt beim **Anlegen** nur noch
den Start-Tag (`scripts/sync-faq-tags.mjs`).

## Why-Sektion

```
public/why/
├── default.json
├── <stadt>.json                   # Auto-erstellt von sync:why
├── <skill>.json                   # Auto-erstellt von sync:why
└── <skill>-<stadt>.json           # Manuell für spezifischste Variante

public/img/why/
└── <key>/benefit-{1-4}/           # key = <stadt> oder <skill>
```

Auflösung in `why.ts`: `{skill}-{stadt}` → `{stadt}` → `{skill}` → `default`.

## Erinnerungen (Pinnwand)

```
public/erinnerungen/
├── default.json
├── <stadt>.json                   # Auto von sync:erinnerungen
├── <skill>.json                   # Auto von sync:erinnerungen
└── <skill>-<stadt>.json           # Manuell
```

Selbe Fallback-Kette wie Why.

## CinemaWelcome (Startseiten-Orbit)

```
public/cinema/
└── cinema.json                    # Intro + 3 Orbit-Sektionen
```

## Navigation

```
public/navigation/
└── navigation.json                # Items mit optionalen children (Dropdowns)
```

## Referenzlogos

```
public/img/referenzenLogos/        # Auto-Discovery: alle Bilder werden angezeigt
```

## Partner

```
public/partners/
└── partners.json                  # Daten für /partner/-Seite
public/img/partners/               # Partner-Logos
```

## Kalender (nur Admin-Tool)

```
public/calendar/<jahr>/<monat>.json   # NICHT von der Website gelesen, nur vom Admin
```

## Konfiguration

```
public/config/
├── components.json                # Sektions-Stack `_order` + Sichtbarkeit je Seitentyp
├── page-visibility.json           # versteckte Pfade (Präfix-Regel)
└── tags.json                      # Tag-Vokabular (Skill × Anlass × Ort)
```

Drei Steuerdateien, die die Website liest, obwohl kein Mensch sie „Inhalt" nennen
würde – und genau deshalb übersieht man sie:

- `components.json` → `src/utils/componentConfig.ts` (`komponenten-stack.md`)
- `page-visibility.json` → **zweimal**: `src/utils/pageVisibility.ts` für
  `<meta robots>` UND der Sitemap-Filter in `astro.config.mjs` (`seo.md`)
- `tags.json` → `src/utils/gallery.ts` (Galerie-Filter) und die Sync-Skripte

## Site-Texte

```
public/site-texts/
└── content.json                   # landingHeadings + landingIntros (siteTexts.ts)
```

## Mehrsprachigkeit

```
public/i18n/<locale>/              # spiegelt die public/-Struktur, aktuell nur `fr`
├── landings.json
├── faq/
├── site-texts/
└── why/
```

Fehlt eine Overlay-Datei, greift automatisch das deutsche Original
(`resolveLocalizedFile` / `resolveLocalizedDir` in `src/i18n/config.ts`).

## Inhalte der Standalone-Seiten

```
public/branding/content.json           # branding.astro   ← branding.ts
public/canvas/content.json             # canvas.astro     ← canvas.ts
public/du-bist-kunst/content.json      # du-bist-kunst.astro ← duBistKunst.ts
public/stimmung-durch-kunst/content.json                 ← stimmungDurchKunst.ts
```

## Hero-Hintergrund

```
public/img/hero-bg/<key>/          # key = <skill>-<stadt> ODER <stadt>
```

Erstes Bild alphabetisch. Fallback-Kette in `heroBg.ts`: `{skill}-{landing}` →
`{landing}` → `null`. **Kein Default-Ordner** – gibt es nichts, gibt es keinen
Hintergrund. Aufgerufen von `[skill].astro` und `[...kombi].astro`.

## Fonts / Statische Assets

```
public/fonts/inter/                # Inter latin + latin-ext (woff2), SIL OFL → OFL.txt
public/fonts/mayonice/             # Custom-Font (woff2/woff, stylesheet.css, demo.html,
                                   #   Unterordner mayonice_original/)
public/img/samples/                # System-Fallback /img/samples/sample1.webp
public/img/logo/                   # Logo (u.a. im LocalBusiness-Schema)
public/img/team/                   # Team-Portraits
public/robots.txt                  # SEO – siehe seo.md
```

Beide Font-Ordner werden per `@font-face` in `src/styles/global.css` eingebunden.

## Pfad-Artefakte (nicht löschen, nicht befüllen)

- `public/img/Titelbild/landings/` – aus alter Struktur, wird ignoriert
- `public/img/Titelbild/skills/` – aus alter Struktur, wird ignoriert
