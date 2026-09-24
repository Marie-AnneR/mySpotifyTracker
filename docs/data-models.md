# Modèles de données internes

L'app ne manipule jamais directement les réponses de l'API Spotify en dehors de la couche d'accès aux données. Si Spotify change un format, seul un mapper est à adapter : la couche KPI et l'UI ne changent pas.

## Architecture

```
API Spotify ──► services/ ──► mappers/ ──► types/models.ts ──► lib/ (KPI, agrégations) ──► components/, app/
                (fetch)       (validation   (modèles internes)
                               + conversion)
```

| Dossier | Rôle | Peut importer `types/spotifyApi.ts` ? |
|---|---|---|
| `services/` | Appels HTTP via `spotifyClient` (token, erreurs, pagination) | oui |
| `mappers/` | Validation des réponses brutes et conversion vers les modèles | oui |
| `types/spotifyApi.ts` | Formes brutes de l'API (snake_case, champs optionnels) | — |
| `types/models.ts` | Modèles internes (`User`, `Artist`, `Track`, `PlayEvent`, `LikedTrack`) | non |
| `lib/` | Logique métier pure : agrégations, timeline, futurs KPI | **non** |
| `components/`, `app/` | UI | **non** |

## Modèles

| Modèle | Source Spotify | Usage |
|---|---|---|
| `User` | `GET /me` | Session, affichage du profil |
| `Artist` | `GET /me/top/artists` | Top artistes par période |
| `Track` | `GET /me/top/tracks`, et inclus dans `PlayEvent` et `LikedTrack` | Top titres, base commune |
| `PlayEvent` | `GET /me/player/recently-played` + historique accumulé | Analyses temporelles (7 derniers jours…) |
| `LikedTrack` | `GET /me/tracks` | Bibliothèque, timeline mensuelle des likes |

`PlayEvent` et top tracks sont deux choses différentes : un `PlayEvent` est une écoute datée, alors que les top tracks sont un classement calculé par Spotify, sans date ni nombre d'écoutes. Les top tracks et l'historique ne se remplacent donc pas l'un l'autre. Ce sont des sources complémentaires.

## Conventions

### Nommage
- Les modèles utilisent le **camelCase**, l'API le snake_case : c'est le mapper qui fait la conversion (`duration_ms` → `durationMs`).
- Les types bruts sont suffixés `Object`, comme dans la doc Spotify (`SpotifyTrackObject`). Les modèles n'ont pas de préfixe (`Track`).

### Champs optionnels
Un modèle ne contient jamais `undefined` : chaque champ a une valeur par défaut explicite.

| Cas | Valeur |
|---|---|
| Liste absente (`genres`) | `[]` |
| Nombre absent (`popularity`) | `null` |
| URL ou texte absent (`imageUrl`, `spotifyUrl`, `releaseDate`) | `null` |
| Booléen absent (`explicit`) | `false` |
| `display_name` absent | id Spotify de l'utilisateur |

`null` veut dire « Spotify ne fournit pas l'info ». La distinction est importante pour les KPI : une popularité à `null` ne doit pas être comptée comme `0` dans une moyenne.

### Dates
Chaque date existe sous deux formes, avec toujours le même schéma de nommage `<événement>At` + `<événement>AtMs` :

| Champ | Format | Usage |
|---|---|---|
| `playedAt`, `addedAt` | ISO 8601 UTC (chaîne) | Affichage, sérialisation JSON, clé de déduplication |
| `playedAtMs`, `addedAtMs` | epoch en millisecondes (nombre) | Tri, filtres, comparaisons |

Les regroupements par jour ou par mois (`lib/timeline.ts`) utilisent le **fuseau horaire local** de l'utilisateur. Une écoute à 23h30 à Paris compte pour le bon jour, alors que Spotify renvoie de l'UTC.

### Images
- Un seul champ `imageUrl` par entité (`User`, `Artist`, `Album`), au lieu du tableau `images[]` de Spotify.
- On garde la plus grande image, que Spotify place en premier, et le navigateur la redimensionne. S'il faut plusieurs tailles plus tard (optimisation mobile), on pourra ajouter un champ sans casser l'existant.

### Plusieurs artistes par titre
- `Track.artists` n'est **jamais vide** : les titres sans artiste sont rejetés par `isTrackObject`.
- L'ordre de Spotify est conservé : `artists[0]` est l'artiste principal, les suivants les featurings.
- Chaque KPI choisit sa règle et doit la documenter. Par exemple, « top artistes par écoutes » peut ne compter que l'artiste principal, ou compter l'écoute pour chaque artiste crédité.
- `TrackArtist` ne contient que `id` et `name`. Le détail d'un artiste (genres, image) vient de `Artist` et peut être joint par `id` si besoin.

### Données invalides
- Un item mal formé est **ignoré avec un warning** (`mapValidItems`), sans faire échouer toute la liste. C'est le cas des épisodes de podcast, des fichiers locaux sans id ou des titres devenus indisponibles.
- Une réponse dont la structure globale est cassée (pas de tableau `items`) lève en revanche une erreur.

## Agrégations
`lib/aggregations.ts` (`groupBy`, `countBy`) et `lib/timeline.ts` (`groupByDay`, `groupByMonth`, `filterLastDays`, `getCoveredRange`) sont génériques. Ils prennent une fonction d'accès, ce qui évite d'écrire une version par modèle :

```ts
groupByDay(plays, playedAt);                       // PlayEvent par jour
groupByMonth(likes, addedAt);                      // LikedTrack par mois
countBy(plays, (play) => play.track.artists[0].id); // écoutes par artiste principal
```

## Historique stocké
- L'historique d'écoute accumulé (`services/playHistory.ts`) est stocké au format `PlayEvent`.
- Si un modèle change, il faut ajouter une migration à la lecture. Voir `migrateStoredPlay`, qui convertit l'ancien format `album.images[]` en `album.imageUrl`.
