'use client';

import { useEffect, useState } from 'react';
import { getWrappedKpis } from '@/services/wrapped';
import { WrappedKpis } from '@/types/kpis';
import { TIME_RANGES } from '@/types/spotify';

// Page de vérification réservée au dev : KPIs Wrapped V1 sur les 3 périodes (#13)
type Result = { kpis: WrappedKpis } | { error: string };

export default function WrappedDevPage() {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') return;

    getWrappedKpis()
      .then((kpis) => setResult({ kpis }))
      .catch((err) => setResult({ error: err.message }));
  }, []);

  if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') {
    return <p className="p-8">Page disponible uniquement en développement.</p>;
  }
  if (!result) return <p className="p-8">Calcul des KPIs...</p>;
  if ('error' in result) return <p className="p-8 text-red-500">{result.error}</p>;

  return (
    <div className="grid gap-8 p-8 lg:grid-cols-3">
      {TIME_RANGES.map((timeRange) => {
        const period = result.kpis.periods[timeRange];
        return (
          <section key={timeRange} className="space-y-4">
            <h2 className="text-xl font-semibold">{period.label}</h2>

            <dl className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <dt className="text-zinc-500">Mainstream</dt>
                <dd className="text-lg font-semibold">
                  {period.stats.mainstreamScore ?? 'n/a'}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Genres</dt>
                <dd className="text-lg font-semibold">{period.stats.distinctGenres}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Artistes</dt>
                <dd className="text-lg font-semibold">
                  {period.stats.distinctArtistsInTopTracks}
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="font-semibold">Top genres</h3>
              {period.genresAvailable ? (
                <ol className="list-decimal pl-5 text-sm">
                  {period.topGenres.map((genre) => (
                    <li key={genre.genre}>
                      <strong>{genre.genre}</strong> · {Math.round(genre.share * 100)} % (
                      {genre.artistCount} artistes) · {genre.topArtistNames.join(', ')}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-zinc-500">Genres non fournis par Spotify.</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold">Top artistes</h3>
              <ol className="list-decimal pl-5 text-sm">
                {period.topArtists.map(({ rank, item }) => (
                  <li key={item.id} value={rank}>
                    {item.name}
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="font-semibold">Top titres</h3>
              <ol className="list-decimal pl-5 text-sm">
                {period.topTracks.map(({ rank, item }) => (
                  <li key={item.id} value={rank}>
                    {item.name} – {item.artists.map((artist) => artist.name).join(', ')}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        );
      })}
    </div>
  );
}
