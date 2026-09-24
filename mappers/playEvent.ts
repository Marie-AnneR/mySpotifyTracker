import { isIsoDate, isRecord, toSpotifyUrl } from '@/mappers/common';
import { isTrackObject, toTrack } from '@/mappers/track';
import { PlayEvent } from '@/types/models';
import { SpotifyPlayHistoryObject } from '@/types/spotifyApi';

export function isPlayHistoryObject(item: unknown): item is SpotifyPlayHistoryObject {
  return isRecord(item) && isIsoDate(item.played_at) && isTrackObject(item.track);
}

export function toPlayEvent(raw: SpotifyPlayHistoryObject): PlayEvent {
  return {
    track: toTrack(raw.track),
    playedAt: raw.played_at,
    playedAtMs: Date.parse(raw.played_at),
    context: raw.context
      ? {
          type: raw.context.type,
          uri: raw.context.uri,
          spotifyUrl: toSpotifyUrl(raw.context.external_urls),
        }
      : null,
  };
}
