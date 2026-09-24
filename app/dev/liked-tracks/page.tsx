'use client';

import { useEffect, useState } from 'react';
import { addedAt, groupByMonth } from '@/lib/timeline';
import { getLikedTracks } from '@/services/spotifyLikedTracks';
import { LikedTrack } from '@/types/models';

// Page de vérification réservée au dev : teste getLikedTracks et la timeline mensuelle (#11)
type Result = { likes: LikedTrack[]; durationMs: number } | { error: string };

export default function LikedTracksDevPage() {
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') return;

    const startedAt = performance.now();
    getLikedTracks({ onProgress: (loaded, total) => setProgress({ loaded, total }) })
      .then((likes) => setResult({ likes, durationMs: performance.now() - startedAt }))
      .catch((err) => setResult({ error: err.message }));
  }, []);

  if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') {
    return <p className="p-8">Page disponible uniquement en développement.</p>;
  }
  if (!result) {
    return (
      <p className="p-8">
        Chargement... {progress.total > 0 && `${progress.loaded} / ${progress.total}`}
      </p>
    );
  }
  if ('error' in result) return <p className="p-8 text-red-500">{result.error}</p>;
  if (result.likes.length === 0) return <p className="p-8">Aucun titre liké.</p>;

  const months = [...groupByMonth(result.likes, addedAt)];
  const maxCount = Math.max(...months.map(([, likes]) => likes.length));

  return (
    <div className="space-y-6 p-8">
      <p className="text-sm text-zinc-500">
        {result.likes.length} titres likés · chargés en {(result.durationMs / 1000).toFixed(1)}s
      </p>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Likes par mois</h2>
        <ul className="space-y-1 font-mono text-sm">
          {months.map(([month, likes]) => (
            <li key={month} className="flex items-center gap-2">
              <span className="w-20">{month}</span>
              <span
                className="h-3 bg-green-500"
                style={{ width: `${(likes.length / maxCount) * 300}px` }}
              />
              <span>{likes.length}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">10 derniers likes</h2>
        <ul className="space-y-1 text-sm">
          {result.likes.slice(0, 10).map((like) => (
            <li key={like.track.id}>
              <span className="text-zinc-500">
                {new Date(like.addedAtMs).toLocaleDateString('fr-FR')}
              </span>{' '}
              <strong>{like.track.name}</strong> –{' '}
              {like.track.artists.map((artist) => artist.name).join(', ')}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
