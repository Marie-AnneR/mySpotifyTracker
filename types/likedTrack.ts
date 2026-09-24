import { SpotifyTrackResponse, Track } from '@/types/track';

// Forme brute d'un item de GET /me/tracks
export interface SpotifySavedTrackResponse {
  // ISO 8601 en UTC : date à laquelle le titre a été liké
  added_at: string;
  track: SpotifyTrackResponse;
}

export interface LikedTrack {
  track: Track;
  // Champ central des analyses de bibliothèque (timeline mensuelle des likes)
  addedAt: string;
  addedAtMs: number;
}
