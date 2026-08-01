# Memory-Index – Kunstwolff Website

Themen-Verzeichnis für Claude. Lies bei jeder Aufgabe zuerst hier nach, identifiziere relevante Themen und lade nur diese Subfiles.

> **Stand 2026-08-01:** Alle Subfiles wurden Aussage für Aussage gegen den Code gehalten
> (rund 1000 Einzelaussagen, 110 Divergenzen eingearbeitet). Die drei häufigsten Irrtümer:
> die Ort-Kombis sind **flach** (`/berlin-schnellzeichner-karikaturist/`, die hierarchische
> Form existiert nur noch als 301); der **Ordner entscheidet nichts mehr** – FAQs, Reviews
> und Bilder werden über Tags gewählt, `getFAQsByCity` und ein `default/`-Rückfall gibt es
> nicht mehr; und viele **Zahlen stammten aus der Migrationszeit** (FAQs 71→85, Slides
> 234→238, versteckte Pfade 128→129).

> **Konvention:** Alle Pfade in diesem Index sind relativ zum Projekt-Root (`Kunstwolffwebsite/`). Memory-Files liegen in `memory/`.

---

## Schnellnavigation

### Grundlagen (fast immer relevant)
- [Projekt-Übersicht](projekt.md) – Was ist Kunstwolff, Tech-Stack, Ziele, Setup
- [Architektur](architektur.md) – SSG-Logik, dateibasiertes CMS, public/-Prinzip
- [Pfadstruktur](pfadstruktur.md) – Vollständiger Baum von `public/` mit Zweck pro Pfad
- [Routing & URL-Generierung](routing.md) – Wie URLs aus landings.md/skills.json/events.json entstehen
- [Komponenten-Stack](komponenten-stack.md) – `components.json` `_order` als EINE Quelle für Sektions-Reihenfolge+Sichtbarkeit (Website rendert daraus, Admin liest dasselbe), Build-Guardrail
- [Admin-Tool / Cross-Repo](admin-tool.md) – Was Admin schreibt, was nicht, Cross-Repo-Workflow

### Content-Systeme (lade nur was zur Aufgabe passt)
- [Cities / Landings](content-landings.md) – `landings.md`, Slugs, neue Stadt anlegen/entfernen
- [Skills](content-skills.md) – `skills.json`, automatische Seiten-Generierung
- [Events](content-events.md) – `events.json`, content.json, Event-Bilder
- [Slides](content-slides.md) – Bilder, `slides.meta.json`, Lightbox (gemeinsam mit der Galerie), Fallback-Logik
- [Galerie](content-galerie.md) – `/galerie/`: **alle** Bilder auf einer Seite, Chips je Tag-Dimension (UND-verknüpft) + Suche, Client-Filter, verlinkt unter jedem „Unsere Kunst"-Banner
- [Team](content-team.md) – `/team/`: zwei Profile (Gabriele zuerst), Portraits als Zuschnitte aus Event-Fotos, **kein `srcset`** für `img/team`
- [Tag-System](tag-system.md) – Skill × Anlass × Ort: `config/tags.json`, Tag-Blöcke an Bildern/Reviews/FAQs, Migration; **Phase 5a+5b+5d+5e fertig – Bilder, Reviews UND FAQs wählen über Tags aus, und seit 5e (2026-07-31) tut das AUCH der Admin. Der Ordner ist nur noch Ablage und Upload-Ziel.**
- [Responsive Bilder](responsive-images.md) – `srcset`/`sizes`, Varianten-Erzeugung nach dem Build, warum nicht `astro:assets`
- [Vercel-Header](vercel-headers.md) – Cache-Control für `/img/*`, warum bewusst kein `immutable`; **Redirect-Karte Wix→Astro** (warum nicht über `astro.config.mjs`)
- [Titelbild](content-titelbild.md) – Pfad, Metadaten, Fallback-Kette
- [Reviews](content-reviews.md) – Markdown-Format, **Auswahl über `tags.landings` bzw. `tags.events`**, Auffüll-Logik **mit Deckel** und **`tagOnly`-Schalter pro Bewertung**, MiniReviews-Anzeige (Stadtseiten waren bis 2026-07-31 gar nicht angeschlossen)
- [Allgemeine Texte](content-site-texts.md) – `site-texts/content.json`, Startseiten-Texte, `landingIntros` (Einführungstext)
- [FAQs](content-faqs.md) – Markdown-Format, **Auswahl über Tags: mindestens ein Treffer, kein Widerspruch — leer heisst NIRGENDS**, `getFAQsForContext`; allgemein Gültiges liegt in `faq/default/` (Auffüll-Topf); i18n-Overlays laufen im selben Sync, deutscher Fallback nur noch für die Standard-Locale
- [Why-Sektion](content-why.md) – JSON-Format, Fallback-Kette, Bilder; **die vier Why-Detailseiten leiten ihre Bilder von hier ab statt sie zu kopieren** (`whyHighlights.ts`), Rest heilt über `bildAufloesung.ts`
- [Erinnerungen](content-erinnerungen.md) – Pinnwand-Fotos, Fallback-Kette
- [CinemaWelcome](content-cinema.md) – Startseiten-Konfigurator (Event→Wunsch→Geschmack), `cinema.json`, autoSelect, Ergebnis-Komposition
- [Navigation](content-navigation.md) – `navigation.json`; **Services kommt aus `skills.json`, Events aus `events.json`** (nicht aus der JSON)
- [Referenzlogos](content-referenzlogos.md) – Auto-Discovery aus `referenzenLogos/`, Streifen im Hero vs. Gitter auf `/referenzen/`, Label-Regeln

### Build & Automatisierung
- [Sync-Scripts](sync-scripts.md) – Reihenfolge, was jedes Script tut, GitHub Action
- [Git-Hooks](git-hooks.md) – pre-commit, pre-push, Bildoptimierung
- [Befehle](befehle.md) – `npm run …` Übersicht, Dev/Build/Preview
- [Validierungsreports](validierungsreports.md) – `reports/validation/`

### Sonstiges
- [SEO](seo.md) – Sitemap, Meta-Tags, OpenGraph, Schema.org JSON-LD, **Stage vs. Production** (`SITE_URL`-Env, robots-Whitelist)
- [Mehrsprachigkeit](i18n.md) – Locale-Registry, **Content-Overlay unter `public/i18n/<locale>/`** (fehlt eine Datei, greift das deutsche Original), FR-Route, Sprach-Umschalter
- [WIP-Komponenten](wip-komponenten.md) – Existierend aber noch nicht eingebunden

### Status & offene Punkte (außerhalb von `memory/`)
- `HEALTH_CHECK_2026-05-05.md` (Repo-Root) – aktueller Audit: Vercel-Stage vs. Wix-Production, Cutover-Tickets, GitHub-Action-Lücken, TS-/SEO-Findings.
- `CUTOVER_PLAN.md` (Repo-Root) – Schritt-für-Schritt-Plan Wix → Astro/Vercel: URL-Mapping, DNS, Vercel-Settings, Cutover-Tag, Rollback.
- `reports/tagsystem-audit-2026-07-30.md` – Befundliste aus dem Tag-System-Audit (45 bestätigte Funde über sechs Ebenen, nach Schwere sortiert, mit „gesund"- und „widerlegt"-Abschnitt). ⚠️ **Nicht mehr als To-do-Liste lesen** – die vier prominentesten Punkte sind erledigt: die 38 leeren Skill×Stadt-Galerien (2026-07-30), die 40 inhaltslosen Aquarelle-Seiten (ausgeblendet, 2026-07-30), die tote Anlass-Dimension der FAQs (eigenes `event`-Feld, 2026-07-31) und `public/config` in beiden `git add`-Listen (pre-commit-Hook **und** `sync-landings.yml`). Der Report bleibt als Beleg, nicht als Auftrag.

---

## Wann welche Datei lesen?

| Aufgabe | Lade |
| :-- | :-- |
| "Neue Stadt hinzufügen" | `content-landings.md` |
| "Slide hochladen / Reihenfolge ändern" | `content-slides.md` |
| "Galerie / alle Bilder / Bild-Filter / Bild-Suche" | `content-galerie.md` (+ `tag-system.md`) |
| "Team / Profile / Portraitfotos" | `content-team.md` |
| "Tags / Anlass / automatische Einsortierung" | `tag-system.md` |
| "Admin zeigt etwas anderes als die Seite" | `tag-system.md` (Phase 5e) + `admin-tool.md` |
| "Review pflegen" | `content-reviews.md` |
| "FAQ pflegen" | `content-faqs.md` |
| "Why-Texte ändern" | `content-why.md` |
| "Kaputtes/fehlendes Bild auf einer Seite" | `content-why.md` (Abschnitt Detailseiten) + `git-hooks.md` (`validate:images`) |
| "Neuen Skill anlegen" | `content-skills.md` |
| "Event hinzufügen" | `content-events.md` |
| "Pfad in `public/` umstrukturieren" | `pfadstruktur.md` + `admin-tool.md` + `sync-scripts.md` |
| "Build/Dev startet nicht" | `sync-scripts.md` + `befehle.md` |
| "Bildoptimierung / Pre-Push-Probleme" | `git-hooks.md` |
| "SEO / Meta-Tags / Sitemap" | `seo.md` |
| "Routing / URL passt nicht" | `routing.md` |
| "Sektion ein-/ausblenden, Reihenfolge ändern, Sektion taucht falsch auf" | `komponenten-stack.md` |
| "Admin-Tool schreibt falsch" | `admin-tool.md` |
| "Hosting / Vercel / Cutover-Stand" | `projekt.md` (Hosting-Section) + `seo.md` + `reports/cutover-audit-2026-07-30.md` + `CUTOVER_PLAN.md` (⚠ an zwei Stellen falsch, siehe `seo.md`) |
| "Umzug auf kunstwolff.de / Redirects / DNS" | `seo.md` (Cutover-Abschnitt) + `vercel-headers.md` + `reports/cutover-audit-2026-07-30.md` |
| "Französische Seite / neue Sprache / Übersetzung fehlt" | `i18n.md` |
| "Cross-Repo / Admin-Tool" | `admin-tool.md` + Admin-Memory `/home/sasha/codicus/Kunstwolff/kunstwolff-admin/memory/index.md` |

Wenn unklar: erst `projekt.md` + `architektur.md` als Einstieg, dann gezielt nachladen.
