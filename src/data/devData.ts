import type { LeaderboardEntry, PlayerProfile } from '../types/domain';

/**
 * Development preview data only. It is intentionally isolated from production services
 * and must not be described as live users, ratings, balances, or blockchain results.
 */
export const devProfile: PlayerProfile = {
  handle: '0xAje',
  rating: 1842,
  rank: 'Diamond',
  streak: 7,
  games: 127,
  wins: 83,
  avatarSeed: 'aje',
};

export const devLeaderboard: LeaderboardEntry[] = [
  { rank: 1, handle: 'NimiqKing', rating: 2341, streak: 12 },
  { rank: 2, handle: 'Luna', rating: 2214, streak: 9 },
  { rank: 3, handle: '0xAje', rating: 1842, streak: 7, isCurrentUser: true },
  { rank: 4, handle: 'Orbit', rating: 1768, streak: 4 },
];
