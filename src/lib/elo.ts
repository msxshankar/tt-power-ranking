import { Player, Match, PlayerStats } from './types';

/**
 * Validates a single game score based on table tennis rules.
 * - For 11-point games: must reach at least 11, and win by 2 clear points.
 * - For 21-point games: must reach at least 21, and win by 2 clear points.
 */
export function isValidGameScore(score1: number, score2: number, type: '11' | '21'): boolean {
  if (score1 < 0 || score2 < 0) return false;
  
  const target = type === '11' ? 11 : 21;
  const max = Math.max(score1, score2);
  const min = Math.min(score1, score2);

  if (max < target) {
    return false; // Game not finished
  }
  
  if (max === target) {
    return min <= target - 2; // e.g. 11-9 is valid, 11-10 is invalid (must win by 2)
  }
  
  // If score goes beyond the target (deuce rules)
  return max - min === 2;
}

/**
 * Validates an entire match score sheet.
 * Returns true if all games are valid and one player won the majority of the games.
 */
export function validateMatchScores(gameScores: [number, number][], type: '11' | '21'): {
  isValid: boolean;
  error?: string;
  winnerIndex?: 0 | 1;
  player1Games: number;
  player2Games: number;
} {
  if (!gameScores || gameScores.length === 0) {
    return { isValid: false, error: 'At least one game score is required', player1Games: 0, player2Games: 0 };
  }

  let player1Games = 0;
  let player2Games = 0;

  for (let i = 0; i < gameScores.length; i++) {
    const [s1, s2] = gameScores[i];
    if (!isValidGameScore(s1, s2, type)) {
      return {
        isValid: false,
        error: `Game ${i + 1} has an invalid score (${s1}-${s2}) for a ${type}-point game.`,
        player1Games: 0,
        player2Games: 0
      };
    }
    if (s1 > s2) player1Games++;
    else player2Games++;
  }

  if (player1Games === player2Games) {
    return {
      isValid: false,
      error: 'The match cannot end in a draw of games.',
      player1Games,
      player2Games
    };
  }

  return {
    isValid: true,
    winnerIndex: player1Games > player2Games ? 0 : 1,
    player1Games,
    player2Games
  };
}

/**
 * Computes live player statistics and ELO rankings by processing all matches chronologically.
 */
export function calculateRankings(players: Player[], matches: Match[]): {
  playerStats: PlayerStats[];
  top5: PlayerStats[];
  recentMatches: (Match & {
    player1_name: string;
    player2_name: string;
    winner_name: string;
    player1_games: number;
    player2_games: number;
  })[];
  eloHistory: {
    label: string;
    matchId: number;
    date: string;
    ratings: Record<string, number>;
  }[];
} {
  // Initialize statistics for all players
  const statsMap: Record<string, PlayerStats> = {};
  for (const player of players) {
    statsMap[player.id] = {
      id: player.id,
      name: player.name,
      elo: 1200,
      wins11: 0,
      losses11: 0,
      wins21: 0,
      losses21: 0,
      totalWins: 0,
      totalLosses: 0,
    };
  }

  // Helper to safely get timestamp value for sorting
  const getMatchTime = (createdAt?: string): number => {
    if (!createdAt) return 0;
    const t = new Date(createdAt).getTime();
    return isNaN(t) ? 0 : t;
  };

  // Process all matches in chronological order (sorted by created_at timestamp, falling back to id)
  const sortedMatches = [...matches].sort((a, b) => {
    const timeA = getMatchTime(a.created_at);
    const timeB = getMatchTime(b.created_at);
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return a.id - b.id;
  });

  const eloHistory: {
    label: string;
    matchId: number;
    date: string;
    ratings: Record<string, number>;
  }[] = [];

  // Add starting point
  const startSnapshot: Record<string, number> = {};
  for (const player of players) {
    startSnapshot[player.name] = 1200;
  }
  eloHistory.push({
    label: 'Start',
    matchId: 0,
    date: 'Initial',
    ratings: startSnapshot,
  });

  // Map player IDs to entities for O(1) lookups
  const playerMap = new Map<string, Player>(players.map(p => [p.id, p]));

  for (const match of sortedMatches) {
    const p1 = statsMap[match.player1_id];
    const p2 = statsMap[match.player2_id];

    // If any player in the match has been deleted, skip stat aggregation for this match
    if (!p1 || !p2) continue;

    const isP1Winner = match.winner_id === match.player1_id;

    // Calculate ELO update
    const r1 = p1.elo;
    const r2 = p2.elo;
    
    // Expected score
    const e1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400));
    const e2 = 1 / (1 + Math.pow(10, (r1 - r2) / 400));
    
    const s1 = isP1Winner ? 1 : 0;
    const s2 = isP1Winner ? 0 : 1;
    
    const K = 32;
    p1.elo = Math.round(r1 + K * (s1 - e1));
    p2.elo = Math.round(r2 + K * (s2 - e2));

    // Update wins & losses based on individual game scores
    const isGame11 = match.match_type === '11';
    for (const [s1, s2] of match.game_scores) {
      if (s1 > s2) {
        // Player 1 won this game
        if (isGame11) {
          p1.wins11++;
          p2.losses11++;
        } else {
          p1.wins21++;
          p2.losses21++;
        }
      } else {
        // Player 2 won this game
        if (isGame11) {
          p1.losses11++;
          p2.wins11++;
        } else {
          p1.losses21++;
          p2.wins21++;
        }
      }
    }

    p1.totalWins = p1.wins11 + p1.wins21;
    p1.totalLosses = p1.losses11 + p1.losses21;
    p2.totalWins = p2.wins11 + p2.wins21;
    p2.totalLosses = p2.losses11 + p2.losses21;

    // Record ELO snapshot for history
    const snapshot: Record<string, number> = {};
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      snapshot[player.name] = statsMap[player.id]?.elo ?? 1200;
    }
    eloHistory.push({
      label: `Match #${match.id}`,
      matchId: match.id,
      date: formatDate(match.created_at),
      ratings: snapshot,
    });
  }

  // Convert stats map to array
  const playerStatsList = Object.values(statsMap);

  // Sort by Elo rating descending
  const sortedPlayers = [...playerStatsList].sort((a, b) => b.elo - a.elo);

  // Top 5 players (or all players if less than 5) who have played at least one match
  const top5 = sortedPlayers.filter(p => (p.totalWins + p.totalLosses) > 0).slice(0, 5);

  // Last 5 recent matches, mapped with player names and game totals using O(1) Map lookups
  const recentRaw = sortedMatches.slice(-5).reverse();
  const recentMatches = recentRaw.map(m => {
    const p1 = playerMap.get(m.player1_id);
    const p2 = playerMap.get(m.player2_id);
    const winner = playerMap.get(m.winner_id);

    let p1Games = 0;
    let p2Games = 0;
    for (const [s1, s2] of m.game_scores) {
      if (s1 > s2) p1Games++;
      else p2Games++;
    }

    return {
      ...m,
      player1_name: p1 ? p1.name : 'Deleted Player',
      player2_name: p2 ? p2.name : 'Deleted Player',
      winner_name: winner ? winner.name : 'Deleted Player',
      player1_games: p1Games,
      player2_games: p2Games,
    };
  });

  return {
    playerStats: sortedPlayers,
    top5,
    recentMatches,
    eloHistory,
  };
}

export function formatDate(isoString: string): string {
  if (!isoString) return 'Unknown Date';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Unknown Date';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  
  return `${month} ${day}, ${year}`;
}
