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
public/img/slides/<stadt>/
public/reviews/<stadt>/
public/faq/<stadt>/
public/img/Titelbild/<stadt>/
public/img/why/<stadt>/benefit-{1-4}/
public/why/<stadt>.json
public/erinnerungen/<stadt>.json
```

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
├── events/<event-slug>/           # Event-Slides (separater Namespace)
├── slides.meta.json               # Metadaten (categories, priority, alt, title, enabled)
└── category-matching.md           # Optionale Zusatzregeln für Auto-Kategorisierung
```

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

**Wichtig:** Sowohl Stadt- als auch Skill-Slugs werden als Top-Level-Ordner in `Titelbild/` erwartet. `titleImages.ts` löst bei einer Skill-Seite (`/schnellzeichner/`) zuerst `Titelbild/schnellzeichner/`, dann `Titelbild/default/` auf.

## Reviews

```
public/reviews/
├── _vorlage.md
├── default/
└── <stadt>/*.md
```

## FAQs

```
public/faq/
├── default/*.md           # aktuell die einzige genutzte Quelle
└── <stadt>/*.md           # vom Loader unterstützt, aktuell NICHT angelegt
```

Stand jetzt: nur `public/faq/default/` existiert. Der Loader (`faq.ts`) liest auch stadt-spezifische FAQs, sobald welche angelegt sind.

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

## Fonts / Statische Assets

```
public/fonts/mayonice/             # Custom-Font, eingebunden via global.css
public/robots.txt                  # SEO – siehe seo.md
```

## Pfad-Artefakte (nicht löschen, nicht befüllen)

- `public/img/Titelbild/landings/` – aus alter Struktur, wird ignoriert
- `public/img/Titelbild/skills/` – aus alter Struktur, wird ignoriert
