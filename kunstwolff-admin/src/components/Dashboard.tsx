import { useState, useEffect } from 'preact/hooks';
import { pendingFiles, pendingCount, removePendingFile } from '../services/state';
import { putFile, putBinaryFile, deleteFile, getFile } from '../services/github';
import { ImageManager } from './ImageManager';
import { ReviewManager } from './ReviewManager';
import { CityManager } from './CityManager';
import { FaqManager } from './FaqManager';
import { CalendarView } from './CalendarView';
import { CleanupManager } from './CleanupManager';
import { PartnerManager } from './PartnerManager';

type Tab = 'slides' | 'titelbild' | 'why' | 'reviews' | 'staedte' | 'faqs' | 'kalender' | 'bereinigung' | 'partner';

interface Props {
  onLogout: () => void;
}

function parseCities(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('---') && !line.endsWith(':'))
    .map((line) => line.startsWith('- ') ? line.slice(2).trim() : line)
    .filter(Boolean);
}

export function Dashboard({ onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('slides');
  const [city, setCity] = useState('default');
  const [cities, setCities] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const count = pendingCount.value;

  // Städte beim Start laden
  useEffect(() => {
    getFile('public/landings/landings.md')
      .then((file) => {
        const parsed = parseCities(file.content);
        setCities(parsed);
        if (parsed.length > 0) setCity(parsed[0]);
      })
      .catch(() => {/* bleibt bei 'default' */});
  }, []);

  async function publish() {
    if (count === 0) return;
    setPublishing(true);
    setPublishResult(null);

    let done = 0;
    const errors: string[] = [];

    // Snapshot vor dem Iterieren – wir entfernen erfolgreich gepushte Files
    // sofort aus der Queue, damit ein Retry keine SHA-Mismatch-Fehler verursacht
    const entries = Array.from(pendingFiles.value.entries());

    for (const [path, pending] of entries) {
      try {
        if (pending.isDeleted) {
          if (pending.sha) await deleteFile(path, pending.sha, pending.commitMessage);
        } else if (pending.isBinary) {
          const buffer = Uint8Array.from(atob(pending.content), (c) => c.charCodeAt(0)).buffer;
          await putBinaryFile(path, buffer, pending.sha, pending.commitMessage);
        } else {
          await putFile(path, pending.content, pending.sha, pending.commitMessage);
        }
        // Sofort aus Queue entfernen – bei Teilerfolg bleiben nur die fehlgeschlagenen Files
        removePendingFile(path);
        done++;
      } catch (e) {
        errors.push(`${path}: ${(e as Error).message}`);
      }
    }

    if (errors.length === 0) {
      setPublishResult({ ok: true, msg: `${done} Datei(en) erfolgreich veröffentlicht.` });
    } else {
      setPublishResult({ ok: false, msg: `${done} OK, ${errors.length} Fehler:\n${errors.join('\n')}` });
    }

    setPublishing(false);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'slides', label: 'Slideshow' },
    { key: 'titelbild', label: 'Titelbild' },
    { key: 'why', label: 'Why-Bilder' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'staedte', label: 'Städte' },
    { key: 'faqs', label: 'FAQs' },
    { key: 'kalender', label: 'Kalender' },
    { key: 'partner', label: 'Partner' },
    { key: 'bereinigung', label: 'Bereinigung' },
  ];

  // Kein Stadt-Dropdown für Tabs die stadtunabhängig arbeiten
  const showCitySelect = activeTab !== 'staedte' && activeTab !== 'kalender' && activeTab !== 'bereinigung' && activeTab !== 'partner';

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div class="flex items-center gap-4">
          <span class="font-bold text-gray-900">Kunstwolff Admin</span>
          {showCitySelect && city && (
            <select
              value={city}
              onChange={(e) => setCity((e.target as HTMLSelectElement).value)}
              class="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="default">default (Fallback)</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        <div class="flex items-center gap-3">
          {publishResult && (
            <div class={`text-sm px-3 py-1.5 rounded-lg ${publishResult.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {publishResult.ok ? '✓ ' : '✗ '}{publishResult.msg.split('\n')[0]}
            </div>
          )}
          <button
            onClick={publish}
            disabled={count === 0 || publishing}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              count > 0 ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            } disabled:opacity-60`}
          >
            {publishing ? 'Veröffentliche...' : `Veröffentlichen${count > 0 ? ` (${count})` : ''}`}
          </button>
          <button onClick={onLogout} class="text-sm text-gray-400 hover:text-gray-600 px-2 py-1">
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div class="bg-white border-b border-gray-200 px-6">
        <div class="flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              class={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main class="flex-1">
        {activeTab === 'slides' && city && <ImageManager city={city} imageType="slides" />}
        {activeTab === 'titelbild' && city && <ImageManager city={city} imageType="titelbild" />}
        {activeTab === 'why' && city && <ImageManager city={city} imageType="why" />}
        {activeTab === 'reviews' && city && <ReviewManager city={city} />}
        {activeTab === 'staedte' && (
          <CityManager onCitiesChange={(c) => {
            setCities(c);
            if (!c.includes(city)) setCity(c[0] ?? '');
          }} />
        )}
        {activeTab === 'faqs' && city && <FaqManager city={city} />}
        {activeTab === 'kalender' && <CalendarView />}
        {activeTab === 'bereinigung' && <CleanupManager cities={cities} />}
        {activeTab === 'partner' && <PartnerManager />}
      </main>
    </div>
  );
}
