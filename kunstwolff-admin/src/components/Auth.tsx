import { useState } from 'preact/hooks';
import { testConnection } from '../services/github';

interface Props {
  onAuth: () => void;
}

export function Auth({ onAuth }: Props) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setError('');
    localStorage.setItem('gh_pat', token.trim());

    try {
      const user = await testConnection();
      console.log('Eingeloggt als:', user.login);
      onAuth();
    } catch {
      setError('Verbindung fehlgeschlagen. PAT ungültig oder falsche Berechtigungen (benötigt: repo).');
      localStorage.removeItem('gh_pat');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-gray-900">Kunstwolff Admin</h1>
          <p class="text-gray-500 mt-2 text-sm">GitHub Personal Access Token eingeben</p>
        </div>

        <form onSubmit={handleSubmit} class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              GitHub PAT
            </label>
            <input
              type="password"
              value={token}
              onInput={(e) => setToken((e.target as HTMLInputElement).value)}
              placeholder="ghp_... oder github_pat_..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              autocomplete="off"
            />
            <p class="text-xs text-gray-400 mt-1">
              Benötigt <code class="bg-gray-100 px-1 rounded">repo</code>-Berechtigung. Wird nur in deinem Browser gespeichert.
            </p>
          </div>

          {error && (
            <div class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Verbinde...' : 'Verbinden'}
          </button>
        </form>

        <p class="text-xs text-gray-400 text-center mt-6">
          Token generieren unter GitHub → Settings → Developer settings → Personal access tokens
        </p>
      </div>
    </div>
  );
}
