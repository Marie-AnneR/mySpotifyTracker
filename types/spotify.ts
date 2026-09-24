export interface SpotifyUser {
  id: string;
  displayName: string;
  imageUrl: string | null;
}

// Fenêtres temporelles natives de Spotify :
// short_term ≈ 4 dernières semaines, medium_term ≈ 6 derniers mois, long_term ≈ ~1 an
export const TIME_RANGES = ['short_term', 'medium_term', 'long_term'] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

export interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
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
