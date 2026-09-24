import { SpotifyImage } from '@/types/spotify';

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
