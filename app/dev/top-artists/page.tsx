'use client';

import { useEffect, useState } from 'react';
import { getTopArtists } from '@/services/spotifyArtists';
import { Artist } from '@/types/models';
import { TIME_RANGES, TimeRange } from '@/types/spotify';

// Page de vérification réservée au dev : teste getTopArtists sur les 3 périodes (#8)
type Result = { artists: Artist[] } | { error: string };

export default function TopArtistsDevPage() {
  const [results, setResults] = useState<Partial<Record<TimeRange, Result>>>({});

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') return;

    for (const timeRange of TIME_RANGES) {
      getTopArtists({ timeRange, limit: 10 })
        .then((artists) => setResults((prev) => ({ ...prev, [timeRange]: { artists } })))
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
            {result && 'artists' in result && (
              <ol className="list-decimal space-y-2 pl-5">
                {result.artists.map((artist) => (
                  <li key={artist.id}>
                    <strong>{artist.name}</strong>
                    <span className="block text-sm text-zinc-500">
                      popularité : {artist.popularity ?? 'n/a'} · genres :{' '}
                      {artist.genres.join(', ') || 'n/a'} · image : {artist.imageUrl ? 'oui' : 'non'}
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
