import { getStoredSession } from '@/services/spotifySession';
import { SpotifyPage } from '@/types/spotify';

// Point d'entrée unique pour tous les appels à l'API Web Spotify
const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';
const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development';

export class SpotifyApiError extends Error {
  // 0 = erreur réseau (pas de réponse HTTP)
  status: number;
  // Secondes à attendre avant de réessayer (réponses 429)
  retryAfter?: number;

  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.name = 'SpotifyApiError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

interface SpotifyFetchOptions extends Omit<RequestInit, 'body'> {
  // Paramètres de query string, ex. { limit: 20, time_range: 'short_term' }
  params?: Record<string, string | number | undefined>;
  body?: unknown;
  // Token explicite, sinon celui de la session stockée
  accessToken?: string;
}

function debugLog(...args: unknown[]) {
  if (isDev) console.debug('[spotifyClient]', ...args);
}

function resolveAccessToken(explicitToken?: string): string {
  if (explicitToken) return explicitToken;

  const session = getStoredSession();
  if (!session) {
    throw new SpotifyApiError('Aucune session Spotify, connecte-toi', 401);
  }
  if (Date.now() >= session.expiresAt) {
    throw new SpotifyApiError('Session Spotify expirée, reconnecte-toi', 401);
  }
  return session.accessToken;
}

function buildUrl(pathOrUrl: string, params?: SpotifyFetchOptions['params']): string {
  // Les URLs "next" de la pagination sont déjà absolues
  const url = new URL(
    pathOrUrl.startsWith('http') ? pathOrUrl : `${SPOTIFY_API_BASE_URL}${pathOrUrl}`
  );
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function spotifyFetch<T>(
  pathOrUrl: string,
  { params, body, accessToken, headers, ...init }: SpotifyFetchOptions = {}
): Promise<T> {
  const url = buildUrl(pathOrUrl, params);
  const token = resolveAccessToken(accessToken);
  const method = init.method ?? 'GET';
  const startedAt = performance.now();

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    debugLog(method, url, 'network error', err);
    throw new SpotifyApiError('Impossible de joindre Spotify, vérifie ta connexion', 0);
  }

  debugLog(method, url, response.status, `${Math.round(performance.now() - startedAt)}ms`);

  if (!response.ok) {
    // Format d'erreur Spotify : { error: { status, message } }
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.error?.message ?? response.statusText;
    const retryAfter = response.headers.get('Retry-After');
    throw new SpotifyApiError(
      `Spotify API ${response.status} : ${message}`,
      response.status,
      retryAfter ? Number(retryAfter) : undefined
    );
  }

  // Certains endpoints (PUT/DELETE) répondent 204 sans corps
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

// Suit les liens "next" d'un endpoint paginé et concatène les items
export async function fetchAllPages<T>(
  path: string,
  options: SpotifyFetchOptions & { maxPages?: number } = {}
): Promise<T[]> {
  const { maxPages = 10, ...fetchOptions } = options;
  const items: T[] = [];
  let next: string | null = path;
  let pageCount = 0;

  while (next && pageCount < maxPages) {
    const page: SpotifyPage<T> = await spotifyFetch<SpotifyPage<T>>(next, fetchOptions);
    items.push(...page.items);
    next = page.next;
    pageCount++;
    // Les params sont déjà inclus dans l'URL "next"
    fetchOptions.params = undefined;
  }

  return items;
}
