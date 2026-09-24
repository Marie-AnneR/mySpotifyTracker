import { SpotifyTrackResponse, Track } from '@/types/track';

// Forme brute d'un item de GET /me/player/recently-played
export interface SpotifyPlayHistoryResponse {
  track: SpotifyTrackResponse;
  // ISO 8601 en UTC, ex. "2026-09-24T18:42:10.123Z"
  played_at: string;
  // null si l'écoute ne vient pas d'un album/playlist/artiste (ex. recherche directe)
  context: {
    type: string;
    uri: string;
    external_urls?: { spotify?: string };
  } | null;
}

export interface PlayContext {
  // "album" | "artist" | "playlist" | "show" | …
  type: string;
  uri: string;
  spotifyUrl: string | null;
}

// Une écoute datée : unité de base des analyses temporelles
// (≠ top tracks, qui sont un classement agrégé par Spotify sans dates)
export interface RecentPlay {
  track: Track;
  // ISO conservé pour l'affichage et la sérialisation (localStorage, JSON)
  playedAt: string;
  // Timestamp en ms, pratique pour trier et filtrer par période
  playedAtMs: number;
  context: PlayContext | null;
}
