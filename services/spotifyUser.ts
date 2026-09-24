import { spotifyFetch } from '@/services/spotifyClient';
import { SpotifyUser } from '@/types/spotify';

interface SpotifyUserResponse {
  id: string;
  display_name: string | null;
  images?: { url: string }[];
}

// accessToken optionnel : au callback, la session n'est pas encore stockée
export async function fetchCurrentUser(accessToken?: string): Promise<SpotifyUser> {
  const data = await spotifyFetch<SpotifyUserResponse>('/me', { accessToken });

  return {
    id: data.id,
    displayName: data.display_name ?? data.id,
    imageUrl: data.images?.[0]?.url ?? null,
  };
}
