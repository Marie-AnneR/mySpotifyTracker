import { and, asc, desc, eq, gte, inArray, lt } from 'drizzle-orm';
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

export type SnapshotSource = 'manual' | 'scheduled';

export interface SnapshotData {
  user: User;
  source: SnapshotSource;
  topTracks: { timeRange: TimeRange; tracks: Track[] }[];
  topArtists: { timeRange: TimeRange; artists: Artist[] }[];
  likedTracks: LikedTrack[];
  // false = bibliothèque inchangée depuis le dernier snapshot stocké : on ne recopie pas les likes
  storeLikes: boolean;
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

// Crée l'utilisateur à sa première écriture en base, met à jour son nom/avatar ensuite
function upsertUserQuery(user: User, now = new Date()) {
  return getDb()
    .insert(users)
    .values({ id: user.id, displayName: user.displayName, imageUrl: user.imageUrl })
    .onConflictDoUpdate({
      target: users.id,
      set: { displayName: user.displayName, imageUrl: user.imageUrl, updatedAt: now },
    });
}

export async function upsertUser(user: User): Promise<void> {
  await upsertUserQuery(user);
}

// IDs des likes du dernier snapshot qui a réellement stocké la bibliothèque (null si aucun)
export async function getLatestStoredLikeIds(userId: string): Promise<Set<string> | null> {
  const db = getDb();
  const [latest] = await db
    .select({ id: snapshotRuns.id })
    .from(snapshotRuns)
    .where(and(eq(snapshotRuns.userId, userId), eq(snapshotRuns.likedTracksStored, true)))
    .orderBy(desc(snapshotRuns.createdAt))
    .limit(1);
  if (!latest) return null;

  const rows = await db
    .select({ trackId: likedTracksSnapshots.trackId })
    .from(likedTracksSnapshots)
    .where(eq(likedTracksSnapshots.runId, latest.id));
  return new Set(rows.map((row) => row.trackId));
}

// Un snapshot existe-t-il déjà depuis cette date ? (évite un doublon cron + bouton le même jour)
export async function hasSnapshotSince(userId: string, since: Date): Promise<boolean> {
  const [run] = await getDb()
    .select({ id: snapshotRuns.id })
    .from(snapshotRuns)
    .where(and(eq(snapshotRuns.userId, userId), gte(snapshotRuns.createdAt, since)))
    .limit(1);
  return run !== undefined;
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

  const likedRows = (data.storeLikes ? data.likedTracks : []).map((like) => ({
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
    source: data.source,
    topTracksCount: topTrackRows.length,
    topArtistsCount: topArtistRows.length,
    // Taille de la bibliothèque, même quand les lignes ne sont pas recopiées
    likedTracksCount: data.likedTracks.length,
  };

  // batch = une seule transaction : soit tout est enregistré, soit rien
  // (pas de snapshot à moitié écrit si une requête échoue en route)
  const [first, ...rest] = [
    upsertUserQuery(data.user, now),
    db.insert(snapshotRuns).values({
      id: runId,
      userId: data.user.id,
      createdAt: now,
      source: summary.source,
      topTracksCount: summary.topTracksCount,
      topArtistsCount: summary.topArtistsCount,
      likedTracksCount: summary.likedTracksCount,
      likedTracksStored: data.storeLikes,
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

// --- Lecture pour le wrap mensuel (#17) ---

export async function getSnapshotRunsBetween(
  userId: string,
  start: Date,
  end: Date
): Promise<{ id: string; createdAtMs: number }[]> {
  const runs = await getDb()
    .select({ id: snapshotRuns.id, createdAt: snapshotRuns.createdAt })
    .from(snapshotRuns)
    .where(
      and(
        eq(snapshotRuns.userId, userId),
        gte(snapshotRuns.createdAt, start),
        lt(snapshotRuns.createdAt, end)
      )
    )
    .orderBy(asc(snapshotRuns.createdAt));
  return runs.map((run) => ({ id: run.id, createdAtMs: run.createdAt.getTime() }));
}

// Tops "short_term" (~4 semaines) des snapshots donnés, convertis en modèles internes.
// Les champs non stockés (explicit, releaseDate, spotifyUrl) prennent leur valeur par défaut.
export interface ShortTermTops {
  tracks: { runId: string; rank: number; track: Track }[];
  artists: { runId: string; rank: number; artist: Artist }[];
}

export async function getShortTermTops(runIds: string[]): Promise<ShortTermTops> {
  if (runIds.length === 0) return { tracks: [], artists: [] };
  const db = getDb();

  const [trackRows, artistRows] = await Promise.all([
    db
      .select()
      .from(topTracksSnapshots)
      .where(
        and(inArray(topTracksSnapshots.runId, runIds), eq(topTracksSnapshots.timeRange, 'short_term'))
      ),
    db
      .select()
      .from(topArtistsSnapshots)
      .where(
        and(
          inArray(topArtistsSnapshots.runId, runIds),
          eq(topArtistsSnapshots.timeRange, 'short_term')
        )
      ),
  ]);

  return {
    tracks: trackRows.map((row) => ({
      runId: row.runId,
      rank: row.rank,
      track: {
        id: row.trackId,
        name: row.name,
        artists: row.artists,
        album: {
          id: row.albumId,
          name: row.albumName,
          imageUrl: row.albumImageUrl,
          releaseDate: null,
        },
        durationMs: row.durationMs,
        popularity: row.popularity,
        explicit: false,
        spotifyUrl: null,
      } satisfies Track,
    })),
    artists: artistRows.map((row) => ({
      runId: row.runId,
      rank: row.rank,
      artist: {
        id: row.artistId,
        name: row.name,
        genres: row.genres,
        imageUrl: row.imageUrl,
        popularity: row.popularity,
        spotifyUrl: null,
      } satisfies Artist,
    })),
  };
}

// Titres likés pendant la période, d'après TOUS les snapshots de l'utilisateur :
// un titre liké puis retiré entre deux snapshots apparaît quand même s'il a été capturé une fois
export async function getLikedTracksBetween(
  userId: string,
  start: Date,
  end: Date
): Promise<LikedTrack[]> {
  const rows = await getDb()
    .select({ like: likedTracksSnapshots })
    .from(likedTracksSnapshots)
    .innerJoin(snapshotRuns, eq(likedTracksSnapshots.runId, snapshotRuns.id))
    .where(
      and(
        eq(snapshotRuns.userId, userId),
        gte(likedTracksSnapshots.addedAt, start),
        lt(likedTracksSnapshots.addedAt, end)
      )
    )
    .orderBy(desc(likedTracksSnapshots.addedAt));

  // Un même like est présent dans chaque snapshot qui l'a capturé : on dédoublonne par titre
  const byTrack = new Map<string, LikedTrack>();
  for (const { like } of rows) {
    if (byTrack.has(like.trackId)) continue;
    byTrack.set(like.trackId, {
      addedAt: like.addedAt.toISOString(),
      addedAtMs: like.addedAt.getTime(),
      track: {
        id: like.trackId,
        name: like.name,
        artists: like.artists,
        // L'id d'album n'est pas stocké pour les likes (inutile aux KPIs de likes)
        album: { id: '', name: like.albumName, imageUrl: like.albumImageUrl, releaseDate: null },
        durationMs: like.durationMs,
        popularity: null,
        explicit: false,
        spotifyUrl: null,
      },
    });
  }
  return [...byTrack.values()];
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
