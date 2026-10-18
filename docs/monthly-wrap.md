# Wrap mensuel depuis les snapshots

Mis en place par l'issue #17. Il permet de générer un wrap pour un mois donné, par exemple « octobre 2026 », à partir des snapshots stockés en base (voir [database.md](database.md)). Les snapshots sont la **base de vérité** pour les périodes personnalisées.

| Élément | Où |
|---|---|
| Moteur (fonctions pures) | `lib/kpis/monthlyWrap.ts` |
| Lecture en base | `services/snapshotStore.ts` (`getSnapshotRunsBetween`, `getShortTermTops`, `getLikedTracksBetween`) |
| API | `GET /api/wraps/monthly?month=AAAA-MM`, dans `app/api/wraps/monthly/route.ts` |
| Côté navigateur | `services/monthlyWrap.ts` (`getMonthlyWrap`) : enrichissement des genres et calcul des KPIs |
| Affichage | `components/wrapped/WrapView.tsx`, partagé avec `/stats` |
| Page de test | `/dev/monthly-wrap` |

## Le principe

Un snapshot pris le jour **J** contient le top `short_term` de Spotify, qui couvre à peu près les **28 jours avant J**. Chaque snapshot décrit donc la fenêtre **[J − 28 j, J]**.

```
Octobre        1 ─────────────────────────────── 31
Snapshot 8/10  [════ 10/9 → 8/10 ═══]                  ← 7 jours dans octobre → poids 7/28
Snapshot 22/10           [═══ 24/9 → 22/10 ═══]        ← 21 jours dans octobre → poids 21/28
Snapshot 5/11                    [══ 8/10 → 5/11 ══]   ← 24 jours dans octobre → poids 24/28
```

## Règles

### 1. Sélection des snapshots
- On prend les snapshots de l'utilisateur dont la fenêtre de 28 jours **chevauche** le mois, c'est-à-dire pris entre le 1er du mois et 28 jours après la fin du mois. Un snapshot du 5 novembre compte donc pour octobre.
- **Au plus un snapshot par jour** (en UTC) : le plus récent. Cliquer 5 fois le même jour ne lui donne pas 5 fois plus de poids.

### 2. Pondération
Le poids d'un snapshot est la part de sa fenêtre qui tombe dans le mois, entre 0 et 1. Un snapshot du 2 novembre (fenêtre du 5 octobre au 2 novembre) ne parle presque que d'octobre : poids 27/28 ≈ 0,96. Un snapshot du 2 octobre (fenêtre du 4 septembre au 2 octobre) parle surtout de septembre : poids 1/28 ≈ 0,04.

### 3. Agrégation des tops (méthode de Borda pondérée)
- Chaque élément reçoit, pour chaque snapshot, **poids × (51 − rang)** points : le n°1 rapporte 50 points, le n°50 en rapporte 1.
- Les points sont additionnés sur tous les snapshots, puis on trie par score. À égalité, le meilleur rang obtenu départage.
- Un titre n°5 pendant tout le mois bat donc un titre n°1 pendant une seule semaine.
- Ce calcul s'applique aux top titres et aux top artistes. Les top genres en sont déduits, avec la même méthode que le Wrapped Spotify (`computeTopGenres`) et les genres enrichis (#31).

### 4. Likes du mois
- Ils sont **exacts** : les titres dont `added_at` tombe dans le mois.
- On regarde dans **tous** les snapshots. Un titre liké puis retiré compte quand même, à condition qu'un snapshot l'ait capturé entre-temps.

### 5. Qualité
`coverage.ratio` est la part des jours du mois **déjà écoulés** qui sont couverts par au moins une fenêtre de snapshot.

| Couverture | `quality` | Affichage |
|---|---|---|
| ≥ 90 % | `good` | Bonne précision |
| ≥ 30 % | `partial` | Précision partielle |
| < 30 %, ou aucun snapshot | `insufficient` | Données insuffisantes |

Un mois en cours n'est jugé que sur les jours passés : il n'est pas pénalisé pour des jours qui ne sont pas encore arrivés.

## Fréquence de snapshots recommandée

| Fréquence | Résultat attendu |
|---|---|
| 1 par semaine | couverture complète, chaque jour vu par 3 ou 4 snapshots : **bonne précision** |
| 1 toutes les 4 semaines | couverture complète mais une seule « photo » par période : le classement est approximatif |
| 1 par mois, à date variable | des trous possibles : précision partielle |
| aucun | wrap vide, `insufficient` |

## Limites de précision (hypothèses du modèle)

1. **La fenêtre de 28 jours est une approximation.** Spotify ne documente pas la durée exacte de `short_term` (« environ 4 semaines »), ni comment il pondère les écoutes à l'intérieur de cette fenêtre.
2. **Ce sont des classements, pas des écoutes.** On sait qu'un titre était n°3, pas combien de fois il a été écouté. Le wrap mensuel est donc un classement reconstruit, pas un comptage.
3. **Effet de bord en début et en fin de mois.** Un snapshot du 1er novembre inclut fin octobre, mais aussi quelques jours de début octobre déjà comptés ailleurs. La pondération atténue cet effet sans l'annuler.
4. **Un top est limité à 50.** Un artiste écouté régulièrement mais jamais dans le top 50 d'un snapshot est invisible.
5. **Les mois sont en UTC.** Une écoute le 31 à 23h30 heure de Paris peut basculer sur le mois suivant. C'est acceptable pour une vue mensuelle.
6. **Les genres sont enrichis au moment de l'affichage,** et non au moment du snapshot. Ce sont donc les genres connus aujourd'hui.
7. **Plus les snapshots sont fréquents, meilleur est le résultat.** Avec les snapshots manuels, la qualité dépend de ta régularité. La planification automatique (hors périmètre) réglera ce problème.

## Évolutions possibles
- Snapshots automatiques hebdomadaires, pour garantir une bonne couverture.
- Combiner avec l'historique d'écoute accumulé (`PlayEvent`), qui permet de vrais comptages, mais seulement depuis le début de la synchro.
- Une période libre (du … au …) : le moteur accepte déjà n'importe quel intervalle `{ start, end }`, il suffit d'ajouter le paramètre à l'API.
