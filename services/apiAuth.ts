import { SpotifyApiError } from '@/services/spotifyClient';
import { fetchCurrentUser } from '@/services/spotifyUser';

// Outils communs aux routes API (/api/...) — SERVEUR UNIQUEMENT

// Identité vérifiée côté serveur : on ne fait jamais confiance à un userId envoyé par le
// navigateur. Le token est présenté à Spotify (/me) : s'il est valide, Spotify nous dit à qui
// il appartient. Un token volé ou inventé est donc refusé par Spotify, pas par nous.
export async function authenticate(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const accessToken = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!accessToken) {
    throw new SpotifyApiError('Token Spotify manquant', 401);
  }
  const user = await fetchCurrentUser(accessToken);
  return { accessToken, user };
}

// Erreur Spotify → même statut (401, 429…) ; autre erreur → 500 sans détail côté navigateur
// (le détail est dans les logs serveur : terminal de `npm run dev` ou logs Vercel)
export function errorResponse(err: unknown, route: string, fallbackMessage: string) {
  if (err instanceof SpotifyApiError) {
    // 0 = Spotify injoignable
    const status = err.status === 0 ? 502 : err.status;
    return Response.json(
      { error: err.message },
      {
        status,
        headers: err.retryAfter ? { 'Retry-After': String(err.retryAfter) } : undefined,
      }
    );
  }
  console.error(`[${route}]`, err);
  return Response.json({ error: fallbackMessage }, { status: 500 });
}
