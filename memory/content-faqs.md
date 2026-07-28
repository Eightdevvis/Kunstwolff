# FAQs

## Ablage

```
public/faq/default/*.md     # allgemeine FAQs – gelten überall (kein Ort-Tag)
public/faq/<stadt>/*.md      # stadtspezifische FAQs
```

**Der Ordner entscheidet seit 2026-07-28 nichts mehr.** Er liefert beim Anlegen den
Start-Tag (`scripts/sync-faq-tags.mjs`), danach ist er reine Ablage – die Auswahl läuft
über die Tags (siehe unten). `getFAQsByCity` / `getFAQsByCategories` / `getFAQsByCategory`
wurden dabei **entfernt**; wer sie sucht, will `getFAQsForContext`.

Vorhandene Stadt-Ordner: `belgique`, `bw`, `duesseldorf`, `frankfurt`, `heidelberg`, `kaiserslautern`, `karlsruhe`, `koblenz`, `koeln`, `ludwigshafen`, `luxembourg`, `mainz`, `mannheim`, `rheinland-pfalz`, `saarbruecken`, `saarland`, `schweiz`, `trier`, `wiesbaden`, `wuppertal` (20 Städte + `default`). Weitere Stadt-FAQs: einfach den Ordner `public/faq/<stadt>/` anlegen und MD-Files reinschreiben.

## Format

```md
---
question: "Wie buche ich einen Schnellzeichner?"
answer: "Sie können uns direkt über das Kontaktformular anfragen..."
categories:
  - Schnellzeichner
  - Szenenmaler
---
```

## Frontmatter-Felder

| Feld | Pflicht | Zweck |
| :-- | :-- | :-- |
| `question` | ja | Die Frage |
| `answer` | ja | Die Antwort |
| `categories` | nein | Array von Skills, für die diese FAQ relevant ist |
| `city` | nein | Überschreibt den Ordnernamen (Stadt-Zuordnung) |
| `tags` | **faktisch ja** | Objekt mit Arrays `events` / `skills` / `landings` – **die** Zuordnung, siehe Auswahl-Logik. Fehlt der Block, ergänzt ihn `scripts/sync-faq-tags.mjs` beim nächsten Build aus Ordner + `categories` |

## Auswahl-Logik (seit 2026-07-28 tag-basiert)

**Eine** Funktion entscheidet: `getFAQsForContext(context, locale)` in `src/utils/faq.ts`.
`FAQ.astro` ruft nur noch die auf – die frühere Vierfach-Verzweigung mit Ordner-Gate
und Fallback-Treppe ist weg.

Geprüft werden drei Dimensionen **einzeln und mit UND** verknüpft:

| Dimension | FAQ-Feld | Regel |
| :-- | :-- | :-- |
| Skill | `tags.skills` + `categories` | leer ⇒ gilt für jeden Skill |
| Anlass | `tags.events` | leer ⇒ gilt für jeden Anlass |
| Ort | `tags.landings` | leer ⇒ gilt für jeden Ort |

Innerhalb einer Dimension heißt **leer = gilt überall**. Das ersetzt den `default/`-Ordner:
„allgemein" ist jetzt eine Eigenschaft des Inhalts, nicht seines Ablageorts.

Sortierung: FAQs, die den Kontext ausdrücklich nennen, stehen vor den allgemeinen.
Sonst entschiede die Lesereihenfolge der Dateien, was in die ersten `maxItems` (Default 4)
rutscht – und die Stadtseite zeigte ausgerechnet ihre eigenen Fragen nicht.

### Warum das vorher nicht ging

`matchesFAQContext` verknüpfte die Teilprüfungen mit **ODER**. Eine FAQ mit passendem
Skill erschien damit auf *jeder* Stadtseite. Deshalb musste `FAQ.astro` vorher über
`getFAQsByCity` nach dem **Ordner** vorfiltern – und deshalb war der Tag-Teil faktisch
wirkungslos. Am 2026-07-28 gemessen: von 71 FAQ-Dateien trug **keine einzige** einen
Ort-Tag. `matchesFAQContext` las Tags, die es nicht gab.

Gemessene Wirkung der Umstellung (dist gegen die Live-Seite verglichen, alle Stadtseiten):
**keine FAQ verschwunden**, und die Seiten füllen sich auf die vorgesehenen 4 Fragen
statt auf 1–2 – die alte Fallback-Treppe griff nie, weil das Ordner-Gate eine
nicht-leere, aber kurze Liste zurückgab.

### Tags kommen per Sync

`scripts/sync-faq-tags.mjs` ergänzt fehlende Tag-Blöcke: Ort aus dem Ordner,
Skills aus `categories`, `default/` bleibt absichtlich ohne Ort-Tag. Vorhandene
`tags:`-Blöcke werden **nie** angefasst. Anlässe rät das Script bewusst **nicht** aus
dem Text (anders als bei Reviews) – ein geratener Anlass würde eine allgemeine Frage
still zu einer Anlass-Frage machen. Anlässe vergibt Jenny im Admin über die Tag-Chips.

Der Schritt läuft in `sync:content:safe`, also bei jedem `dev`/`build` – **nach**
`sync:tags`, weil ein Ort ohne Vokabular-Eintrag verworfen wird.

⚠️ **Bekannte Grenze:** `FaqManager.tsx` schreibt den `tags:`-Block nur, wenn mindestens
ein Tag gesetzt ist (gleiche Haltung wie `ReviewManager`). Löscht jemand im Admin *alle*
Tags einer Stadt-FAQ, um sie allgemein zu machen, ergänzt der Sync beim nächsten Build
den Ordner-Tag wieder. „Bewusst allgemein" ist derzeit nicht ausdrückbar.

## Schema.org

FAQs werden automatisch als `FAQPage` JSON-LD ausgegeben (siehe `seo.md`). Kann zu aufklappbaren FAQ-Blöcken direkt in den Google-Suchergebnissen führen.

## Admin-Tool

FaqManager schreibt nach `public/faq/default/` und `public/faq/<city>/`.
