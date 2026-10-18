import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
// Chemin relatif (pas d'alias @/) : ce fichier est aussi lu par drizzle-kit, hors de Next.js
import type { TrackArtist } from '../types/models';

// Schéma de la base des snapshots (#16). Choix et conventions : docs/database.md
// Chaque table de snapshot recopie les infos utiles (nom, image…) plutôt que de pointer
// vers des tables "tracks"/"artists" partagées : plus simple, et la photo reste fidèle
// à ce que Spotify renvoyait ce jour-là.

export const users = pgTable('users', {
  // ID Spotify : identifiant naturel, déjà unique
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Une prise de snapshot : regroupe toutes les lignes enregistrées au même moment
export const snapshotRuns = pgTable(
  'snapshot_runs',
  {
    id: uuid('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      // Supprimer un utilisateur supprime ses snapshots
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    // 'manual' (bouton) ou 'scheduled' (cron hebdomadaire)
    source: text('source').notNull(),
    // Nombre de lignes enregistrées, pour vérifier la cohérence sans tout relire
    topTracksCount: integer('top_tracks_count').notNull(),
    topArtistsCount: integer('top_artists_count').notNull(),
    // Taille de la bibliothèque au moment du snapshot (même si les likes ne sont pas recopiés)
    likedTracksCount: integer('liked_tracks_count').notNull(),
    // false = bibliothèque identique au dernier snapshot qui l'a stockée : lignes non recopiées
    // pour économiser l'espace (la bibliothèque est alors celle de ce snapshot précédent)
    likedTracksStored: boolean('liked_tracks_stored').notNull().default(true),
  },
  // Requête typique : "les snapshots de cet utilisateur, du plus récent au plus ancien"
  (table) => [index('snapshot_runs_user_created_idx').on(table.userId, table.createdAt)]
);

// Snapshots automatiques : une ligne par utilisateur qui les a activés (opt-in).
// Supprimer la ligne = désactiver ET effacer le token.
export const autoSnapshotSettings = pgTable('auto_snapshot_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  // false après un échec définitif (token révoqué) : l'utilisateur doit réactiver
  enabled: boolean('enabled').notNull().default(true),
  // Refresh token Spotify propre au serveur, chiffré en AES-256-GCM ("iv.tag.données").
  // Jamais stocké en clair, jamais renvoyé au navigateur.
  encryptedRefreshToken: text('encrypted_refresh_token').notNull(),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const topTracksSnapshots = pgTable(
  'top_tracks_snapshots',
  {
    runId: uuid('run_id')
      .notNull()
      .references(() => snapshotRuns.id, { onDelete: 'cascade' }),
    // 'short_term' | 'medium_term' | 'long_term'
    timeRange: text('time_range').notNull(),
    rank: integer('rank').notNull(),
    trackId: text('track_id').notNull(),
    name: text('name').notNull(),
    // Ordre conservé : [0] = artiste principal
    artists: jsonb('artists').$type<TrackArtist[]>().notNull(),
    albumId: text('album_id').notNull(),
    albumName: text('album_name').notNull(),
    albumImageUrl: text('album_image_url'),
    durationMs: integer('duration_ms').notNull(),
    popularity: integer('popularity'),
  },
  (table) => [
    primaryKey({ columns: [table.runId, table.timeRange, table.rank] }),
    // Pour suivre un titre d'un snapshot à l'autre
    index('top_tracks_snapshots_track_idx').on(table.trackId),
  ]
);

export const topArtistsSnapshots = pgTable(
  'top_artists_snapshots',
  {
    runId: uuid('run_id')
      .notNull()
      .references(() => snapshotRuns.id, { onDelete: 'cascade' }),
    timeRange: text('time_range').notNull(),
    rank: integer('rank').notNull(),
    artistId: text('artist_id').notNull(),
    name: text('name').notNull(),
    // Genres renvoyés par Spotify (vides en Development mode, cf. docs/database.md)
    genres: jsonb('genres').$type<string[]>().notNull(),
    imageUrl: text('image_url'),
    popularity: integer('popularity'),
  },
  (table) => [
    primaryKey({ columns: [table.runId, table.timeRange, table.rank] }),
    index('top_artists_snapshots_artist_idx').on(table.artistId),
  ]
);

export const likedTracksSnapshots = pgTable(
  'liked_tracks_snapshots',
  {
    runId: uuid('run_id')
      .notNull()
      .references(() => snapshotRuns.id, { onDelete: 'cascade' }),
    trackId: text('track_id').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull(),
    name: text('name').notNull(),
    artists: jsonb('artists').$type<TrackArtist[]>().notNull(),
    albumName: text('album_name').notNull(),
    albumImageUrl: text('album_image_url'),
    durationMs: integer('duration_ms').notNull(),
  },
  (table) => [primaryKey({ columns: [table.runId, table.trackId] })]
);
