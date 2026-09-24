'use client';

import { useEffect, useState } from 'react';
import { getTopTracks } from '@/services/spotifyTracks';
import { TIME_RANGES, TimeRange } from '@/types/spotify';
import { Track } from '@/types/track';

// Page de vérification réservée au dev : teste getTopTracks sur les 3 périodes (#9)
type Result = { tracks: Track[] } | { error: string };

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export default function TopTracksDevPage() {
  const [results, setResults] = useState<Partial<Record<TimeRange, Result>>>({});

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') return;

    for (const timeRange of TIME_RANGES) {
      getTopTracks({ timeRange, limit: 10 })
        .then((tracks) => setResults((prev) => ({ ...prev, [timeRange]: { tracks } })))
        .catch((err) =>
          setResults((prev) => ({ ...prev, [timeRange]: { error: err.message } }))
        );
    }
  }, []);

  if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') {
    return <p className="p-8">Page disponible uniquement en développement.</p>;
  }

  return (
    <div className="grid gap-8 p-8 md:grid-cols-3">
      {TIME_RANGES.map((timeRange) => {
        const result = results[timeRange];
        return (
          <section key={timeRange}>
            <h2 className="mb-4 text-xl font-semibold">{timeRange}</h2>
            {!result && <p>Chargement...</p>}
            {result && 'error' in result && <p className="text-red-500">{result.error}</p>}
            {result && 'tracks' in result && (
              <ol className="list-decimal space-y-2 pl-5">
                {result.tracks.map((track) => (
                  <li key={track.id}>
                    <strong>{track.name}</strong>
                    <span className="block text-sm">
                      {track.artists.map((artist) => artist.name).join(', ')}
                    </span>
                    <span className="block text-sm text-zinc-500">
                      {track.album.name} · {formatDuration(track.durationMs)} · popularité :{' '}
                      {track.popularity ?? 'n/a'}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
