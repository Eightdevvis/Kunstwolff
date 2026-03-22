import { signal, computed } from '@preact/signals';

export interface PendingFile {
  content: string;       // base64 für Bilder, UTF-8 für Text
  sha: string | null;    // null = neue Datei
  isBinary: boolean;
  commitMessage: string;
  isDeleted?: boolean;   // true = Datei soll gelöscht werden
}

// Zentraler Draft-State – alle ungespeicherten Änderungen
export const pendingFiles = signal<Map<string, PendingFile>>(new Map());

export const pendingCount = computed(() => pendingFiles.value.size);

export function addPendingFile(path: string, file: PendingFile) {
  const next = new Map(pendingFiles.value);
  next.set(path, file);
  pendingFiles.value = next;
}

export function removePendingFile(path: string) {
  const next = new Map(pendingFiles.value);
  next.delete(path);
  pendingFiles.value = next;
}

export function clearPendingFiles() {
  pendingFiles.value = new Map();
}

export function hasPendingFile(path: string): boolean {
  return pendingFiles.value.has(path);
}
