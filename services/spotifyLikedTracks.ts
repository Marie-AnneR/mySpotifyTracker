import { spotifyFetch } from '@/services/spotifyClient';
import { isValidTrack, toTrack } from '@/services/spotifyTracks';
import { LikedTrack, SpotifySavedTrackResponse } from '@/types/likedTrack';
import { SpotifyPage } from '@/types/spotify';

// Limite imposée par Spotify sur /me/tracks
const PAGE_SIZE = 50;
// Pages récupérées en parallèle : assez pour aller vite, assez peu pour éviter les 429
const CONCURRENCY = 4;
const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development';

interface GetLikedTracksOptions {
  // Plafond de sécurité pour les très grosses bibliothèques
  maxTracks?: number;
  // Appelé après chaque page, pour afficher une progression
  onProgress?: (loaded: number, total: number) => void;
}

function isValidSavedTrack(item: unknown): item is SpotifySavedTrackResponse {
  if (typeof item !== 'object' || item === null) return false;
  const saved = item as Record<string, unknown>;
  return (
    typeof saved.added_at === 'string' &&
    !Number.isNaN(Date.parse(saved.added_at)) &&
    isValidTrack(saved.track)
  );
}

function toLikedTrack(raw: SpotifySavedTrackResponse): LikedTrack {
  return {
    track: toTrack(raw.track),
    addedAt: raw.added_at,
    addedAtMs: Date.parse(raw.added_at),
  };
}

function fetchPage(offset: number) {
  return spotifyFetch<SpotifyPage<unknown>>('/me/tracks', {
    params: { limit: PAGE_SIZE, offset },
  });
}

// Récupère toute la bibliothèque, triée du like le plus récent au plus ancien
export async function getLikedTracks({
  maxTracks = 10_000,
  onProgress,
}: GetLikedTracksOptions = {}): Promise<LikedTrack[]> {
  const startedAt = performance.now();

  // 1re page : donne le total, qui permet de lancer les suivantes en parallèle
  const firstPage = await fetchPage(0);
  if (!Array.isArray(firstPage?.items)) {
    throw new Error('Réponse Spotify inattendue pour /me/tracks : items manquant');
  }

  const total = Math.min(firstPage.total, maxTracks);
  const rawItems: unknown[] = [...firstPage.items];
  onProgress?.(rawItems.length, total);

  const offsets: number[] = [];
  for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) offsets.push(offset);

  // Lots de CONCURRENCY pages : Promise.all conserve l'ordre des offsets
  for (let i = 0; i < offsets.length; i += CONCURRENCY) {
    const pages = await Promise.all(offsets.slice(i, i + CONCURRENCY).map(fetchPage));
    for (const page of pages) rawItems.push(...(page.items ?? []));
    onProgress?.(Math.min(rawItems.length, total), total);
  }

  const validItems = rawItems.filter(isValidSavedTrack);
  if (validItems.length < rawItems.length) {
    console.warn(`[getLikedTracks] ${rawItems.length - validItems.length} titre(s) ignoré(s)`);
  }

  // Déduplication : si un like/unlike a lieu pendant la récupération, les offsets se décalent
  // et un même titre peut apparaître sur deux pages. On garde la 1re occurrence (la plus récente).
  const seen = new Set<string>();
  const likedTracks = validItems
    .map(toLikedTrack)
    .filter(({ track }) => {
      if (seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    })
    .slice(0, maxTracks)
    .sort((a, b) => b.addedAtMs - a.addedAtMs);

  if (isDev) {
    console.debug(
      `[getLikedTracks] ${likedTracks.length} titres en ${offsets.length + 1} requêtes, ` +
        `${Math.round(performance.now() - startedAt)}ms`
    );
  }

  return likedTracks;
}
