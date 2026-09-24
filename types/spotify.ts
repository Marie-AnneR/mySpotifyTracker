import { User } from '@/types/models';

// Fenêtres temporelles natives de Spotify :
// short_term ≈ 4 dernières semaines, medium_term ≈ 6 derniers mois, long_term ≈ ~1 an
export const TIME_RANGES = ['short_term', 'medium_term', 'long_term'] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

export interface SpotifySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
}
