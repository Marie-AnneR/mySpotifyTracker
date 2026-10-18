import { WrapCoverage, WrapQuality } from '@/types/kpis';

// Moteur du wrap mensuel (#17) : fonctions pures, sans base ni API.
// Règles, exemples et limites : docs/monthly-wrap.md

const DAY_MS = 24 * 60 * 60 * 1000;
// Fenêtre approximative du top "short_term" de Spotify (~4 semaines avant le snapshot)
export const SHORT_TERM_WINDOW_DAYS = 28;
const WINDOW_MS = SHORT_TERM_WINDOW_DAYS * DAY_MS;
// Taille des tops enregistrés dans un snapshot : n°1 = 50 points … n°50 = 1 point
export const TOP_SIZE = 50;

// Seuils de qualité, sur la part des jours écoulés couverts par au moins un snapshot
const GOOD_COVERAGE = 0.9;
const PARTIAL_COVERAGE = 0.3;

export interface TimeRangeMs {
  // Début inclus, fin exclue
  start: number;
  end: number;
}

export interface SnapshotRef {
  id: string;
  createdAtMs: number;
}

export interface WeightedSnapshot extends SnapshotRef {
  // Fenêtre [createdAt − 28 j, createdAt] décrite par son top short_term
  windowStart: number;
  windowEnd: number;
  // Part de la fenêtre qui tombe dans la période (0–1) : poids du snapshot dans l'agrégation
  weight: number;
}

// "2026-10" → [1er octobre 00:00 UTC, 1er novembre 00:00 UTC[
export function parseMonthKey(key: string): TimeRangeMs | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  return { start: Date.UTC(year, month, 1), end: Date.UTC(year, month + 1, 1) };
}

// Bornes des dates de snapshot utiles : leur fenêtre de 28 jours doit chevaucher la période
export function snapshotSearchRange(range: TimeRangeMs): TimeRangeMs {
  return { start: range.start, end: range.end + WINDOW_MS };
}

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

// Règles de sélection :
// 1. au plus un snapshot par jour (UTC), le plus récent : cliquer 5 fois ne pèse pas 5 fois plus
// 2. on garde ceux dont la fenêtre chevauche la période, pondérés par la taille du chevauchement
export function selectSnapshots(runs: SnapshotRef[], range: TimeRangeMs): WeightedSnapshot[] {
  const latestByDay = new Map<string, SnapshotRef>();
  for (const run of runs) {
    const day = new Date(run.createdAtMs).toISOString().slice(0, 10);
    const current = latestByDay.get(day);
    if (!current || run.createdAtMs > current.createdAtMs) latestByDay.set(day, run);
  }

  return [...latestByDay.values()]
    .map((run) => {
      const windowStart = run.createdAtMs - WINDOW_MS;
      const windowEnd = run.createdAtMs;
      return {
        ...run,
        windowStart,
        windowEnd,
        weight: overlap(windowStart, windowEnd, range.start, range.end) / WINDOW_MS,
      };
    })
    .filter((snapshot) => snapshot.weight > 0)
    .sort((a, b) => a.createdAtMs - b.createdAtMs);
}

// Part de la période (jusqu'à aujourd'hui) réellement couverte par les fenêtres des snapshots
export function computeCoverage(
  snapshots: WeightedSnapshot[],
  range: TimeRangeMs,
  now = Date.now()
): WrapCoverage {
  // Un mois en cours n'est évalué que sur les jours déjà écoulés
  const effectiveEnd = Math.min(range.end, now);
  const elapsedMs = Math.max(0, effectiveEnd - range.start);

  // Union des intervalles [fenêtre ∩ période] : les chevauchements entre snapshots ne comptent qu'une fois
  const intervals = snapshots
    .map((s) => [Math.max(s.windowStart, range.start), Math.min(s.windowEnd, effectiveEnd)])
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);

  let coveredMs = 0;
  let cursor = -Infinity;
  for (const [start, end] of intervals) {
    const from = Math.max(start, cursor);
    if (end > from) coveredMs += end - from;
    cursor = Math.max(cursor, end);
  }

  const ratio = elapsedMs > 0 ? coveredMs / elapsedMs : 0;
  let quality: WrapQuality = 'insufficient';
  if (snapshots.length > 0 && ratio >= GOOD_COVERAGE) quality = 'good';
  else if (snapshots.length > 0 && ratio >= PARTIAL_COVERAGE) quality = 'partial';

  return {
    snapshotsUsed: snapshots.length,
    coveredDays: Math.round((coveredMs / DAY_MS) * 10) / 10,
    elapsedDays: Math.round((elapsedMs / DAY_MS) * 10) / 10,
    ratio,
    quality,
  };
}

export interface RankedEntry<T> {
  id: string;
  rank: number;
  value: T;
}

// Classement agrégé (méthode de Borda pondérée) :
// score = Σ poids du snapshot × (51 − rang). Un titre n°1 sur tout le mois bat un titre n°1
// sur quelques jours seulement. À égalité, le meilleur rang obtenu départage.
// Les listes doivent être triées du plus ancien au plus récent : on garde la version la plus
// récente de chaque élément (nom, image…).
export function aggregateRankings<T>(
  lists: { weight: number; entries: RankedEntry<T>[] }[]
): T[] {
  const scores = new Map<string, { score: number; bestRank: number; value: T }>();

  for (const { weight, entries } of lists) {
    for (const { id, rank, value } of entries) {
      const points = weight * (TOP_SIZE + 1 - rank);
      const current = scores.get(id);
      scores.set(id, {
        score: (current?.score ?? 0) + points,
        bestRank: Math.min(current?.bestRank ?? Infinity, rank),
        value,
      });
    }
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score || a.bestRank - b.bestRank)
    .map((entry) => entry.value);
}
