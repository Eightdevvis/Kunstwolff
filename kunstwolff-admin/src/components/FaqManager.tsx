import { useState, useEffect } from 'preact/hooks';
import { listDirectory, getFile } from '../services/github';
import { addPendingFile, pendingFiles } from '../services/state';
import { parseFrontmatter, serializeFrontmatter } from '../utils/markdown';

type Category = 'Schnellzeichner' | 'Szenenmaler';
type FaqMode = 'default' | 'city';

interface Faq {
  path: string;
  slug: string;         // Dateiname ohne .md
  sha: string | null;
  question: string;
  answer: string;
  categories: Category[];
  isNew?: boolean;
}

interface Props {
  city: string;
}


export function FaqManager({ city }: Props) {
  const [mode, setMode] = useState<FaqMode>('default');
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newFaq, setNewFaq] = useState({ slug: '', question: '', answer: '', categories: [] as Category[] });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [city, mode]);

  function dirPath() {
    return mode === 'default' ? 'public/faq/default' : `public/faq/${city}`;
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      let entries: { name: string; path: string; sha: string }[] = [];
      try {
        entries = await listDirectory(dirPath()) as typeof entries;
      } catch {
        // Noch keine FAQs
      }

      const faqFiles = entries.filter((e) => e.name.endsWith('.md') && e.name !== '_vorlage.md');
      const loaded: Faq[] = [];

      for (const entry of faqFiles) {
        const pending = pendingFiles.value.get(entry.path);
        if (pending?.isDeleted) continue;
        const raw = pending ? pending.content : (await getFile(entry.path)).content;
        const sha = pending ? pending.sha : entry.sha;
        const { frontmatter } = parseFrontmatter(raw);

        loaded.push({
          path: entry.path,
          slug: entry.name.replace('.md', ''),
          sha,
          question: (frontmatter.question as string) ?? '',
          answer: (frontmatter.answer as string) ?? '',
          categories: ((frontmatter.categories as string[]) ?? []) as Category[],
        });
      }

      // Neu angelegte aus pending dazunehmen
      for (const [path, pending] of pendingFiles.value.entries()) {
        if (path.startsWith(`${dirPath()}/`) && path.endsWith('.md') && !loaded.find((f) => f.path === path)) {
          const { frontmatter } = parseFrontmatter(pending.content);
          loaded.push({
            path,
            slug: path.split('/').pop()!.replace('.md', ''),
            sha: null,
            question: (frontmatter.question as string) ?? '',
            answer: (frontmatter.answer as string) ?? '',
            categories: ((frontmatter.categories as string[]) ?? []) as Category[],
            isNew: true,
          });
        }
      }

      setFaqs(loaded);
    } catch (e) {
      setError(`Fehler: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function saveFaq(faq: Faq) {
    const content = serializeFrontmatter(
      { question: faq.question, answer: faq.answer, categories: faq.categories },
      ''
    );
    addPendingFile(faq.path, {
      content,
      sha: faq.sha,
      isBinary: false,
      commitMessage: `admin: FAQ aktualisiert - ${faq.slug}`,
    });
    setFaqs((fs) => fs.map((f) => (f.path === faq.path ? faq : f)));
    setEditing(null);
  }

  function createFaq() {
    if (!newFaq.slug.trim() || !newFaq.question.trim()) return;
    const slug = newFaq.slug.trim().toLowerCase().replace(/\s+/g, '-');
    const path = `${dirPath()}/${slug}.md`;
    const faq: Faq = { path, slug, sha: null, question: newFaq.question, answer: newFaq.answer, categories: newFaq.categories, isNew: true };
    saveFaq(faq);
    setFaqs((fs) => [...fs, faq]);
    setNewFaq({ slug: '', question: '', answer: '', categories: [] });
    setShowNew(false);
  }

  function markDeleted(faq: Faq) {
    addPendingFile(faq.path, {
      content: '',
      sha: faq.sha,
      isBinary: false,
      commitMessage: `admin: FAQ gelöscht - ${faq.slug}`,
      isDeleted: true,
    });
    setFaqs((fs) => fs.filter((f) => f.path !== faq.path));
    setDeleteConfirm(null);
  }

  function toggleNewCat(cat: Category) {
    setNewFaq((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  }

  return (
    <div class="p-6 max-w-3xl">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900">FAQs</h2>
        <button
          onClick={() => setShowNew(true)}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Neue FAQ
        </button>
      </div>

      {/* Tabs */}
      <div class="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setMode('default')}
          class={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'default' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Standard-FAQs
        </button>
        <button
          onClick={() => setMode('city')}
          class={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'city' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {city}-FAQs
        </button>
      </div>

      {mode === 'default' && (
        <div class="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 mb-4">
          Standard-FAQs gelten für alle Städte ohne eigene FAQs.
        </div>
      )}
      {mode === 'city' && (
        <div class="bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg px-3 py-2 mb-4">
          Stadtspezifische FAQs überschreiben die Standard-FAQs komplett (kein Merge).
        </div>
      )}

      {/* Neue FAQ */}
      {showNew && (
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 class="font-medium text-blue-900 mb-3">Neue FAQ</h3>
          <div class="space-y-3">
            <input
              type="text"
              value={newFaq.slug}
              onInput={(e) => setNewFaq((f) => ({ ...f, slug: (e.target as HTMLInputElement).value }))}
              placeholder="Slug (z.B. parking, pricing)"
              class="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newFaq.question}
              onInput={(e) => setNewFaq((f) => ({ ...f, question: (e.target as HTMLInputElement).value }))}
              placeholder="Frage"
              class="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={newFaq.answer}
              onInput={(e) => setNewFaq((f) => ({ ...f, answer: (e.target as HTMLTextAreaElement).value }))}
              placeholder="Antwort"
              rows={3}
              class="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div class="flex gap-4">
              {(['Schnellzeichner', 'Szenenmaler'] as Category[]).map((cat) => (
                <label key={cat} class="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={newFaq.categories.includes(cat)} onChange={() => toggleNewCat(cat)} class="rounded" />
                  {cat}
                </label>
              ))}
            </div>
            <div class="flex gap-2">
              <button
                onClick={createFaq}
                disabled={!newFaq.slug.trim() || !newFaq.question.trim()}
                class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Erstellen
              </button>
              <button onClick={() => setShowNew(false)} class="px-4 py-2 text-gray-600 text-sm hover:text-gray-800">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div class="text-gray-500 text-sm">Lade FAQs...</div>
      ) : error ? (
        <div class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
      ) : faqs.length === 0 ? (
        <div class="text-center py-8">
            {mode === 'city' && city !== 'default' ? (
              <p class="text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 inline-block">
                Wird mit <strong>default</strong> zur Zeit aufgefüllt!
              </p>
            ) : (
              <p class="text-gray-400 text-sm">
                {mode === 'default' ? 'Keine Standard-FAQs gefunden' : `Keine FAQs für ${city}`}
              </p>
            )}
          </div>
      ) : (
        <div class="space-y-3">
          {faqs.map((faq) => (
            <div key={faq.path} class={`border rounded-xl overflow-hidden ${faq.isNew ? 'border-blue-300' : 'border-gray-200'}`}>
              {editing === faq.path ? (
                <EditFaq faq={faq} onSave={saveFaq} onCancel={() => setEditing(null)} />
              ) : (
                <div class="p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-medium text-gray-900 text-sm">{faq.question || '(keine Frage)'}</span>
                        {faq.isNew && <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Neu</span>}
                        {faq.categories.map((c) => (
                          <span key={c} class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c}</span>
                        ))}
                      </div>
                      <p class="text-gray-500 text-sm line-clamp-2">{faq.answer}</p>
                      <p class="text-xs text-gray-400 mt-1 font-mono">{faq.slug}.md</p>
                    </div>
                    <div class="flex gap-2 shrink-0">
                      <button onClick={() => setEditing(faq.path)} class="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">
                        Bearbeiten
                      </button>
                      {deleteConfirm === faq.path ? (
                        <>
                          <button onClick={() => markDeleted(faq)} class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Löschen</button>
                          <button onClick={() => setDeleteConfirm(null)} class="text-xs text-gray-400 hover:text-gray-600">✕</button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteConfirm(faq.path)} class="text-xs text-gray-400 hover:text-red-500 px-2 py-1">
                          Löschen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p class="text-xs text-gray-400 mt-4">
        {faqs.length} FAQs · Änderungen werden beim "Veröffentlichen" gespeichert
      </p>
    </div>
  );
}

function EditFaq({
  faq,
  onSave,
  onCancel,
}: {
  faq: Faq;
  onSave: (f: Faq) => void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);
  const [cats, setCats] = useState<Category[]>(faq.categories);

  function toggle(cat: Category) {
    setCats((c) => c.includes(cat) ? c.filter((x) => x !== cat) : [...c, cat]);
  }

  return (
    <div class="p-4 bg-gray-50 space-y-3">
      <input
        type="text"
        value={question}
        onInput={(e) => setQuestion((e.target as HTMLInputElement).value)}
        placeholder="Frage"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        value={answer}
        onInput={(e) => setAnswer((e.target as HTMLTextAreaElement).value)}
        rows={3}
        placeholder="Antwort"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      <div class="flex gap-4">
        {(['Schnellzeichner', 'Szenenmaler'] as Category[]).map((cat) => (
          <label key={cat} class="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={cats.includes(cat)} onChange={() => toggle(cat)} class="rounded" />
            {cat}
          </label>
        ))}
      </div>
      <div class="flex gap-2">
        <button onClick={() => onSave({ ...faq, question, answer, categories: cats })} class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Speichern
        </button>
        <button onClick={onCancel} class="px-4 py-2 text-gray-600 text-sm hover:text-gray-800">Abbrechen</button>
      </div>
    </div>
  );
}
