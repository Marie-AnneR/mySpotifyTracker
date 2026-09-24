import { spotifyFetch } from '@/services/spotifyClient';
import { isValidTrack, toTrack } from '@/services/spotifyTracks';
import { RecentPlay, SpotifyPlayHistoryResponse } from '@/types/recentPlay';

// Limite imposée par Spotify. L'API ne remonte de toute façon que les ~50 dernières écoutes :
// pour des analyses plus longues, il faudra accumuler l'historique côté app (via `after`).
const MAX_LIMIT = 50;

interface GetRecentlyPlayedOptions {
  limit?: number;
  // Timestamps Unix en ms, mutuellement exclusifs côté Spotify :
  // after = écoutes postérieures (synchro incrémentale), before = écoutes antérieures
  after?: number;
  before?: number;
}

interface RecentlyPlayedResponse {
  items: unknown[];
  next: string | null;
  cursors: { after: string; before: string } | null;
}

function isValidPlay(item: unknown): item is SpotifyPlayHistoryResponse {
  if (typeof item !== 'object' || item === null) return false;
  const play = item as Record<string, unknown>;
  return (
    typeof play.played_at === 'string' &&
    !Number.isNaN(Date.parse(play.played_at)) &&
    isValidTrack(play.track)
  );
}

function toRecentPlay(raw: SpotifyPlayHistoryResponse): RecentPlay {
  return {
    track: toTrack(raw.track),
    playedAt: raw.played_at,
    playedAtMs: Date.parse(raw.played_at),
    context: raw.context
      ? {
          type: raw.context.type,
          uri: raw.context.uri,
          spotifyUrl: raw.context.external_urls?.spotify ?? null,
        }
      : null,
  };
}

// Renvoie les écoutes triées de la plus récente à la plus ancienne.
// Tableau vide = pas d'historique exploitable (compte neuf, historique privé, rien depuis `after`…)
export async function getRecentlyPlayed({
  limit = MAX_LIMIT,
  after,
  before,
}: GetRecentlyPlayedOptions = {}): Promise<RecentPlay[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new RangeError(`limit doit être un entier entre 1 et ${MAX_LIMIT} (reçu : ${limit})`);
  }
  if (after !== undefined && before !== undefined) {
    throw new RangeError('after et before ne peuvent pas être utilisés ensemble');
  }

  const response = await spotifyFetch<RecentlyPlayedResponse>('/me/player/recently-played', {
    params: { limit, after, before },
  });

  if (!Array.isArray(response?.items)) {
    throw new Error('Réponse Spotify inattendue pour /me/player/recently-played : items manquant');
  }

  const validItems = response.items.filter(isValidPlay);
  if (validItems.length < response.items.length) {
    // Typiquement des épisodes de podcast ou des tracks locaux sans id
    console.warn(
      `[getRecentlyPlayed] ${response.items.length - validItems.length} écoute(s) ignorée(s)`
    );
  }

  return validItems.map(toRecentPlay).sort((a, b) => b.playedAtMs - a.playedAtMs);
}
