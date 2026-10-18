import { getTopArtists } from '@/services/spotifyArtists';
import { getLikedTracks } from '@/services/spotifyLikedTracks';
import { getTopTracks } from '@/services/spotifyTracks';
import {
  getLatestStoredLikeIds,
  saveSnapshot,
  SnapshotRunSummary,
  SnapshotSource,
} from '@/services/snapshotStore';
import { LikedTrack, User } from '@/types/models';
import { TIME_RANGES } from '@/types/spotify';

// Prise d'un snapshot complet — SERVEUR UNIQUEMENT.
// Commun au bouton (POST /api/snapshots) et au cron hebdomadaire (/api/cron/snapshots).

// Maximum Spotify sur /me/top/*
const TOP_LIMIT = 50;

function sameLibrary(likes: LikedTrack[], previous: Set<string> | null): boolean {
  if (!previous || previous.size !== likes.length) return false;
  return likes.every((like) => previous.has(like.track.id));
}

export async function captureSnapshot({
  accessToken,
  user,
  source,
}: {
  accessToken: string;
  user: User;
  source: SnapshotSource;
}): Promise<SnapshotRunSummary> {
  // Les données sont récupérées ICI, chez Spotify, jamais envoyées par le navigateur
  const [topTracks, topArtists, likedTracks, previousLikeIds] = await Promise.all([
    Promise.all(
      TIME_RANGES.map(async (timeRange) => ({
        timeRange,
        tracks: await getTopTracks({ timeRange, limit: TOP_LIMIT, accessToken }),
      }))
    ),
    Promise.all(
      TIME_RANGES.map(async (timeRange) => ({
        timeRange,
        artists: await getTopArtists({ timeRange, limit: TOP_LIMIT, accessToken }),
      }))
    ),
    getLikedTracks({ accessToken }),
    getLatestStoredLikeIds(user.id),
  ]);

  return saveSnapshot({
    user,
    source,
    topTracks,
    topArtists,
    likedTracks,
    // Les likes pèsent ~80 % d'un snapshot : on ne les recopie que s'ils ont changé
    storeLikes: !sameLibrary(likedTracks, previousLikeIds),
  });
}
