# Vercel-Header (`vercel.json`)

**Angelegt 2026-07-28.** Vorher gab es keine `vercel.json`; Bilder kamen mit
`cache-control: public, max-age=0, must-revalidate`. Jeder Besucher fragte also
bei jedem Aufruf für **jedes** Bild neu nach – auf einer Seite mit 30+ Slides
sind das 30+ überflüssige Anfragen pro Besuch.

## Was gesetzt ist

```
/img/*   Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```

Einen Tag frisch, danach eine Woche lang „liefere den alten Stand sofort aus und
hole im Hintergrund den neuen".

## Warum NICHT `immutable` / `max-age=31536000`

Das ist der übliche Rat für Bilder – hier wäre er **falsch**. Das Admin-Tool
schreibt Bilder unter **demselben Dateinamen** zurück: ersetzt Jenny ein Motiv
oder ändert sie den Titelbild-Rahmen, bleibt der Pfad gleich. Mit `immutable`
sähen wiederkehrende Besucher bis zu ein Jahr lang die alte Fassung, ohne dass
irgendetwas kaputt aussieht – der schlimmste Fehlertyp, weil ihn niemand meldet.

Der übliche Ausweg wären Datei-Namen mit Inhalts-Hash. Der scheitert hier daran,
dass der Pfad der Vertrag zwischen den beiden Repos ist: das Admin-Tool listet
und schreibt `public/img/...` direkt.

`stale-while-revalidate` löst denselben Zweck ohne die Falle: schnell für den
Besucher, und eine Änderung ist spätestens am Folgetag überall sichtbar.

## Gilt auch für die Varianten

`/img/variants/…` (aus `scripts/generate-image-variants.mjs`) fällt unter
dieselbe Regel – die Dateinamen leiten sich vom Original ab und ändern sich beim
Austausch ebenso wenig. Siehe `responsive-images.md`.

## Redirects (seit 2026-07-30)

`vercel.json` hat jetzt neben `headers` einen `redirects`-Block: die Weiterleitungskarte
der alten Wix-URLs auf die neuen Astro-Pfade. Inventar aus den fünf Wix-Sitemaps
(34 URLs), 30 davon liefen ohne Karte ins 404 – darunter `/kontakt`, die Anfrage-Seite
der alten Seite. Vollständige Tabelle mit Begründung je Zeile:
`reports/cutover-audit-2026-07-30.md`, Anhang A.

Drei Regeln dazu:

- **`"permanent": true`** (=308, von Google wie 301 behandelt). Ohne das erbt das neue
  Ziel kein Ranking.
- **Nicht über `astro.config.mjs` `redirects` lösen.** Astro erzeugt bei statischer
  Ausgabe eine HTML-Seite mit Meta-Refresh, keinen echten Statuscode. Der vorhandene
  Eintrag `/gallerie → /galerie/` bleibt dort nur für den Dev-Server; ausgeliefert wird
  auf Vercel der 301 aus `vercel.json` (Redirects greifen vor dem Dateisystem).
- **Apex → www gehört NICHT hierher**, sondern in die Vercel-Domain-Settings.

Sammelregeln (`/template/:rest*`, `/portfolio-collections/:rest*`) stehen am Ende ihrer
Gruppe – Vercel nimmt die erste passende Regel, spezifische also zuerst.
