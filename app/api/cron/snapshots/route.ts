import { NextRequest } from 'next/server';
import {
  listScheduledUsers,
  recordAutoSnapshotRun,
  rotateRefreshToken,
} from '@/services/autoSnapshotStore';
import { refreshAccessToken, TokenRefreshError } from '@/services/spotifyAuth';
import { captureSnapshot } from '@/services/snapshotCapture';
import { hasSnapshotSince } from '@/services/snapshotStore';
import { fetchCurrentUser } from '@/services/spotifyUser';

// Appelée chaque lundi par Vercel Cron (vercel.json). Détails : docs/auto-snapshots.md
// Utilisateurs traités un par un : plus lent, mais évite de saturer la limite de requêtes Spotify
export const maxDuration = 60;

// Un snapshot (manuel ou auto) déjà pris récemment suffit : pas de doublon
const RECENT_SNAPSHOT_MS = 20 * 60 * 60 * 1000;

type Outcome = 'success' | 'skipped' | 'failed' | 'disabled';

async function snapshotUser(userId: string, refreshToken: string | null): Promise<Outcome> {
  if (!refreshToken) {
    await recordAutoSnapshotRun(userId, {
      error: 'Token illisible : réactive les snapshots automatiques',
      disable: true,
    });
    return 'disabled';
  }
  if (await hasSnapshotSince(userId, new Date(Date.now() - RECENT_SNAPSHOT_MS))) {
    return 'skipped';
  }

  try {
    const tokens = await refreshAccessToken(refreshToken);
    // Sauvegardé tout de suite : si la suite échoue, on garde le dernier token valide
    if (tokens.refreshToken !== refreshToken) await rotateRefreshToken(userId, tokens.refreshToken);

    const user = await fetchCurrentUser(tokens.accessToken);
    if (user.id !== userId) {
      // Ne devrait jamais arriver (vérifié à l'activation) : par sécurité, on coupe
      await recordAutoSnapshotRun(userId, { error: 'Compte Spotify inattendu', disable: true });
      return 'disabled';
    }

    await captureSnapshot({ accessToken: tokens.accessToken, user, source: 'scheduled' });
    await recordAutoSnapshotRun(userId, { error: null });
    return 'success';
  } catch (err) {
    const revoked = err instanceof TokenRefreshError && err.revoked;
    console.error(`[api/cron/snapshots] ${userId}`, err);
    await recordAutoSnapshotRun(userId, {
      error: revoked
        ? 'Autorisation Spotify révoquée ou expirée : réactive les snapshots automatiques'
        : err instanceof Error
          ? err.message
          : 'Erreur inconnue',
      // Token révoqué : inutile de réessayer chaque semaine. Autre erreur : on réessaiera.
      disable: revoked,
    });
    return revoked ? 'disabled' : 'failed';
  }
}

export async function GET(request: NextRequest) {
  // Vercel Cron envoie "Authorization: Bearer <CRON_SECRET>". Sans ce contrôle, n'importe qui
  // pourrait déclencher des snapshots pour tout le monde en appelant l'URL.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const outcomes: Record<Outcome, number> = { success: 0, skipped: 0, failed: 0, disabled: 0 };
  for (const { userId, refreshToken } of await listScheduledUsers()) {
    outcomes[await snapshotUser(userId, refreshToken)]++;
  }

  console.info('[api/cron/snapshots]', outcomes);
  return Response.json(outcomes);
}
