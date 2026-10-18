import { NextRequest } from 'next/server';
import {
  aggregateRankings,
  computeCoverage,
  parseMonthKey,
  selectSnapshots,
  snapshotSearchRange,
} from '@/lib/kpis/monthlyWrap';
import { authenticate, errorResponse } from '@/services/apiAuth';
import {
  getLikedTracksBetween,
  getShortTermTops,
  getSnapshotRunsBetween,
} from '@/services/snapshotStore';
import { MonthlyWrapData } from '@/types/kpis';

const ROUTE = 'api/wraps/monthly';

// GET /api/wraps/monthly?month=2026-10
// Agrège les snapshots de l'utilisateur connecté pour le mois demandé (#17)
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticate(request);

    const monthKey = request.nextUrl.searchParams.get('month') ?? '';
    const range = parseMonthKey(monthKey);
    if (!range) {
      return Response.json({ error: 'Paramètre month attendu au format AAAA-MM' }, { status: 400 });
    }

    // 1. Sélection : snapshots dont la fenêtre de ~4 semaines chevauche le mois
    const search = snapshotSearchRange(range);
    const runs = await getSnapshotRunsBetween(user.id, new Date(search.start), new Date(search.end));
    const snapshots = selectSnapshots(runs, range);
    const weightById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot.weight]));

    // 2. Données des snapshots retenus
    const [tops, likedTracks] = await Promise.all([
      getShortTermTops(snapshots.map((snapshot) => snapshot.id)),
      getLikedTracksBetween(user.id, new Date(range.start), new Date(range.end)),
    ]);

    // 3. Agrégation : une liste classée par snapshot, du plus ancien au plus récent
    const listsFor = <T>(rows: { runId: string; rank: number; id: string; value: T }[]) =>
      snapshots.map((snapshot) => ({
        weight: weightById.get(snapshot.id) ?? 0,
        entries: rows.filter((row) => row.runId === snapshot.id),
      }));

    const tracks = aggregateRankings(
      listsFor(tops.tracks.map(({ runId, rank, track }) => ({ runId, rank, id: track.id, value: track })))
    );
    const artists = aggregateRankings(
      listsFor(
        tops.artists.map(({ runId, rank, artist }) => ({ runId, rank, id: artist.id, value: artist }))
      )
    );

    const data: MonthlyWrapData = {
      period: {
        key: monthKey,
        start: new Date(range.start).toISOString(),
        end: new Date(range.end).toISOString(),
      },
      coverage: computeCoverage(snapshots, range),
      tracks,
      artists,
      likedTracks,
    };
    return Response.json(data);
  } catch (err) {
    return errorResponse(err, ROUTE, 'Erreur serveur lors du calcul du wrap mensuel');
  }
}
