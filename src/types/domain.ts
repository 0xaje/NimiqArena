export type MatchMode = 'solo' | 'challenge' | 'quick' | 'ranked';

export type Screen = 'splash' | 'home' | 'games' | 'match' | 'challenge' | 'ludo' | 'result' | 'leaderboard' | 'profile';

export interface PlayerProfile {
  handle: string;
  rating: number;
  rank: string;
  streak: number;
  games: number;
  wins: number;
  avatarSeed: string;
}

export interface LeaderboardEntry {
  rank: number;
  handle: string;
  rating: number;
  streak: number;
  isCurrentUser?: boolean;
}

export interface MatchSummary {
  mode: MatchMode;
  opponent: string;
  status: 'development-preview';
}

export interface NimiqWalletPort {
  readonly status: 'not-configured';
  connect(): Promise<never>;
  requestPayment(): Promise<never>;
}
