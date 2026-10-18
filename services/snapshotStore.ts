import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  likedTracksSnapshots,
  snapshotRuns,
  topArtistsSnapshots,
  topTracksSnapshots,
  users,
} from '@/db/schema';
import { Artist, LikedTrack, Track, User } from '@/types/models';
import { TimeRange } from '@/types/spotify';

// Accès aux données des snapshots — SERVEUR UNIQUEMENT (utilise DATABASE_URL)

export interface SnapshotData {
  user: User;
  topTracks: { timeRange: TimeRange; tracks: Track[] }[];
  topArtists: { timeRange: TimeRange; artists: Artist[] }[];
  likedTracks: LikedTrack[];
}

export interface SnapshotRunSummary {
  id: string;
  createdAt: string;
  source: string;
  topTracksCount: number;
  topArtistsCount: number;
  likedTracksCount: number;
}

// Postgres accepte au plus 65 535 paramètres par requête : on découpe les gros inserts
// (une bibliothèque de 5 000 likes × 8 colonnes = 40 000 paramètres)
const INSERT_CHUNK_SIZE = 1_000;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export async function saveSnapshot(data: SnapshotData): Promise<SnapshotRunSummary> {
  const db = getDb();
  // ID généré ici (et pas par la base) : il faut le connaître avant d'insérer les lignes liées
  const runId = crypto.randomUUID();
  const now = new Date();

  const topTrackRows = data.topTracks.flatMap(({ timeRange, tracks }) =>
    tracks.map((track, index) => ({
      runId,
      timeRange,
      rank: index + 1,
      trackId: track.id,
      name: track.name,
      artists: track.artists,
      albumId: track.album.id,
      albumName: track.album.name,
      albumImageUrl: track.album.imageUrl,
      durationMs: track.durationMs,
      popularity: track.popularity,
    }))
  );

  const topArtistRows = data.topArtists.flatMap(({ timeRange, artists }) =>
    artists.map((artist, index) => ({
      runId,
      timeRange,
      rank: index + 1,
      artistId: artist.id,
      name: artist.name,
      genres: artist.genres,
      imageUrl: artist.imageUrl,
      popularity: artist.popularity,
    }))
  );

  const likedRows = data.likedTracks.map((like) => ({
    runId,
    trackId: like.track.id,
    addedAt: new Date(like.addedAtMs),
    name: like.track.name,
    artists: like.track.artists,
    albumName: like.track.album.name,
    albumImageUrl: like.track.album.imageUrl,
    durationMs: like.track.durationMs,
  }));

  const summary = {
    id: runId,
    createdAt: now.toISOString(),
    source: 'manual',
    topTracksCount: topTrackRows.length,
    topArtistsCount: topArtistRows.length,
    likedTracksCount: likedRows.length,
  };

  // batch = une seule transaction : soit tout est enregistré, soit rien
  // (pas de snapshot à moitié écrit si une requête échoue en route)
  const [first, ...rest] = [
    // Crée l'utilisateur au premier snapshot, met à jour son nom/avatar ensuite
    db
      .insert(users)
      .values({ id: data.user.id, displayName: data.user.displayName, imageUrl: data.user.imageUrl })
      .onConflictDoUpdate({
        target: users.id,
        set: { displayName: data.user.displayName, imageUrl: data.user.imageUrl, updatedAt: now },
      }),
    db.insert(snapshotRuns).values({
      id: runId,
      userId: data.user.id,
      createdAt: now,
      source: summary.source,
      topTracksCount: summary.topTracksCount,
      topArtistsCount: summary.topArtistsCount,
      likedTracksCount: summary.likedTracksCount,
    }),
    ...chunk(topTrackRows, INSERT_CHUNK_SIZE).map((rows) => db.insert(topTracksSnapshots).values(rows)),
    ...chunk(topArtistRows, INSERT_CHUNK_SIZE).map((rows) =>
      db.insert(topArtistsSnapshots).values(rows)
    ),
    ...chunk(likedRows, INSERT_CHUNK_SIZE).map((rows) => db.insert(likedTracksSnapshots).values(rows)),
  ];
  await db.batch([first, ...rest]);

  return summary;
}

export async function listSnapshotRuns(userId: string, limit = 20): Promise<SnapshotRunSummary[]> {
  const runs = await getDb()
    .select()
    .from(snapshotRuns)
    .where(eq(snapshotRuns.userId, userId))
    .orderBy(desc(snapshotRuns.createdAt))
    .limit(limit);

  return runs.map((run) => ({
    id: run.id,
    createdAt: run.createdAt.toISOString(),
    source: run.source,
    topTracksCount: run.topTracksCount,
    topArtistsCount: run.topArtistsCount,
    likedTracksCount: run.likedTracksCount,
  }));
}
