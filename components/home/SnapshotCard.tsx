'use client';

import { useEffect, useState } from 'react';
import AutoSnapshotToggle from '@/components/home/AutoSnapshotToggle';
import KpiCard, { EmptyMessage } from '@/components/wrapped/KpiCard';
import { createSnapshot, listSnapshots, SnapshotRunSummary } from '@/services/snapshots';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

type Status =
  | { type: 'loading' }
  | { type: 'idle' }
  | { type: 'saving' }
  | { type: 'saved' }
  | { type: 'error'; message: string };

// Snapshot manuel (#16) : photo datée des tops et des likes, enregistrée en base
export default function SnapshotCard() {
  const [latest, setLatest] = useState<SnapshotRunSummary | null>(null);
  const [status, setStatus] = useState<Status>({ type: 'loading' });

  useEffect(() => {
    listSnapshots()
      .then((runs) => {
        setLatest(runs[0] ?? null);
        setStatus({ type: 'idle' });
      })
      .catch((err) => setStatus({ type: 'error', message: err.message }));
  }, []);

  const handleSave = async () => {
    setStatus({ type: 'saving' });
    try {
      setLatest(await createSnapshot());
      setStatus({ type: 'saved' });
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Erreur inconnue' });
    }
  };

  return (
    <KpiCard
      title="Snapshots"
      subtitle="Une photo datée de tes tops et de tes likes, pour suivre leur évolution"
    >
      {status.type === 'loading' ? (
        <EmptyMessage>Chargement…</EmptyMessage>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            {latest ? (
              <>
                Dernier snapshot : <strong>{formatDateTime(latest.createdAt)}</strong>
                <span className="block text-zinc-500 dark:text-zinc-400">
                  {latest.topTracksCount} titres · {latest.topArtistsCount} artistes ·{' '}
                  {latest.likedTracksCount} likes
                </span>
              </>
            ) : (
              'Aucun snapshot pour le moment.'
            )}
          </p>

          <button
            onClick={handleSave}
            disabled={status.type === 'saving'}
            className="w-full rounded-full border border-green-500 px-4 py-2 font-semibold text-green-600 hover:bg-green-500/10 disabled:opacity-50 dark:text-green-400"
          >
            {status.type === 'saving' ? 'Enregistrement…' : 'Enregistrer un snapshot'}
          </button>

          {status.type === 'saved' && (
            <p role="status" className="text-center text-sm text-green-600 dark:text-green-400">
              Snapshot enregistré ✓
            </p>
          )}
          {status.type === 'error' && (
            <p role="alert" className="text-center text-sm text-red-500">
              {status.message}
            </p>
          )}

          <AutoSnapshotToggle />
        </div>
      )}
    </KpiCard>
  );
}
