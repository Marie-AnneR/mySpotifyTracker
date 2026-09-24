'use client';

import { useEffect, useState } from 'react';
import { filterLastDays, getCoveredRange, groupByDay, playedAt } from '@/lib/timeline';
import { syncPlayHistory, SyncResult } from '@/services/playHistory';

// Page de vérification réservée au dev : historique accumulé (#11) et helpers temporels (#10)
type Result = SyncResult | { error: string };

const formatDateTime = (ms: number) =>
  new Date(ms).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function RecentlyPlayedDevPage() {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') return;

    syncPlayHistory()
      .then(setResult)
      .catch((err) => setResult({ error: err.message }));
  }, []);

  if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') {
    return <p className="p-8">Page disponible uniquement en développement.</p>;
  }
  if (!result) return <p className="p-8">Chargement...</p>;
  if ('error' in result) return <p className="p-8 text-red-500">{result.error}</p>;
  if (result.plays.length === 0) {
    return <p className="p-8">Aucune écoute récente exploitable.</p>;
  }

  const range = getCoveredRange(result.plays, playedAt);
  const lastWeek = filterLastDays(result.plays, playedAt, 7);

  return (
    <div className="space-y-6 p-8">
      <p className="text-sm text-zinc-500">
        {result.plays.length} écoutes en historique (+{result.added} à cette synchro) ·{' '}
        {lastWeek.length} sur les 7 derniers jours
        {range && ` · du ${formatDateTime(range.from)} au ${formatDateTime(range.to)}`}
      </p>
      {result.hasGap && (
        <p className="text-sm text-amber-600">
          Plus de 50 écoutes depuis la dernière synchro : certaines ont pu être manquées.
        </p>
      )}
      {[...groupByDay(result.plays, playedAt)].map(([day, plays]) => (
        <section key={day}>
          <h2 className="mb-2 text-lg font-semibold">
            {day} ({plays.length})
          </h2>
          <ul className="space-y-1">
            {plays.map((play) => (
              <li key={play.playedAt} className="text-sm">
                <span className="text-zinc-500">{formatTime(play.playedAtMs)}</span>{' '}
                <strong>{play.track.name}</strong> –{' '}
                {play.track.artists.map((artist) => artist.name).join(', ')}
                {play.context && (
                  <span className="text-zinc-500"> · via {play.context.type}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
