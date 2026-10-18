# Snapshots automatiques

Un snapshot est pris **chaque lundi à 6h UTC**, sans action de l'utilisateur ni navigateur ouvert. C'est ce qui rend le wrap mensuel fiable : avec un snapshot par semaine, chaque jour est couvert par 3 ou 4 snapshots (voir [monthly-wrap.md](monthly-wrap.md)).

## Fonctionnement

```
Lundi 6h UTC
Vercel Cron ──GET /api/cron/snapshots──► vérifie CRON_SECRET
  (Authorization: Bearer CRON_SECRET)     pour chaque utilisateur actif, un par un :
                                            1. déchiffre son refresh token
                                            2. refresh → access token (+ nouveau refresh token, sauvegardé tout de suite)
                                            3. vérifie le compte (/me)
                                            4. prend le snapshot (source = 'scheduled')
                                            5. note lastRunAt / lastError
```

| Élément | Où |
|---|---|
| Planification | `vercel.json` (`"0 6 * * 1"` = lundi 6h00 UTC) |
| Route du cron | `app/api/cron/snapshots/route.ts` |
| Activation / désactivation | `app/api/auto-snapshots/route.ts` (GET / PUT / DELETE) |
| Prise de snapshot (commune au bouton et au cron) | `services/snapshotCapture.ts` |
| Réglages et token chiffré | table `auto_snapshot_settings`, `services/autoSnapshotStore.ts` |
| Chiffrement | `services/secretBox.ts` (AES-256-GCM) |
| Interface | `components/home/AutoSnapshotToggle.tsx`, dans la carte Snapshots de l'accueil |

## Activation : pourquoi une seconde autorisation Spotify ?

Le serveur a besoin d'un *refresh token* pour agir sans que l'utilisateur soit connecté. On **n'envoie pas** celui de la session du navigateur. Spotify peut fournir un nouveau refresh token à chaque utilisation (flow PKCE). Si le navigateur et le serveur partageaient le même, chacun risquerait d'invalider le token de l'autre.

Cliquer sur **Activer** relance donc le flow OAuth avec l'intention `auto-snapshots` :
1. Aller-retour vers Spotify, souvent instantané si l'app est déjà autorisée.
2. Le callback échange le code et obtient un refresh token **dédié au serveur**.
3. Il l'envoie à `PUT /api/auto-snapshots`, sans toucher à la session du navigateur.
4. Le serveur vérifie que ce token appartient bien à l'utilisateur authentifié (refresh, puis `/me`), puis le stocke chiffré.

## Sécurité

- **Opt-in :** aucun token n'est stocké tant que l'utilisateur n'a pas activé la fonction.
- **Token chiffré** en AES-256-GCM avec `TOKEN_ENCRYPTION_KEY`, qui n'existe que dans les variables d'environnement. Une fuite de la base seule ne permet pas d'utiliser les tokens.
- **Le token n'est jamais renvoyé au navigateur :** `GET /api/auto-snapshots` ne renvoie que `enabled`, `lastRunAt` et `lastError`.
- **Désactiver supprime la ligne,** et donc le token.
- **Route du cron protégée par `CRON_SECRET`.** Sans ce secret, appeler l'URL renvoie 401.
- **Changer `TOKEN_ENCRYPTION_KEY`** rend les tokens existants illisibles. Le cron désactive alors proprement les utilisateurs concernés, qui doivent réactiver la fonction.

## Gestion des échecs

| Cas | Comportement |
|---|---|
| Snapshot déjà pris dans les 20 dernières heures (bouton) | ignoré, pas de doublon |
| Refresh token révoqué ou expiré (`invalid_grant`) | **désactivé**, avec le message « réactive les snapshots automatiques » sur l'accueil |
| Erreur passagère (Spotify indisponible, 429, base…) | `lastError` renseigné, **reste activé**, retenté lundi suivant |
| Token illisible (clé changée) | désactivé |

## Stockage

Pour une bibliothèque de 2 000 likes, un snapshot pèse environ 0,8 Mo, dont ~80 % de likes. **Si la bibliothèque n'a pas changé depuis le dernier snapshot qui l'a stockée, les likes ne sont pas recopiés** (`snapshot_runs.liked_tracks_stored = false`). Le run garde la taille de la bibliothèque dans `liked_tracks_count`.

| Fréquence | Volume / an (1 utilisateur, 2 000 likes) |
|---|---|
| Hebdomadaire, likes qui changent chaque semaine | ~42 Mo |
| Hebdomadaire, likes rarement modifiés | ~7 Mo |

Avec une offre gratuite Neon de l'ordre de 0,5 Go, il y a de la marge pour plusieurs années. La consommation se suit dans la console Neon → Usage.

## Tester en local

Vercel Cron ne tourne pas en local : on appelle la route à la main, avec le secret de `.env.local`.

```bash
curl -H "Authorization: Bearer <valeur de CRON_SECRET>" "http://[::1]:3000/api/cron/snapshots"
```

Réponse attendue : `{"success":1,"skipped":0,"failed":0,"disabled":0}`, ou `skipped: 1` si un snapshot a déjà été pris dans les 20 dernières heures.

## Limites connues

- **Plan Hobby de Vercel :** les crons tournent au plus une fois par jour, avec une heure d'exécution approximative (dans l'heure prévue).
- **Utilisateurs traités un par un,** dans une seule exécution de 60 s maximum. C'est suffisant pour quelques utilisateurs. Au-delà d'une dizaine, il faudra répartir le travail (une file, ou plusieurs exécutions).
- **Les genres ne sont pas enrichis** dans les snapshots, ni manuels ni automatiques : l'enrichissement se fait à l'affichage.
