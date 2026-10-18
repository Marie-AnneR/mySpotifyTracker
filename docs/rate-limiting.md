# Rate limiting et retry

Implémentation : `services/spotifyClient.ts` (`spotifyFetch`). Tous les appels à l'API Spotify passent par ce client, donc tous en bénéficient.

## Contexte

- Spotify limite le nombre de requêtes par app, sur une **fenêtre glissante de 30 secondes**. La limite exacte n'est pas publiée, et elle est plus basse pour une app en Development mode.
- Au-delà de la limite, l'API répond **429 Too Many Requests**, avec un en-tête `Retry-After` qui donne le délai d'attente en secondes.
- Doc : https://developer.spotify.com/documentation/web-api/concepts/rate-limits

Écrans qui envoient des requêtes en rafale :

| Écran | Requêtes |
|---|---|
| `/stats` | 6 en parallèle (top tracks et top artists × 3 périodes) |
| liked tracks | 1 + jusqu'à 199 pages, 4 en parallèle |
| accueil | 1 synchronisation de l'historique par visite |

## Stratégie V1

1. **429 → pause commune.** Le délai de `Retry-After` s'applique à **toutes** les requêtes (`cooldownUntil`), pas seulement à celle qui a reçu le 429. Les requêtes lancées pendant la pause attendent sa fin au lieu d'être refusées à leur tour.
2. **Décalage aléatoire (jitter, 0 à 250 ms).** Les requêtes qui reprennent après une même pause ne repartent pas toutes à la même milliseconde.
3. **2 nouvelles tentatives maximum** par requête, soit 3 essais au total.
4. **Abandon si l'attente dépasse 10 s.** L'erreur affiche alors « Spotify limite temporairement les requêtes. Réessaie dans N s. », plutôt que de laisser l'écran charger sans explication. Pendant une pause longue, les nouvelles requêtes échouent tout de suite, sans appel réseau.
5. **`Retry-After` absent ou illisible → 1 s.** Les deux formats sont gérés : un nombre de secondes, ou une date HTTP.
6. **Erreurs serveur passagères (500, 502, 503, 504) :** 2 nouvelles tentatives avec un délai qui double (500 ms puis 1 s), **uniquement pour les GET**. Un POST ou un PUT pourrait avoir déjà été pris en compte par Spotify.
7. **401 :** un seul refresh du token, puis la requête est renvoyée. Ce mécanisme est distinct du retry ci-dessus.

Les autres erreurs (400, 403, 404…) ne sont jamais retentées : refaire la même requête donnerait le même résultat.

## Côté écrans

- `SpotifyApiError.status === 429` et `retryAfter` (en secondes) permettent d'afficher un message adapté.
- `/stats` affiche le message d'erreur et un bouton « Réessayer ». La page ne plante pas.
- La synchro de l'historique (`PlayHistorySync`) échoue silencieusement, avec un log : elle sera relancée à la prochaine visite.

## Tester

En dev uniquement (`NEXT_PUBLIC_APP_ENV=development`), dans la console du navigateur :

```js
localStorage.setItem('debug_simulate_429', '3')
```

Les 3 prochaines requêtes Spotify reçoivent un faux 429 (`Retry-After: 2`), sans appel réseau. Quelques valeurs à essayer :

| Valeur | Résultat attendu sur `/stats` |
|---|---|
| `1` ou `2` | Les requêtes attendent puis réussissent ; les stats s'affichent quelques secondes plus tard |
| `20` | Les nouvelles tentatives s'épuisent ; l'écran d'erreur s'affiche avec « Réessaie dans 2 s » et « Réessayer » |

Les avertissements `[spotifyClient] rate limit …` apparaissent dans la console, au niveau Warnings.

## Limites connues (à faire évoluer si besoin)

- **La pause commune est propre à l'onglet.** Deux onglets ouverts ne la partagent pas.
- **Pas de limitation préventive.** On réagit au 429 sans anticiper la limite : pas de file d'attente globale ni de quota local. Pour la V1, la concurrence maximale de 4 sur les liked tracks suffit à éviter la plupart des 429.
- **Pas de cache des réponses Spotify.** Chaque ouverture de `/stats` refait les 6 appels.
- **Limite haute à 10 s.** Au-delà, l'utilisateur doit réessayer à la main.
- **MusicBrainz a son propre limiteur** (1 requête/s, dans `services/artistGenres.ts`), et ses refus ne passent pas par ce client. MusicBrainz signale le dépassement par un 503 : l'artiste concerné est alors marqué en échec, sans mise en cache, et il est retenté au chargement suivant.
