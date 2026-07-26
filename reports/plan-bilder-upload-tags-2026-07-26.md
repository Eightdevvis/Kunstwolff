# Plan: Bilder, Upload-Drosselung, Tag-System

**Datum:** 2026-07-26
**Umfang:** beide Repos (`Kunstwolffwebsite`, `kunstwolff-admin`)
**Anlass:** (1) Fotos laden langsam auf der Astro-Site, (2) Jenny wird beim Hochladen
von GitHub gedrosselt obwohl das „schon gefixt" war, (3) der Umbau auf das
Tag-System steht noch aus.
**Status:** Phase 1 und 2 **umgesetzt** (2026-07-26, lokal verifiziert, noch nicht
deployed). Phase 3–6 offen. Fortschritt je Phase unten.

---

## 0. Die Kernthese

Das sind nicht drei Probleme. Das ist **eine Ursachenkette**, und die Reihenfolge
der Behebung ergibt sich daraus fast von selbst:

```
Slides gehören per ORDNER zu einer Seite
        │
        ├──> Ein Bild auf zwei Seiten = Bytes werden KOPIERT
        │         │
        │         ├──> 33 bytegleiche Duplikate im Repo
        │         ├──> jede Kopie = ein weiterer Blob-Upload = Rate-Limit
        │         └──> jede Kopie liegt für immer in .git (371 MB)
        │
        └──> Kein Deckel auf der langen Kante + WebP wird übersprungen
                  │
                  ├──> 139 Bilder >1600px = 71% des Volumens
                  ├──> /trier/ lädt 14,5 MB
                  └──> jeder Upload schleppt 2,5 MB base64 durch die API
```

Das Ordner-Modell ist die gemeinsame Wurzel von Duplikaten und Rate-Limit. **Das
Tag-System ist deshalb nicht „das dritte Projekt", sondern die strukturelle Lösung
für Problem 1 und 2.** Es kommt trotzdem zuletzt, weil es das mit Abstand
invasivste Stück ist und die billigen Fixe nicht auf es warten müssen.

---

## 1. Befund

### 1.1 Warum die Drosselung zurück ist

Der Batch-Commit-Fix ist echt und wirkt — **aber nur für Textdateien.**

`kunstwolff-admin/src/services/github.ts:240-253` baut einen Git-Tree:

| Inhaltstyp | Weg in den Tree | Zusätzliche Requests |
| :-- | :-- | :-- |
| Text | inline als `content` | **0** |
| Binär (Bilder) | `POST /git/blobs` je Datei | **1 pro Bild** |

Tree-Content muss UTF-8 sein, Bilder können also nicht inline. Blob-Erstellung
zählt bei GitHub als *content-creating request*; die Sekundärlimits liegen bei
rund 80/Minute und 500/Stunde. 50 Fotos = 50 solche Requests in Folge.

`kunstwolff-admin/memory/publish-workflow.md:43` behauptet als Vorteil des
Batch-Commits: *„kein sekundäres GitHub-Rate-Limit bei vielen Dateien"*. Für
Bilder ist das **falsch** — und Bilder sind genau das, was in Massen hochgeladen
wird. Derselbe Satz steht als Kommentar in `src/services/publish.ts:73`.

**Der Teufelskreis.** `publish-workflow.md:27` dokumentiert korrekt: bei Fehler
bleibt der ganze Draft erhalten, *„ein erneuter Klick re-committet den kompletten
Batch"*. Genau das ist bei Rate-Limit fatal:

1. Upload bricht bei Bild 60 von 100 ab.
2. Jenny sieht „bitte 1–2 Minuten warten" (`Dashboard.tsx:263`).
3. Sie klickt erneut → **alle 100 Blobs gehen erneut raus**.
4. Kontingent ist wieder weg, bevor Bild 60 erreicht ist.

Der Kommentar in `github.ts:236` nimmt an, inhaltsadressierte Blobs seien „über
Retries hinweg wiederverwendbar". Inhaltlich stimmt das — GitHub dedupliziert die
Daten. Der **Request** zählt trotzdem voll. Dazu:

- **Kein Retry-After wird ausgewertet.** Grep über `publish.ts` + `github.ts`
  nach `retry|backoff|429|Retry-After`: nur die 422-Fast-Forward-Schleife.
- **Die genannten „1–2 Minuten" sind geraten.** Das sekundäre Limit für
  Content-Erzeugung läuft über eine Stunde.
- **Alle Nutzer teilen sich ein PAT** im Worker → ein gemeinsames Kontingent.

Es wurde also die Fehler**meldung** gefixt, nicht die Ursache. Der Worker selbst
drosselt nicht (`loginRateLimited` in `worker/src/index.ts:198` gilt nur für
`/auth/login`).

### 1.2 Bildbestand

| | |
| :-- | --: |
| Bilder in `public/img` | 295 (55,7 MB) |
| davon >1600 px | **139 — 71 % des Volumens** |
| ungebremst (3000×4000 / 4000×3000) | 18 |
| bytegleiche Duplikate | 33 |
| `srcset`/`sizes` im gesamten `src/` | **0** |
| `astro:assets` / `<Image>` | **nirgends benutzt** |

Gemessene Auslieferung auf `kunstwolff.vercel.app`:

| Seite | Bilder | Payload |
| :-- | --: | --: |
| `/trier/` | 33 | **14,48 MB** |
| `/frankfurt/` | 41 | 10,22 MB |
| `/` | 42 | 7,54 MB |
| `/schnellzeichner/` | 24 | 3,69 MB |
| `/FAQ/` | 1 | 0,03 MB |

Zwei Lecks in der Optimierungskette:

**Der Deckel greift nur auf die Breite.** `kunstwolff-admin/src/utils/imageWebp.ts:42`
und `Kunstwolffwebsite/scripts/optimize-all-images.mjs` rechnen beide
`if (width > maxWidth)`. Bei Hochformat 3:4 wird daraus 1600×2133 — 3,4 MP statt
der gedeckelten 2,56 MP. Mit 79 Dateien der größte Einzelposten.

**Fertige WebPs werden übersprungen.** `allowedExtensions` im Hook kennt nur
`.jpg/.jpeg/.png/.gif`. Alles, was schon als WebP ankommt — und seit der
browserseitigen Konvertierung 2026-06-05 kommt **alles** aus dem Admin als WebP —
umgeht jede weitere Optimierung. Daher die 18 Bilder mit 3000×4000.

**Doppelte Auslieferung.** `Titelbild/trier/paar-….webp` und
`slides/trier/13_paar-….webp` sind bytegleich (identische MD5), liegen aber unter
zwei URLs. 1,41 MB werden auf `/trier/` zweimal geladen — und das Titelbild ist
`eager`, also im LCP-Pfad.

**Nebenbefund:** Vercel liefert Bilder mit `cache-control: public, max-age=0,
must-revalidate`. Jeder Wiederbesuch revalidiert 1,9-MB-Dateien.

### 1.3 Git-Historie

`.git` = **371 MB** bei 130 MB Arbeitsverzeichnis; 429 von 857 Commits fassen
Bilder an. **Entscheidung vom 2026-07-26: bleibt liegen.** Ein Rewrite würde alle
Hashes ändern und jeden Klon brechen; Vercel klont flach, im Alltag stört es nicht.

> **Konsequenz, die den Plan prägt:** Bilder neu zu encodieren macht `.git`
> *größer*, nicht kleiner — Git behält jeden alten Blob. Die Sanierung des
> Bestands lohnt sich für Website und Uploads, nicht fürs Repo-Gewicht. Sie ist
> deshalb **einmalig** durchzuführen, nicht iterativ.

### 1.4 Was das Tag-System damit zu tun hat

Aus `phase2_tag_system` + `media_library_and_perf`, am Code verifiziert
(`Kunstwolffwebsite/src/utils/slideImages.ts:171` `readFolderSlides(folderName)`
ist weiterhin strikt ordnerbasiert):

Weil ein Slide heute **per Ordner** zu einer Seite gehört, muss die Mediathek beim
Platzieren die **Bytes kopieren**. Der alternative Weg — *referenzieren* über ein
Manifest, ohne Duplikate — ist bewusst nicht gebaut und wartet aufs Tag-System.

Damit ist die Kette geschlossen: Ordner-Modell → Kopien → Duplikate → mehr
Blob-Uploads → Rate-Limit → mehr Git-Gewicht. **Die 33 Duplikate sind kein
Schlamperei-Artefakt, sondern die korrekte Funktionsweise des heutigen Modells.**

---

## 2. Reihenfolge und ihre Begründung

Drei Regeln bestimmen die Abfolge:

1. **Erst den Zufluss dichtmachen, dann den Bestand säubern.** Andernfalls putzt
   man in einen lecken Eimer.
2. **Den Bestand lokal sanieren, nicht durchs Admin-Tool.** Ein lokaler
   `git push` schickt *ein Packfile* über das Git-Protokoll — null API-Requests,
   null Rate-Limit. Dieselben 139 Bilder durchs Admin-Tool wären 139 Blob-POSTs
   und würden das Limit garantiert sprengen.
3. **Das Tag-System zuletzt**, weil es als einziges das Website-Rendering
   umbaut — und weil dieser Umbau der richtige Moment für `srcset` ist.

---

## Phase 1 — Zufluss dichtmachen ✅ ERLEDIGT 2026-07-26

**Warum zuerst:** zwei kleine Änderungen, ohne die jede Sanierung sofort wieder
zuläuft. Risiko minimal, betrifft nur neue Uploads.

**Umgesetzt:**
- `Kunstwolffwebsite/scripts/image-constraints.mjs` (neu) — EINE Quelle für
  `MAX_EDGE = 1600`, `WEBP_QUALITY`, `resizeToMaxEdge()`, `exceedsMaxEdge()`.
- Beide Hook-Skripte nutzen sie; `resizeToMaxEdge` setzt `width` UND `height`
  mit `fit: 'inside'`, deckelt also die längere Kante.
- Beide Skripte prüfen zusätzlich `.webp`/`.avif` auf Übergröße (ohne sie zu
  konvertieren) — das war das zweite Leck.
- `kunstwolff-admin/src/utils/imageWebp.ts` — Geometrie als reine Funktion
  `fitWithinEdge()` + `MAX_EDGE`, 12 Tests.
- Der Voll-Durchgang über den Altbestand liegt hinter `--shrink-existing` und
  läuft ausdrücklich **nicht** im pre-push-Hook (der committet ungefragt; die
  Originale existieren nur im Repo).

**Verifiziert** in isolierter Fixture: 3000×4000 → 1200×1600, 4000×3000 →
1600×1200, 800×600 unangetastet, zweiter Lauf idempotent, und ohne Flag bleiben
vorhandene Übergrößen unberührt.

- `kunstwolff-admin/src/utils/imageWebp.ts:42` — Deckel auf die **längste Kante**
  statt nur die Breite.
- `Kunstwolffwebsite/scripts/optimize-all-images.mjs` — dito, plus `.webp`/`.avif`
  in die Prüfung aufnehmen: schon-WebP nicht *konvertieren*, aber auf Übergröße
  prüfen und ggf. herunterrechnen.
- Zielgröße gemeinsam festlegen (Vorschlag: längste Kante 1600, für Slides
  reicht wahrscheinlich 1400).
- Tests für beide Kappungen; `git-hooks.md` + `publish-workflow.md` nachziehen.

**Ergebnis:** neue Uploads sind 3–4× kleiner. Die *Anzahl* der Requests ändert
sich nicht — Jennys Limit-Problem löst das noch nicht.

## Phase 2 — Upload-Pfad: alles in EINEN Request ✅ ERLEDIGT 2026-07-26

**Umgesetzt:**
- `worker/src/security.ts` — `COMMIT_MUTATION` (festgenagelt) +
  `isAllowedGraphqlCommit()`: nur diese eine Mutation, jeder Pfad in
  `fileChanges` muss unter `public/` liegen, Ausbruchsversuche (`..`, führender
  Slash, Backslash) blockiert. 8 Testfälle, u.a. angehängte Zweitmutation.
- `worker/src/index.ts` — GraphQL-Zweig im Proxy vor dem REST-Guard;
  `proxyToGithub()` herausgezogen und reicht jetzt zusätzlich `Retry-After`
  durch.
- `src/services/github.ts` — `commitFilesBatch` über `createCommitOnBranch`,
  `chunkBySize()` für Drafts über 40 MB, `expectedHeadOid` statt
  Ref-PATCH-422-Schleife, Prüfung von `errors[]` (GraphQL meldet Fachfehler mit
  HTTP 200 — ohne die Prüfung sähe ein abgelehnter Commit wie Erfolg aus).
- `src/services/github-errors.ts` — `parseRetryAfter()` + `retryAfterSeconds`
  am Fehler; `Dashboard.tsx` zeigt die echte Wartezeit statt „1–2 Minuten".

**Verifiziert:** `tsc -b` sauber, 158 Tests grün, Vite-Build und
`wrangler --dry-run` bauen durch.

**Offen:** End-to-End gegen GitHub. Das geht erst nach dem Deploy von Worker
und Frontend — siehe „Was noch aussteht" am Ende.

**Warum hier:** entsperrt Jennys Alltag und ist Voraussetzung für Phase 5, in der
die Tag-Migration ihrerseits viele Schreibvorgänge durch dieselbe Röhre schickt.

### Der bessere Weg: GraphQL statt REST

Die Commits sind bereits gebündelt — ein Klick = ein Commit. Das ist nicht der
Hebel. Der Hebel sind die **Blobs davor**, und die lassen sich auf dem REST-Weg
nicht bündeln: Tree-Inhalte müssen UTF-8 sein, Binärdaten brauchen zwingend je
ein eigenes `POST /git/blobs`.

**Über GraphQL fällt diese Einschränkung weg.** Gegen das veröffentlichte
GitHub-Schema verifiziert (`docs.github.com/public/fpt/schema.docs.graphql`,
geprüft 2026-07-26):

```graphql
input FileAddition  { contents: Base64String!   path: String! }
input FileChanges   { additions: [FileAddition!]  deletions: [FileDeletion!] }
input CreateCommitOnBranchInput {
  branch: CommittableBranch!   expectedHeadOid: GitObjectID!
  fileChanges: FileChanges     message: CommitMessage!
}
```

`contents` ist ausdrücklich *„the base64 encoded contents of the file"* und
`additions` ist eine **Liste**. Damit gehen alle Dateien eines Publish —
Text, Bilder und Löschungen — in **einem einzigen Request** raus.

| | heute (REST) | mit GraphQL |
| :-- | --: | --: |
| Requests bei 100 Bildern | 100 Blobs + 4 | **1** |
| content-creating requests | 104 | **1** |

`expectedHeadOid` ersetzt dabei die heutige 422-Fast-Forward-Schleife
eins zu eins — gleiche optimistische Nebenläufigkeit, nur deklarativ.

**Der Teufelskreis verschwindet von selbst.** Es gibt keinen Teil-Fortschritt
mehr, den ein erneuter Klick teuer wiederholen könnte: ein Retry ist genau ein
Request. Ein „Fortsetzen statt neu anfangen" braucht es dann gar nicht.

### Zwei echte Kosten

**1. Der SEC-1-Guard muss neu gebaut werden — sicherheitsrelevant.** Der Worker
lässt Schreibzugriffe nur unter `public/` zu und prüft dafür heute den
`git/trees`-Body (`worker/src/security.ts` `isGitTreeWrite` /
`isAllowedGithubWrite`, Proxy-Route `worker/src/index.ts:284`). Für GraphQL
braucht es ein Äquivalent, das `fileChanges.additions[].path` und `.deletions[]`
prüft — inklusive Variablen-Auflösung. **Ohne diesen Guard wäre der Proxy ein
offenes Schreibrecht aufs ganze Repo.** Das ist der Hauptaufwand der Umstellung,
nicht der Client.

**2. Alles reist in einem Body.** `GITHUB_BODY_LIMIT` im Worker steht auf
**50 MB** (`worker/src/index.ts:282`); Base64 bläht um Faktor 4/3, also rund
37 MB Rohdaten pro Publish.

| Bildgröße | Bilder pro Request |
| :-- | --: |
| heute, 1,9 MB | **~19** |
| nach Phase 1, ~300 KB | ~120 |

**Damit ist Phase 1 keine Kür mehr, sondern harte Voraussetzung.** Mit den
heutigen Dateigrößen wäre der Gewinn bei großen Uploads durch den Body-Deckel
wieder aufgezehrt. Für Batches über dem Limit braucht es Chunking: dann mehrere
Commits statt einem — akzeptabel, und immer noch 3 Requests statt 150. Ein
Publish, das unter das Limit passt, bleibt ein Commit.

### Zusätzlich, unabhängig vom Weg

- **Retry-After auswerten** statt der geratenen „1–2 Minuten" in
  `Dashboard.tsx:263` — das sekundäre Limit läuft über eine Stunde.
- Kommentar `publish.ts:73` und `publish-workflow.md:43` korrigieren — die
  Behauptung „kein sekundäres Rate-Limit" gilt nur für Text.
- `publish-workflow.md:9` hält „REST, **nicht** GraphQL" als Entscheidung fest,
  ohne Begründung. Vor der Umstellung klären, ob dahinter ein Grund stand.

**Ergebnis:** Massen-Uploads gehen als ein Request raus. Rate-Limit als Thema
erledigt, nicht nur abgefedert.

## Phase 3 — Bestand sanieren (einmalig, lokal)

**Warum nach 1+2:** der Deckel steht, also bleibt es beim einen Durchgang.

- **Vorher Vollbackup der Originale außerhalb von `public/`** — das Repo ist laut
  Auskunft vom 2026-07-26 die einzige Kopie.
- Die 139 Übergrößen lokal mit sharp herunterrechnen.
- `validate:image-refs` + Website-Build als Kontrolle.
- **Lokal committen und pushen**, ausdrücklich nicht übers Admin-Tool.
- Die 33 Duplikate **bleiben vorerst liegen** — sie sind Konsequenz des
  Ordner-Modells und werden in Phase 5 strukturell aufgelöst. Jetzt gelöscht,
  bräche das Rendering.

**Ergebnis:** `/trier/` von 14,5 MB auf geschätzt 4–5 MB.

**Billig mitzunehmen:** `vercel.json` mit brauchbaren `cache-control`-Headern für
`/img/*`. Fünf Minuten, unabhängig von allem anderen.

## Phase 4 — Entscheidung: `astro:assets` oder eigener Weg

**Kein Code, nur eine Festlegung** — aber sie muss vor Phase 5 fallen, weil sie
bestimmt, wie Phase 5 rendert.

Astros Bild-Pipeline (`<Image>`, automatisches `srcset`) verlangt Bilder in
`src/assets/`. Das Admin-Tool schreibt aber nach `public/` — dorthin kommt es via
GitHub-API, und `public/` ist genau der Vertrag zwischen beiden Repos. Ein Umzug
nach `src/assets/` bricht diesen Vertrag.

Realistisch bleiben zwei Optionen:

- **A:** `public/` behalten, Varianten (z.B. 400/800/1600) zur Build-Zeit per
  sharp-Skript erzeugen, `srcset` von Hand in die Komponenten. Admin-Workflow
  bleibt unangetastet.
- **B:** Bild-Auslieferung über einen Cloudflare-Worker / CF-Images
  on-the-fly. `utils/thumb.ts` im Admin kapselt eine solche Umstellung bereits
  hinter einer Funktion (heute images.weserv.nl).

Empfehlung: **A**, weil es die Repo-Grenze respektiert. Zu klären ist, ob die
Varianten ins Repo committet werden (mehr Git-Gewicht) oder im Vercel-Build
entstehen (sauberer, aber längere Builds).

## Phase 5 — Tag-System

Der invasive Teil. Aus `phase2_tag_system`, in drei Stufen:

**5a — Datenmodell.** Skill × Anlass × Ort, gemeinsam für Bilder *und* Reviews.
Zwei der drei Dimensionen existieren bereits: `slides.meta.json` trägt
Skill-Tags, Reviews haben `categories` plus Stadt-Ordner. **Die Anlass-Dimension
fehlt bei beiden** — das ist der eigentliche Neubau.

**5b — Referenzieren statt Kopieren.** Ein Manifest löst die Ordner-Zuordnung ab.
`readFolderSlides()` in `slideImages.ts` weicht einer Tag-Abfrage. **Hier
verschwindet die Ursache der Duplikate** — erst danach lassen sich die 33 Kopien
gefahrlos auflösen. Cross-Repo-Pflicht: `admin-tool.md` + `pfadstruktur.md`.

**5c — Responsive Bilder.** `srcset`/`sizes` nach Entscheidung aus Phase 4.
Bewusst hier und nicht früher: Phase 5b fasst `slideImages.ts` und
`Slideshow.astro` ohnehin an — zweimal durch dieselbe Datei zu gehen wäre
verschwendet. Danach lädt ein Handy ~200 KB statt 1,6 MB.

## Phase 6 — KI-Auto-Tagging

Das Phase-2-Endziel: die KI sieht sich die Bilder an und vergibt die Tags selbst.
Setzt 5a zwingend voraus und ist ohne 5b sinnlos — Tags ohne Referenz-Rendering
sortieren nichts ein.

---

## 3. Was dieser Plan bewusst nicht anfasst

- **Git-Historien-Rewrite.** Entschieden: liegen lassen (§1.3).
- **Wix→Astro-Cutover.** Eigenes Vorhaben (`CUTOVER_PLAN.md`). Berührungspunkt:
  `www.kunstwolff.de` läuft weiterhin auf Wix — alle Messungen oben stammen von
  `kunstwolff.vercel.app`. Phase 3 und 5c sollten **vor** dem Cutover stehen,
  sonst geht die Seite mit 14-MB-Seiten in die Google-Bewertung.
- **Admin↔Live-Paritätslücke** (`admin_vs_live_resolution_gap`) — eigenes Thema.

## 3a. Was nach Phase 1+2 noch aussteht

**Deploy.** Beide Phasen liegen als Code vor, sind aber nirgends live:

1. `npm run worker:deploy` (Admin-Repo) — ohne den neuen Worker antwortet
   `/api/github/graphql` mit 403, und das Veröffentlichen bräche komplett.
2. Frontend auf `master` pushen → Vercel baut `kunstwolff-admin.vercel.app`.

**Reihenfolge ist zwingend: Worker zuerst.** Ein Frontend, das GraphQL spricht,
gegen einen Worker, der es noch nicht kennt, kann gar nichts veröffentlichen.
Umgekehrt ist unkritisch — der neue Worker beherrscht den alten REST-Pfad weiter.

**End-to-End-Test danach**, in dieser Reihenfolge:
1. Eine Textdatei ändern → veröffentlichen. Prüft den GraphQL-Pfad im
   einfachsten Fall.
2. Ein Bild hochladen → veröffentlichen. Prüft base64-`contents`.
3. Mehrere Bilder gleichzeitig → prüft, dass es ein Commit bleibt.
4. Im Repo gegenprüfen: ein Commit, alle Dateien drin, Inhalte unversehrt.

**Rückfallebene:** Der REST-Pfad ist im Worker unverändert erhalten. Bricht
etwas, genügt es, `commitFilesBatch` im Client auf die alte Implementierung
zurückzusetzen — Commit `16e1874`s Vorgänger im Admin-Repo hat sie.

## 4. Sofort erledigbar, unabhängig von allem

- `worker/.dev.vars` trägt noch den alten, toten PAT (401 verifiziert). Nur
  lokale Entwicklung betroffen; das Live-Worker-Secret ist aktuell.
- `vercel.json` mit Cache-Headern (siehe Phase 3).
- Die falsche Zeile in `publish-workflow.md:43` korrigieren, damit die nächste
  Fehlersuche nicht wieder darauf hereinfällt.
