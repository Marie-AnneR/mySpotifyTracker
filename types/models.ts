// Modèles internes : ce que consomment lib/ (KPI, agrégations), components/ et app/.
// Indépendants du format de l'API Spotify, construits uniquement par mappers/.
// Conventions et choix documentés dans docs/data-models.md.

export interface User {
  id: string;
  displayName: string;
  imageUrl: string | null;
}

export interface Artist {
  id: string;
  name: string;
  // [] si Spotify ne fournit pas de genres
  genres: string[];
  imageUrl: string | null;
  // 0–100, null si Spotify ne fournit pas le champ
  popularity: number | null;
  spotifyUrl: string | null;
}

// Référence légère vers un artiste, telle qu'incluse dans un track
export interface TrackArtist {
  id: string;
  name: string;
}

export interface Album {
  id: string;
  name: string;
  imageUrl: string | null;
  // Précision variable selon l'album : "2024", "2024-03" ou "2024-03-15"
  releaseDate: string | null;
}

export interface Track {
  id: string;
  name: string;
  // Jamais vide. Ordre conservé : [0] = artiste principal, suivants = featurings
  artists: TrackArtist[];
  album: Album;
  durationMs: number;
  popularity: number | null;
  explicit: boolean;
  spotifyUrl: string | null;
}

export interface PlayContext {
  // "album" | "artist" | "playlist" | "show" | …
  type: string;
  uri: string;
  spotifyUrl: string | null;
}

// Une écoute datée (recently played / historique accumulé)
export interface PlayEvent {
  track: Track;
  playedAt: string; // ISO 8601 UTC
  playedAtMs: number; // epoch ms, pour trier / filtrer
  context: PlayContext | null;
}

// Un titre de la bibliothèque, daté de son like
export interface LikedTrack {
  track: Track;
  addedAt: string; // ISO 8601 UTC
  addedAtMs: number; // epoch ms, pour trier / filtrer
}
