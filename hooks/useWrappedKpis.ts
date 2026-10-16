'use client';

import { useCallback, useEffect, useState } from 'react';
import { SpotifyApiError } from '@/services/spotifyClient';
import { getWrappedKpis, WrappedResult } from '@/services/wrapped';

export type WrappedState =
  | { status: 'loading' }
  | { status: 'success'; kpis: WrappedResult }
  // Pas de session, ou session expirée et refresh impossible : il faut se (re)connecter
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string };

export function useWrappedKpis() {
  const [state, setState] = useState<WrappedState>({ status: 'loading' });
  // Incrémenté par retry() pour relancer l'effet
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Ignore une réponse arrivée après le démontage du composant
    let cancelled = false;

    getWrappedKpis()
      .then((kpis) => {
        if (!cancelled) setState({ status: 'success', kpis });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof SpotifyApiError && err.status === 401) {
          setState({ status: 'unauthenticated' });
        } else {
          setState({ status: 'error', message: err.message ?? 'Erreur inconnue' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}
