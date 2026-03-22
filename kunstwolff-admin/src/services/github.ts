import { decodeText, encodeText, encodeArrayBuffer } from '../utils/encoding';

const BASE_URL = 'https://api.github.com';

export const REPO_CONFIG = {
  owner: import.meta.env.VITE_REPO_OWNER ?? 'eightdevvis',
  repo: import.meta.env.VITE_REPO_NAME ?? 'Kunstwolffwebsite',
  branch: import.meta.env.VITE_REPO_BRANCH ?? 'main',
};

function getToken(): string {
  return localStorage.getItem('gh_pat') ?? '';
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${getToken()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers(), ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`GitHub API ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function testConnection(): Promise<{ login: string }> {
  // /user ist bei Fine-grained tokens ohne Account-Berechtigung gesperrt –
  // stattdessen das Repo selbst abfragen, das reicht als Auth-Test
  await apiFetch(`/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}`);
  return { login: REPO_CONFIG.owner };
}

// ── Datei lesen ─────────────────────────────────────────────────────────────

export interface FileInfo {
  sha: string;
  content: string; // dekodierter Textinhalt
  path: string;
}

export async function getFile(path: string): Promise<FileInfo> {
  const data = await apiFetch<{ sha: string; content: string; path: string }>(
    `/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/contents/${path}`
  );
  return {
    sha: data.sha,
    content: decodeText(data.content),
    path: data.path,
  };
}

// ── Verzeichnis lesen ────────────────────────────────────────────────────────

export interface DirEntry {
  name: string;
  path: string;
  sha: string;
  type: 'file' | 'dir';
}

export async function listDirectory(path: string): Promise<DirEntry[]> {
  const data = await apiFetch<DirEntry[]>(
    `/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/contents/${path}`
  );
  return data;
}

// ── Datei schreiben (Text) ────────────────────────────────────────────────────

export async function putFile(
  path: string,
  content: string,
  sha: string | null,
  message: string
): Promise<void> {
  const body: Record<string, string> = {
    message,
    content: encodeText(content),
    branch: REPO_CONFIG.branch,
  };
  if (sha) body.sha = sha;

  await apiFetch(`/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── Bild hochladen (Binär) ────────────────────────────────────────────────────

export async function putBinaryFile(
  path: string,
  buffer: ArrayBuffer,
  sha: string | null,
  message: string
): Promise<void> {
  const body: Record<string, string> = {
    message,
    content: encodeArrayBuffer(buffer),
    branch: REPO_CONFIG.branch,
  };
  if (sha) body.sha = sha;

  await apiFetch(`/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── Datei löschen ────────────────────────────────────────────────────────────

export async function deleteFile(path: string, sha: string, message: string): Promise<void> {
  await apiFetch(`/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/contents/${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sha, branch: REPO_CONFIG.branch }),
  });
}

// ── Raw-URL für Bild-Thumbnails ────────────────────────────────────────────────

export function rawUrl(path: string): string {
  return `https://raw.githubusercontent.com/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/${REPO_CONFIG.branch}/${path}`;
}
