# FAQs

## Ablage

```
public/faq/default/*.md     # allgemeine FAQs (aktuell die einzige genutzte Quelle)
public/faq/<stadt>/*.md     # stadtspezifische FAQs (Loader unterstützt es, aktuell NICHT angelegt)
```

**Stand jetzt:** Nur `public/faq/default/` existiert. Stadt-spezifische FAQs sind technisch möglich (der Loader fragt sie ab), wurden aber für keine Stadt angelegt. Wenn du Stadt-FAQs brauchst, einfach den Ordner `public/faq/<stadt>/` anlegen und MD-Files reinschreiben.

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

## Filter-Logik

- Auf **Skill-Seiten:** nur FAQs mit passender `categories`
- Auf **Stadt-Landings:** stadt-spezifische FAQs bevorzugt
- Sonst: `default/` FAQs

## Schema.org

FAQs werden automatisch als `FAQPage` JSON-LD ausgegeben (siehe `seo.md`). Kann zu aufklappbaren FAQ-Blöcken direkt in den Google-Suchergebnissen führen.

## Admin-Tool

FaqManager schreibt nach `public/faq/default/` und `public/faq/<city>/`.
