export type Screen = 'splash' | 'home' | 'games' | 'match' | 'challenge' | 'ludo' | 'result' | 'leaderboard' | 'profile';
export type MatchMode = 'solo' | 'challenge' | 'quick' | 'ranked';

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
