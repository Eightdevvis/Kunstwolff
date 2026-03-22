import { getFile } from './github';
import { addPendingFile, pendingFiles } from './state';

export const CALENDAR_BASE = 'public/calendar';
export const CATEGORIES_PATH = `${CALENDAR_BASE}/categories.json`;

// ── Typen ────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;       // ISO: "2026-03-16"
  time: number;       // 0–23
  location?: string;
  categoryId: string;
  actors: Actor[];
}

export type Actor = 'Jenny' | 'Gaby' | 'Papa';
export const ALL_ACTORS: Actor[] = ['Jenny', 'Gaby', 'Papa'];

export interface Category {
  id: string;
  title: string;
  color: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'auftrag',    title: 'Auftrag',    color: '#3b82f6' },
  { id: 'babysitter', title: 'Babysitter', color: '#10b981' },
  { id: 'turnier',    title: 'Turnier',    color: '#f59e0b' },
];

// ── Pfade ────────────────────────────────────────────────────────────────────

export function monthPath(year: number, month: number): string {
  return `${CALENDAR_BASE}/${year}/${String(month).padStart(2, '0')}.json`;
}

// ── Kategorien laden ─────────────────────────────────────────────────────────

export async function loadCategories(): Promise<{ categories: Category[]; sha: string | null }> {
  const pending = pendingFiles.value.get(CATEGORIES_PATH);
  if (pending) {
    return { categories: JSON.parse(pending.content), sha: pending.sha };
  }
  try {
    const file = await getFile(CATEGORIES_PATH);
    return { categories: JSON.parse(file.content), sha: file.sha };
  } catch {
    // Noch keine categories.json → Defaults zurückgeben
    return { categories: DEFAULT_CATEGORIES, sha: null };
  }
}

export function saveCategories(categories: Category[], sha: string | null) {
  addPendingFile(CATEGORIES_PATH, {
    content: JSON.stringify(categories, null, 2),
    sha,
    isBinary: false,
    commitMessage: 'admin: Kalender-Kategorien aktualisiert',
  });
}

// ── Events laden ─────────────────────────────────────────────────────────────

export async function loadEvents(year: number, month: number): Promise<{ events: CalendarEvent[]; sha: string | null }> {
  const path = monthPath(year, month);
  const pending = pendingFiles.value.get(path);
  if (pending) {
    return { events: JSON.parse(pending.content), sha: pending.sha };
  }
  try {
    const file = await getFile(path);
    return { events: JSON.parse(file.content), sha: file.sha };
  } catch {
    return { events: [], sha: null };
  }
}

export function saveEvents(year: number, month: number, events: CalendarEvent[], sha: string | null) {
  const path = monthPath(year, month);
  addPendingFile(path, {
    content: JSON.stringify(events, null, 2),
    sha,
    isBinary: false,
    commitMessage: `admin: Kalender ${year}/${String(month).padStart(2, '0')} aktualisiert`,
  });
}

// ── Hilfen ───────────────────────────────────────────────────────────────────

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function formatTime(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}
