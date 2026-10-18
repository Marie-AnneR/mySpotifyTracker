import { NextRequest } from 'next/server';
import { authenticate, errorResponse } from '@/services/apiAuth';
import { getLikedTracks } from '@/services/spotifyLikedTracks';
import { getTopArtists } from '@/services/spotifyArtists';
import { getTopTracks } from '@/services/spotifyTracks';
import { listSnapshotRuns, saveSnapshot } from '@/services/snapshotStore';
import { TIME_RANGES } from '@/types/spotify';

// Une grosse bibliothèque de likes peut demander une centaine d'appels Spotify
export const maxDuration = 60;

// Maximum Spotify sur /me/top/*
const TOP_LIMIT = 50;

const ROUTE = 'api/snapshots';

// Enregistre un snapshot manuel de l'utilisateur connecté
export async function POST(request: NextRequest) {
  try {
    const { accessToken, user } = await authenticate(request);

    // Les données sont récupérées ICI, chez Spotify, et non envoyées par le navigateur :
    // impossible d'enregistrer de fausses données au nom de quelqu'un
    const [topTracks, topArtists, likedTracks] = await Promise.all([
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
    ]);

    const run = await saveSnapshot({ user, topTracks, topArtists, likedTracks });
    return Response.json(run, { status: 201 });
  } catch (err) {
    return errorResponse(err, ROUTE, "Erreur serveur lors de l'enregistrement");
  }
}

// Liste les derniers snapshots de l'utilisateur connecté
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticate(request);
    return Response.json(await listSnapshotRuns(user.id));
  } catch (err) {
    return errorResponse(err, ROUTE, 'Erreur serveur lors de la lecture des snapshots');
  }
}
