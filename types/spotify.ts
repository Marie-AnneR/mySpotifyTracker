export interface SpotifyUser {
  id: string;
  displayName: string;
  imageUrl: string | null;
}

export interface SpotifySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: SpotifyUser;
}
