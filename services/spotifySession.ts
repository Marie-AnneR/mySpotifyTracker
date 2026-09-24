import { SpotifySession } from '@/types/spotify';

export const SESSION_STORAGE_KEY = 'spotify_session';
// L'événement "storage" ne se déclenche que dans les autres onglets : on notifie l'onglet courant nous-mêmes
export const SESSION_CHANGE_EVENT = 'spotify-session-change';

function notifySessionChange() {
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

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
  notifySessionChange();
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  notifySessionChange();
}
