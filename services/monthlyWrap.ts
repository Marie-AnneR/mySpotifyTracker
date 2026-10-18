import { computePeriodStats, computeTopGenres, rank } from '@/lib/kpis/wrapped';
import { enrichArtistGenres } from '@/services/artistGenres';
import { getValidAccessToken } from '@/services/spotifyClient';
import { MonthlyWrap, MonthlyWrapData } from '@/types/kpis';

// Côté navigateur : récupère l'agrégat du mois depuis /api/wraps/monthly, enrichit les genres
// (cache local + Wikidata/MusicBrainz, comme le Wrapped Spotify) puis calcule les KPIs

const TOP_TRACKS_COUNT = 10;
const TOP_ARTISTS_COUNT = 10;
const TOP_GENRES_COUNT = 5;
const LATEST_LIKES_COUNT = 10;

// "2026-10" → "octobre 2026" (au milieu du mois pour éviter tout décalage de fuseau)
export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

// Mois courant au format "AAAA-MM"
export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function getMonthlyWrap(monthKey: string): Promise<MonthlyWrap> {
  const token = await getValidAccessToken();
  const response = await fetch(`/api/wraps/monthly?month=${encodeURIComponent(monthKey)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? `Erreur ${response.status}`);

  const { period, coverage, tracks, artists, likedTracks } = data as MonthlyWrapData;
  const { artists: enrichedArtists } = await enrichArtistGenres(artists);
  const topGenres = computeTopGenres(enrichedArtists, TOP_GENRES_COUNT);

  return {
    period,
    coverage,
    label: formatMonthLabel(period.key),
    topTracks: rank(tracks, TOP_TRACKS_COUNT),
    topArtists: rank(enrichedArtists, TOP_ARTISTS_COUNT),
    topGenres,
    genresAvailable: topGenres.length > 0,
    stats: computePeriodStats(tracks, enrichedArtists),
    likes: { count: likedTracks.length, latest: likedTracks.slice(0, LATEST_LIKES_COUNT) },
  };
}
