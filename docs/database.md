# Base de données des snapshots

Mise en place par l'issue #16. Elle sert à stocker des **photos datées** (snapshots) des données Spotify, pour reconstruire plus tard des périodes personnalisées. Spotify ne fournit que des fenêtres glissantes (environ 4 semaines, 6 mois et 1 an à partir d'aujourd'hui).

## Stack

| Élément | Choix | Où |
|---|---|---|
| Base | Neon (Postgres serverless), créée via Vercel → Storage | variables `DATABASE_URL` et `DATABASE_URL_UNPOOLED` |
| ORM | Drizzle (schéma typé en TypeScript, migrations SQL) | `db/schema.ts`, `db/index.ts`, `drizzle.config.ts` |
| Driver | `@neondatabase/serverless` (HTTP), adapté aux fonctions serverless de Vercel | `db/index.ts` |
| Accès aux données | serveur uniquement | `services/snapshotStore.ts` |
| API | `POST /api/snapshots` (enregistre), `GET /api/snapshots` (liste) | `app/api/snapshots/route.ts` |

## Tables

```
users ──< snapshot_runs ──< top_tracks_snapshots
                        ├──< top_artists_snapshots
                        └──< liked_tracks_snapshots
```

| Table | Clé primaire | Une ligne = |
|---|---|---|
| `users` | `id` (ID Spotify) | un utilisateur, créé au premier snapshot |
| `snapshot_runs` | `id` (UUID) | une prise de snapshot : qui, quand, source (`manual`), et le nombre de lignes de chaque type |
| `top_tracks_snapshots` | (`run_id`, `time_range`, `rank`) | le titre classé n°`rank` sur une période, lors d'un snapshot |
| `top_artists_snapshots` | (`run_id`, `time_range`, `rank`) | l'artiste classé n°`rank` sur une période, lors d'un snapshot |
| `liked_tracks_snapshots` | (`run_id`, `track_id`) | un titre présent dans les likes lors d'un snapshot, avec son `added_at` |

Les suppressions sont **en cascade** : supprimer un utilisateur supprime ses runs, et supprimer un run supprime ses lignes.

## Choix de conception

- **Données recopiées dans chaque snapshot**, sans tables `tracks` ni `artists` partagées. Chaque ligne contient le nom, les artistes et la pochette.
  - C'est plus simple, comme le demande l'issue (« éviter un schéma trop complexe »).
  - La photo reste fidèle, même si Spotify renomme un titre ensuite.
  - Le prix à payer : des données en double d'un snapshot à l'autre.
- **Les compteurs sont stockés dans `snapshot_runs`.** On peut vérifier la cohérence d'un snapshot (« 150 titres, 150 artistes, 2 314 likes ? ») sans relire toutes ses lignes.
- **Écriture atomique.** Toutes les insertions d'un snapshot partent dans un seul `db.batch` (une transaction) : un snapshot est soit complet, soit absent.
- **Inserts découpés par 1 000 lignes,** car Postgres accepte au plus 65 535 paramètres par requête.
- **Bibliothèque de likes complète à chaque snapshot.** C'est simple, mais c'est la table qui grossit le plus : environ 1 000 à 5 000 lignes par snapshot selon la bibliothèque. Si l'espace devient un problème, on pourra ne stocker que les changements depuis le snapshot précédent.
- **Genres non enrichis.** Les genres stockés sont ceux de Spotify, donc vides en Development mode. L'enrichissement Wikidata/MusicBrainz (#31) tourne dans le navigateur avec un cache local. On pourra le recalculer plus tard à partir de `artist_id`.

## Sécurité

- **`DATABASE_URL` n'a pas de préfixe `NEXT_PUBLIC_` :** Next.js ne l'envoie jamais au navigateur. Seul le code serveur (`app/api/…`, `services/snapshotStore.ts`, `db/`) l'utilise.
- **Le serveur ne fait pas confiance au navigateur :**
  - il reçoit le token Spotify dans l'en-tête `Authorization` ;
  - il demande à Spotify (`/me`) à qui ce token appartient ;
  - il **récupère lui-même** les données chez Spotify.

  Un navigateur ne peut donc ni se faire passer pour un autre utilisateur, ni enregistrer de fausses données.
- **Aucun token n'est stocké en base.** La prise automatique de snapshots, hors périmètre, demandera de stocker le *refresh token* côté serveur, chiffré.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run db:generate` | génère une migration SQL dans `db/migrations/` à partir des changements de `db/schema.ts` |
| `npm run db:migrate` | applique les migrations en attente sur la base Neon |
| `npm run db:studio` | ouvre Drizzle Studio, une interface web pour parcourir les tables |

**Modifier le schéma :** modifie `db/schema.ts`, puis lance `db:generate`. Relis le SQL généré, lance `db:migrate`, et commite le schéma **et** la migration.

## Reste à faire (issues futures)

- Prise automatique des snapshots (planification, refresh token stocké côté serveur et chiffré)
- Suppression des données à la demande (« supprimer mon compte et mes snapshots »)
- Périodes personnalisées calculées à partir des snapshots
- Base séparée pour le développement (branche Neon) : aujourd'hui, le dev et la prod partagent la même base
