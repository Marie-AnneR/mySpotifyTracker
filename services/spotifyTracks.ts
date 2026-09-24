import { fetchTopItems, TopItemsOptions } from '@/services/spotifyTop';
import { SpotifyTrackResponse, Track } from '@/types/track';

// Champs clés vérifiés : sans eux, un track n'est pas exploitable pour les KPI
function isValidTrack(item: unknown): item is SpotifyTrackResponse {
  if (typeof item !== 'object' || item === null) return false;
  const track = item as Record<string, unknown>;
  const album = track.album as Record<string, unknown> | undefined;
  return (
    typeof track.id === 'string' &&
    typeof track.name === 'string' &&
    typeof track.duration_ms === 'number' &&
    Array.isArray(track.artists) &&
    track.artists.length > 0 &&
    typeof album?.id === 'string' &&
    typeof album?.name === 'string'
  );
}

function toTrack(raw: SpotifyTrackResponse): Track {
  return {
    id: raw.id,
    name: raw.name,
    artists: raw.artists.map(({ id, name }) => ({ id, name })),
    album: {
      id: raw.album.id,
      name: raw.album.name,
      images: Array.isArray(raw.album.images) ? raw.album.images : [],
      releaseDate: raw.album.release_date ?? null,
    },
    durationMs: raw.duration_ms,
    popularity: typeof raw.popularity === 'number' ? raw.popularity : null,
    explicit: raw.explicit ?? false,
    spotifyUrl: raw.external_urls?.spotify ?? null,
  };
}

export function getTopTracks(options: TopItemsOptions = {}): Promise<Track[]> {
  return fetchTopItems('tracks', options, isValidTrack, toTrack);
}
