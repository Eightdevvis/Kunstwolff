import { useState, useEffect } from 'preact/hooks';
import { listDirectory, getFile } from '../services/github';
import { addPendingFile, pendingFiles } from '../services/state';
import { parseFrontmatter, serializeFrontmatter } from '../utils/markdown';

type Category = 'Schnellzeichner' | 'Szenenmaler';

interface Review {
  path: string;       // Repo-Pfad, z.B. public/reviews/frankfurt/review0.md
  filename: string;   // review0.md
  sha: string | null;
  author: string;
  categories: Category[];
  text: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface Props {
  city: string;
}

export function ReviewManager({ city }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null); // path
  const [showNew, setShowNew] = useState(false);
  const [newReview, setNewReview] = useState({ author: '', text: '', categories: [] as Category[] });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [city]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const dirPath = `public/reviews/${city}`;
      let entries: { name: string; path: string; sha: string }[] = [];
      try {
        entries = await listDirectory(dirPath) as typeof entries;
      } catch {
        // Noch keine Reviews für diese Stadt
      }

      const reviewFiles = entries.filter(
        (e) => e.name.startsWith('review') && e.name.endsWith('.md')
      );

      const loaded: Review[] = [];
      for (const entry of reviewFiles) {
        const repoPath = entry.path;
        // Ggf. aus pending laden
        const pending = pendingFiles.value.get(repoPath);
        const raw = pending ? pending.content : (await getFile(repoPath)).content;
        const sha = pending ? pending.sha : entry.sha;

        const { frontmatter, body } = parseFrontmatter(raw);
        if (pending?.isDeleted) continue; // gelöschte nicht anzeigen

        loaded.push({
          path: repoPath,
          filename: entry.name,
          sha,
          author: (frontmatter.author as string) ?? '',
          categories: ((frontmatter.categories as string[]) ?? []) as Category[],
          text: body,
        });
      }

      // Auch neue (nur in pending) anzeigen
      for (const [path, pending] of pendingFiles.value.entries()) {
        if (
          path.startsWith(`public/reviews/${city}/review`) &&
          !loaded.find((r) => r.path === path)
        ) {
          const { frontmatter, body } = parseFrontmatter(pending.content);
          loaded.push({
            path,
            filename: path.split('/').pop()!,
            sha: null,
            author: (frontmatter.author as string) ?? '',
            categories: ((frontmatter.categories as string[]) ?? []) as Category[],
            text: body,
            isNew: true,
          });
        }
      }

      setReviews(loaded);
    } catch (e) {
      setError(`Fehler: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function saveReview(review: Review) {
    const content = serializeFrontmatter(
      {
        author: review.author,
        categories: review.categories,
      },
      review.text
    );
    addPendingFile(review.path, {
      content,
      sha: review.sha,
      isBinary: false,
      commitMessage: `admin: Review aktualisiert - ${city}/${review.filename}`,
    });
    setReviews((rs) => rs.map((r) => (r.path === review.path ? review : r)));
    setEditing(null);
  }

  function createReview() {
    const existingNums = reviews
      .map((r) => parseInt(r.filename.replace('review', '').replace('.md', ''), 10))
      .filter((n) => !isNaN(n));
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 0;
    const filename = `review${nextNum}.md`;
    const path = `public/reviews/${city}/${filename}`;

    const review: Review = {
      path,
      filename,
      sha: null,
      author: newReview.author,
      categories: newReview.categories,
      text: newReview.text,
      isNew: true,
    };

    saveReview(review);
    setReviews((rs) => [...rs, review]);
    setNewReview({ author: '', text: '', categories: [] });
    setShowNew(false);
  }

  function markDeleted(review: Review) {
    addPendingFile(review.path, {
      content: '',
      sha: review.sha,
      isBinary: false,
      commitMessage: `admin: Review gelöscht - ${city}/${review.filename}`,
      isDeleted: true,
    });
    setReviews((rs) => rs.filter((r) => r.path !== review.path));
    setDeleteConfirm(null);
  }

  function toggleNewCat(cat: Category) {
    setNewReview((r) => ({
      ...r,
      categories: r.categories.includes(cat)
        ? r.categories.filter((c) => c !== cat)
        : [...r.categories, cat],
    }));
  }

  if (loading) return <div class="p-6 text-gray-500">Lade Reviews...</div>;
  if (error) return (
    <div class="p-6">
      <div class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      <button onClick={load} class="mt-3 text-sm text-blue-600 hover:underline">Erneut versuchen</button>
    </div>
  );

  return (
    <div class="p-6 max-w-3xl">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-gray-900">
          Reviews – <span class="font-mono text-blue-600">{city}</span>
        </h2>
        <button
          onClick={() => setShowNew(true)}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Neuer Review
        </button>
      </div>

      {/* Neuer Review */}
      {showNew && (
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 class="font-medium text-blue-900 mb-3">Neuer Review</h3>
          <div class="space-y-3">
            <input
              type="text"
              value={newReview.author}
              onInput={(e) => setNewReview((r) => ({ ...r, author: (e.target as HTMLInputElement).value }))}
              placeholder="Name der Person"
              class="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={newReview.text}
              onInput={(e) => setNewReview((r) => ({ ...r, text: (e.target as HTMLTextAreaElement).value }))}
              placeholder="Review-Text..."
              rows={4}
              class="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div class="flex gap-4">
              {(['Schnellzeichner', 'Szenenmaler'] as Category[]).map((cat) => (
                <label key={cat} class="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newReview.categories.includes(cat)}
                    onChange={() => toggleNewCat(cat)}
                    class="rounded"
                  />
                  {cat}
                </label>
              ))}
            </div>
            <div class="flex gap-2">
              <button
                onClick={createReview}
                disabled={!newReview.author.trim() || !newReview.text.trim()}
                class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Speichern
              </button>
              <button
                onClick={() => setShowNew(false)}
                class="px-4 py-2 text-gray-600 text-sm hover:text-gray-800"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review-Liste */}
      {reviews.length === 0 ? (
        <div class="text-center py-8">
            {city !== 'default' ? (
              <p class="text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 inline-block">
                Wird mit <strong>default</strong> zur Zeit aufgefüllt!
              </p>
            ) : (
              <p class="text-gray-400 text-sm">Keine Reviews vorhanden</p>
            )}
          </div>
      ) : (
        <div class="space-y-4">
          {reviews.map((review) => (
            <div key={review.path} class={`border rounded-xl overflow-hidden ${review.isNew ? 'border-blue-300' : 'border-gray-200'}`}>
              {editing === review.path ? (
                <EditReview
                  review={review}
                  onSave={saveReview}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div class="p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-medium text-gray-900">{review.author || '(kein Name)'}</span>
                        {review.isNew && (
                          <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Neu</span>
                        )}
                        {review.categories.map((c) => (
                          <span key={c} class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c}</span>
                        ))}
                      </div>
                      <p class="text-gray-600 text-sm line-clamp-2">{review.text}</p>
                      <p class="text-xs text-gray-400 mt-1 font-mono">{review.filename}</p>
                    </div>
                    <div class="flex gap-2 shrink-0">
                      <button
                        onClick={() => setEditing(review.path)}
                        class="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                      >
                        Bearbeiten
                      </button>
                      {deleteConfirm === review.path ? (
                        <>
                          <button
                            onClick={() => markDeleted(review)}
                            class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                          >
                            Löschen
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            class="text-xs text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(review.path)}
                          class="text-xs text-gray-400 hover:text-red-500 px-2 py-1"
                        >
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
        {reviews.length} Reviews · Änderungen werden beim "Veröffentlichen" gespeichert
      </p>
    </div>
  );
}

// ── Inline-Editor ─────────────────────────────────────────────────────────────

function EditReview({
  review,
  onSave,
  onCancel,
}: {
  review: Review;
  onSave: (r: Review) => void;
  onCancel: () => void;
}) {
  const [author, setAuthor] = useState(review.author);
  const [text, setText] = useState(review.text);
  const [cats, setCats] = useState<Category[]>(review.categories);

  function toggle(cat: Category) {
    setCats((c) => c.includes(cat) ? c.filter((x) => x !== cat) : [...c, cat]);
  }

  return (
    <div class="p-4 bg-gray-50 space-y-3">
      <input
        type="text"
        value={author}
        onInput={(e) => setAuthor((e.target as HTMLInputElement).value)}
        placeholder="Name"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        rows={4}
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
        <button
          onClick={() => onSave({ ...review, author, text, categories: cats })}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Speichern
        </button>
        <button onClick={onCancel} class="px-4 py-2 text-gray-600 text-sm hover:text-gray-800">
          Abbrechen
        </button>
      </div>
    </div>
  );
}
