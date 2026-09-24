import { SpotifyImage } from '@/types/spotify';

// Forme brute renvoyée par l'API (GET /me/top/tracks)
export interface SpotifyTrackResponse {
  id: string;
  name: string;
  duration_ms: number;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images?: SpotifyImage[];
    release_date?: string;
  };
  popularity?: number;
  explicit?: boolean;
  external_urls?: { spotify?: string };
}

// Référence légère : le détail d'un artiste passe par getTopArtists si besoin
export interface TrackArtist {
  id: string;
  name: string;
}

// Modèle interne utilisé par le reste de l'app (KPI, wrapped, UI)
export interface Track {
  id: string;
  name: string;
  // Ordre conservé : le premier est l'artiste principal, les suivants les featurings
  artists: TrackArtist[];
  album: {
    id: string;
    name: string;
    images: SpotifyImage[];
    // Format variable selon l'album : "2024", "2024-03" ou "2024-03-15"
    releaseDate: string | null;
  };
  durationMs: number;
  // null si Spotify ne fournit pas le champ
  popularity: number | null;
  explicit: boolean;
  spotifyUrl: string | null;
}
