import { useState, useEffect } from 'preact/hooks';
import { listDirectory, rawUrl, getFile } from '../services/github';
import { addPendingFile, pendingFiles } from '../services/state';

// Pfad zur zentralen Slideshow-Meta-Datei (muss beim Löschen von Slides-Bildern mitgepflegt werden)
const META_PATH = 'public/img/slides/slides.meta.json';

// Alle Bild-Endungen die wir beim Scan berücksichtigen
const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif)$/i;

// Reihenfolge der Endungen für "Welche Datei behalten wir?" bei SHA-Duplikaten.
// webp > avif > png > gif > jpg/jpeg – webp ist immer bevorzugt weil die Website
// ohnehin nur webp anzeigt wenn es existiert.
const EXT_PRIORITY: Record<string, number> = {
  webp: 0,
  avif: 1,
  png: 2,
  gif: 3,
  jpg: 4,
  jpeg: 5,
};

// Ein einzelner gescannter Bildeintrag aus einem GitHub-Verzeichnis
interface ScannedImage {
  path: string;      // vollständiger Repo-Pfad, z.B. "public/img/slides/berlin/foto.jpg"
  filename: string;  // nur der Dateiname, z.B. "foto.jpg"
  sha: string;       // Git Blob-SHA – identische Inhalte haben identische SHAs
  url: string;       // raw.githubusercontent.com-URL für die Vorschau
  basename: string;  // Dateiname ohne Endung, z.B. "foto" – für WebP-Basename-Erkennung
  ext: string;       // Endung lowercase, z.B. "jpg"
  dir: string;       // Verzeichnis-Pfad, z.B. "public/img/slides/berlin"
}

// Gruppe von inhaltlich identischen Bildern (gleicher Git-Blob-SHA).
// "keeper" bleibt erhalten, "dupes" werden als zu löschen markiert.
interface ShaGroup {
  keeper: ScannedImage;
  dupes: ScannedImage[];
}

interface Props {
  // Alle Städte aus landings.md (ohne "default" – wird intern immer hinzugefügt)
  cities: string[];
}

export function CleanupManager({ cities }: Props) {
  // Alle gefundenen Bilder über alle Städte und Verzeichnisse hinweg
  const [allImages, setAllImages] = useState<ScannedImage[]>([]);

  // Pfade von Bildern bei denen der Browser einen Ladefehler gemeldet hat
  const [brokenPaths, setBrokenPaths] = useState<Set<string>>(new Set());

  // slides.meta.json – wird beim Löschen von Slides-Bildern mitaktualisiert
  const [metaSha, setMetaSha] = useState<string | null>(null);
  const [allMeta, setAllMeta] = useState<Record<string, unknown>>({});

  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState('');

  // Welcher Bestätigungs-Dialog ist gerade offen?
  const [confirmDelete, setConfirmDelete] = useState<'webp-dupes' | 'sha-dupes' | 'broken' | null>(null);

  // Beim ersten Rendern automatisch scannen
  useEffect(() => {
    scan();
  }, []);

  // ── Scan ──────────────────────────────────────────────────────────────────
  // Lädt alle Bild-Verzeichnisse für alle Städte und sammelt jeden Bildeintrag.
  async function scan() {
    setScanning(true);
    setScanned(false);
    setError('');
    setBrokenPaths(new Set());

    try {
      // slides.meta.json vorab laden – wird beim späteren Löschen mitaktualisiert
      let meta: Record<string, unknown> = {};
      let sha: string | null = null;
      const pendingMeta = pendingFiles.value.get(META_PATH);
      if (pendingMeta && !pendingMeta.isDeleted) {
        meta = JSON.parse(pendingMeta.content);
        sha = pendingMeta.sha;
      } else {
        try {
          const file = await getFile(META_PATH);
          meta = JSON.parse(file.content);
          sha = file.sha;
        } catch {
          // Datei existiert noch nicht – kein Problem, bleibt leer
        }
      }
      setAllMeta(meta);
      setMetaSha(sha);

      // "default" immer mit scannen, dann alle konfigurierten Städte
      const allCities = ['default', ...cities.filter((c) => c !== 'default')];
      const found: ScannedImage[] = [];

      for (const city of allCities) {
        const dirs = [
          `public/img/slides/${city}`,
          `public/img/Titelbild/${city}`,
          `public/img/why/${city}/benefit-1`,
          `public/img/why/${city}/benefit-2`,
          `public/img/why/${city}/benefit-3`,
          `public/img/why/${city}/benefit-4`,
        ];

        for (const dir of dirs) {
          try {
            const entries = await listDirectory(dir);
            for (const e of entries) {
              if (!IMAGE_EXTS.test(e.name) || e.name === '.gitkeep') continue;

              const lastDot = e.name.lastIndexOf('.');
              const ext = e.name.substring(lastDot + 1).toLowerCase();
              const basename = e.name.substring(0, lastDot);

              found.push({
                path: e.path,
                filename: e.name,
                sha: e.sha,
                url: rawUrl(e.path),
                basename,
                ext,
                dir,
              });
            }
          } catch {
            // Verzeichnis existiert noch nicht → überspringen
          }
        }
      }

      setAllImages(found);
      setScanned(true);
    } catch (e) {
      setError(`Scan-Fehler: ${(e as Error).message}`);
    } finally {
      setScanning(false);
    }
  }

  // ── WebP-Basename-Duplikate ───────────────────────────────────────────────
  // Erkennt: foto.jpg + foto.webp im selben Verzeichnis.
  // Die Website zeigt ohnehin nur das .webp an (laut README-WebP-Deduplication).
  // → Alle non-webp Dateien die einen .webp-Partner im selben Dir haben.
  const webpDuplicates = (() => {
    // Gruppiere nach Verzeichnis + Basename
    const groups = new Map<string, ScannedImage[]>();
    for (const img of allImages) {
      const key = `${img.dir}||${img.basename}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(img);
    }

    const dupes: ScannedImage[] = [];
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const hasWebp = group.some((img) => img.ext === 'webp');
      if (hasWebp) {
        dupes.push(...group.filter((img) => img.ext !== 'webp'));
      }
    }
    return dupes;
  })();

  // ── SHA-Duplikate ─────────────────────────────────────────────────────────
  // Git speichert Dateien als Content-adressierte Blobs: gleicher Inhalt = gleiche SHA.
  // Wenn zwei Bilder (egal wo, egal welcher Name) denselben Blob-SHA haben, sind
  // sie byte-für-byte identisch. Das passiert z.B. wenn dieselbe Datei unter zwei
  // verschiedenen Namen hochgeladen wurde.
  //
  // "Keeper"-Auswahl: webp vor anderen Formaten, dann alphabetisch nach Pfad.
  // Bereits als WebP-Basename-Duplikat erkannte Dateien werden hier übersprungen
  // um Doppel-Markierungen zu vermeiden.
  const webpDupePaths = new Set(webpDuplicates.map((d) => d.path));

  const shaGroups = (() => {
    // Gruppiere alle Bilder nach SHA (außer die schon als WebP-Dupe markierten)
    const bySha = new Map<string, ScannedImage[]>();
    for (const img of allImages) {
      if (webpDupePaths.has(img.path)) continue; // bereits erfasst, überspringen
      // Key = Verzeichnis + SHA: nur Dateien im SELBEN Ordner mit identischem Inhalt
      // sind Duplikate. Gleiche SHA über verschiedene Verzeichnisse hinweg ist kein
      // Duplikat – dieselbe Datei kann legitimerweise in berlin/ und muenchen/ liegen.
      const key = `${img.dir}||${img.sha}`;
      if (!bySha.has(key)) bySha.set(key, []);
      bySha.get(key)!.push(img);
    }

    const groups: ShaGroup[] = [];
    for (const group of bySha.values()) {
      if (group.length < 2) continue;

      // Kaputte Bilder komplett aus der SHA-Logik ausschließen:
      // Wenn zwei identische Bilder beide kaputt sind, sollen BEIDE gelöscht werden –
      // die broken-Sektion übernimmt das. Die Duplikat-Logik (eins behalten, Rest löschen)
      // darf hier nicht greifen, weil "ein kaputtes Bild behalten" keinen Sinn ergibt.
      const healthy = group.filter((img) => !brokenPaths.has(img.path));

      // Alle kaputt → kein SHA-Duplikat erzeugen, broken-Detection löscht alle
      if (healthy.length < 2) continue;

      // Keeper-Auswahl unter den gesunden: webp bevorzugt, dann alphabetisch
      const sorted = [...healthy].sort((a, b) => {
        const pa = EXT_PRIORITY[a.ext] ?? 99;
        const pb = EXT_PRIORITY[b.ext] ?? 99;
        if (pa !== pb) return pa - pb;
        return a.path.localeCompare(b.path);
      });

      groups.push({ keeper: sorted[0], dupes: sorted.slice(1) });
    }
    return groups;
  })();

  // Flache Liste aller SHA-Duplikate (nur die zu-löschenden, nicht der Keeper)
  const shaDuplicates = shaGroups.flatMap((g) => g.dupes);

  // Kaputte Bilder: alle die beim Laden einen Fehler ausgelöst haben
  const brokenImages = allImages.filter((img) => brokenPaths.has(img.path));

  // Gesamtanzahl aller zu bereinigenden Probleme
  const totalProblems = webpDuplicates.length + shaDuplicates.length + brokenImages.length;

  // Von img onError aufgerufen – markiert ein Bild als kaputt
  function markBroken(path: string) {
    setBrokenPaths((prev) => new Set([...prev, path]));
  }

  // ── Löschen ───────────────────────────────────────────────────────────────
  // Fügt alle übergebenen Bilder als "isDeleted" in den pending-State ein.
  // Slides-Bilder: zugehörige Meta-Einträge in slides.meta.json werden mitbereinigt.
  function doDelete(imgs: ScannedImage[]) {
    let updatedMeta = { ...allMeta };
    let metaChanged = false;

    for (const img of imgs) {
      addPendingFile(img.path, {
        content: '',
        sha: img.sha,
        isBinary: false,
        commitMessage: `admin: Bereinigung – ${img.path}`,
        isDeleted: true,
      });

      // Slideshow-Bilder haben einen Meta-Eintrag der mitgelöscht werden muss
      if (img.path.startsWith('public/img/slides/')) {
        const metaKey = img.path.replace('public/img/slides/', '');
        if (metaKey in updatedMeta) {
          const { [metaKey]: _removed, ...rest } = updatedMeta;
          updatedMeta = rest;
          metaChanged = true;
        }
      }
    }

    if (metaChanged) {
      setAllMeta(updatedMeta);
      addPendingFile(META_PATH, {
        content: JSON.stringify(updatedMeta, null, 2),
        sha: metaSha,
        isBinary: false,
        commitMessage: 'admin: Bereinigung – slides.meta.json aktualisiert',
      });
    }

    // Aus der lokalen Anzeige entfernen
    const deletedPaths = new Set(imgs.map((i) => i.path));
    setAllImages((prev) => prev.filter((img) => !deletedPaths.has(img.path)));
    setBrokenPaths((prev) => {
      const next = new Set(prev);
      for (const p of deletedPaths) next.delete(p);
      return next;
    });

    setConfirmDelete(null);
  }

  // Wiederverwendbarer Inline-Bestätigungsdialog mit Ja/Abbrechen
  function ConfirmBar({
    id,
    count,
    label,
    onConfirm,
  }: {
    id: 'webp-dupes' | 'sha-dupes' | 'broken';
    count: number;
    label: string;
    onConfirm: () => void;
  }) {
    if (count === 0) return null;
    return confirmDelete === id ? (
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-sm text-gray-600 whitespace-nowrap">{count} Datei{count !== 1 ? 'en' : ''} löschen?</span>
        <button onClick={onConfirm} class="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
          Ja, löschen
        </button>
        <button onClick={() => setConfirmDelete(null)} class="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
          Abbrechen
        </button>
      </div>
    ) : (
      <button
        onClick={() => setConfirmDelete(id)}
        class={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors shrink-0 ${
          id === 'broken' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-500 hover:bg-yellow-600'
        }`}
      >
        {label} ({count})
      </button>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div class="p-6 space-y-10">

      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Bereinigung</h2>
          {scanned && !scanning && (
            <p class="text-sm text-gray-500 mt-1">
              {allImages.length} Bilder gescannt ·{' '}
              {totalProblems === 0 ? (
                <span class="text-green-600 font-medium">alles sauber</span>
              ) : (
                <>
                  <span class={webpDuplicates.length > 0 ? 'text-yellow-600 font-medium' : ''}>
                    {webpDuplicates.length} WebP-Duplikate
                  </span>
                  {' · '}
                  <span class={shaDuplicates.length > 0 ? 'text-yellow-600 font-medium' : ''}>
                    {shaDuplicates.length} inhaltliche Duplikate
                  </span>
                  {' · '}
                  <span class={brokenImages.length > 0 ? 'text-red-600 font-medium' : ''}>
                    {brokenImages.length} kaputt
                  </span>
                  {brokenImages.length === 0 && allImages.length > 0 && (
                    <span class="text-gray-400"> (Broken-Check läuft…)</span>
                  )}
                </>
              )}
            </p>
          )}
        </div>
        <button
          onClick={scan}
          disabled={scanning}
          class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 transition-colors"
        >
          {scanning ? 'Scanne…' : 'Erneut scannen'}
        </button>
      </div>

      {/* Fehler */}
      {error && (
        <div class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
      )}

      {/* Scan-Spinner */}
      {scanning && (
        <div class="flex items-center gap-3 text-gray-500 text-sm py-8">
          <div class="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          Scanne alle Verzeichnisse aller Städte…
        </div>
      )}

      {/*
        Unsichtbare Probe-Bilder für die Broken-Detection.
        display:none verhindert das Laden NICHT – der Browser lädt das src trotzdem.
        Nur loading="lazy" würde das verhindern (deshalb kein lazy hier).
        Schlägt ein Load fehl → onError → markBroken().
      */}
      {allImages.map((img) => (
        <img key={img.path} src={img.url} class="hidden" onError={() => markBroken(img.path)} />
      ))}

      {scanned && !scanning && (
        <>
          {/* ── WebP-Basename-Duplikate ──────────────────────────────────── */}
          <section>
            <div class="flex items-start justify-between mb-4 gap-4">
              <div>
                <h3 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                  WebP-Duplikate
                  {webpDuplicates.length > 0 && (
                    <span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                      {webpDuplicates.length}
                    </span>
                  )}
                </h3>
                <p class="text-xs text-gray-500 mt-1 max-w-xl">
                  Gleicher Dateiname, andere Endung: <code>foto.jpg</code> + <code>foto.webp</code> im selben Ordner.
                  Die Website zeigt nur das .webp an – das Original kostet nur Speicher.
                  Das WebP bleibt, die Kopie fliegt raus.
                </p>
              </div>
              <ConfirmBar
                id="webp-dupes"
                count={webpDuplicates.length}
                label="WebP-Duplikate bereinigen"
                onConfirm={() => doDelete(webpDuplicates)}
              />
            </div>

            {webpDuplicates.length === 0 ? (
              <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
                Keine WebP-Duplikate gefunden.
              </div>
            ) : (
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {webpDuplicates.map((img) => (
                  <div key={img.path} class="rounded-xl overflow-hidden border-2 border-yellow-300">
                    <div class="aspect-square bg-yellow-50 relative">
                      <img src={img.url} alt={img.filename} class="w-full h-full object-cover" loading="lazy" />
                      <span class="absolute top-1.5 left-1.5 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                        wird gelöscht
                      </span>
                    </div>
                    <div class="p-2 bg-white space-y-0.5">
                      <p class="text-xs text-gray-600 font-mono truncate line-through" title={img.filename}>
                        {img.filename}
                      </p>
                      <p class="text-xs text-gray-400 truncate" title={img.dir}>
                        {img.dir.split('/').slice(-2).join('/')}
                      </p>
                      <p class="text-xs text-green-600 font-medium">✓ {img.basename}.webp bleibt</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── SHA-Duplikate ─────────────────────────────────────────────── */}
          <section>
            <div class="flex items-start justify-between mb-4 gap-4">
              <div>
                <h3 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                  Inhaltliche Duplikate
                  {shaDuplicates.length > 0 && (
                    <span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                      {shaDuplicates.length}
                    </span>
                  )}
                </h3>
                <p class="text-xs text-gray-500 mt-1 max-w-xl">
                  Byte-identische Dateien mit verschiedenen Namen (gleicher Git-Blob-SHA).
                  Entsteht wenn dieselbe Datei mehrfach hochgeladen wurde.
                  Pro Gruppe bleibt das WebP (oder die beste Variante) erhalten.
                </p>
              </div>
              <ConfirmBar
                id="sha-dupes"
                count={shaDuplicates.length}
                label="Inhaltliche Duplikate bereinigen"
                onConfirm={() => doDelete(shaDuplicates)}
              />
            </div>

            {shaGroups.length === 0 ? (
              <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
                Keine inhaltlichen Duplikate gefunden.
              </div>
            ) : (
              <div class="space-y-4">
                {shaGroups.map((group) => (
                  // Jede Gruppe zeigt Keeper + alle Duplikate nebeneinander
                  <div key={group.keeper.sha} class="border border-gray-200 rounded-xl overflow-hidden">
                    <div class="bg-gray-50 px-3 py-2 text-xs text-gray-500 font-mono truncate">
                      SHA: {group.keeper.sha.substring(0, 12)}… · {group.dupes.length + 1} identische Dateien
                    </div>
                    <div class="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {/* Keeper – wird behalten */}
                      <div class="rounded-lg overflow-hidden border-2 border-green-400">
                        <div class="aspect-square bg-green-50 relative">
                          <img src={group.keeper.url} alt={group.keeper.filename} class="w-full h-full object-cover" loading="lazy" />
                          <span class="absolute top-1.5 left-1.5 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                            bleibt
                          </span>
                        </div>
                        <div class="p-2 bg-white">
                          <p class="text-xs text-gray-600 font-mono truncate" title={group.keeper.filename}>
                            {group.keeper.filename}
                          </p>
                          <p class="text-xs text-gray-400 truncate" title={group.keeper.dir}>
                            {group.keeper.dir.split('/').slice(-2).join('/')}
                          </p>
                        </div>
                      </div>

                      {/* Duplikate – werden gelöscht */}
                      {group.dupes.map((img) => (
                        <div key={img.path} class="rounded-lg overflow-hidden border-2 border-yellow-300">
                          <div class="aspect-square bg-yellow-50 relative">
                            <img src={img.url} alt={img.filename} class="w-full h-full object-cover" loading="lazy" />
                            <span class="absolute top-1.5 left-1.5 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                              wird gelöscht
                            </span>
                          </div>
                          <div class="p-2 bg-white">
                            <p class="text-xs text-gray-600 font-mono truncate line-through" title={img.filename}>
                              {img.filename}
                            </p>
                            <p class="text-xs text-gray-400 truncate" title={img.dir}>
                              {img.dir.split('/').slice(-2).join('/')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Kaputte Bilder ──────────────────────────────────────────────── */}
          <section>
            <div class="flex items-start justify-between mb-4 gap-4">
              <div>
                <h3 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                  Kaputte Bilder
                  {brokenImages.length > 0 && (
                    <span class="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                      {brokenImages.length}
                    </span>
                  )}
                </h3>
                <p class="text-xs text-gray-500 mt-1 max-w-xl">
                  Bilder die sich nicht laden lassen – korrupte Uploads, leere Dateien, oder
                  fehlerhafte URLs. Werden automatisch im Hintergrund erkannt.
                  {brokenImages.length === 0 && allImages.length > 0 && ' Prüfung läuft noch…'}
                </p>
              </div>
              <ConfirmBar
                id="broken"
                count={brokenImages.length}
                label="Alle kaputten löschen"
                onConfirm={() => doDelete(brokenImages)}
              />
            </div>

            {brokenImages.length === 0 ? (
              <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
                Keine kaputten Bilder erkannt.
                {allImages.length > 0 && (
                  <span> Bilder werden im Hintergrund geprüft – Tab offen lassen bis Prüfung abgeschlossen.</span>
                )}
              </div>
            ) : (
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {brokenImages.map((img) => (
                  <div key={img.path} class="rounded-xl overflow-hidden border-2 border-red-300">
                    <div class="aspect-square bg-red-50 flex flex-col items-center justify-center relative">
                      <div class="text-3xl mb-1">⚠️</div>
                      <p class="text-xs text-red-600 font-medium">Lädt nicht</p>
                      <span class="absolute top-1.5 left-1.5 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                        Kaputt
                      </span>
                    </div>
                    <div class="p-2 bg-white space-y-0.5">
                      <p class="text-xs text-gray-600 font-mono truncate" title={img.filename}>
                        {img.filename}
                      </p>
                      <p class="text-xs text-gray-400 truncate" title={img.path}>
                        {img.dir.split('/').slice(-2).join('/')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
