# Kunstwolff SEO Relaunch Plan

> **⚠ HISTORISCHES DOKUMENT** – Der Relaunch ist abgeschlossen. Dieses Dokument enthält veraltete Informationen (z.B. falsche Sitemap-URL `sitemap.xml` statt `sitemap-index.xml`, Netlify-Stage als Ziel). Die aktuelle SEO-Dokumentation steht in README.md §8.

Dieses Dokument fasst die SEO-Strategie für den Relaunch der Website **kunstwolff.de** zusammen.
Die neue Website wird mit **Astro** entwickelt und zunächst auf **kunstwolff.netlify.app** aufgebaut, bevor sie die bestehende Wix-Seite ersetzt.

Ziel:

* Maximales organisches Ranking in Suchmaschinen
* Mehr qualifizierte Eventanfragen
* Saubere, skalierbare SEO-Architektur

---

# 1. Ausgangssituation

## Aktuelle Website

Domain: kunstwolff.de
Technologie: Wix
Zustand:

* geringe Rankings
* wenig Traffic
* geringe Anzahl indexierter Seiten

Analyse über Google Search Console zeigt:

* Homepage ~95 Klicks
* wenige weitere Seiten mit minimalem Traffic
* viele Seiten ohne relevante Rankings

Interpretation:

* bestehende Seite hat **kaum SEO-Wert**
* Relaunch birgt **geringes Ranking-Risiko**
* neue Architektur kann frei optimiert werden

---

# 2. Relaunch Architektur

Neue Seite wird entwickelt auf:

```
kunstwolff.netlify.app
```

Nach Fertigstellung:

1. Wix-Seite entfernen
2. Domain kunstwolff.de auf neue Seite zeigen
3. Sitemap neu einreichen
4. Indexierung prüfen

---

# 3. Technische Basis

Technologie:

* Astro
* HTML
* CSS
* JavaScript / TypeScript

Rendering:

* statischer Build (Static Site Generation)

Vorteile:

* extrem schnelle Ladezeiten
* sehr gute SEO-Performance
* einfache Skalierung von Landingpages

---

# 4. Seitenarchitektur

Die Architektur basiert auf drei Ebenen.

## 4.1 Skill-Seiten

Beispiele:

```
/schnellzeichner/
/szenenmaler/
```

Diese Seiten beschreiben die Hauptleistungen.

---

## 4.2 Stadtseiten

Stadtseiten werden automatisch generiert.

Beispiele:

```
/berlin/
/frankfurt/
/hamburg/
```

Zweck:

* lokale Sichtbarkeit
* Ranking für Orts-Suchanfragen

Beispiele Suchanfragen:

```
schnellzeichner berlin
karikaturist frankfurt
eventzeichner hamburg
```

---

## 4.3 Skill + Stadt Kombination

Beispiele:

```
/schnellzeichner/berlin/
/schnellzeichner/frankfurt/
/szenenmaler/berlin/
```

Diese Seiten sind die wichtigsten SEO-Landingpages.

Sie zielen auf Suchanfragen wie:

```
schnellzeichner berlin
karikaturist frankfurt
```

---

# 5. Automatisierte Seitengenerierung

Landingpages werden automatisch generiert über:

```
public/landings/landings.md
public/skills/skills.json
```

Generierte Seiten:

```
/<stadt>/
/<skill>/
/<skill>/<stadt>/
```

Beispiel:

```
/berlin/
/schnellzeichner/
/schnellzeichner/berlin/
```

---

# 6. Content-System

Content wird aus verschiedenen Pools generiert.

## Bilder

Ordnerstruktur:

```
public/img/slides/<stadt>/
public/img/slides/default/
```

Eigenschaften:

* automatisches Laden
* Priorität über Dateinamen
* Metadaten über slides.meta.json

---

## Reviews

Ordner:

```
public/reviews/<stadt>/
```

Fallback-System:

1. Stadt
2. default
3. andere Städte

Dadurch hat jede Seite ausreichend Content.

---

## FAQs

Ordner:

```
public/faq/<stadt>/
public/faq/default/
```

Filterung:

* nach Stadt
* nach Skill

---

## Skills

Datei:

```
public/skills/skills.json
```

Beispiel:

```
Schnellzeichner
Szenenmaler
```

Automatisch generiert:

```
/schnellzeichner/
/schnellzeichner/<stadt>
```

---

# 7. SEO Richtlinien für Landingpages

Jede Landingpage sollte enthalten:

* eindeutigen Text
* Bilder
* Referenzen
* FAQs
* interne Links

Empfohlene Struktur:

```
H1 Schnellzeichner in Berlin

Intro

H2 Schnellzeichner für Events in Berlin
H2 Live Karikaturen für Firmenfeiern
H2 Beispiele aus Berlin
H2 Galerie
H2 Kundenbewertungen
H2 FAQ
```

Empfohlene Textlänge:

```
600 – 1200 Wörter
```

---

# 8. Vermeidung von Doorway Pages

Suchmaschinen (z. B. Google) warnen vor sogenannten Doorway Pages.

Quelle:
Google Search Central – Spam Policies

Definition:

Doorway Pages sind Seiten, die nur erstellt werden, um für bestimmte Keywords zu ranken und Nutzer auf dieselbe Seite weiterzuleiten.

Problematisch wird es wenn:

* viele Seiten fast identisch sind
* nur Ort oder Keyword ausgetauscht wird

Beispiel:

```
/schnellzeichner-berlin
/schnellzeichner-hamburg
/schnellzeichner-muenchen
```

mit identischem Inhalt.

---

## Lösung

Jede Stadtseite sollte echten lokalen Content enthalten:

* Events aus der Stadt
* Fotos aus der Stadt
* lokale Referenzen
* angepasste Texte

---

# 9. Bild SEO

Eventservices profitieren stark von Bildersuche.

Empfehlungen:

Dateinamen:

```
schnellzeichner-hochzeit-berlin.jpg
```

Alt-Text:

```
Schnellzeichner zeichnet Gäste auf einer Hochzeit in Berlin
```

Format:

```
webp
avif
```

---

# 10. Structured Data

Empfohlene Schema.org Typen:

* LocalBusiness
* Organization
* Review
* FAQ

Dies verbessert Suchergebnisse (Rich Snippets).

---

# 11. Technische SEO Anforderungen

Die Seite sollte enthalten:

robots.txt

```
User-agent: *
Allow: /

Sitemap: https://kunstwolff.de/sitemap.xml
```

Sitemap:

```
/sitemap.xml
```

Meta Tags:

```
title
meta description
canonical
open graph
```

---

# 12. Relaunch Ablauf

## Schritt 1

Seite vollständig auf Netlify fertigstellen.

---

## Schritt 2

SEO prüfen:

* sitemap
* robots
* meta tags
* canonical
* structured data

---

## Schritt 3

Domain umstellen:

```
kunstwolff.de → neue Seite
```

---

## Schritt 4

Neue Sitemap einreichen in
Google Search Console.

---

## Schritt 5

Indexierung überwachen.

---

# 13. Wichtige SEO Erfolgsfaktoren

Für Kunstwolff sind besonders relevant:

1. Stadtlandingpages
2. viele Eventfotos
3. Kundenbewertungen
4. ausführliche Landingpages
5. schnelle Ladezeiten

---

# 14. Haupthebel für Wachstum

Die wichtigsten Rankingfaktoren für diese Website:

```
City Landingpages
+
Event Content
+
Bilder
+
Backlinks
```

Damit lässt sich organischer Traffic langfristig steigern.

---

# 15. Nächste Schritte

Empfohlene Reihenfolge:

1. vollständige Liste aller Städte definieren
2. Content für wichtigste Städte erstellen
3. Bilder und Referenzen hinzufügen
4. strukturierte Daten integrieren
5. Seite testen
6. Relaunch durchführen
