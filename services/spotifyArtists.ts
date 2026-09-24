import { spotifyFetch } from '@/services/spotifyClient';
import { Artist, SpotifyArtistResponse, TIME_RANGES, TimeRange } from '@/types/artist';
import { SpotifyPage } from '@/types/spotify';

// Limite imposée par Spotify sur /me/top/*
const MAX_LIMIT = 50;

interface GetTopArtistsOptions {
  timeRange?: TimeRange;
  limit?: number;
  offset?: number;
}

function isValidArtist(item: unknown): item is SpotifyArtistResponse {
  if (typeof item !== 'object' || item === null) return false;
  const artist = item as Record<string, unknown>;
  return typeof artist.id === 'string' && typeof artist.name === 'string';
}

function toArtist(raw: SpotifyArtistResponse): Artist {
  return {
    id: raw.id,
    name: raw.name,
    // Champs optionnels : valeurs par défaut pour ne jamais propager undefined
    genres: Array.isArray(raw.genres) ? raw.genres : [],
    images: Array.isArray(raw.images) ? raw.images : [],
    popularity: typeof raw.popularity === 'number' ? raw.popularity : null,
    spotifyUrl: raw.external_urls?.spotify ?? null,
  };
}

export async function getTopArtists({
  timeRange = 'medium_term',
  limit = 20,
  offset = 0,
}: GetTopArtistsOptions = {}): Promise<Artist[]> {
  if (!TIME_RANGES.includes(timeRange)) {
    throw new RangeError(`time_range invalide : ${timeRange}`);
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new RangeError(`limit doit être un entier entre 1 et ${MAX_LIMIT} (reçu : ${limit})`);
  }

  const page = await spotifyFetch<SpotifyPage<unknown>>('/me/top/artists', {
    params: { time_range: timeRange, limit, offset },
  });

  if (!Array.isArray(page?.items)) {
    throw new Error('Réponse Spotify inattendue pour /me/top/artists : items manquant');
  }

  // Les items mal formés sont ignorés plutôt que de faire échouer toute la liste
  const validItems = page.items.filter(isValidArtist);
  if (validItems.length < page.items.length) {
    console.warn(
      `[getTopArtists] ${page.items.length - validItems.length} artiste(s) mal formé(s) ignoré(s)`
    );
  }

  return validItems.map(toArtist);
}
