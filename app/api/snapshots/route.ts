import { NextRequest } from 'next/server';
import { getLikedTracks } from '@/services/spotifyLikedTracks';
import { getTopArtists } from '@/services/spotifyArtists';
import { getTopTracks } from '@/services/spotifyTracks';
import { SpotifyApiError } from '@/services/spotifyClient';
import { fetchCurrentUser } from '@/services/spotifyUser';
import { listSnapshotRuns, saveSnapshot } from '@/services/snapshotStore';
import { TIME_RANGES } from '@/types/spotify';

// Une grosse bibliothèque de likes peut demander une centaine d'appels Spotify
export const maxDuration = 60;

// Maximum Spotify sur /me/top/*
const TOP_LIMIT = 50;

// Identité vérifiée côté serveur : on ne fait jamais confiance à un userId envoyé par le
// navigateur. Le token est présenté à Spotify (/me) : s'il est valide, Spotify nous dit à qui
// il appartient. Un token volé ou inventé est donc refusé par Spotify, pas par nous.
async function authenticate(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  const accessToken = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!accessToken) {
    throw new SpotifyApiError('Token Spotify manquant', 401);
  }
  const user = await fetchCurrentUser(accessToken);
  return { accessToken, user };
}

function errorResponse(err: unknown) {
  if (err instanceof SpotifyApiError) {
    // 401 Spotify = token invalide ou expiré ; 429 = rate limit ; 0 = Spotify injoignable
    const status = err.status === 0 ? 502 : err.status;
    return Response.json(
      { error: err.message },
      {
        status,
        headers: err.retryAfter ? { 'Retry-After': String(err.retryAfter) } : undefined,
      }
    );
  }
  console.error('[api/snapshots]', err);
  return Response.json({ error: "Erreur serveur lors de l'enregistrement" }, { status: 500 });
}

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
    return errorResponse(err);
  }
}

// Liste les derniers snapshots de l'utilisateur connecté
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticate(request);
    return Response.json(await listSnapshotRuns(user.id));
  } catch (err) {
    return errorResponse(err);
  }
}
