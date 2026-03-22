import { useState } from 'preact/hooks';
import type { CalendarEvent, Category, Actor } from '../services/calendar';
import { ALL_ACTORS, generateId, formatTime } from '../services/calendar';

interface Props {
  event?: CalendarEvent;           // undefined = neues Event
  initialDate?: string;            // vorausgefülltes Datum beim Klick auf Tag
  categories: Category[];
  onSave: (event: CalendarEvent) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
  onCreateCategory: (cat: Category) => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#6b7280',
];

export function EventModal({ event, initialDate, categories, onSave, onDelete, onClose, onCreateCategory }: Props) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [date, setDate] = useState(event?.date ?? initialDate ?? '');
  const [time, setTime] = useState<number | null>(event?.time ?? null); // null = noch nicht gewählt
  const [location, setLocation] = useState(event?.location ?? '');
  const [categoryId, setCategoryId] = useState(event?.categoryId ?? categories[0]?.id ?? '');
  const [actors, setActors] = useState<Actor[]>(event?.actors ?? []);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false); // für Rot-Feedback

  // Neue Kategorie
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[5]);

  const errors = {
    title: !title.trim(),
    date: !date,
    time: time === null,
    location: !location.trim(),
    actors: actors.length === 0,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  function toggleActor(actor: Actor) {
    setActors((a) => a.includes(actor) ? a.filter((x) => x !== actor) : [...a, actor]);
  }

  function handleSave() {
    setSubmitted(true);
    if (hasErrors || time === null) return;
    onSave({
      id: event?.id ?? generateId(),
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      time,
      location: location.trim() || undefined,
      categoryId,
      actors,
    });
  }

  function handleCreateCategory() {
    if (!newCatTitle.trim()) return;
    const cat: Category = {
      id: newCatTitle.trim().toLowerCase().replace(/\s+/g, '-'),
      title: newCatTitle.trim(),
      color: newCatColor,
    };
    onCreateCategory(cat);
    setCategoryId(cat.id);
    setShowNewCat(false);
    setNewCatTitle('');
  }

  return (
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">
              {event ? 'Event bearbeiten' : 'Neues Event'}
            </h2>
            <button onClick={onClose} class="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>

          {/* Titel */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
            <input
              type="text"
              value={title}
              onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
              class={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${submitted && errors.title ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              autofocus
            />
            {submitted && errors.title && <p class="text-red-500 text-xs mt-1">Pflichtfeld</p>}
          </div>

          {/* Datum + Uhrzeit */}
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
              <input
                type="date"
                value={date}
                onInput={(e) => setDate((e.target as HTMLInputElement).value)}
                class={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${submitted && errors.date ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              {submitted && errors.date && <p class="text-red-500 text-xs mt-1">Pflichtfeld</p>}
            </div>
            <div class="w-32">
              <label class="block text-sm font-medium text-gray-700 mb-1">Uhrzeit *</label>
              <select
                value={time ?? ''}
                onChange={(e) => {
                  const v = (e.target as HTMLSelectElement).value;
                  setTime(v === '' ? null : parseInt(v));
                }}
                class={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${submitted && errors.time ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              >
                <option value="" disabled>-- Uhrzeit</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{formatTime(i)}</option>
                ))}
              </select>
              {submitted && errors.time && <p class="text-red-500 text-xs mt-1">Pflichtfeld</p>}
            </div>
          </div>

          {/* Ort */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ort *</label>
            <input
              type="text"
              value={location}
              onInput={(e) => setLocation((e.target as HTMLInputElement).value)}
              class={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${submitted && errors.location ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
            />
            {submitted && errors.location && <p class="text-red-500 text-xs mt-1">Pflichtfeld</p>}
          </div>

          {/* Kategorie */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
            {showNewCat ? (
              <div class="border border-blue-200 bg-blue-50 rounded-lg p-3 space-y-2">
                <p class="text-xs font-medium text-blue-800">Neue Kategorie</p>
                <input
                  type="text"
                  value={newCatTitle}
                  onInput={(e) => setNewCatTitle((e.target as HTMLInputElement).value)}
                  placeholder="Name"
                  class="w-full px-2 py-1.5 border border-blue-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div>
                  <p class="text-xs text-blue-700 mb-1">Farbe</p>
                  <div class="flex gap-1.5 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewCatColor(c)}
                        class={`w-6 h-6 rounded-full border-2 transition-transform ${newCatColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={newCatColor}
                      onInput={(e) => setNewCatColor((e.target as HTMLInputElement).value)}
                      class="w-6 h-6 rounded-full border border-gray-300 cursor-pointer"
                      title="Eigene Farbe"
                    />
                  </div>
                </div>
                <div class="flex gap-2">
                  <button
                    onClick={handleCreateCategory}
                    disabled={!newCatTitle.trim()}
                    class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Erstellen
                  </button>
                  <button onClick={() => setShowNewCat(false)} class="px-3 py-1 text-gray-500 text-xs hover:text-gray-700">
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <div class="flex gap-2">
                <select
                  value={categoryId}
                  onChange={(e) => {
                    const val = (e.target as HTMLSelectElement).value;
                    if (val === '__new__') { setShowNewCat(true); }
                    else setCategoryId(val);
                  }}
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.title}</option>
                  ))}
                  <option value="__new__">+ Neue Kategorie erstellen</option>
                </select>
                {/* Farb-Vorschau */}
                <div
                  class="w-10 rounded-lg border border-gray-200 shrink-0"
                  style={{ backgroundColor: categories.find((c) => c.id === categoryId)?.color ?? '#ccc' }}
                />
              </div>
            )}
          </div>

          {/* Akteure */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Akteure *</label>
            <div class={`flex gap-2 p-2 rounded-lg ${submitted && errors.actors ? 'bg-red-50 border border-red-500' : ''}`}>
              {ALL_ACTORS.map((actor) => (
                <button
                  key={actor}
                  onClick={() => toggleActor(actor)}
                  class={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    actors.includes(actor)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {actor}
                </button>
              ))}
            </div>
            {submitted && errors.actors && <p class="text-red-500 text-xs mt-1">Mindestens eine Person auswählen</p>}
          </div>

          {/* Beschreibung */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              value={description}
              onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
              placeholder="Optional"
              rows={3}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div class="flex items-center justify-between pt-2">
            <div>
              {event && onDelete && (
                deleteConfirm ? (
                  <div class="flex gap-2 items-center">
                    <span class="text-xs text-red-600">Wirklich löschen?</span>
                    <button onClick={() => onDelete(event.id)} class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Ja</button>
                    <button onClick={() => setDeleteConfirm(false)} class="text-xs text-gray-400 hover:text-gray-600">Nein</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(true)} class="text-sm text-red-500 hover:text-red-700">
                    Löschen
                  </button>
                )
              )}
            </div>
            <div class="flex gap-2">
              <button onClick={onClose} class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
