import { useState, useEffect } from 'preact/hooks';
import type { CalendarEvent, Category, Actor } from '../services/calendar';
import {
  ALL_ACTORS,
  loadEvents, saveEvents, loadCategories, saveCategories,
  DEFAULT_CATEGORIES,
} from '../services/calendar';
import { EventModal } from './EventModal';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Montag-basierter Wochentag (0=Mo … 6=So)
function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function CalendarView() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1–12
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsShaMemo, setEventsShaMemo] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [categoriesShaMemo, setCategoriesShaMemo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ event?: CalendarEvent; date?: string } | null>(null);
  const [actorFilter, setActorFilter] = useState<Actor | null>(null);

  useEffect(() => {
    loadAll();
  }, [year, month]);

  async function loadAll() {
    setLoading(true);
    const [evResult, catResult] = await Promise.all([
      loadEvents(year, month),
      loadCategories(),
    ]);
    setEvents(evResult.events);
    setEventsShaMemo(evResult.sha);
    setCategories(catResult.categories);
    setCategoriesShaMemo(catResult.sha);
    setLoading(false);
  }

  function handleSaveEvent(event: CalendarEvent) {
    const updated = events.find((e) => e.id === event.id)
      ? events.map((e) => (e.id === event.id ? event : e))
      : [...events, event];
    setEvents(updated);
    saveEvents(year, month, updated, eventsShaMemo);
    setModal(null);
  }

  function handleDeleteEvent(id: string) {
    const updated = events.filter((e) => e.id !== id);
    setEvents(updated);
    saveEvents(year, month, updated, eventsShaMemo);
    setModal(null);
  }

  function handleCreateCategory(cat: Category) {
    const updated = [...categories, cat];
    setCategories(updated);
    saveCategories(updated, categoriesShaMemo);
  }

  // Navigation
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  // Kalender-Grid aufbauen
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = weekdayIndex(firstDay); // Leer-Zellen am Anfang

  // Tage als Array: null = leere Zelle, number = Tag
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Auf volle Wochen auffüllen
  while (cells.length % 7 !== 0) cells.push(null);

  function eventsForDay(day: number): CalendarEvent[] {
    const dateStr = isoDate(year, month, day);
    return events
      .filter((e) => e.date === dateStr && (actorFilter === null || e.actors.includes(actorFilter)))
      .sort((a, b) => a.time - b.time);
  }

  function categoryColor(categoryId: string): string {
    return categories.find((c) => c.id === categoryId)?.color ?? '#6b7280';
  }

  const todayStr = isoDate(today.getFullYear(), today.getMonth() + 1, today.getDate());

  return (
    <div class="p-6">
      {/* Header: Navigation + Akteur-Filter */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Monats-Navigation */}
        <div class="flex items-center gap-3">
          <button onClick={prevMonth} class="p-2 rounded-lg hover:bg-gray-100 text-gray-600">‹</button>
          <div class="flex items-center gap-2">
            <span class="text-lg font-semibold text-gray-900 min-w-[7rem] text-center">
              {MONTHS[month - 1]}
            </span>
            {/* Jahr: klickbar zum direkten Editieren */}
            <input
              type="number"
              value={year}
              onInput={(e) => {
                const v = parseInt((e.target as HTMLInputElement).value);
                if (v > 1900 && v < 2100) setYear(v);
              }}
              class="w-16 text-center text-lg font-semibold text-gray-700 border-b border-gray-300 focus:outline-none focus:border-blue-500 bg-transparent"
            />
          </div>
          <button onClick={nextMonth} class="p-2 rounded-lg hover:bg-gray-100 text-gray-600">›</button>
        </div>

        {/* Akteur-Filter */}
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500">Filter:</span>
          <button
            onClick={() => setActorFilter(null)}
            class={`px-3 py-1 rounded-full text-sm border transition-colors ${
              actorFilter === null ? 'bg-gray-800 text-white border-gray-800' : 'text-gray-600 border-gray-300 hover:border-gray-500'
            }`}
          >
            Alle
          </button>
          {ALL_ACTORS.map((actor) => (
            <button
              key={actor}
              onClick={() => setActorFilter(actorFilter === actor ? null : actor)}
              class={`px-3 py-1 rounded-full text-sm border transition-colors ${
                actorFilter === actor ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300 hover:border-blue-400'
              }`}
            >
              {actor}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div class="text-gray-400 text-sm text-center py-16">Lade Kalender...</div>
      ) : (
        <div class="border border-gray-200 rounded-xl overflow-hidden">
          {/* Wochentag-Header */}
          <div class="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {WEEKDAYS.map((d) => (
              <div key={d} class="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
            ))}
          </div>

          {/* Tage-Grid */}
          <div class="grid grid-cols-7 divide-x divide-y divide-gray-100">
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} class="bg-gray-50 min-h-[80px]" />;
              }

              const dayEvents = eventsForDay(day);
              const dateStr = isoDate(year, month, day);
              const isToday = dateStr === todayStr;

              // Morgen-Events (< 12) oben, Nachmittag/Abend (>= 12) unten
              const morningEvents = dayEvents.filter((e) => e.time < 17);
              const afternoonEvents = dayEvents.filter((e) => e.time >= 17);

              return (
                <div
                  key={day}
                  class="min-h-[80px] p-1 cursor-pointer hover:bg-blue-50 transition-colors flex flex-col"
                  onClick={() => setModal({ date: dateStr })}
                >
                  {/* Tageszahl */}
                  <div class="flex justify-end mb-1">
                    <span class={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-blue-600 text-white' : 'text-gray-500'
                    }`}>
                      {day}
                    </span>
                  </div>

                  {/* Morgen-Events */}
                  <div class="space-y-0.5">
                    {morningEvents.map((ev) => (
                      <EventChip
                        key={ev.id}
                        event={ev}
                        color={categoryColor(ev.categoryId)}
                        onClick={(e) => { e.stopPropagation(); setModal({ event: ev }); }}
                      />
                    ))}
                  </div>

                  {/* Spacer drückt Nachmittag-Events nach unten */}
                  {afternoonEvents.length > 0 && <div class="flex-1" />}

                  {/* Nachmittag/Abend-Events */}
                  <div class="space-y-0.5">
                    {afternoonEvents.map((ev) => (
                      <EventChip
                        key={ev.id}
                        event={ev}
                        color={categoryColor(ev.categoryId)}
                        onClick={(e) => { e.stopPropagation(); setModal({ event: ev }); }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kategorie-Legende */}
      <div class="flex flex-wrap gap-3 mt-4">
        {categories.map((cat) => (
          <div key={cat.id} class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
            <span class="text-xs text-gray-600">{cat.title}</span>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <EventModal
          event={modal.event}
          initialDate={modal.date}
          categories={categories}
          onSave={handleSaveEvent}
          onDelete={modal.event ? handleDeleteEvent : undefined}
          onClose={() => setModal(null)}
          onCreateCategory={handleCreateCategory}
        />
      )}
    </div>
  );
}

// ── Event-Chip im Kalender ───────────────────────────────────────────────────

function EventChip({ event, color, onClick }: {
  event: CalendarEvent;
  color: string;
  onClick: (e: MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      class="text-white text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
      style={{ backgroundColor: color }}
      title={`${String(event.time).padStart(2, '0')}:00 – ${event.title}`}
    >
      {event.title}
    </div>
  );
}
