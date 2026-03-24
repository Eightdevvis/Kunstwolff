import fs from 'fs';
import path from 'path';
import { getEvents } from './events';

export type NavigationLinkItem = {
  label: string;
  url: string;
  /* Markiert den Link als Call-to-Action-Button (gold pill) */
  cta?: boolean;
};

export type NavigationDropdownItem = {
  label: string;
  children: NavigationLinkItem[];
};

export type NavigationItem = NavigationLinkItem | NavigationDropdownItem;

type NavigationJson = {
  items?: unknown;
};

const navigationConfigPath = path.resolve('./public/navigation/navigation.json');

const defaultNavigation: NavigationItem[] = [
  {
    label: 'Home',
    children: [
      { label: 'Kunstwolff', url: '/' },
      { label: 'Schnellzeichner', url: '/schnellzeichner/' },
    ],
  },
  { label: 'Services', url: '#skills' },
  { label: 'Work', url: '#work' },
  { label: 'Anfrage', url: '#contact', cta: true },
];

const isDropdownItemWithLabel = (
  item: NavigationItem,
  label: string,
): item is NavigationDropdownItem => 'children' in item && item.label === label;

const buildEventsDropdownItem = (): NavigationDropdownItem | null => {
  const events = getEvents();
  if (events.length === 0) return null;

  const children = events.map((e) => ({
    label: e.title,
    url: e.link,
  }));

  return {
    label: 'Events',
    children,
  };
};

const addEventsDropdownNextToServices = (items: NavigationItem[]): NavigationItem[] => {
  const eventsItem = buildEventsDropdownItem();
  if (!eventsItem) return items;

  const existingEventsIndex = items.findIndex((item) => isDropdownItemWithLabel(item, eventsItem.label));
  const servicesIndex = items.findIndex((item) => item.label === 'Services');

  if (existingEventsIndex >= 0) {
    // Ersetze vorhandenes Events-Dropdown (falls es in navigation.json schon existiert).
    const next = [...items];
    next[existingEventsIndex] = eventsItem;
    return next;
  }

  const insertIndex = servicesIndex >= 0 ? servicesIndex + 1 : items.length;
  const next = [...items];
  next.splice(insertIndex, 0, eventsItem);
  return next;
};

const isString = (value: unknown): value is string => typeof value === 'string';

const normalizeText = (value: unknown): string => (isString(value) ? value.trim() : '');

const isValidLinkItem = (value: unknown): value is NavigationLinkItem => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  const label = normalizeText(record.label);
  const url = normalizeText(record.url);

  return Boolean(label && url);
};

const isValidDropdownItem = (value: unknown): value is NavigationDropdownItem => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  const label = normalizeText(record.label);

  if (!label || !Array.isArray(record.children)) {
    return false;
  }

  const children = record.children.filter(isValidLinkItem);
  return children.length > 0;
};

const normalizeItem = (value: unknown): NavigationItem | null => {
  if (isValidDropdownItem(value)) {
    const record = value as Record<string, unknown>;
    const children: NavigationLinkItem[] = (record.children as unknown[])
      .filter(isValidLinkItem)
      .map((item) => ({
        label: (item as NavigationLinkItem).label.trim(),
        url: (item as NavigationLinkItem).url.trim(),
      }));

    return {
      label: (record.label as string).trim(),
      children,
    };
  }

  if (isValidLinkItem(value)) {
    /* cta-Flag aus der JSON-Quelle übernehmen, falls vorhanden */
    const record = value as Record<string, unknown>;
    return {
      label: value.label.trim(),
      url: value.url.trim(),
      ...(record.cta === true && { cta: true }),
    };
  }

  return null;
};

const normalizeItems = (items: unknown): NavigationItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map(normalizeItem)
    .filter((item): item is NavigationItem => item !== null);
};

const parseNavigationContent = (raw: string): NavigationItem[] => {
  const parsed = JSON.parse(raw) as NavigationJson | unknown[];
  const source = Array.isArray(parsed) ? parsed : parsed.items;
  return normalizeItems(source);
};

export const getNavigationItems = (): NavigationItem[] => {
  let items: NavigationItem[] = defaultNavigation;

  if (!fs.existsSync(navigationConfigPath)) {
    return addEventsDropdownNextToServices(items);
  }

  try {
    const raw = fs.readFileSync(navigationConfigPath, 'utf-8');
    const parsed = parseNavigationContent(raw);
    if (parsed.length > 0) {
      items = parsed;
      return addEventsDropdownNextToServices(items);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`navigation: Could not parse navigation.json (${message}). Using defaults.`);
  }

  return addEventsDropdownNextToServices(items);
};
