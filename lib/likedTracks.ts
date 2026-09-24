import { LikedTrack } from '@/types/likedTrack';

// Clé de mois au format YYYY-MM, dans le fuseau horaire local de l'utilisateur
export function toMonthKey(timestampMs: number): string {
  const date = new Date(timestampMs);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Timeline mensuelle des likes, du mois le plus récent au plus ancien.
// Les mois sans like ne sont pas inclus : à combler côté UI si besoin d'un axe continu.
export function groupLikesByMonth(likes: LikedTrack[]): Map<string, LikedTrack[]> {
  const sorted = [...likes].sort((a, b) => b.addedAtMs - a.addedAtMs);
  const groups = new Map<string, LikedTrack[]>();
  for (const like of sorted) {
    const key = toMonthKey(like.addedAtMs);
    groups.set(key, [...(groups.get(key) ?? []), like]);
  }
  return groups;
}
