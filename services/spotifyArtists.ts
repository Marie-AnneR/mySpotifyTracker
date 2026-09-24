import { isArtistObject, toArtist } from '@/mappers/artist';
import { fetchTopItems, TopItemsOptions } from '@/services/spotifyTop';
import { Artist } from '@/types/models';

export function getTopArtists(options: TopItemsOptions = {}): Promise<Artist[]> {
  return fetchTopItems('artists', options, isArtistObject, toArtist);
}
