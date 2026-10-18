import { getValidAccessToken } from '@/services/spotifyClient';
import type { SnapshotRunSummary } from '@/services/snapshotStore';

// Côté navigateur : appelle notre route API /api/snapshots avec le token Spotify de la session

export type { SnapshotRunSummary };

async function callSnapshotsApi<T>(method: 'GET' | 'POST'): Promise<T> {
  const token = await getValidAccessToken();
  const response = await fetch('/api/snapshots', {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? `Erreur ${response.status}`);
  }
  return data as T;
}

export function createSnapshot(): Promise<SnapshotRunSummary> {
  return callSnapshotsApi<SnapshotRunSummary>('POST');
}

export function listSnapshots(): Promise<SnapshotRunSummary[]> {
  return callSnapshotsApi<SnapshotRunSummary[]>('GET');
}
