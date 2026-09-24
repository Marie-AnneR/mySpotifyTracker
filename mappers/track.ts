import { isRecord, pickImageUrl, toSpotifyUrl } from '@/mappers/common';
import { Track } from '@/types/models';
import { SpotifyTrackObject } from '@/types/spotifyApi';

// Champs clés vérifiés : sans eux, un track n'est pas exploitable pour les KPI.
// Exclut notamment les épisodes de podcast et les fichiers locaux (sans id).
export function isTrackObject(item: unknown): item is SpotifyTrackObject {
  if (!isRecord(item) || !isRecord(item.album)) return false;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.duration_ms === 'number' &&
    Array.isArray(item.artists) &&
    item.artists.length > 0 &&
    typeof item.album.id === 'string' &&
    typeof item.album.name === 'string'
  );
}

export function toTrack(raw: SpotifyTrackObject): Track {
  return {
    id: raw.id,
    name: raw.name,
    artists: raw.artists.map(({ id, name }) => ({ id, name })),
    album: {
      id: raw.album.id,
      name: raw.album.name,
      imageUrl: pickImageUrl(raw.album.images),
      releaseDate: raw.album.release_date ?? null,
    },
    durationMs: raw.duration_ms,
    popularity: typeof raw.popularity === 'number' ? raw.popularity : null,
    explicit: raw.explicit ?? false,
    spotifyUrl: toSpotifyUrl(raw.external_urls),
  };
}
