import { RecentPlay } from '@/types/recentPlay';

const DAY_MS = 24 * 60 * 60 * 1000;

// Fonctions pures, sans appel API : base des vues temporelles ("7 derniers jours"…)

// Clé de jour au format YYYY-MM-DD, dans le fuseau horaire local de l'utilisateur
export function toDayKey(timestampMs: number): string {
  const date = new Date(timestampMs);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// Écoutes des `days` derniers jours, à partir de maintenant
export function filterLastDays(plays: RecentPlay[], days: number, now = Date.now()): RecentPlay[] {
  const since = now - days * DAY_MS;
  return plays.filter((play) => play.playedAtMs >= since);
}

// Regroupe par jour local, jours du plus récent au plus ancien
export function groupByDay(plays: RecentPlay[]): Map<string, RecentPlay[]> {
  const sorted = [...plays].sort((a, b) => b.playedAtMs - a.playedAtMs);
  const groups = new Map<string, RecentPlay[]>();
  for (const play of sorted) {
    const key = toDayKey(play.playedAtMs);
    groups.set(key, [...(groups.get(key) ?? []), play]);
  }
  return groups;
}

// Période réellement couverte par l'historique, utile pour signaler une vue incomplète
// (ex. "7 derniers jours" alors que les 50 écoutes ne remontent qu'à 2 jours)
export function getCoveredRange(plays: RecentPlay[]): { from: number; to: number } | null {
  if (plays.length === 0) return null;
  const timestamps = plays.map((play) => play.playedAtMs);
  return { from: Math.min(...timestamps), to: Math.max(...timestamps) };
}
