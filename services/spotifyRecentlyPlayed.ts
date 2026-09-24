import { mapValidItems } from '@/mappers/common';
import { isPlayHistoryObject, toPlayEvent } from '@/mappers/playEvent';
import { spotifyFetch } from '@/services/spotifyClient';
import { PlayEvent } from '@/types/models';

// Limite imposée par Spotify. L'API ne remonte de toute façon que les ~50 dernières écoutes :
// l'historique plus long est accumulé côté app par services/playHistory.ts.
const MAX_LIMIT = 50;

interface GetRecentlyPlayedOptions {
  limit?: number;
  // Timestamps Unix en ms, mutuellement exclusifs côté Spotify :
  // after = écoutes postérieures, before = écoutes antérieures
  after?: number;
  before?: number;
}

interface RecentlyPlayedResponse {
  items: unknown[];
  next: string | null;
  cursors: { after: string; before: string } | null;
}

// Renvoie les écoutes triées de la plus récente à la plus ancienne.
// Tableau vide = pas d'historique exploitable (compte neuf, historique privé, rien depuis `after`…)
export async function getRecentlyPlayed({
  limit = MAX_LIMIT,
  after,
  before,
}: GetRecentlyPlayedOptions = {}): Promise<PlayEvent[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new RangeError(`limit doit être un entier entre 1 et ${MAX_LIMIT} (reçu : ${limit})`);
  }
  if (after !== undefined && before !== undefined) {
    throw new RangeError('after et before ne peuvent pas être utilisés ensemble');
  }

  const path = '/me/player/recently-played';
  const response = await spotifyFetch<RecentlyPlayedResponse>(path, {
    params: { limit, after, before },
  });

  if (!Array.isArray(response?.items)) {
    throw new Error(`Réponse Spotify inattendue pour ${path} : items manquant`);
  }

  return mapValidItems(response.items, isPlayHistoryObject, toPlayEvent, path).sort(
    (a, b) => b.playedAtMs - a.playedAtMs
  );
}
