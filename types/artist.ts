// Fenêtres temporelles natives de Spotify :
// short_term ≈ 4 dernières semaines, medium_term ≈ 6 derniers mois, long_term ≈ ~1 an
export const TIME_RANGES = ['short_term', 'medium_term', 'long_term'] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

export interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

// Forme brute renvoyée par l'API (GET /me/top/artists)
export interface SpotifyArtistResponse {
  id: string;
  name: string;
  genres?: string[];
  images?: SpotifyImage[];
  popularity?: number;
  external_urls?: { spotify?: string };
}

// Modèle interne utilisé par le reste de l'app (KPI, UI)
export interface Artist {
  id: string;
  name: string;
  genres: string[];
  images: SpotifyImage[];
  // null si Spotify ne fournit pas le champ
  popularity: number | null;
  spotifyUrl: string | null;
}
