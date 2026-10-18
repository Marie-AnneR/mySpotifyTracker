import { Artist, LikedTrack, Track } from '@/types/models';
import { TimeRange } from '@/types/spotify';

// Sortie de la couche KPI, pensée pour être affichée telle quelle par l'UI.
// Liste des KPI V1 et contraintes métier : docs/kpis.md

export interface Ranked<T> {
  // 1 = premier
  rank: number;
  item: T;
}

export interface GenreStat {
  genre: string;
  // Nombre d'artistes du top qui portent ce genre
  artistCount: number;
  // Part des artistes du top (avec au moins un genre) qui portent ce genre, entre 0 et 1
  share: number;
  // Artistes les mieux classés portant ce genre, pour illustrer ("pop : Dua Lipa, The Weeknd…")
  topArtistNames: string[];
}

export interface PeriodStats {
  // Moyenne de popularité (0–100) des top artistes : plus c'est haut, plus les goûts sont mainstream.
  // null si Spotify ne fournit pas la popularité.
  mainstreamScore: number | null;
  // Nombre de genres différents parmi les top artistes
  distinctGenres: number;
  // Part des top artistes (0–1) pour lesquels au moins un genre est connu : fiabilité des top genres
  genreCoverage: number;
  // Nombre d'artistes différents crédités sur les top tracks
  distinctArtistsInTopTracks: number;
}

export interface PeriodKpis {
  timeRange: TimeRange;
  // Libellé prêt à afficher, ex. "4 dernières semaines"
  label: string;
  topTracks: Ranked<Track>[];
  topArtists: Ranked<Artist>[];
  topGenres: GenreStat[];
  // false si Spotify ne renvoie aucun genre (le bloc genres est alors à masquer côté UI)
  genresAvailable: boolean;
  stats: PeriodStats;
}

export interface WrappedKpis {
  // ISO 8601, date de calcul (les périodes Spotify sont glissantes)
  generatedAt: string;
  periods: Record<TimeRange, PeriodKpis>;
}

// Ce dont l'affichage d'un wrap a besoin : commun au Wrapped Spotify et au wrap mensuel
export type WrapViewData = Pick<PeriodKpis, 'label' | 'topTracks' | 'topArtists' | 'topGenres'>;

// --- Wrap mensuel depuis les snapshots (#17). Règles et limites : docs/monthly-wrap.md ---

export interface WrapPeriod {
  // "2026-10"
  key: string;
  // ISO 8601, début inclus / fin exclue, en UTC
  start: string;
  end: string;
}

export type WrapQuality = 'good' | 'partial' | 'insufficient';

export interface WrapCoverage {
  // Snapshots retenus (au plus un par jour)
  snapshotsUsed: number;
  // Jours de la période couverts par au moins une fenêtre de snapshot
  coveredDays: number;
  // Jours de la période déjà écoulés (un mois en cours n'est pas pénalisé pour l'avenir)
  elapsedDays: number;
  // coveredDays / elapsedDays, entre 0 et 1
  ratio: number;
  quality: WrapQuality;
}

// Réponse de l'API : classements agrégés depuis la base, sans genres enrichis
export interface MonthlyWrapData {
  period: WrapPeriod;
  coverage: WrapCoverage;
  // Ordre = classement agrégé (index 0 = n°1)
  tracks: Track[];
  artists: Artist[];
  // Titres likés pendant la période (exact, grâce à added_at), du plus récent au plus ancien
  likedTracks: LikedTrack[];
}

// Wrap prêt pour l'UI, après enrichissement des genres côté navigateur
export interface MonthlyWrap extends WrapViewData {
  period: WrapPeriod;
  coverage: WrapCoverage;
  genresAvailable: boolean;
  stats: PeriodStats;
  likes: { count: number; latest: LikedTrack[] };
}
