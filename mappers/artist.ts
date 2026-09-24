import { isRecord, pickImageUrl, toSpotifyUrl } from '@/mappers/common';
import { Artist } from '@/types/models';
import { SpotifyArtistObject } from '@/types/spotifyApi';

export function isArtistObject(item: unknown): item is SpotifyArtistObject {
  return isRecord(item) && typeof item.id === 'string' && typeof item.name === 'string';
}

export function toArtist(raw: SpotifyArtistObject): Artist {
  return {
    id: raw.id,
    name: raw.name,
    genres: Array.isArray(raw.genres) ? raw.genres : [],
    imageUrl: pickImageUrl(raw.images),
    popularity: typeof raw.popularity === 'number' ? raw.popularity : null,
    spotifyUrl: toSpotifyUrl(raw.external_urls),
  };
}
