'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { enableAutoSnapshots } from '@/services/autoSnapshots';
import { exchangeCodeForToken } from '@/services/spotifyAuth';
import { AUTH_STORAGE_KEYS } from '@/services/spotifyAuthFlow';
import { saveSession } from '@/services/spotifySession';
import { fetchCurrentUser } from '@/services/spotifyUser';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  // Un code d'autorisation n'est utilisable qu'une fois : évite le double appel du StrictMode en dev
  const hasExchanged = useRef(false);

  const code = searchParams.get('code');
  const authError = searchParams.get('error');
  // Erreurs lisibles directement dans l'URL : calculées au rendu, pas besoin de state
  const paramError = authError
    ? `Spotify a refusé l'autorisation : ${authError}`
    : !code
      ? "Code d'autorisation manquant"
      : null;

  useEffect(() => {
    if (paramError) {
      console.error('[OAuth callback]', paramError);
      return;
    }
    if (hasExchanged.current || !code) return;
    hasExchanged.current = true;

    const verifier = localStorage.getItem(AUTH_STORAGE_KEYS.verifier);
    const expectedState = localStorage.getItem(AUTH_STORAGE_KEYS.state);
    const intent = localStorage.getItem(AUTH_STORAGE_KEYS.intent) ?? 'login';
    localStorage.removeItem(AUTH_STORAGE_KEYS.state);
    localStorage.removeItem(AUTH_STORAGE_KEYS.intent);
    if (!expectedState || searchParams.get('state') !== expectedState) {
      // Asynchrone pour respecter react-hooks/set-state-in-effect
      Promise.resolve().then(() =>
        setExchangeError('Paramètre state invalide, réessaie de te connecter')
      );
      return;
    }
    if (!verifier) {
      // Asynchrone pour respecter react-hooks/set-state-in-effect
      Promise.resolve().then(() =>
        setExchangeError('Code verifier introuvable, réessaie de te connecter')
      );
      return;
    }

    exchangeCodeForToken(code, verifier)
      .then(async (tokens) => {
        localStorage.removeItem(AUTH_STORAGE_KEYS.verifier);
        if (intent === 'auto-snapshots') {
          // Autorisation dédiée au serveur : le refresh token part en base (chiffré),
          // la session du navigateur reste intacte
          await enableAutoSnapshots(tokens.refreshToken);
        } else {
          const user = await fetchCurrentUser(tokens.accessToken);
          saveSession({ ...tokens, user });
        }
        // replace : l'URL contenant le code ne reste pas dans l'historique
        router.replace('/');
      })
      .catch((err) => {
        console.error('[OAuth callback]', err);
        setExchangeError(
          intent === 'auto-snapshots'
            ? `Activation des snapshots automatiques impossible : ${err.message}`
            : (err.message ?? "Échec de l'échange du token")
        );
      });
  }, [code, paramError, router, searchParams]);

  const error = paramError ?? exchangeError;
  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500">Erreur : {error}</p>
        <Link href="/" className="mt-4 inline-block underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }
  return <p className="p-8">Connexion à Spotify en cours...</p>;
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<p className="p-8">Chargement...</p>}>
      <CallbackContent />
    </Suspense>
  );
}
