import { NextRequest } from 'next/server';
import { authenticate, errorResponse } from '@/services/apiAuth';
import {
  deleteAutoSnapshots,
  enableAutoSnapshots,
  getAutoSnapshotStatus,
} from '@/services/autoSnapshotStore';
import { refreshAccessToken } from '@/services/spotifyAuth';
import { upsertUser } from '@/services/snapshotStore';
import { fetchCurrentUser } from '@/services/spotifyUser';

const ROUTE = 'api/auto-snapshots';

// État des snapshots automatiques de l'utilisateur connecté (jamais le token)
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticate(request);
    const status = await getAutoSnapshotStatus(user.id);
    return Response.json(status ?? { enabled: false, lastRunAt: null, lastError: null });
  } catch (err) {
    return errorResponse(err, ROUTE, 'Erreur serveur lors de la lecture du réglage');
  }
}

// Activation : le navigateur envoie un refresh token obtenu par une autorisation Spotify
// DÉDIÉE au serveur (distincte de celle de la session du navigateur)
export async function PUT(request: NextRequest) {
  try {
    const { user } = await authenticate(request);
    const body = await request.json().catch(() => null);
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : null;
    if (!refreshToken) {
      return Response.json({ error: 'refreshToken manquant' }, { status: 400 });
    }

    // Vérification : ce refresh token appartient-il bien à l'utilisateur authentifié ?
    // Sans ça, on pourrait rattacher le compte Spotify de quelqu'un d'autre à son profil.
    const tokens = await refreshAccessToken(refreshToken);
    const owner = await fetchCurrentUser(tokens.accessToken);
    if (owner.id !== user.id) {
      return Response.json({ error: 'Ce token ne correspond pas à ton compte' }, { status: 403 });
    }

    // La table de réglages référence users : l'utilisateur doit exister en base
    await upsertUser(user);
    // On garde le token éventuellement renouvelé par le refresh ci-dessus
    await enableAutoSnapshots(user.id, tokens.refreshToken);
    return Response.json(await getAutoSnapshotStatus(user.id));
  } catch (err) {
    return errorResponse(err, ROUTE, "Erreur serveur lors de l'activation");
  }
}

// Désactivation : supprime le réglage ET le token stocké
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await authenticate(request);
    await deleteAutoSnapshots(user.id);
    return Response.json({ enabled: false, lastRunAt: null, lastError: null });
  } catch (err) {
    return errorResponse(err, ROUTE, 'Erreur serveur lors de la désactivation');
  }
}
