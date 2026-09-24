import { pickImageUrl } from '@/mappers/common';
import { User } from '@/types/models';
import { SpotifyUserObject } from '@/types/spotifyApi';

export function toUser(raw: SpotifyUserObject): User {
  return {
    id: raw.id,
    // display_name peut être null : on retombe sur l'identifiant Spotify
    displayName: raw.display_name ?? raw.id,
    imageUrl: pickImageUrl(raw.images),
  };
}
