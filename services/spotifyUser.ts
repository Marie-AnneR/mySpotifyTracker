import { toUser } from '@/mappers/user';
import { spotifyFetch } from '@/services/spotifyClient';
import { User } from '@/types/models';
import { SpotifyUserObject } from '@/types/spotifyApi';

// accessToken optionnel : au callback, la session n'est pas encore stockée
export async function fetchCurrentUser(accessToken?: string): Promise<User> {
  const data = await spotifyFetch<SpotifyUserObject>('/me', { accessToken });
  return toUser(data);
}
