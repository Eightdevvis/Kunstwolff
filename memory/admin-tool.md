# Admin-Tool / Cross-Repo-Workflow

## Wo liegt das Admin-Tool?

`/home/sasha/codicus/Kunstwolff/Kunstwolff-admin/kunstwolff-admin/`

> Das äußere Verzeichnis `Kunstwolff-admin/` ist nur der Repo-Wrapper – die App lebt eine Ebene tiefer in `kunstwolff-admin/`.

Eigenständige Vite + Preact + TypeScript + Tailwind-App, die via **GitHub REST API direkt in dieses Repo schreibt**. Schnittstelle:

```
Browser → GitHub REST API → Kunstwolffwebsite-Repo → Vercel-Build → Stage/Production
```

Auth: GitHub Personal Access Token (Fine-grained, **Contents – Read and write**) im `localStorage`. Kein Backend, rein statisch.

**Remote:** `git@github.com:Eightdevvis/kunstwolff-admin.git` – Default-Branch und Live-Deploy-Quelle ist **`master`** (nicht `main`). `main` existiert parallel und hat nur Bugfixes; `master` enthält zusätzliche Features (Cloudflare-Worker, Multi-User, EventManager-WIP). Lokal kann HEAD trotzdem auf `main` sein – das ist nur die lokale Setup-Default.

**Deployment:** GitHub Pages → `admin.kunstwolff.de` (CNAME im Repo).

> **Hosting-Stand 2026-05-05:** Der Vercel-Build der Website läuft als Stage auf `kunstwolff.vercel.app`. Die echte Domain `kunstwolff.de` zeigt noch auf Wix – Admin-Edits erreichen also aktuell **die Stage**, nicht den Production-Traffic. Dieser Zustand ist gewollt bis zum Cutover. Befunde: `HEALTH_CHECK_2026-05-05.md`. Cutover-Ablauf (URL-Mapping, DNS, Vercel-Settings, Rollback): `CUTOVER_PLAN.md` – beide im Website-Repo-Root.

## Cross-Repo-Doku

Bei jeder Cross-Repo-Arbeit alle drei lesen:

- `Kunstwolff-admin/kunstwolff-admin/README.md` – vollständige Funktions- und Format-Doku
- `Kunstwolff-admin/kunstwolff-admin/CLAUDE.md` – Claude-spezifische Kurzübersicht + Cross-Repo-Workflow
- `BUGS_TODO.md` (`/home/sasha/codicus/Kunstwolff/BUGS_TODO.md`) – aktueller Bug-/Lücken-Stand des Admin-Tools (Single Source of Truth für offene Tickets, inklusive der LÜCKEN-Liste; das verdrängt die alte "noch nicht implementiert"-Sektion in der Admin-README)
- `human_doc_bugs.md` (`/home/sasha/codicus/Kunstwolff/human_doc_bugs.md`) – User-/Endnutzer-Feedback (kurze Notizen, weniger formal als BUGS_TODO)

## Was das Admin-Tool aktuell schreibt

| Pfad im Website-Repo | Admin-Komponente |
| :-- | :-- |
| `public/img/slides/{city}/` + `slides.meta.json` | `ImageManager.tsx` (slides-Modus) |
| `public/img/Titelbild/{city}/` | `ImageManager.tsx` (titelbild-Modus) |
| `public/img/why/{city}/benefit-{1-4}/` | `ImageManager.tsx` (why-Modus) |
| `public/reviews/{city}/review*.md` | `ReviewManager.tsx` |
| `public/faq/default/*.md` + `public/faq/{city}/*.md` | `FaqManager.tsx` |
| `public/landings/landings.md` | `CityManager.tsx` |
| `public/calendar/{jahr}/{monat}.json` | `CalendarView.tsx` (+ `EventModal.tsx` als Editor) |
| Bereinigung: löscht doppelte/kaputte Bilder, putzt zugehörige `slides.meta.json`-Einträge mit | `CleanupManager.tsx` |

Alle Änderungen sammeln sich als **Draft-State** (`@preact/signals` in `src/services/state.ts`) und gehen erst beim Klick auf "Veröffentlichen" als sequenzielle PUT/DELETE-Calls ans Repo. So debounced sich der Vercel-Build pro Klick auf einen Build statt N.

## Was das Admin-Tool NICHT kann (manuell per Git pflegen)

Vollständige Lückenliste mit Status: `BUGS_TODO.md` Abschnitt "Lücken im Admin-Tool". Kurzfassung:

- `public/why/{key}.json` – Texte der Why-Sektion (Titel, Text, Alt) — LÜCKE-4
- `public/img/Titelbild/title.meta.json` – Categories/Priority für Titelbilder — LÜCKE-5
- `public/skills/skills.json` – Skills-Liste — LÜCKE-6
- `public/events/events.json` + per-Event `content.json` — LÜCKE-1
- `public/cinema/cinema.json` — LÜCKE-2
- `public/erinnerungen/{key}.json` — LÜCKE-3
- `public/navigation/navigation.json` — kein eigenes Ticket, manuell
- `public/partners/partners.json` — kein eigenes Ticket, manuell
- WebP-Konvertierung — der Pre-Push-Hook des Website-Repos greift nur bei lokalem `git push`. Admin-Uploads landen unkomprimiert. Workaround: nach Bulk-Upload lokal `npm run optimize:all` + Push (siehe `git-hooks.md`).

## Vor Änderungen an `public/`-Strukturen ZWINGEND prüfen

1. **Schreibt das Admin-Tool in diese Pfade?** → Check `src/components/` im Admin-Repo: `ImageManager.tsx`, `ReviewManager.tsx`, `CityManager.tsx`, `FaqManager.tsx`, `CalendarView.tsx`, `EventModal.tsx`, `CleanupManager.tsx`. Die Schreib-Logik sitzt in `src/services/github.ts` (`putFile`, `deleteFile`).
2. **Liest die Website diese Pfade?** → Check `src/utils/*.ts` im Website-Repo.
3. **Beide Repos aktualisieren** – Admin-README/CLAUDE.md + Website-Memory (`pfadstruktur.md`, betroffene `content-*.md`, ggf. `admin-tool.md` hier).

## Workflow für neue Cross-Repo-Features

Wenn neue Admin-Felder + Website-Konsumierung gleichzeitig gebaut werden:

1. **Dateiformat festlegen** – Pfad in `public/`, JSON/MD-Format, Fallback-Logik
2. **Website zuerst** – Utils in `src/utils/` erweitern, Astro-Page konsumiert das neue Format
3. **Admin danach** – neuen Tab/Manager im Admin-Tool bauen der in das Format schreibt (Pattern: `src/components/<Name>Manager.tsx` + ggf. Service-Funktion in `src/services/`)
4. **Sync-Scripts prüfen** – muss `sync-landings.mjs` o.ä. angepasst werden? (siehe `sync-scripts.md`)
5. **Beide Doku-Sets aktualisieren** – Admin-README/CLAUDE.md + Website-Memory + ggf. `BUGS_TODO.md` als Lücke schließen
