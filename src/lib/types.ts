export interface Player {
  id: string;
  name: string;
  created_at: string;
}

export interface Match {
  id: number;
  player1_id: string;
  player2_id: string;
  match_type: '11' | '21';
  game_scores: [number, number][]; // Array of [player1_score, player2_score]
  winner_id: string;
  created_at: string;
}

export interface PlayerStats {
  id: string;
  name: string;
  elo: number;
  wins11: number;
  losses11: number;
  wins21: number;
  losses21: number;
  totalWins: number;
  totalLosses: number;
}
