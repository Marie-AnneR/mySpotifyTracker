import type { AutoSnapshotStatus } from '@/services/autoSnapshotStore';
import { getValidAccessToken } from '@/services/spotifyClient';

// Côté navigateur : appelle /api/auto-snapshots avec le token de la session

export type { AutoSnapshotStatus };

async function callAutoSnapshotsApi(
  method: 'GET' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<AutoSnapshotStatus> {
  const token = await getValidAccessToken();
  const response = await fetch('/api/auto-snapshots', {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? `Erreur ${response.status}`);
  return data as AutoSnapshotStatus;
}

export const getAutoSnapshotStatus = () => callAutoSnapshotsApi('GET');

// refreshToken : obtenu par l'autorisation dédiée (intent 'auto-snapshots'), jamais celui de la session
export const enableAutoSnapshots = (refreshToken: string) =>
  callAutoSnapshotsApi('PUT', { refreshToken });

export const disableAutoSnapshots = () => callAutoSnapshotsApi('DELETE');
