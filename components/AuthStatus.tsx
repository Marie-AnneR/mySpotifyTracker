'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import SpotifyLoginButton from '@/components/SpotifyLoginButton';
import {
  clearSession,
  SESSION_CHANGE_EVENT,
  SESSION_STORAGE_KEY,
} from '@/services/spotifySession';
import { SpotifySession } from '@/types/spotify';

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
const getServerSnapshot = () => null;

export default function AuthStatus() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  let session: SpotifySession | null = null;
  try {
    session = raw ? JSON.parse(raw) : null;
  } catch {
    session = null;
  }

  if (!session?.user) {
    return <SpotifyLoginButton />;
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {session.user.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- image distante Spotify, pas besoin d'optimisation
        <img
          src={session.user.imageUrl}
          alt=""
          className="h-10 w-10 rounded-full"
        />
      )}
      <p>
        Connecté en tant que <strong>{session.user.displayName}</strong>
      </p>
      <Link
        href="/wrapped"
        className="rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-400"
      >
        Voir mon Wrapped
      </Link>
      <button
        onClick={clearSession}
        className="rounded-full border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
      >
        Se déconnecter
      </button>
    </div>
  );
}
