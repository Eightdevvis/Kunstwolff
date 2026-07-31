# Claude-Anweisungen – Kunstwolff Website

## Zwingende Regeln (immer aktiv)

1. **Vor jeder Aufgabe `memory/index.md` öffnen.** Dort die relevanten Themen identifizieren und nur die nötigen Subfiles laden. Niemals `README.md` oder das ganze `memory/` als Ersatz für gezieltes Nachschlagen verwenden.

2. **Cross-Repo-Pflicht:** Bei Änderungen an Pfaden, Dateinamen oder Formaten in `public/` zwingend `memory/admin-tool.md` lesen und Auswirkungen aufs Admin-Tool (`/home/sasha/codicus/Kunstwolff/kunstwolff-admin/`) prüfen. Beide Repos müssen synchron bleiben – das schließt deren `memory/`-Strukturen ein.

3. **Memory-Pflege bei Änderungen – PFLICHT, keine Ausnahmen:** Jede Änderung an Code, Konfiguration, Dateistruktur, Pfaden, Dateiformaten, Sync-Logik, Build-Scripts oder Deployment-Setup muss **sofort** im passenden `memory/`-Subfile mitgepflegt werden. Bei strukturellen Änderungen auch `memory/index.md` und `memory/pfadstruktur.md` anpassen.

4. **Memory-Pflege bei neuen Features – PFLICHT, keine Ausnahmen:** Jedes neue Feature (neuer Content-Typ, neue Page, neue Komponente mit eigenem Datenformat, neuer Manager, neuer Sync-Schritt, neuer externer Service, neue Env-Variable) bekommt entweder:
   - einen **eigenen neuen Memory-Subfile** mit Eintrag in `memory/index.md`, oder
   - eine **Erweiterung** in einem bestehenden Subfile, mit Index-Update wenn das Thema im Index unsauber wird.
   
   Tote Verweise sind schlimmer als fehlende Doku – also entweder vollständig oder nicht. Bei Unsicherheit, wo ein Feature dokumentiert gehört: **nachfragen**, nicht stillschweigend auslassen.

5. **Sync-Reihenfolge respektieren:** `npm run sync:content:safe` läuft als `predev`/`prebuild`. Bei neuen Sync-Schritten Reihenfolge in `memory/sync-scripts.md` aktualisieren.

6. **`ANLEITUNGEN/` ist Endbenutzer-Doku** (deutsch, nicht-technisch) – nicht für Claude. Aber: bei Änderungen an dort dokumentierten Workflows trotzdem mitpflegen, da Endbenutzer darauf angewiesen sind.

## Einstieg

Projekt-Übersicht: `memory/projekt.md`
Architektur: `memory/architektur.md`
Vollständiger Themen-Index: `memory/index.md`
