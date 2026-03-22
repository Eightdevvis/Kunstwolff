import { useState, useEffect } from 'preact/hooks';
import { getFile } from '../services/github';
import { addPendingFile, hasPendingFile, pendingFiles } from '../services/state';
import { normalizeSlug } from '../utils/encoding';

const LANDINGS_PATH = 'public/landings/landings.md';

function parseCities(raw: string): string[] {
  return raw
    .split('\n')
    .filter((line) => line.trimStart().startsWith('- '))
    .map((line) => line.trimStart().replace(/^-\s+/, '').trim());
}

function serializeCities(cities: string[], originalRaw: string): string {
  // Alle Zeilen die keine Stadt-Einträge sind 1:1 übernehmen, Stadt-Block ersetzen
  const lines = originalRaw.split('\n');
  const firstCityIndex = lines.findIndex((l) => l.trimStart().startsWith('- '));
  const lastCityIndex = lines.reduce(
    (acc, l, i) => (l.trimStart().startsWith('- ') ? i : acc),
    firstCityIndex
  );

  if (firstCityIndex === -1) {
    // Keine Städte gefunden – einfach ans Ende anhängen
    return originalRaw.trimEnd() + '\n' + cities.map((c) => `- ${c}`).join('\n') + '\n';
  }

  const before = lines.slice(0, firstCityIndex);
  const after = lines.slice(lastCityIndex + 1);
  return [...before, ...cities.map((c) => `- ${c}`), ...after].join('\n');
}

interface Props {
  onCitiesChange?: (cities: string[]) => void;
}

export function CityManager({ onCitiesChange }: Props) {
  const [cities, setCities] = useState<string[]>([]);
  const [originalRaw, setOriginalRaw] = useState('');
  const [sha, setSha] = useState<string | null>(null);
  const [newCity, setNewCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Wenn der pendingFiles-State eine Änderung für diese Datei enthält, daraus laden
  useEffect(() => {
    const pending = pendingFiles.value.get(LANDINGS_PATH);
    if (pending) {
      setCities(parseCities(pending.content));
      setLoading(false);
      return;
    }
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const file = await getFile(LANDINGS_PATH);
      setSha(file.sha);
      setOriginalRaw(file.content);
      const parsed = parseCities(file.content);
      setCities(parsed);
      onCitiesChange?.(parsed);
    } catch (e) {
      setError(`Fehler beim Laden: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function saveDraft(updatedCities: string[]) {
    const content = serializeCities(updatedCities, originalRaw);
    addPendingFile(LANDINGS_PATH, {
      content,
      sha,
      isBinary: false,
      commitMessage: 'admin: Städteliste aktualisiert',
    });
    onCitiesChange?.(updatedCities);
  }

  function addCity() {
    // normalizeSlug: Umlaute transliterieren, lowercase, Leerzeichen → Bindestriche,
    // alle anderen Sonderzeichen entfernen (ä→ae, ö→oe, ü→ue, ß→ss)
    const slug = normalizeSlug(newCity);
    if (!slug || cities.includes(slug)) return;
    const updated = [...cities, slug];
    setCities(updated);
    saveDraft(updated);
    setNewCity('');
  }

  function removeCity(city: string) {
    const updated = cities.filter((c) => c !== city);
    setCities(updated);
    saveDraft(updated);
    setDeleteConfirm(null);
  }

  const isDirty = hasPendingFile(LANDINGS_PATH);

  if (loading) return <div class="p-6 text-gray-500">Lade Städteliste...</div>;
  if (error) return (
    <div class="p-6">
      <div class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      <button onClick={load} class="mt-3 text-sm text-blue-600 hover:underline">Erneut versuchen</button>
    </div>
  );

  return (
    <div class="p-6 max-w-2xl">
      <div class="flex items-center gap-3 mb-6">
        <h2 class="text-xl font-semibold text-gray-900">Städte verwalten</h2>
        {isDirty && (
          <span class="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
            Ungespeicherte Änderungen
          </span>
        )}
      </div>

      {/* Neue Stadt hinzufügen */}
      <div class="flex gap-2 mb-6">
        <input
          type="text"
          value={newCity}
          onInput={(e) => setNewCity((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && addCity()}
          placeholder="z.B. München oder frankfurt-am-main"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        <button
          onClick={addCity}
          disabled={!newCity.trim()}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Hinzufügen
        </button>
      </div>

      <p class="text-xs text-gray-400 mb-4">
        Umlaute werden automatisch umgeschrieben (ä→ae, ö→oe, ü→ue, ß→ss). Leerzeichen werden zu Bindestrichen. Korrekt: <code class="bg-gray-100 px-1 rounded">frankfurt</code>, <code class="bg-gray-100 px-1 rounded">muenchen</code>
      </p>

      {/* Städteliste */}
      <div class="space-y-2">
        {cities.map((city) => (
          <div key={city} class="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
            <span class="font-mono text-sm text-gray-800">{city}</span>
            {deleteConfirm === city ? (
              <div class="flex items-center gap-2">
                <span class="text-xs text-red-600">Wirklich löschen?</span>
                <button
                  onClick={() => removeCity(city)}
                  class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                >
                  Ja, löschen
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  class="text-xs text-gray-500 hover:text-gray-700"
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(city)}
                class="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                title="Stadt entfernen"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <p class="text-xs text-gray-400 mt-4">
        {cities.length} Städte · Änderungen werden erst beim "Veröffentlichen" gespeichert
      </p>
    </div>
  );
}
