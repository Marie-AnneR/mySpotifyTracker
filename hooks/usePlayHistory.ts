'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  parsePlayHistory,
  PLAY_HISTORY_CHANGE_EVENT,
  playHistoryStorageKey,
} from '@/services/playHistory';
import { PlayEvent } from '@/types/models';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(PLAY_HISTORY_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(PLAY_HISTORY_CHANGE_EVENT, onChange);
  };
}

// Historique d'écoute accumulé, mis à jour automatiquement après chaque synchro.
// Trié du plus récent au plus ancien (ordre de sauvegarde).
export function usePlayHistory(userId: string): PlayEvent[] {
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(playHistoryStorageKey(userId)),
    () => null
  );
  // Parsé seulement quand le contenu change (l'historique peut contenir des milliers d'écoutes)
  return useMemo(() => parsePlayHistory(raw), [raw]);
}
