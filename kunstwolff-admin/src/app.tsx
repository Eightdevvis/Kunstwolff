import { useState, useEffect } from 'preact/hooks';
import { testConnection } from './services/github';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = prüft noch

  useEffect(() => {
    const pat = localStorage.getItem('gh_pat');
    if (!pat) {
      setAuthed(false);
      return;
    }
    testConnection()
      .then(() => setAuthed(true))
      .catch(() => {
        localStorage.removeItem('gh_pat');
        setAuthed(false);
      });
  }, []);

  function handleLogout() {
    localStorage.removeItem('gh_pat');
    setAuthed(false);
  }

  if (authed === null) {
    return (
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-gray-400">Verbinde...</div>
      </div>
    );
  }

  if (!authed) {
    return <Auth onAuth={() => setAuthed(true)} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}
