import { useState, useEffect, useRef } from 'preact/hooks';
import { getFile, listDirectory, rawUrl } from '../services/github';
import { addPendingFile, pendingFiles } from '../services/state';
import { encodeArrayBuffer, normalizeFilename } from '../utils/encoding';

const META_PATH = 'public/img/slides/slides.meta.json';

type SlideMeta = {
  categories: string[];
  priority: number;
  alt?: string;
  enabled?: boolean;
};

type SlidesMeta = Record<string, SlideMeta>;

interface ImageEntry {
  key: string;
  filename: string;
  repoPath: string;   // vollständiger Repo-Pfad
  sha: string | null; // für Löschen nötig
  meta: SlideMeta;
  isNew?: boolean;
}

export type ImageType = 'slides' | 'titelbild' | 'why';

// Welche Verzeichnisse und Labels gehören zu welchem Typ
const IMAGE_TYPE_CONFIG: Record<ImageType, {
  label: string;
  dirs: (city: string) => string[];          // Verzeichnisse zum Auflisten
  uploadDir: (city: string, subdir?: string) => string;
  hasMeta: boolean;
  multiple: boolean;                          // mehrere Bilder erlaubt
  subDirs?: string[];                         // für Why: benefit-1 bis benefit-4
}> = {
  slides: {
    label: 'Slideshow',
    dirs: (city) => [`public/img/slides/${city}`],
    uploadDir: (city) => `public/img/slides/${city}`,
    hasMeta: true,
    multiple: true,
  },
  titelbild: {
    label: 'Titelbild',
    dirs: (city) => [`public/img/Titelbild/${city}`],
    uploadDir: (city) => `public/img/Titelbild/${city}`,
    hasMeta: false,
    multiple: false,
  },
  why: {
    label: 'Why-Bilder',
    dirs: (city) => [
      `public/img/why/${city}/benefit-1`,
      `public/img/why/${city}/benefit-2`,
      `public/img/why/${city}/benefit-3`,
      `public/img/why/${city}/benefit-4`,
    ],
    uploadDir: (city, subdir) => `public/img/why/${city}/${subdir}`,
    hasMeta: false,
    multiple: false,
    subDirs: ['benefit-1', 'benefit-2', 'benefit-3', 'benefit-4'],
  },
};

interface Props {
  city: string;
  imageType: ImageType;
}

export function ImageManager({ city, imageType }: Props) {
  const config = IMAGE_TYPE_CONFIG[imageType];

  const [allMeta, setAllMeta] = useState<SlidesMeta>({});
  const [metaSha, setMetaSha] = useState<string | null>(null);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [activeSubDir, setActiveSubDir] = useState(config.subDirs?.[0] ?? '');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveSubDir(config.subDirs?.[0] ?? '');
    load();
  }, [city, imageType]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      // slides.meta.json nur für Slideshow laden
      if (config.hasMeta) {
        const pendingMeta = pendingFiles.value.get(META_PATH);
        let meta: SlidesMeta;
        let sha: string | null = null;
        if (pendingMeta) {
          meta = JSON.parse(pendingMeta.content);
          sha = pendingMeta.sha;
        } else {
          const file = await getFile(META_PATH);
          meta = JSON.parse(file.content);
          sha = file.sha;
        }
        setAllMeta(meta);
        setMetaSha(sha);
      }

      // Bilder aus allen relevanten Verzeichnissen laden
      const allImages: ImageEntry[] = [];
      for (const dir of config.dirs(city)) {
        let entries: { name: string; path: string }[] = [];
        try {
          entries = await listDirectory(dir);
        } catch {
          // Verzeichnis existiert noch nicht
        }
        entries
          .filter((e) => /\.(jpe?g|png|webp|gif|avif)$/i.test(e.name) && e.name !== '.gitkeep')
          .forEach((e) => {
            // Für Slides: key = "city/filename" wie in slides.meta.json gespeichert.
            // Für andere Typen (titelbild, why): key = voller Repo-Pfad als eindeutige ID.
            const key = config.hasMeta ? e.path.replace('public/img/slides/', '') : e.path;
            allImages.push({
              key,
              filename: e.name,
              repoPath: e.path,
              sha: (e as { sha?: string }).sha ?? null,
              meta: allMeta[key] ?? { categories: [], priority: allImages.length + 1 },
            });
          });
      }
      setImages(allImages);
    } catch (e) {
      setError(`Fehler: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function saveMeta(updated: SlidesMeta) {
    setAllMeta(updated);
    addPendingFile(META_PATH, {
      content: JSON.stringify(updated, null, 2),
      sha: metaSha,
      isBinary: false,
      commitMessage: `admin: Bild-Metadaten aktualisiert (${city})`,
    });
  }

  function updateImageMeta(key: string, patch: Partial<SlideMeta>) {
    const updated = { ...allMeta, [key]: { ...(allMeta[key] ?? { categories: [], priority: 1 }), ...patch } };
    // Nur für Slides schreiben – für titelbild/why gibt es keine Meta-Datei.
    // Ohne diesen Guard würde ein allMeta={} in slides.meta.json geschrieben → Datenverlust!
    if (config.hasMeta) saveMeta(updated);
    setImages((imgs) => imgs.map((img) => (img.key === key ? { ...img, meta: updated[key] } : img)));
  }

  function deleteImage(img: ImageEntry) {
    addPendingFile(img.repoPath, {
      content: '',
      sha: img.sha,
      isBinary: false,
      commitMessage: `admin: Bild gelöscht - ${img.repoPath}`,
      isDeleted: true,
    });
    setImages((imgs) => imgs.filter((i) => i.repoPath !== img.repoPath));
    if (config.hasMeta) {
      const updated = { ...allMeta };
      delete updated[img.key];
      saveMeta(updated);
    }
    setDeleteConfirm(null);
  }

  function toggleCategory(key: string, cat: string) {
    const current = allMeta[key]?.categories ?? [];
    updateImageMeta(key, {
      categories: current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat],
    });
  }

  async function handleFiles(files: FileList) {
    if (!files.length) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const filename = normalizeFilename(file.name);
      const uploadDir = config.subDirs
        ? config.uploadDir(city, activeSubDir)
        : config.uploadDir(city);
      const repoPath = `${uploadDir}/${filename}`;
      // Gleiche Key-Logik wie beim Laden: nur für Slides den slides/-Prefix abschneiden
      const key = config.hasMeta ? repoPath.replace('public/img/slides/', '') : repoPath;

      const buffer = await file.arrayBuffer();
      addPendingFile(repoPath, {
        content: encodeArrayBuffer(buffer),
        sha: null,
        isBinary: true,
        commitMessage: `admin: Bild hochgeladen - ${repoPath}`,
      });

      const newEntry: ImageEntry = {
        key,
        filename,
        repoPath,
        sha: null,
        meta: { categories: [], priority: images.length + 1 },
        isNew: true,
      };
      setImages((imgs) => [...imgs, newEntry]);

      if (config.hasMeta) {
        saveMeta({ ...allMeta, [key]: newEntry.meta });
      }
    }

    setUploading(false);
  }

  // Bild-URL: für slides via key, für andere via repoPath
  function imgUrl(entry: ImageEntry): string {
    if (imageType === 'slides') return rawUrl(`public/img/slides/${entry.key}`);
    return rawUrl(entry.repoPath);
  }

  // Nur Bilder des aktiven Subdir anzeigen (für Why)
  const visibleImages = config.subDirs
    ? images.filter((img) => img.repoPath.includes(`/${activeSubDir}/`))
    : images;

  if (loading) return <div class="p-6 text-gray-500">Lade Bilder...</div>;
  if (error) return (
    <div class="p-6">
      <div class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      <button onClick={load} class="mt-3 text-sm text-blue-600 hover:underline">Erneut versuchen</button>
    </div>
  );

  return (
    <div class="p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-6">
        {config.label} – <span class="font-mono text-blue-600">{city}</span>
      </h2>

      {/* Why: Benefit-Tabs */}
      {config.subDirs && (
        <div class="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-fit">
          {config.subDirs.map((sub, i) => (
            <button
              key={sub}
              onClick={() => setActiveSubDir(sub)}
              class={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeSubDir === sub ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Benefit {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Upload-Zone */}
      <div
        class={`border-2 border-dashed rounded-xl p-8 text-center mb-8 transition-colors cursor-pointer ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={config.multiple}
          class="hidden"
          onChange={(e) => { const input = e.target as HTMLInputElement; if (input.files) handleFiles(input.files); }}
        />
        {uploading ? (
          <p class="text-blue-600">Bereite Upload vor...</p>
        ) : (
          <p class="text-gray-500 font-medium">
            {config.multiple ? 'Bilder hierher ziehen oder klicken' : 'Bild hierher ziehen oder klicken'}
          </p>
        )}
      </div>

      {/* Bild-Grid */}
      {visibleImages.length === 0 ? (
        <div class="text-center py-8">
          {city !== 'default' ? (
            <p class="text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 inline-block">
              Wird mit <strong>default</strong> zur Zeit aufgefüllt!
            </p>
          ) : (
            <p class="text-gray-400 text-sm">Keine Bilder vorhanden</p>
          )}
        </div>
      ) : (
        <div class={`grid gap-4 ${config.multiple ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 max-w-sm'}`}>
          {visibleImages.map((img) => (
            <div key={img.repoPath} class={`rounded-xl overflow-hidden border ${img.isNew ? 'border-blue-300 ring-2 ring-blue-200' : 'border-gray-200'}`}>
              <div class="aspect-square bg-gray-100 relative">
                <img
                  src={img.isNew
                    ? `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23dbeafe' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' font-size='30'%3E🆕%3C/text%3E%3C/svg%3E`
                    : imgUrl(img)
                  }
                  alt={img.meta.alt ?? img.filename}
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
                {img.isNew && (
                  <span class="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">Neu</span>
                )}
                {/* Löschen-Button */}
                {deleteConfirm === img.repoPath ? (
                  <div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                    <span class="text-white text-xs font-medium">Wirklich löschen?</span>
                    <div class="flex gap-2">
                      <button onClick={() => deleteImage(img)} class="bg-red-600 text-white text-xs px-3 py-1 rounded hover:bg-red-700">Ja</button>
                      <button onClick={() => setDeleteConfirm(null)} class="bg-white text-gray-800 text-xs px-3 py-1 rounded hover:bg-gray-100">Nein</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(img.repoPath)}
                    class="absolute top-2 right-2 bg-black/40 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm transition-colors"
                    title="Bild löschen"
                  >
                    ×
                  </button>
                )}
              </div>
              <div class="p-3 space-y-2 bg-white">
                <p class="text-xs text-gray-500 font-mono truncate" title={img.filename}>{img.filename}</p>
                {/* Alt-Text nur für Slides – nur dort gibt es slides.meta.json zum Persistieren */}
                {config.hasMeta && (
                  <input
                    type="text"
                    value={img.meta.alt ?? ''}
                    onInput={(e) => updateImageMeta(img.key, { alt: (e.target as HTMLInputElement).value })}
                    placeholder="Alt-Text (SEO)"
                    class="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
                {config.hasMeta && (
                  <div class="flex gap-2">
                    {(['Schnellzeichner', 'Szenenmaler'] as const).map((cat) => (
                      <label key={cat} class="flex items-center gap-1 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={img.meta.categories.includes(cat)}
                          onChange={() => toggleCategory(img.key, cat)}
                          class="rounded"
                        />
                        <span class="text-gray-600">{cat === 'Schnellzeichner' ? 'Schnell' : 'Szene'}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p class="text-xs text-gray-400 mt-6">
        {visibleImages.length} Bild(er) · Änderungen werden beim "Veröffentlichen" gespeichert
      </p>
    </div>
  );
}
