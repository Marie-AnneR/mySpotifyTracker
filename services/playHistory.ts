import { getRecentlyPlayed } from '@/services/spotifyRecentlyPlayed';
import { getStoredSession } from '@/services/spotifySession';
import { PlayEvent } from '@/types/models';

// Spotify ne renvoie que les 50 dernières écoutes : on les accumule dans le navigateur
// à chaque synchro pour construire un historique plus long que l'API.
const STORAGE_PREFIX = 'spotify_play_history';
// Plafond pour rester sous la limite du localStorage (~5 Mo)
const MAX_STORED_PLAYS = 5_000;
const RECENTLY_PLAYED_LIMIT = 50;

export interface SyncResult {
  plays: PlayEvent[];
  added: number;
  // true si des écoutes ont pu être manquées depuis la dernière synchro (> 50 écoutes entre-temps)
  hasGap: boolean;
}

// Émis à chaque sauvegarde, pour que l'UI se mette à jour après une synchro
export const PLAY_HISTORY_CHANGE_EVENT = 'spotify-play-history-change';

// Une même écoute = même titre au même instant
const playKey = (play: PlayEvent) => `${play.playedAt}:${play.track.id}`;
// Historique par utilisateur : deux comptes sur le même navigateur ne se mélangent pas
export const playHistoryStorageKey = (userId: string) => `${STORAGE_PREFIX}:${userId}`;

// Migration des écoutes stockées avant #12 : album.images[] → album.imageUrl
function migrateStoredPlay(play: PlayEvent): PlayEvent {
  const album = play.track.album as PlayEvent['track']['album'] & { images?: { url: string }[] };
  if (album.imageUrl !== undefined) return play;
  const { images, ...rest } = album;
  return {
    ...play,
    track: { ...play.track, album: { ...rest, imageUrl: images?.[0]?.url ?? null } },
  };
}

// Lit le contenu brut du localStorage (utile aussi aux composants qui l'observent directement)
export function parsePlayHistory(raw: string | null): PlayEvent[] {
  if (!raw) return [];
  try {
    const plays = JSON.parse(raw);
    return Array.isArray(plays) ? plays.map(migrateStoredPlay) : [];
  } catch {
    return [];
  }
}

export function getPlayHistory(userId: string): PlayEvent[] {
  return parsePlayHistory(localStorage.getItem(playHistoryStorageKey(userId)));
}

function savePlayHistory(userId: string, plays: PlayEvent[]): void {
  try {
    localStorage.setItem(playHistoryStorageKey(userId), JSON.stringify(plays));
    window.dispatchEvent(new Event(PLAY_HISTORY_CHANGE_EVENT));
  } catch (err) {
    // Quota dépassé : l'historique existant reste en place, la synchro suivante réessaiera
    console.warn('[playHistory] sauvegarde impossible', err);
  }
}

// Synchro partagée : évite deux fusions concurrentes (StrictMode, plusieurs composants)
let syncPromise: Promise<SyncResult> | null = null;

export function syncPlayHistory(): Promise<SyncResult> {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const userId = getStoredSession()?.user.id;
    if (!userId) throw new Error('Aucune session Spotify, connecte-toi');

    const stored = getPlayHistory(userId);
    const latest = await getRecentlyPlayed({ limit: RECENTLY_PLAYED_LIMIT });

    const byKey = new Map(stored.map((play) => [playKey(play), play]));
    let added = 0;
    for (const play of latest) {
      if (!byKey.has(playKey(play))) {
        byKey.set(playKey(play), play);
        added++;
      }
    }

    // Trou possible : la plus ancienne écoute récupérée est plus récente que tout l'historique
    // stocké, et la page était pleine (il y avait peut-être d'autres écoutes entre les deux)
    const newestStored = stored.length > 0 ? Math.max(...stored.map((p) => p.playedAtMs)) : null;
    const oldestLatest = latest.length > 0 ? Math.min(...latest.map((p) => p.playedAtMs)) : null;
    const hasGap =
      newestStored !== null &&
      oldestLatest !== null &&
      latest.length >= RECENTLY_PLAYED_LIMIT &&
      oldestLatest > newestStored;

    const plays = [...byKey.values()]
      .sort((a, b) => b.playedAtMs - a.playedAtMs)
      .slice(0, MAX_STORED_PLAYS);

    savePlayHistory(userId, plays);
    if (hasGap) console.warn('[playHistory] des écoutes ont pu être manquées depuis la dernière synchro');

    return { plays, added, hasGap };
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}
