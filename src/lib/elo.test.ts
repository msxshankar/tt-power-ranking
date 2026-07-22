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
  { id: 'p4', name: 'David', created_at: '' },
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

// Alice stats (2 game wins, 0 losses in 11, ELO should go up from 1200)
const alice = stats.find(p => p.id === 'p1')!;
assert(alice.wins11 === 2 && alice.losses11 === 0, 'Alice should have 2 wins and 0 losses for games to 11');
assert(alice.elo > 1200, 'Alice ELO should have increased');

// Charlie stats (0 wins, 2 losses in 21, ELO should go down from 1200)
const charlie = stats.find(p => p.id === 'p3')!;
assert(charlie.wins21 === 0 && charlie.losses21 === 2, 'Charlie should have 0 wins and 2 losses for games to 21');
assert(charlie.elo < 1200, 'Charlie ELO should have decreased');

// Bob stats (2 losses in 11, 2 wins in 21)
const bob = stats.find(p => p.id === 'p2')!;
assert(bob.wins21 === 2 && bob.losses11 === 2, 'Bob should have 2 wins in 21 and 2 losses in 11');

// Ranking orders
assert(rankings.playerStats[0].id === 'p1', 'Alice should be ranked #1');
assert(rankings.top5.length === 3, 'Top 5 should return all 3 active players (excluding David)');
assert(rankings.top5.find(p => p.id === 'p4') === undefined, 'David should not be in Top 5 since he has 0 matches');
assert(rankings.recentMatches.length === 2, 'Should return both matches');
assert(rankings.recentMatches[0].id === 2, 'Recent matches should be sorted in reverse (newest first)');
assert(rankings.recentMatches[0].player1_name === 'Bob', 'Player names should be mapped correctly');

console.log('✅ calculateRankings tests passed.\n');

// 4. Test calculateRankings with backdated matches
console.log('Testing calculateRankings with backdated matches...');
const backdatePlayers: Player[] = [
  { id: 'pa', name: 'Alice', created_at: '2026-01-01T00:00:00Z' },
  { id: 'pb', name: 'Bob', created_at: '2026-01-01T00:00:00Z' },
];

const backdateMatches: Match[] = [
  // Match #1 logged on Jan 2nd (Bob wins)
  {
    id: 1,
    player1_id: 'pa',
    player2_id: 'pb',
    match_type: '11',
    game_scores: [[9, 11], [8, 11]],
    winner_id: 'pb',
    created_at: '2026-01-02T10:00:00Z',
  },
  // Match #2 logged later with higher ID, but backdated to Jan 1st (Alice wins)
  {
    id: 2,
    player1_id: 'pa',
    player2_id: 'pb',
    match_type: '11',
    game_scores: [[11, 9], [11, 8]],
    winner_id: 'pa',
    created_at: '2026-01-01T10:00:00Z',
  },
];

const backdateRankings = calculateRankings(backdatePlayers, backdateMatches);
// Verify that Match #2 (Jan 1st) was processed before Match #1 (Jan 2nd)
assert(backdateRankings.eloHistory[1].matchId === 2, 'Backdated match #2 (Jan 1st) must be processed first in eloHistory');
assert(backdateRankings.eloHistory[2].matchId === 1, 'Match #1 (Jan 2nd) must be processed second in eloHistory');

const paStats = backdateRankings.playerStats.find(p => p.id === 'pa')!;
const pbStats = backdateRankings.playerStats.find(p => p.id === 'pb')!;
// In chronological order (Jan 1st: Alice beats Bob, Jan 2nd: Bob beats 1216-rated Alice):
assert(paStats.elo === 1199 && pbStats.elo === 1201, 'Ratings calculated accurately in chronological order');
console.log('✅ Backdated match sorting tests passed.\n');

console.log('🎉 All core business logic tests completed successfully!');
