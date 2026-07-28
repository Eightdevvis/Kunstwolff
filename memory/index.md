# Memory-Index – Kunstwolff Website

Themen-Verzeichnis für Claude. Lies bei jeder Aufgabe zuerst hier nach, identifiziere relevante Themen und lade nur diese Subfiles.

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
- [Slides](content-slides.md) – Bilder, `slides.meta.json`, Lightbox, Fallback-Logik
- [Tag-System](tag-system.md) – Skill × Anlass × Ort: `config/tags.json`, Tag-Blöcke an Bildern/Reviews/FAQs, Migration; **Phase 5a+5b+5d fertig – Bilder, Reviews UND FAQs wählen über Tags aus, der Ordner ist nur noch Ablage**
- [Responsive Bilder](responsive-images.md) – `srcset`/`sizes`, Varianten-Erzeugung nach dem Build, warum nicht `astro:assets`
- [Vercel-Header](vercel-headers.md) – Cache-Control für `/img/*`, warum bewusst kein `immutable`
- [Titelbild](content-titelbild.md) – Pfad, Metadaten, Fallback-Kette
- [Reviews](content-reviews.md) – Markdown-Format, **Auswahl über `tags.landings`**, Auffüll-Logik, MiniReviews-Anzeige
- [Allgemeine Texte](content-site-texts.md) – `site-texts/content.json`, Startseiten-Texte, `landingIntros` (Einführungstext)
- [FAQs](content-faqs.md) – Markdown-Format, **Auswahl über Tags (UND je Dimension, leer = gilt überall)**, `getFAQsForContext`
- [Why-Sektion](content-why.md) – JSON-Format, Fallback-Kette, Bilder
- [Erinnerungen](content-erinnerungen.md) – Pinnwand-Fotos, Fallback-Kette
- [CinemaWelcome](content-cinema.md) – Startseiten-Konfigurator (Event→Wunsch→Geschmack), `cinema.json`, autoSelect, Ergebnis-Komposition
- [Navigation](content-navigation.md) – `navigation.json`
- [Referenzlogos](content-referenzlogos.md) – Auto-Discovery aus `referenzenLogos/`

### Build & Automatisierung
- [Sync-Scripts](sync-scripts.md) – Reihenfolge, was jedes Script tut, GitHub Action
- [Git-Hooks](git-hooks.md) – pre-commit, pre-push, Bildoptimierung
- [Befehle](befehle.md) – `npm run …` Übersicht, Dev/Build/Preview
- [Validierungsreports](validierungsreports.md) – `reports/validation/`

### Sonstiges
- [SEO](seo.md) – Sitemap, Meta-Tags, OpenGraph, Schema.org JSON-LD, **Stage vs. Production** (`SITE_URL`-Env, robots-Whitelist)
- [WIP-Komponenten](wip-komponenten.md) – Existierend aber noch nicht eingebunden

### Status & offene Punkte (außerhalb von `memory/`)
- `HEALTH_CHECK_2026-05-05.md` (Repo-Root) – aktueller Audit: Vercel-Stage vs. Wix-Production, Cutover-Tickets, GitHub-Action-Lücken, TS-/SEO-Findings.
- `CUTOVER_PLAN.md` (Repo-Root) – Schritt-für-Schritt-Plan Wix → Astro/Vercel: URL-Mapping, DNS, Vercel-Settings, Cutover-Tag, Rollback.

---

## Wann welche Datei lesen?

| Aufgabe | Lade |
| :-- | :-- |
| "Neue Stadt hinzufügen" | `content-landings.md` |
| "Slide hochladen / Reihenfolge ändern" | `content-slides.md` |
| "Tags / Anlass / automatische Einsortierung" | `tag-system.md` |
| "Review pflegen" | `content-reviews.md` |
| "FAQ pflegen" | `content-faqs.md` |
| "Why-Texte ändern" | `content-why.md` |
| "Neuen Skill anlegen" | `content-skills.md` |
| "Event hinzufügen" | `content-events.md` |
| "Pfad in `public/` umstrukturieren" | `pfadstruktur.md` + `admin-tool.md` + `sync-scripts.md` |
| "Build/Dev startet nicht" | `sync-scripts.md` + `befehle.md` |
| "Bildoptimierung / Pre-Push-Probleme" | `git-hooks.md` |
| "SEO / Meta-Tags / Sitemap" | `seo.md` |
| "Routing / URL passt nicht" | `routing.md` |
| "Sektion ein-/ausblenden, Reihenfolge ändern, Sektion taucht falsch auf" | `komponenten-stack.md` |
| "Admin-Tool schreibt falsch" | `admin-tool.md` |
| "Hosting / Vercel / Cutover-Stand" | `projekt.md` (Hosting-Section) + `seo.md` + `HEALTH_CHECK_2026-05-05.md` + `CUTOVER_PLAN.md` |
| "Cross-Repo / Admin-Tool" | `admin-tool.md` + Admin-Memory `/home/sasha/codicus/Kunstwolff/kunstwolff-admin/memory/index.md` |

Wenn unklar: erst `projekt.md` + `architektur.md` als Einstieg, dann gezielt nachladen.
