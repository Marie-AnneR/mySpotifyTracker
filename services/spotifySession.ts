import { SpotifySession } from '@/types/spotify';

export const SESSION_STORAGE_KEY = 'spotify_session';

export function getStoredSession(): SpotifySession | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SpotifySession;
  } catch {
    return null;
  }
}

export function saveSession(session: SpotifySession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
