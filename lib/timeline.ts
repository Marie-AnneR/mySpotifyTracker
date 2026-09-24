import { groupBy } from '@/lib/aggregations';

// Helpers temporels génériques : fonctionnent avec tout modèle daté
// (PlayEvent via playedAtMs, LikedTrack via addedAtMs) grâce à une fonction d'accès.
type GetTime<T> = (item: T) => number;

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (value: number) => String(value).padStart(2, '0');

// Clés dans le fuseau horaire local : une écoute à 23h30 à Paris compte pour le bon jour
export function toDayKey(timestampMs: number): string {
  const date = new Date(timestampMs);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toMonthKey(timestampMs: number): string {
  const date = new Date(timestampMs);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

// Du plus récent au plus ancien
export function sortByTimeDesc<T>(items: T[], getTime: GetTime<T>): T[] {
  return [...items].sort((a, b) => getTime(b) - getTime(a));
}

// Éléments des `days` derniers jours, à partir de maintenant
export function filterLastDays<T>(
  items: T[],
  getTime: GetTime<T>,
  days: number,
  now = Date.now()
): T[] {
  const since = now - days * DAY_MS;
  return items.filter((item) => getTime(item) >= since);
}

// Groupes du plus récent au plus ancien. Les périodes vides ne sont pas incluses.
export function groupByDay<T>(items: T[], getTime: GetTime<T>): Map<string, T[]> {
  return groupBy(sortByTimeDesc(items, getTime), (item) => toDayKey(getTime(item)));
}

export function groupByMonth<T>(items: T[], getTime: GetTime<T>): Map<string, T[]> {
  return groupBy(sortByTimeDesc(items, getTime), (item) => toMonthKey(getTime(item)));
}

// Période réellement couverte, utile pour signaler une vue incomplète
// (ex. "7 derniers jours" alors que l'historique ne remonte qu'à 2 jours)
export function getCoveredRange<T>(
  items: T[],
  getTime: GetTime<T>
): { from: number; to: number } | null {
  if (items.length === 0) return null;
  let from = Infinity;
  let to = -Infinity;
  for (const item of items) {
    const time = getTime(item);
    if (time < from) from = time;
    if (time > to) to = time;
  }
  return { from, to };
}

// Accesseurs prêts à l'emploi pour les modèles internes
export const playedAt = (play: { playedAtMs: number }) => play.playedAtMs;
export const addedAt = (like: { addedAtMs: number }) => like.addedAtMs;
