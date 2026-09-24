export interface SpotifyUser {
  id: string;
  displayName: string;
  imageUrl: string | null;
}

// Objet de pagination renvoyé par les endpoints de liste Spotify
export interface SpotifyPage<T> {
  items: T[];
  next: string | null;
  previous: string | null;
  total: number;
  limit: number;
  offset: number;
}

export interface SpotifySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: SpotifyUser;
}
