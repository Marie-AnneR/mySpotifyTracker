import { fetchTopItems, TopItemsOptions } from '@/services/spotifyTop';
import { Artist, SpotifyArtistResponse } from '@/types/artist';

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

export function getTopArtists(options: TopItemsOptions = {}): Promise<Artist[]> {
  return fetchTopItems('artists', options, isValidArtist, toArtist);
}
