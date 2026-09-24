// Formes brutes renvoyées par l'API Web Spotify (snake_case, champs optionnels).
// Règle : seuls services/ et mappers/ importent ce fichier. Le reste de l'app
// (lib/, components/, app/) ne manipule que les modèles de types/models.ts.

export interface SpotifyImageObject {
  url: string;
  width: number | null;
  height: number | null;
}

// Objet de pagination des endpoints de liste (/me/top/*, /me/tracks…)
export interface SpotifyPage<T> {
  items: T[];
  next: string | null;
  previous: string | null;
  total: number;
  limit: number;
  offset: number;
}

export interface SpotifyUserObject {
  id: string;
  display_name: string | null;
  images?: SpotifyImageObject[];
}

export interface SpotifyArtistObject {
  id: string;
  name: string;
  genres?: string[];
  images?: SpotifyImageObject[];
  popularity?: number;
  external_urls?: { spotify?: string };
}

// Version allégée des artistes, incluse dans chaque track
export interface SpotifySimplifiedArtistObject {
  id: string;
  name: string;
}

export interface SpotifyAlbumObject {
  id: string;
  name: string;
  images?: SpotifyImageObject[];
  release_date?: string;
}

export interface SpotifyTrackObject {
  id: string;
  name: string;
  duration_ms: number;
  artists: SpotifySimplifiedArtistObject[];
  album: SpotifyAlbumObject;
  popularity?: number;
  explicit?: boolean;
  external_urls?: { spotify?: string };
}

// Item de GET /me/player/recently-played
export interface SpotifyPlayHistoryObject {
  track: SpotifyTrackObject;
  played_at: string;
  context: {
    type: string;
    uri: string;
    external_urls?: { spotify?: string };
  } | null;
}

// Item de GET /me/tracks
export interface SpotifySavedTrackObject {
  added_at: string;
  track: SpotifyTrackObject;
}
