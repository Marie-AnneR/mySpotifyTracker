import { isIsoDate, isRecord } from '@/mappers/common';
import { isTrackObject, toTrack } from '@/mappers/track';
import { LikedTrack } from '@/types/models';
import { SpotifySavedTrackObject } from '@/types/spotifyApi';

export function isSavedTrackObject(item: unknown): item is SpotifySavedTrackObject {
  return isRecord(item) && isIsoDate(item.added_at) && isTrackObject(item.track);
}

export function toLikedTrack(raw: SpotifySavedTrackObject): LikedTrack {
  return {
    track: toTrack(raw.track),
    addedAt: raw.added_at,
    addedAtMs: Date.parse(raw.added_at),
  };
}
