import { computePeriodKpis, PeriodKpisOptions } from '@/lib/kpis/wrapped';
import { getTopArtists } from '@/services/spotifyArtists';
import { getTopTracks } from '@/services/spotifyTracks';
import { PeriodKpis, WrappedKpis } from '@/types/kpis';
import { TIME_RANGES, TimeRange } from '@/types/spotify';

// Maximum Spotify : on récupère tout pour que genres et stats soient calculés sur un échantillon large
const FETCH_LIMIT = 50;

async function getPeriodKpis(timeRange: TimeRange, options?: PeriodKpisOptions): Promise<PeriodKpis> {
  const [tracks, artists] = await Promise.all([
    getTopTracks({ timeRange, limit: FETCH_LIMIT }),
    getTopArtists({ timeRange, limit: FETCH_LIMIT }),
  ]);
  return computePeriodKpis(timeRange, tracks, artists, options);
}

// 6 appels en parallèle (2 endpoints × 3 périodes). Si un seul échoue, tout échoue :
// un Wrapped partiel serait trompeur.
export async function getWrappedKpis(options?: PeriodKpisOptions): Promise<WrappedKpis> {
  const periods = await Promise.all(
    TIME_RANGES.map((timeRange) => getPeriodKpis(timeRange, options))
  );

  return {
    generatedAt: new Date().toISOString(),
    periods: Object.fromEntries(
      periods.map((period) => [period.timeRange, period])
    ) as Record<TimeRange, PeriodKpis>,
  };
}
