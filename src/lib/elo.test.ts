import { isValidGameScore, validateMatchScores, calculateRankings } from './elo';
import { Player, Match } from './types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('🧪 Starting TT Power Ranker core logic tests...\n');

// 1. Test isValidGameScore
console.log('Testing isValidGameScore...');
assert(isValidGameScore(11, 9, '11') === true, '11-9 is a valid 11-point score');
assert(isValidGameScore(9, 11, '11') === true, '9-11 is a valid 11-point score');
assert(isValidGameScore(11, 10, '11') === false, '11-10 is invalid (must win by 2)');
assert(isValidGameScore(12, 10, '11') === true, '12-10 is a valid 11-point score (deuce)');
assert(isValidGameScore(13, 11, '11') === true, '13-11 is a valid 11-point score');
assert(isValidGameScore(14, 11, '11') === false, '14-11 is invalid (must be win by exactly 2 above target)');
assert(isValidGameScore(5, 5, '11') === false, '5-5 is incomplete');

assert(isValidGameScore(21, 19, '21') === true, '21-19 is a valid 21-point score');
assert(isValidGameScore(21, 20, '21') === false, '21-20 is invalid (must win by 2)');
assert(isValidGameScore(23, 21, '21') === true, '23-21 is a valid 21-point score (deuce)');
console.log('✅ isValidGameScore tests passed.\n');

// 2. Test validateMatchScores
console.log('Testing validateMatchScores...');
const v1 = validateMatchScores([[11, 9], [11, 5]], '11');
assert(v1.isValid === true, 'Best of 2 matches won (2-0)');
assert(v1.winnerIndex === 0, 'Player 1 should be the winner');

const v2 = validateMatchScores([[11, 9], [5, 11], [12, 10]], '11');
assert(v2.isValid === true, 'Best of 3 matches won (2-1)');
assert(v2.winnerIndex === 0, 'Player 1 should be the winner');

const v3 = validateMatchScores([[11, 9], [9, 11]], '11');
assert(v3.isValid === false, 'Match cannot end in a draw of games');

const v4 = validateMatchScores([[11, 10]], '11');
assert(v4.isValid === false, 'Invalid game score makes match invalid');
console.log('✅ validateMatchScores tests passed.\n');

// 3. Test calculateRankings
console.log('Testing calculateRankings...');
const mockPlayers: Player[] = [
  { id: 'p1', name: 'Alice', created_at: '' },
  { id: 'p2', name: 'Bob', created_at: '' },
  { id: 'p3', name: 'Charlie', created_at: '' },
];

const mockMatches: Match[] = [
  // Alice beats Bob in an 11-point match
  {
    id: 1,
    player1_id: 'p1',
    player2_id: 'p2',
    match_type: '11',
    game_scores: [[11, 9], [11, 8]],
    winner_id: 'p1',
    created_at: '',
  },
  // Bob beats Charlie in a 21-point match
  {
    id: 2,
    player1_id: 'p2',
    player2_id: 'p3',
    match_type: '21',
    game_scores: [[21, 15], [21, 17]],
    winner_id: 'p2',
    created_at: '',
  }
];

const rankings = calculateRankings(mockPlayers, mockMatches);
const stats = rankings.playerStats;

// Alice stats (1 win, 0 losses in 11, ELO should go up from 1200)
const alice = stats.find(p => p.id === 'p1')!;
assert(alice.wins11 === 1 && alice.losses11 === 0, 'Alice should have 1 win and 0 losses for games to 11');
assert(alice.elo > 1200, 'Alice ELO should have increased');

// Charlie stats (0 wins, 1 loss in 21, ELO should go down from 1200)
const charlie = stats.find(p => p.id === 'p3')!;
assert(charlie.wins21 === 0 && charlie.losses21 === 1, 'Charlie should have 0 wins and 1 loss for games to 21');
assert(charlie.elo < 1200, 'Charlie ELO should have decreased');

// Bob stats (1 loss in 11, 1 win in 21)
const bob = stats.find(p => p.id === 'p2')!;
assert(bob.wins21 === 1 && bob.losses11 === 1, 'Bob should have 1 win in 21 and 1 loss in 11');

// Ranking orders
assert(rankings.playerStats[0].id === 'p1', 'Alice should be ranked #1');
assert(rankings.top5.length === 3, 'Top 5 should return all 3 players');
assert(rankings.recentMatches.length === 2, 'Should return both matches');
assert(rankings.recentMatches[0].id === 2, 'Recent matches should be sorted in reverse (newest first)');
assert(rankings.recentMatches[0].player1_name === 'Bob', 'Player names should be mapped correctly');

console.log('✅ calculateRankings tests passed.\n');
console.log('🎉 All core business logic tests completed successfully!');
