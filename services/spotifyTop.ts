import { mapValidItems } from '@/mappers/common';
import { spotifyFetch } from '@/services/spotifyClient';
import { TIME_RANGES, TimeRange } from '@/types/spotify';
import { SpotifyPage } from '@/types/spotifyApi';

// Limite imposée par Spotify sur /me/top/*
const MAX_LIMIT = 50;

export interface TopItemsOptions {
  timeRange?: TimeRange;
  limit?: number;
  offset?: number;
}

// Logique commune à /me/top/artists et /me/top/tracks :
// validation des paramètres, appel API, puis mapping vers le modèle interne
export async function fetchTopItems<Raw, Model>(
  type: 'artists' | 'tracks',
  { timeRange = 'medium_term', limit = 20, offset = 0 }: TopItemsOptions,
  isValid: (item: unknown) => item is Raw,
  toModel: (raw: Raw) => Model
): Promise<Model[]> {
  if (!TIME_RANGES.includes(timeRange)) {
    throw new RangeError(`time_range invalide : ${timeRange}`);
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new RangeError(`limit doit être un entier entre 1 et ${MAX_LIMIT} (reçu : ${limit})`);
  }

  const path = `/me/top/${type}`;
  const page = await spotifyFetch<SpotifyPage<unknown>>(path, {
    params: { time_range: timeRange, limit, offset },
  });

  if (!Array.isArray(page?.items)) {
    throw new Error(`Réponse Spotify inattendue pour ${path} : items manquant`);
  }

  return mapValidItems(page.items, isValid, toModel, path);
}
