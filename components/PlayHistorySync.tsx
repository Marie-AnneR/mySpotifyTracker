'use client';

import { useEffect } from 'react';
import { syncPlayHistory } from '@/services/playHistory';
import { getStoredSession } from '@/services/spotifySession';

// Synchronise l'historique d'écoute à chaque ouverture de l'app, sans rien afficher
export default function PlayHistorySync() {
  useEffect(() => {
    if (!getStoredSession()) return;
    syncPlayHistory().catch((err) => console.error('[PlayHistorySync]', err));
  }, []);

  return null;
}
