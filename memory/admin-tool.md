# Admin-Tool / Cross-Repo-Workflow

## Wo liegt das Admin-Tool?

`/home/sasha/codicus/Kunstwolff/kunstwolff-admin/`

> Flaches Repo, ein Level – kein Wrapper-Verzeichnis. `package.json`, `src/`, `README.md`, `CLAUDE.md` liegen direkt im Repo-Root.

Eigenständige Vite + Preact + TypeScript + Tailwind-App, die **in dieses Repo schreibt**. Schnittstelle:

```
Browser → Server-Backend (GITHUB_PAT server-seitig) → GitHub REST API → Kunstwolffwebsite-Repo → Vercel-Build → Stage/Production
```

Auth: **zwei Modi.**
- **Server-Auth (Standard):** Frontend loggt sich per Login gegen ein Backend ein und bekommt ein **JWT-Session-Token** (`src/services/auth.ts`, `isServerAuthEnabled()`). Der eigentliche **GitHub-PAT liegt server-seitig** im Backend (`worker/src/index.ts:12` `GITHUB_PAT`, Auth über `Bearer ${GITHUB_PAT}`). `github.ts:10` routet dann über `${apiBaseUrl()}/api/github` statt direkt auf `api.github.com`.
- **Legacy-Fallback:** Ohne Server-Auth kann ein PAT im Browser gehalten werden – dann verschlüsselt in einem Vault (`src/utils/authVault.ts` `storeTokenVault`), **nicht** im Klartext-`localStorage` – und die App ruft `api.github.com` direkt.

**Backend:** Cloudflare-Worker (**hono**, `worker/wrangler.toml` name `kunstwolff-admin-api`, deploy via `wrangler`) plus Express-Backend (`server/index.mjs`: express + `jsonwebtoken` + `bcryptjs` + `@libsql/client`).

**Remote:** `git@github.com:Eightdevvis/kunstwolff-admin.git` – Default-Branch und Live-Deploy-Quelle ist **`master`** (nicht `main`). `main` existiert parallel und hat nur Bugfixes; `master` enthält zusätzliche Features (Cloudflare-Worker, Multi-User, EventManager). Lokal kann HEAD trotzdem auf `main` sein – das ist nur die lokale Setup-Default.

**Deployment:** Admin-Frontend als Vite-SPA auf **Vercel** (`kunstwolff-admin.vercel.app`, s. `ADMIN_ALLOWED_ORIGIN` in `worker/wrangler.toml`); Backend-Worker via `wrangler` auf Cloudflare. Kein GitHub Pages / keine gh-actions.

> **Hosting-Stand 2026-05-05:** Der Vercel-Build der Website läuft als Stage auf `kunstwolff.vercel.app`. Die echte Domain `kunstwolff.de` zeigt noch auf Wix – Admin-Edits erreichen also aktuell **die Stage**, nicht den Production-Traffic. Dieser Zustand ist gewollt bis zum Cutover. Befunde: `HEALTH_CHECK_2026-05-05.md`. Cutover-Ablauf (URL-Mapping, DNS, Vercel-Settings, Rollback): `CUTOVER_PLAN.md` – beide im Website-Repo-Root.

## Cross-Repo-Doku

Bei jeder Cross-Repo-Arbeit beide lesen (liegen flach im Admin-Repo-Root):

- `kunstwolff-admin/README.md` – vollständige Funktions- und Format-Doku
- `kunstwolff-admin/CLAUDE.md` – Claude-spezifische Kurzübersicht + Cross-Repo-Workflow

> Die früher hier verlinkten `BUGS_TODO.md` und `human_doc_bugs.md` (im Website-Repo-Root) existieren **nicht mehr** – nicht mehr referenzieren. Offene Lücken stehen direkt in der Admin-README bzw. im Admin-`memory/`.

## Was das Admin-Tool aktuell schreibt

| Pfad im Website-Repo | Admin-Komponente |
| :-- | :-- |
| `public/img/slides/{city}/` + `slides.meta.json` | `ImageManager.tsx` (slides-Modus) |
| `public/img/Titelbild/{city}/` | `ImageManager.tsx` (titelbild-Modus) |
| `public/img/why/{city}/benefit-{1-4}/` (Bilder) | `ImageManager.tsx` (why-Modus) |
| `public/why/{city}.json` (Why-Texte: Titel/Text/Alt) | `ImageManager.tsx` (why-Modus, `saveWhyBenefits`) |
| `public/img/Titelbild/title.meta.json` (Categories/Priority) | `ImageManager.tsx` (titelbild-Modus) |
| `public/reviews/{city}/review*.md` | `ReviewManager.tsx` |
| `public/faq/default/*.md` + `public/faq/{city}/*.md` | `FaqManager.tsx` |
| `public/landings/landings.md` | `CityManager.tsx` |
| `public/events/events.json` + `public/events/{slug}/content.json` | `EventManager.tsx` (Dashboard-Quick-Add schreibt `events.json` mit) |
| `public/cinema/cinema.json` | `CinemaManager.tsx` |
| `public/skills/skills.json` | `Dashboard.tsx` |
| `public/config/tags.json` (Tag-Vokabular) | `services/tagVocabulary.ts` – aus Quick-Add (Skill/Event/Landing), `CityManager`, Tag-Chips und Mediathek. **Seit 2026-07-30**, vorher schrieb es niemand fort und ein neuer Skill war im Admin nicht auswählbar; siehe `tag-system.md` „⚠️ `tags.json` muss COMMITTED werden" |
| `slides.meta.json` (`tags` mengenweise setzen) | `MediaLibrary.tsx` – Umsortieren-Modus; Uploads landen in `public/img/slides/mediathek/…`. Seit 2026-07-30 auch aus **KI-Tagvorschlägen** (die KI sieht die Fotos an, schreibt aber nie selbst – siehe Admin-Memory `ki-faehigkeiten-und-vision.md`) |
| `public/partners/partners.json` | `PartnerManager.tsx` |
| `public/calendar/{jahr}/{monat}.json` | `CalendarView.tsx` (+ `EventModal.tsx` als Editor) |
| Bereinigung: löscht doppelte/kaputte Bilder, putzt zugehörige `slides.meta.json`-Einträge mit | `CleanupManager.tsx` |

Alle Änderungen sammeln sich als **Draft-State** (`pendingFiles`-Signal, `@preact/signals` in `src/services/state.ts`) und gehen erst beim Klick auf "Veröffentlichen" ans Repo. Der Publish ist **EIN atomarer Commit** über die Git-Data-API (`src/services/github.ts:230` `commitFilesBatch`, aufgerufen aus `src/services/publish.ts` `publishPending`): base_tree → `git/trees` (Text inline, Binär als Blob, Löschung via `sha:null`) → Commit → Branch-Ref bewegen, mit Retry bei Fremd-Commit dazwischen. Löst das frühere „ein Commit / eine PUT-DELETE pro Datei" ab – kein sekundäres Rate-Limit bei vielen Dateien, keine per-Datei-SHA-Konflikte, alles-oder-nichts. Der Vercel-Build läuft so pro Klick genau einmal.

## Was das Admin-Tool NICHT kann (manuell per Git pflegen)

Die früher hier gelisteten LÜCKE-1/2/4/5/6 (Events, Cinema, Why-Texte, `title.meta.json`, Skills) sowie `partners.json` sind **geschlossen** – s. die Schreib-Tabelle oben. Offen bleiben:

- `public/erinnerungen/{key}.json` – Erinnerungen/Pinnwand-Texte. Die `erinnerungen`-Sektion existiert im Stack, hat aber `editorType: null` (`src/components/interface/pageTypes.ts:73`) → kein Editor, kein Schreibpfad im Admin.
- `public/navigation/navigation.json` – kein Manager, kein Schreibpfad im Admin (grep auf `navigation` in `kunstwolff-admin/src/` = leer). Manuell pflegen.

> Aktuelle Restlücken werden nicht mehr in einer separaten Bug-Datei geführt (`BUGS_TODO.md` existiert nicht mehr), sondern direkt in der Admin-README bzw. im Admin-`memory/`.

WebP-Konvertierung ist **keine Lücke mehr**: das Admin-Tool konvertiert Uploads browser-seitig (`src/utils/imageWebp.ts` `imageToWebpUpload`, genutzt von `ImageManager`, `CinemaManager`, `PartnerManager`, `BrandStripeManager`, `MediaLibrary`), lädt also bereits `.webp` hoch (siehe `git-hooks.md`).

## Vor Änderungen an `public/`-Strukturen ZWINGEND prüfen

1. **Schreibt das Admin-Tool in diese Pfade?** → Check `src/components/` im Admin-Repo: `ImageManager.tsx`, `ReviewManager.tsx`, `CityManager.tsx`, `FaqManager.tsx`, `EventManager.tsx`, `CinemaManager.tsx`, `PartnerManager.tsx`, `Dashboard.tsx` (Skills/Quick-Add), `CalendarView.tsx`, `EventModal.tsx`, `CleanupManager.tsx`. Die Schreib-Logik sammelt Drafts in `src/services/state.ts` (`pendingFiles`) und committet über `src/services/publish.ts`/`github.ts` (`commitFilesBatch`, `putFile`, `deleteFile`).
2. **Liest die Website diese Pfade?** → Check `src/utils/*.ts` im Website-Repo.
3. **Beide Repos aktualisieren** – Admin-README/CLAUDE.md + Website-Memory (`pfadstruktur.md`, betroffene `content-*.md`, ggf. `admin-tool.md` hier).

## Workflow für neue Cross-Repo-Features

Wenn neue Admin-Felder + Website-Konsumierung gleichzeitig gebaut werden:

1. **Dateiformat festlegen** – Pfad in `public/`, JSON/MD-Format, Fallback-Logik
2. **Website zuerst** – Utils in `src/utils/` erweitern, Astro-Page konsumiert das neue Format
3. **Admin danach** – neuen Tab/Manager im Admin-Tool bauen der in das Format schreibt (Pattern: `src/components/<Name>Manager.tsx` + ggf. Service-Funktion in `src/services/`)
4. **Sync-Scripts prüfen** – muss `sync-landings.mjs` o.ä. angepasst werden? (siehe `sync-scripts.md`)
5. **Beide Doku-Sets aktualisieren** – Admin-README/CLAUDE.md + Website-Memory (`admin-tool.md`, `pfadstruktur.md`, betroffene `content-*.md`); Restlücken stehen in der Admin-README bzw. im Admin-`memory/`, nicht in einer separaten Bug-Datei.


## Der Admin wählt nach Tag aus (2026-07-31)

Bis dahin listete jeder Editor ein Verzeichnis, während die Website seit Phase 5b
nach Tags auswählt. Über alle Seiten waren **126 Tag-Zuordnungen** außerhalb des
gelisteten Ordners, 107 davon auf einer gebauten Seite.

Was das für Änderungen an `public/` bedeutet:

- **Der Ordner steuert nichts mehr.** Er ist Ablage und Upload-Ziel. Wer eine
  Datei verschiebt, ändert keine Seitenzuordnung — der Tag tut das.
- **Der Admin schreibt `altOverride`, nicht `alt`.** `slides.meta.json` hat 85
  Einträge mit `altOverride` und 0 mit `alt`; die Website gibt `altOverride`
  Vorrang. Wer das Feld umbenennt, muss beide Seiten anfassen.
- **Leere Tag-Dimensionen werden als `[]` geschrieben**, nicht weggelassen. Eine
  fehlende Dimension trägt der Sync aus dem Ordner nach, eine ausdrücklich leere
  lässt er stehen. Das ist der Unterschied zwischen „noch nie eingeordnet" und
  „bewusst entfernt".
- **FAQs von Anlass-Seiten landen in `public/faq/default`**, nicht in einem
  neuen Ordner `faq/events/<slug>`. Dort liegen die bestehenden 12 Anlass-FAQs
  auch; ihren Anlass tragen sie ausschließlich als Tag.

Details auf der Admin-Seite: `kunstwolff-admin/memory/manager-images.md`,
`manager-faqs.md`, `manager-reviews.md`.
