import { refreshAccessToken } from '@/services/spotifyAuth';
import { clearSession, getStoredSession, saveSession } from '@/services/spotifySession';
import { SpotifyPage } from '@/types/spotifyApi';

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

// Marge avant expiration pour rafraîchir le token avant qu'une requête échoue
const REFRESH_MARGIN_MS = 60_000;

// --- Rate limiting et retry (stratégie détaillée dans docs/rate-limiting.md) ---
// Nouvelles tentatives max après un 429 ou une erreur serveur passagère (3 essais au total)
const MAX_RETRIES = 2;
// Au-delà, on remonte l'erreur plutôt que de faire patienter l'utilisateur sans explication
const MAX_RETRY_AFTER_SECONDS = 10;
// Si Spotify ne précise pas de délai
const DEFAULT_RETRY_AFTER_SECONDS = 1;
// Erreurs serveur passagères : nouvelle tentative uniquement pour les GET (sans effet de bord)
const RETRYABLE_SERVER_STATUSES = new Set([500, 502, 503, 504]);
const SERVER_RETRY_BASE_DELAY_MS = 500;
// Clé de debug (dev uniquement) : nombre de prochaines requêtes à faire échouer en 429
const SIMULATE_429_KEY = 'debug_simulate_429';

// Pause commune à toutes les requêtes après un 429 : sans elle, les requêtes parallèles
// découvrent chacune le 429 et repartent toutes en même temps, ce qui en provoque un nouveau
let cooldownUntil = 0;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// Décalage aléatoire pour étaler les requêtes qui reprennent après une même pause
const jitter = () => Math.random() * 250;

function rateLimitWarn(...args: unknown[]) {
  if (isDev) console.warn('[spotifyClient] rate limit', ...args);
}

// Retry-After est en secondes ("3") ou, plus rarement, une date HTTP
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, (date - Date.now()) / 1000);
}

function rateLimitError(retryAfterSeconds: number): SpotifyApiError {
  const seconds = Math.ceil(retryAfterSeconds);
  return new SpotifyApiError(
    `Spotify limite temporairement les requêtes. Réessaie dans ${seconds} s.`,
    429,
    seconds
  );
}

// Attend la fin de la pause commune. Si elle est trop longue, échoue tout de suite
// (inutile d'envoyer une requête dont on sait qu'elle sera refusée)
async function waitForCooldown(): Promise<void> {
  const remainingMs = cooldownUntil - Date.now();
  if (remainingMs <= 0) return;
  if (remainingMs > MAX_RETRY_AFTER_SECONDS * 1000) throw rateLimitError(remainingMs / 1000);
  await wait(remainingMs + jitter());
}

// Dev uniquement : localStorage.setItem('debug_simulate_429', '3') → les 3 prochaines requêtes
// reçoivent un faux 429 (Retry-After: 2), pour tester le comportement sans vraiment saturer l'API
function takeSimulated429(): Response | null {
  // Pas de localStorage côté serveur (route API)
  if (!isDev || typeof window === 'undefined') return null;
  const remaining = Number(localStorage.getItem(SIMULATE_429_KEY) ?? 0);
  if (!(remaining > 0)) return null;
  localStorage.setItem(SIMULATE_429_KEY, String(remaining - 1));
  return new Response(JSON.stringify({ error: { status: 429, message: 'simulated' } }), {
    status: 429,
    headers: { 'Retry-After': '2' },
  });
}

// Refresh en cours, partagé par les appels simultanés pour n'en faire qu'un seul
let refreshPromise: Promise<string> | null = null;

function refreshSession(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const session = getStoredSession();
    if (!session?.refreshToken) {
      throw new SpotifyApiError('Aucune session Spotify, connecte-toi', 401);
    }
    try {
      const tokens = await refreshAccessToken(session.refreshToken);
      saveSession({ ...session, ...tokens });
      debugLog('token rafraîchi');
      return tokens.accessToken;
    } catch (err) {
      debugLog('échec du refresh', err);
      clearSession();
      throw new SpotifyApiError('Session Spotify expirée, reconnecte-toi', 401);
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function resolveAccessToken(explicitToken?: string): Promise<string> {
  if (explicitToken) return explicitToken;

  const session = getStoredSession();
  if (!session) {
    throw new SpotifyApiError('Aucune session Spotify, connecte-toi', 401);
  }
  if (Date.now() >= session.expiresAt - REFRESH_MARGIN_MS) {
    return refreshSession();
  }
  return session.accessToken;
}

// Token valide de la session du navigateur (rafraîchi si besoin), pour l'envoyer à nos routes API
export function getValidAccessToken(): Promise<string> {
  return resolveAccessToken();
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
  const method = init.method ?? 'GET';

  const send = async (token: string): Promise<Response> => {
    const simulated = takeSimulated429();
    if (simulated) {
      debugLog(method, url, 429, '(simulé)');
      return simulated;
    }

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
    return response;
  };

  let hasRefreshed = false;

  for (let retry = 0; ; retry++) {
    await waitForCooldown();
    let response = await send(await resolveAccessToken(accessToken));

    // Token révoqué ou expiré plus tôt que prévu : un seul refresh, puis on renvoie la requête
    if (response.status === 401 && !accessToken && !hasRefreshed) {
      hasRefreshed = true;
      response = await send(await refreshSession());
    }

    if (response.ok) {
      // Certains endpoints (PUT/DELETE) répondent 204 sans corps
      if (response.status === 204) return undefined as T;
      return response.json() as Promise<T>;
    }

    // Rate limit : pause commune de la durée demandée par Spotify, puis nouvelle tentative
    if (response.status === 429) {
      const retryAfterSeconds =
        parseRetryAfter(response.headers.get('Retry-After')) ?? DEFAULT_RETRY_AFTER_SECONDS;
      cooldownUntil = Math.max(cooldownUntil, Date.now() + retryAfterSeconds * 1000);

      if (retry >= MAX_RETRIES || retryAfterSeconds > MAX_RETRY_AFTER_SECONDS) {
        rateLimitWarn(`abandon après ${retry + 1} essai(s)`, method, url);
        throw rateLimitError(retryAfterSeconds);
      }
      rateLimitWarn(
        `429, nouvelle tentative ${retry + 1}/${MAX_RETRIES} dans ${retryAfterSeconds}s`,
        method,
        url
      );
      continue;
    }

    // Erreur serveur passagère : attente croissante (500 ms, 1 s), GET uniquement
    if (RETRYABLE_SERVER_STATUSES.has(response.status) && method === 'GET' && retry < MAX_RETRIES) {
      const delayMs = SERVER_RETRY_BASE_DELAY_MS * 2 ** retry + jitter();
      debugLog(`${response.status}, nouvelle tentative dans ${Math.round(delayMs)}ms`, url);
      await wait(delayMs);
      continue;
    }

    // Format d'erreur Spotify : { error: { status, message } }
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.error?.message ?? response.statusText;
    throw new SpotifyApiError(`Spotify API ${response.status} : ${message}`, response.status);
  }
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
