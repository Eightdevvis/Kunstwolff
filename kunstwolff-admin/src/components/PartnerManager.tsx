import { useState, useEffect } from 'preact/hooks';
import { getFile, rawUrl } from '../services/github';
import { addPendingFile, pendingFiles } from '../services/state';

interface Partner {
  id: string;
  name: string;
  logo: string;       // URL-Pfad, z.B. "/img/partners/firma.webp"
  description: string;
  url: string;
  enabled?: boolean;
}

interface PartnersData {
  partners: Partner[];
}

const PARTNERS_PATH = 'public/partners/partners.json';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function PartnerManager() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [jsonSha, setJsonSha] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const pending = pendingFiles.value.get(PARTNERS_PATH);
      if (pending && !pending.isDeleted) {
        const data = JSON.parse(pending.content) as PartnersData;
        setPartners(data.partners ?? []);
        setJsonSha(pending.sha);
      } else {
        const file = await getFile(PARTNERS_PATH);
        const data = JSON.parse(file.content) as PartnersData;
        setPartners(data.partners ?? []);
        setJsonSha(file.sha);
      }
    } catch (e) {
      setError(`Fehler beim Laden: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function saveJson(newPartners: Partner[], sha: string | null = jsonSha) {
    const content = JSON.stringify({ partners: newPartners }, null, 2);
    addPendingFile(PARTNERS_PATH, {
      content,
      sha,
      isBinary: false,
      commitMessage: 'admin: Partner aktualisiert – partners.json',
    });
    setPartners(newPartners);
  }

  async function createPartner(
    fields: { name: string; url: string; description: string },
    logoFile: File | null
  ) {
    const id = slugify(fields.name) || `partner-${Date.now()}`;
    let logoPath = `/img/partners/${id}.png`;

    if (logoFile) {
      const ext = logoFile.name.split('.').pop()?.toLowerCase() ?? 'png';
      logoPath = `/img/partners/${id}.${ext}`;
      const b64 = await fileToBase64(logoFile);
      addPendingFile(`public/img/partners/${id}.${ext}`, {
        content: b64,
        sha: null,
        isBinary: true,
        commitMessage: `admin: Partner-Logo hochgeladen – ${id}.${ext}`,
      });
    }

    const partner: Partner = {
      id,
      name: fields.name,
      logo: logoPath,
      description: fields.description,
      url: fields.url,
      enabled: true,
    };

    saveJson([...partners, partner]);
    setShowNew(false);
  }

  async function updatePartner(
    updated: Partner,
    logoFile: File | null
  ) {
    let partner = { ...updated };

    if (logoFile) {
      const ext = logoFile.name.split('.').pop()?.toLowerCase() ?? 'png';
      const logoPath = `/img/partners/${partner.id}.${ext}`;
      const b64 = await fileToBase64(logoFile);
      addPendingFile(`public/img/partners/${partner.id}.${ext}`, {
        content: b64,
        sha: null,
        isBinary: true,
        commitMessage: `admin: Partner-Logo aktualisiert – ${partner.id}.${ext}`,
      });
      partner = { ...partner, logo: logoPath };
    }

    saveJson(partners.map((p) => (p.id === partner.id ? partner : p)));
    setEditing(null);
  }

  function deletePartner(id: string) {
    saveJson(partners.filter((p) => p.id !== id));
    setDeleteConfirm(null);
  }

  function toggleEnabled(id: string) {
    saveJson(partners.map((p) =>
      p.id === id ? { ...p, enabled: !(p.enabled ?? true) } : p
    ));
  }

  if (loading) return <div class="p-6 text-gray-500">Lade Partner...</div>;
  if (error) return (
    <div class="p-6">
      <div class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      <button onClick={load} class="mt-3 text-sm text-blue-600 hover:underline">Erneut versuchen</button>
    </div>
  );

  return (
    <div class="p-6 max-w-3xl">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-gray-900">Partner</h2>
        <button
          onClick={() => setShowNew(true)}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Neuer Partner
        </button>
      </div>

      {showNew && (
        <PartnerForm
          onSave={createPartner}
          onCancel={() => setShowNew(false)}
        />
      )}

      {partners.length === 0 && !showNew ? (
        <p class="text-gray-400 text-sm text-center py-8">Noch keine Partner eingetragen.</p>
      ) : (
        <div class="space-y-3">
          {partners.map((partner) => (
            <div
              key={partner.id}
              class={`border rounded-xl overflow-hidden ${
                partner.enabled === false ? 'border-gray-100 opacity-60' : 'border-gray-200'
              }`}
            >
              {editing === partner.id ? (
                <PartnerForm
                  initial={partner}
                  onSave={(fields, logo) => updatePartner({ ...partner, ...fields }, logo)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div class="p-4 flex items-start gap-4">
                  {/* Logo-Vorschau */}
                  <div class="w-16 h-16 shrink-0 rounded border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden">
                    <img
                      src={rawUrl(`public${partner.logo}`)}
                      alt={partner.name}
                      class="w-full h-full object-contain"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = 'none';
                        el.parentElement!.innerHTML = '<span class="text-xs text-gray-300">kein Logo</span>';
                      }}
                    />
                  </div>

                  {/* Infos */}
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                      <span class="font-medium text-gray-900">{partner.name}</span>
                      <span class="text-xs font-mono text-gray-400">{partner.id}</span>
                      {partner.enabled === false && (
                        <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Deaktiviert</span>
                      )}
                    </div>
                    <p class="text-sm text-gray-500 line-clamp-2">{partner.description}</p>
                    <p class="text-xs text-blue-500 truncate mt-1">{partner.url}</p>
                  </div>

                  {/* Aktionen */}
                  <div class="flex flex-col gap-1 shrink-0 text-right">
                    <button
                      onClick={() => setEditing(partner.id)}
                      class="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => toggleEnabled(partner.id)}
                      class="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-50"
                    >
                      {partner.enabled === false ? 'Aktivieren' : 'Deaktivieren'}
                    </button>
                    {deleteConfirm === partner.id ? (
                      <div class="flex gap-1 justify-end">
                        <button
                          onClick={() => deletePartner(partner.id)}
                          class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                        >
                          Löschen
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          class="text-xs text-gray-400 hover:text-gray-600 px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(partner.id)}
                        class="text-xs text-gray-400 hover:text-red-500 px-2 py-1"
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p class="text-xs text-gray-400 mt-6">
        {partners.filter((p) => p.enabled !== false).length} aktiv, {partners.filter((p) => p.enabled === false).length} deaktiviert
        · Quelle: <span class="font-mono">public/partners/partners.json</span>
        · Logos: <span class="font-mono">public/img/partners/</span>
      </p>
    </div>
  );
}

// ── Formular (Neu + Bearbeiten) ───────────────────────────────────────────────

function PartnerForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partner;
  onSave: (fields: { name: string; url: string; description: string }, logo: File | null) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  function handleLogoChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  }

  const isNew = !initial;
  const canSave = name.trim().length > 0 && url.trim().length > 0;

  return (
    <div class={`p-4 rounded-xl mb-4 space-y-3 ${isNew ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
      <h3 class={`font-medium ${isNew ? 'text-blue-900' : 'text-gray-800'}`}>
        {isNew ? 'Neuer Partner' : `Bearbeiten: ${initial!.name}`}
      </h3>

      <input
        type="text"
        value={name}
        onInput={(e) => setName((e.target as HTMLInputElement).value)}
        placeholder="Name des Partners *"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <input
        type="url"
        value={url}
        onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
        placeholder="Website-URL *  (https://...)"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <textarea
        value={description}
        onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
        placeholder="Kurzbeschreibung (optional)"
        rows={3}
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />

      {/* Logo-Upload */}
      <div class="flex items-center gap-3">
        <label class="flex-1">
          <span class="text-xs text-gray-600 block mb-1">
            {isNew ? 'Logo hochladen (optional)' : 'Logo ersetzen (optional)'}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            class="w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
          />
        </label>
        {logoPreview && (
          <img src={logoPreview} alt="Vorschau" class="w-12 h-12 object-contain rounded border border-gray-200 bg-white" />
        )}
        {!logoPreview && initial?.logo && (
          <img
            src={rawUrl(`public${initial.logo}`)}
            alt="Aktuell"
            class="w-12 h-12 object-contain rounded border border-gray-200 bg-white"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
      </div>

      {isNew && name.trim() && (
        <p class="text-xs text-gray-400">
          ID (Slug): <span class="font-mono">{slugify(name) || '...'}</span>
        </p>
      )}

      <div class="flex gap-2 pt-1">
        <button
          onClick={() => onSave({ name: name.trim(), url: url.trim(), description: description.trim() }, logoFile)}
          disabled={!canSave}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Speichern
        </button>
        <button
          onClick={onCancel}
          class="px-4 py-2 text-gray-600 text-sm hover:text-gray-800"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
