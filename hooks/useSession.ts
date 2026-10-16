'use client';

import { useSyncExternalStore } from 'react';
import { SESSION_CHANGE_EVENT, SESSION_STORAGE_KEY } from '@/services/spotifySession';
import { SpotifySession } from '@/types/spotify';

export type SessionState =
  // Rendu serveur / hydratation : le localStorage n'est pas encore lisible
  | { status: 'unknown' }
  | { status: 'loggedOut' }
  | { status: 'loggedIn'; session: SpotifySession };

// Valeur sentinelle côté serveur : permet de distinguer "pas encore lu" de "pas de session",
// et d'éviter d'afficher l'écran déconnecté une fraction de seconde à une personne connectée
const SERVER_SNAPSHOT = '__server__';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(SESSION_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(SESSION_CHANGE_EVENT, onChange);
  };
}

// Le snapshot doit être stable entre deux lectures : on renvoie la chaîne brute, parsée ensuite
const getSnapshot = () => localStorage.getItem(SESSION_STORAGE_KEY);
const getServerSnapshot = () => SERVER_SNAPSHOT;

export function useSession(): SessionState {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (raw === SERVER_SNAPSHOT) return { status: 'unknown' };
  if (!raw) return { status: 'loggedOut' };
  try {
    const session = JSON.parse(raw) as SpotifySession;
    return session?.user ? { status: 'loggedIn', session } : { status: 'loggedOut' };
  } catch {
    return { status: 'loggedOut' };
  }
}
