import { generateCodeChallenge, generateCodeVerifier } from '@/lib/pkce';
import { buildSpotifyAuthorizeUrl } from '@/services/spotifyAuth';

// Démarrage du flow OAuth PKCE côté navigateur, commun à deux usages :
// - 'login' : ouvrir la session du navigateur
// - 'auto-snapshots' : obtenir un refresh token DÉDIÉ au serveur (snapshots automatiques),
//   indépendant de celui du navigateur pour que l'un n'invalide jamais l'autre
export type AuthIntent = 'login' | 'auto-snapshots';

export const AUTH_STORAGE_KEYS = {
  verifier: 'spotify_code_verifier',
  state: 'spotify_auth_state',
  intent: 'spotify_auth_intent',
} as const;

export async function startSpotifyAuthorization(intent: AuthIntent = 'login'): Promise<void> {
  // Le verifier est stocké dans le localStorage, qui est propre à chaque origine :
  // le flow doit démarrer sur la même origine que le redirect URI.
  const redirectOrigin = new URL(process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!).origin;
  if (window.location.origin !== redirectOrigin) {
    window.location.href = redirectOrigin + window.location.pathname;
    return;
  }

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  // Le state est vérifié au retour du callback : protège contre une redirection forgée (CSRF)
  const state = generateCodeVerifier(32);

  localStorage.setItem(AUTH_STORAGE_KEYS.verifier, verifier);
  localStorage.setItem(AUTH_STORAGE_KEYS.state, state);
  localStorage.setItem(AUTH_STORAGE_KEYS.intent, intent);

  window.location.href = buildSpotifyAuthorizeUrl(challenge, state);
}
