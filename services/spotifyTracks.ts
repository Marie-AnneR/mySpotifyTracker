import { isTrackObject, toTrack } from '@/mappers/track';
import { fetchTopItems, TopItemsOptions } from '@/services/spotifyTop';
import { Track } from '@/types/models';

export function getTopTracks(options: TopItemsOptions = {}): Promise<Track[]> {
  return fetchTopItems('tracks', options, isTrackObject, toTrack);
}
