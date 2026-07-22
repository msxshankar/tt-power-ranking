'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Player } from '@/lib/types';
import { addMatchAction } from '@/lib/actions';
import { isValidGameScore } from '@/lib/elo';

interface AddMatchSectionProps {
  players: Player[];
}

export default function AddMatchSection({ players: initialPlayers }: AddMatchSectionProps) {
  const router = useRouter();

  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [matchType, setMatchType] = useState<'11' | '21'>('11');
  const [games, setGames] = useState<(number | '')[][]>([
    ['', ''],
    ['', ''],
    ['', ''],
  ]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchDate, setMatchDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });



  // Handle score change
  const handleScoreChange = (gameIndex: number, playerIndex: 0 | 1, value: string) => {
    const numericValue = value === '' ? '' : parseInt(value);
    const safeValue = typeof numericValue === 'number' && isNaN(numericValue) ? '' : numericValue;
    const newGames = [...games];
    newGames[gameIndex] = [...newGames[gameIndex]];
    newGames[gameIndex][playerIndex] = safeValue;
    setGames(newGames);
  };

  // Add a new game row
  const addGameRow = () => {
    setGames([...games, ['', '']]);
  };

  // Remove a game row
  const removeGameRow = (index: number) => {
    if (games.length <= 1) return;
    setGames(games.filter((_, i) => i !== index));
  };



  // Handle Match submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!player1Id || !player2Id) {
      setError('Please select both players.');
      return;
    }
    if (player1Id === player2Id) {
      setError('A player cannot play against themselves.');
      return;
    }

    // Ignore unused score rows, but require both scores whenever a row is started.
    const completedGames: (number | '')[][] = [];
    let player1Wins = 0;
    let player2Wins = 0;
    for (let i = 0; i < games.length; i++) {
      const [s1, s2] = games[i];
      if (s1 === '' && s2 === '') {
        continue;
      }
      if (s1 === '' || s2 === '') {
        setError(`Please enter both scores for Game ${i + 1}.`);
        return;
      }
      if (!isValidGameScore(s1 as number, s2 as number, matchType)) {
        setError(`Game ${i + 1} has an invalid score (${s1}-${s2}) for games to ${matchType}. Remember, players must win by 2 clear points.`);
        return;
      }
      if ((s1 as number) > (s2 as number)) player1Wins++;
      else player2Wins++;
      completedGames.push([s1, s2]);
    }

    if (completedGames.length === 0) {
      setError('Please enter scores for at least one game.');
      return;
    }

    if (player1Wins === player2Wins) {
      setError('Matches cannot end in a tie of games.');
      return;
    }

    setIsSubmitting(true);
    const now = new Date();
    const [year, month, day] = matchDate.split('-').map(Number);
    const dateObj = new Date(
      year,
      month - 1,
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );
    const result = await addMatchAction(player1Id, player2Id, matchType, completedGames as [number, number][], dateObj.toISOString());
    setIsSubmitting(false);

    if (result.success) {
      setSuccess('Match recorded successfully!');
      // Reset form
      setPlayer1Id('');
      setPlayer2Id('');
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      setMatchDate(`${y}-${m}-${d}`);
      setGames([
        ['', ''],
        ['', ''],
        ['', ''],
      ]);
      router.refresh();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Failed to record match.');
    }
  };

  return (
    <div className="glass-panel glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="card-title">
        🏓 Record New Match
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
          Singles Only
        </span>
      </h2>



      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {error && (
          <div style={{
            background: 'var(--tag-loss-bg)',
            color: 'var(--tag-loss-text)',
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
            lineHeight: '1.4'
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'var(--tag-win-bg)',
            color: 'var(--tag-win-text)',
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
            lineHeight: '1.4'
          }}>
            ✅ {success}
          </div>
        )}

        {/* Players Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div className="form-group">
            <label className="form-label">Player 1</label>
            <select
              value={player1Id}
              onChange={(e) => setPlayer1Id(e.target.value)}
              className="form-select"
              style={{ padding: '10px 12px', fontSize: '14px' }}
              required
            >
              <option value="">Select...</option>
              {initialPlayers.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === player2Id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Player 2</label>
            <select
              value={player2Id}
              onChange={(e) => setPlayer2Id(e.target.value)}
              className="form-select"
              style={{ padding: '10px 12px', fontSize: '14px' }}
              required
            >
              <option value="">Select...</option>
              {initialPlayers.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === player1Id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Match Date */}
        <div className="form-group" style={{ marginBottom: '12px' }}>
          <label className="form-label">Match Date</label>
          <input
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            className="form-input"
            required
            style={{ padding: '10px 12px', fontSize: '14px' }}
          />
        </div>

        {/* Match Type */}
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Game Point Rules</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn"
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '12px',
                ...(matchType === '11' ? {
                  background: 'var(--accent-gradient)',
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 4px 14px var(--accent-glow)',
                } : {}),
              }}
              onClick={() => setMatchType('11')}
            >
              🏓 Up to 11
            </button>
            <button
              type="button"
              className="btn"
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '12px',
                ...(matchType === '21' ? {
                  background: 'var(--accent-gradient)',
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 4px 14px var(--accent-glow)',
                } : {}),
              }}
              onClick={() => setMatchType('21')}
            >
              🏓 Up to 21
            </button>
          </div>
        </div>

        {/* Game Scores Inputs */}
        <div style={{ marginBottom: '20px', flexGrow: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="form-label">Game Scores</span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={addGameRow}
              style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '8px' }}
            >
              ＋ Add Game
            </button>
          </div>

          <div style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
            {games.map((game, index) => (
              <div key={index} className="game-score-row" style={{ marginBottom: '6px' }}>
                <span className="game-score-label">G{index + 1}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min="0"
                    value={game[0]}
                    onChange={(e) => handleScoreChange(index, 0, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="form-input"
                    style={{ width: '48px', padding: '6px', fontSize: '14px' }}
                  />
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>:</span>
                  <input
                    type="number"
                    min="0"
                    value={game[1]}
                    onChange={(e) => handleScoreChange(index, 1, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="form-input"
                    style={{ width: '48px', padding: '6px', fontSize: '14px' }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-icon-only btn-danger"
                  onClick={() => removeGameRow(index)}
                  disabled={games.length <= 1}
                  style={{ width: '24px', height: '24px', borderRadius: '6px' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', marginTop: 'auto' }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving Match...' : 'Save Match'}
        </button>
      </form>
    </div>
  );
}
