'use client';

import { useEffect, useState } from 'react';
import {
  AutoSnapshotStatus,
  disableAutoSnapshots,
  getAutoSnapshotStatus,
} from '@/services/autoSnapshots';
import { startSpotifyAuthorization } from '@/services/spotifyAuthFlow';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

// Snapshots automatiques (opt-in) : chaque lundi, via Vercel Cron
export default function AutoSnapshotToggle() {
  const [status, setStatus] = useState<AutoSnapshotStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAutoSnapshotStatus()
      .then(setStatus)
      .catch((err) => setError(err.message));
  }, []);

  // Activation = autorisation Spotify dédiée au serveur : aller-retour vers Spotify,
  // puis la page de callback enregistre le token et revient ici
  const handleEnable = () => {
    setBusy(true);
    startSpotifyAuthorization('auto-snapshots');
  };

  const handleDisable = async () => {
    setBusy(true);
    setError(null);
    try {
      setStatus(await disableAutoSnapshots());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setBusy(false);
    }
  };

  if (!status && !error) return null;

  // Ligne existante mais désactivée après un échec définitif (token révoqué…)
  const needsReauth = status !== null && !status.enabled && status.lastError !== null;

  return (
    <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <p className="text-sm font-semibold">Snapshot automatique chaque lundi</p>

      {status?.enabled ? (
        <>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            ✅ Activé
            {status.lastRunAt && ` · dernier passage : ${formatDateTime(status.lastRunAt)}`}
          </p>
          {status.lastError && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Dernier essai en échec : {status.lastError}
            </p>
          )}
          <button
            onClick={handleDisable}
            disabled={busy}
            className="text-sm text-zinc-500 underline disabled:opacity-50 dark:text-zinc-400"
          >
            Désactiver (supprime l&apos;autorisation enregistrée)
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {needsReauth
              ? `⚠️ Désactivé : ${status.lastError}`
              : 'Une autorisation Spotify supplémentaire est demandée pour agir sans que tu sois connectée. Elle est chiffrée et supprimée si tu désactives.'}
          </p>
          <button
            onClick={handleEnable}
            disabled={busy}
            className="w-full rounded-full bg-green-500 px-4 py-2 font-semibold text-black hover:bg-green-400 disabled:opacity-50"
          >
            {needsReauth ? 'Réactiver' : 'Activer'}
          </button>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
