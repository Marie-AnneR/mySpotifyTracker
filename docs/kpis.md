# KPIs Wrapped V1

Calculés pour chacune des 3 périodes natives de Spotify, à partir des modèles internes (voir [data-models.md](data-models.md)).

- Calcul : `lib/kpis/wrapped.ts`. Ce sont des fonctions pures, testables sans API.
- Récupération des données : `services/wrapped.ts` (`getWrappedKpis()`).
- Structure de sortie : `types/kpis.ts`.
- Page de vérification : `/dev/wrapped`.

## Liste des KPI V1

| KPI | Champ | Source | Calcul |
|---|---|---|---|
| Top titres | `topTracks` | `/me/top/tracks` | Classement Spotify, 10 premiers |
| Top artistes | `topArtists` | `/me/top/artists` | Classement Spotify, 10 premiers |
| Top genres | `topGenres` | genres des top artistes | Nombre d'artistes portant le genre, puis rang du meilleur artiste en cas d'égalité ; 5 premiers |
| Score mainstream | `stats.mainstreamScore` | popularité des top artistes | Moyenne arrondie (0–100), `null` ignorés |
| Diversité des genres | `stats.distinctGenres` | genres des top artistes | Nombre de genres différents |
| Artistes différents | `stats.distinctArtistsInTopTracks` | artistes des top titres | Nombre d'artistes différents, featurings compris |

Les tailles de top (10 / 10 / 5) sont configurables via `PeriodKpisOptions`. Les genres et les stats sont toujours calculés sur les 50 éléments récupérés, pas seulement sur le top affiché.

## Périodes

| `timeRange` | Libellé | Fenêtre réelle |
|---|---|---|
| `short_term` | 4 dernières semaines | environ 4 semaines |
| `medium_term` | 6 derniers mois | environ 6 mois |
| `long_term` | Depuis environ 1 an | environ 1 an (défini par Spotify, non documenté précisément) |

## Contraintes métier connues

1. **Les périodes sont natives de Spotify et approximatives.** Il n'y a pas de dates de début ou de fin exactes, et les fenêtres sont glissantes : le même appel ne donne pas le même résultat d'un jour à l'autre. `generatedAt` indique la date du calcul.
2. **Ce sont des classements, pas des compteurs.** Spotify ne fournit ni nombre d'écoutes ni temps d'écoute par titre ou par artiste. On peut dire « n°1 », mais pas « écouté 142 fois ». Les compteurs viendront de l'historique accumulé (`PlayEvent`), qui ne couvre que la période depuis la première synchronisation.
3. **Les genres viennent des artistes uniquement.** Spotify n'attribue pas de genre aux titres. Un artiste peut avoir plusieurs genres, qui sont tous comptés. La somme des `share` peut donc dépasser 100 %.
4. **Les genres peuvent être absents.** Si Spotify ne renvoie aucun genre (artistes de niche, ou restrictions de l'API), `topGenres` vaut `[]` et `genresAvailable` vaut `false` : l'UI masque alors le bloc.
5. **La popularité n'est pas propre à l'utilisateur.** C'est un score global Spotify (0–100) qui évolue dans le temps. Le score mainstream compare donc tes goûts à l'ensemble de Spotify.
6. **Un top est limité à 50 éléments** par période : c'est le maximum de l'API.
7. **Tout ou rien.** Si l'un des 6 appels échoue, `getWrappedKpis` échoue : un Wrapped partiel serait trompeur.
8. **Pas de snapshots en V1.** Les périodes mensuelles personnalisées (« mon mois de mars ») demanderont de sauvegarder régulièrement ces résultats. C'est hors périmètre, et la décision est de livrer la V1 sans.
