# FAQs

## Ablage

```
public/faq/default/*.md     # allgemeine FAQs (Fallback, wenn eine Stadt keine eigenen FAQs hat)
public/faq/<stadt>/*.md      # stadtspezifische FAQs (angelegt & aktiv genutzt)
```

**Stand jetzt:** Neben `default/` existieren zahlreiche stadtspezifische FAQ-Ordner und werden vom Loader aktiv genutzt (`getFAQsByCity` in `src/utils/faq.ts` fällt nur auf `default/` zurück, wenn eine Stadt **null** eigene FAQs hat). Vorhandene Stadt-Ordner: `belgique`, `bw`, `duesseldorf`, `frankfurt`, `heidelberg`, `kaiserslautern`, `karlsruhe`, `koblenz`, `koeln`, `ludwigshafen`, `luxembourg`, `mainz`, `mannheim`, `rheinland-pfalz`, `saarbruecken`, `saarland`, `schweiz`, `trier`, `wiesbaden`, `wuppertal` (20 Städte + `default`). Weitere Stadt-FAQs: einfach den Ordner `public/faq/<stadt>/` anlegen und MD-Files reinschreiben.

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
| `tags` | nein | Objekt mit Arrays `events` / `skills` / `landings` – zusätzliche Kontext-Zuordnung, ausgewertet von `matchesFAQContext` in `src/utils/faq.ts` |

## Filter-Logik

- Auf **Skill-Seiten:** FAQs mit passender `categories` **oder** passendem `tags.skills`
- Auf **Event-Seiten:** FAQs mit passendem `tags.events` (Kontext `events/<slug>`)
- Auf **Stadt-Landings:** stadt-spezifische FAQs bevorzugt; zusätzlich Treffer über `tags.landings`
- Sonst / wenn eine Stadt keine eigenen FAQs hat: `default/` FAQs

Die Kontext-Prüfung (`matchesFAQContext`, `src/utils/faq.ts`) matcht per **ODER** über `categories`, `tags.skills`, `tags.events` und `tags.landings`.

## Schema.org

FAQs werden automatisch als `FAQPage` JSON-LD ausgegeben (siehe `seo.md`). Kann zu aufklappbaren FAQ-Blöcken direkt in den Google-Suchergebnissen führen.

## Admin-Tool

FaqManager schreibt nach `public/faq/default/` und `public/faq/<city>/`.
