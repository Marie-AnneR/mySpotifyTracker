import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { autoSnapshotSettings } from '@/db/schema';
import { decryptSecret, encryptSecret } from '@/services/secretBox';

// Réglages des snapshots automatiques — SERVEUR UNIQUEMENT.
// Seul fichier qui chiffre/déchiffre le refresh token : il n'en sort qu'en clair vers le cron.

export interface AutoSnapshotStatus {
  enabled: boolean;
  lastRunAt: string | null;
  lastError: string | null;
}

export async function getAutoSnapshotStatus(userId: string): Promise<AutoSnapshotStatus | null> {
  const [row] = await getDb()
    .select()
    .from(autoSnapshotSettings)
    .where(eq(autoSnapshotSettings.userId, userId));
  if (!row) return null;
  // Le token n'est volontairement PAS renvoyé
  return {
    enabled: row.enabled,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    lastError: row.lastError,
  };
}

// Active (ou réactive) en stockant un nouveau refresh token chiffré
export async function enableAutoSnapshots(userId: string, refreshToken: string): Promise<void> {
  const encryptedRefreshToken = encryptSecret(refreshToken);
  const now = new Date();
  await getDb()
    .insert(autoSnapshotSettings)
    .values({ userId, encryptedRefreshToken, enabled: true })
    .onConflictDoUpdate({
      target: autoSnapshotSettings.userId,
      set: { encryptedRefreshToken, enabled: true, lastError: null, updatedAt: now },
    });
}

// Désactiver = supprimer la ligne : le token disparaît de la base
export async function deleteAutoSnapshots(userId: string): Promise<void> {
  await getDb().delete(autoSnapshotSettings).where(eq(autoSnapshotSettings.userId, userId));
}

export interface ScheduledUser {
  userId: string;
  // null si le déchiffrement échoue (clé TOKEN_ENCRYPTION_KEY changée, donnée corrompue)
  refreshToken: string | null;
}

function tryDecrypt(payload: string): string | null {
  try {
    return decryptSecret(payload);
  } catch {
    return null;
  }
}

export async function listScheduledUsers(): Promise<ScheduledUser[]> {
  const rows = await getDb()
    .select({
      userId: autoSnapshotSettings.userId,
      encryptedRefreshToken: autoSnapshotSettings.encryptedRefreshToken,
    })
    .from(autoSnapshotSettings)
    .where(eq(autoSnapshotSettings.enabled, true));
  return rows.map((row) => ({
    userId: row.userId,
    refreshToken: tryDecrypt(row.encryptedRefreshToken),
  }));
}

// Spotify peut renvoyer un nouveau refresh token à chaque refresh : on le sauvegarde AVANT
// de prendre le snapshot, pour ne jamais perdre le token valide si la suite échoue
export async function rotateRefreshToken(userId: string, refreshToken: string): Promise<void> {
  await getDb()
    .update(autoSnapshotSettings)
    .set({ encryptedRefreshToken: encryptSecret(refreshToken), updatedAt: new Date() })
    .where(eq(autoSnapshotSettings.userId, userId));
}

export async function recordAutoSnapshotRun(
  userId: string,
  result: { error: string | null; disable?: boolean }
): Promise<void> {
  const now = new Date();
  await getDb()
    .update(autoSnapshotSettings)
    .set({
      lastRunAt: now,
      lastError: result.error,
      // Échec définitif (token révoqué…) : on arrête jusqu'à réactivation par l'utilisateur
      ...(result.disable && { enabled: false }),
      updatedAt: now,
    })
    .where(eq(autoSnapshotSettings.userId, userId));
}
