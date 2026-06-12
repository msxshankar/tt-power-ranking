'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Player } from '@/lib/types';
import { addPlayerAction, addMatchAction } from '@/lib/actions';
import { isValidGameScore } from '@/lib/elo';

interface AddMatchSectionProps {
  players: Player[];
}

export default function AddMatchSection({ players: initialPlayers }: AddMatchSectionProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
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

  // New player inline creation states
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerError, setNewPlayerError] = useState('');
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);

  // Sync state if initialPlayers changes (e.g. from server refresh)
  if (initialPlayers.length !== players.length && !isCreatingPlayer) {
    setPlayers(initialPlayers);
  }

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

  // Handle inline player creation
  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewPlayerError('');
    const cleanName = newPlayerName.trim();
    if (!cleanName) {
      setNewPlayerError('Name cannot be empty.');
      return;
    }

    setIsCreatingPlayer(true);
    const result = await addPlayerAction(cleanName);
    setIsCreatingPlayer(false);

    if (result.success && result.player) {
      const created = result.player;
      setPlayers(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewPlayerName('');
      setShowNewPlayerForm(false);
      
      // Auto-select the newly created player
      if (!player1Id) {
        setPlayer1Id(created.id);
      } else if (!player2Id) {
        setPlayer2Id(created.id);
      }
      router.refresh();
    } else {
      setNewPlayerError(result.error || 'Failed to create player.');
    }
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

    // Validate scores
    let player1Wins = 0;
    let player2Wins = 0;
    for (let i = 0; i < games.length; i++) {
      const [s1, s2] = games[i];
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
    }

    if (player1Wins === player2Wins) {
      setError('Matches cannot end in a tie of games.');
      return;
    }

    setIsSubmitting(true);
    const result = await addMatchAction(player1Id, player2Id, matchType, games as [number, number][]);
    setIsSubmitting(false);

    if (result.success) {
      setSuccess('Match recorded successfully!');
      // Reset form
      setPlayer1Id('');
      setPlayer2Id('');
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

      {/* Inline Create Player Form Toggle */}
      {showNewPlayerForm ? (
        <form onSubmit={handleCreatePlayer} style={{ marginBottom: '20px', padding: '12px', borderRadius: '12px', background: 'rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Create New Player</h3>
          <div className="form-group" style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="form-input"
                placeholder="e.g. Roger Federer"
                disabled={isCreatingPlayer}
                style={{ padding: '8px 12px', fontSize: '14px' }}
              />
              <button type="submit" className="btn btn-sm btn-primary" disabled={isCreatingPlayer}>
                {isCreatingPlayer ? '...' : 'Create'}
              </button>
            </div>
            {newPlayerError && <span style={{ color: 'var(--tag-loss-text)', fontSize: '12px', fontWeight: 600 }}>{newPlayerError}</span>}
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowNewPlayerForm(false)}
            style={{ width: '100%', padding: '6px' }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => setShowNewPlayerForm(true)}
          style={{ width: '100%', marginBottom: '20px', padding: '8px' }}
        >
          ＋ Create New Player
        </button>
      )}

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
              {players.map((p) => (
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
              {players.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === player1Id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Match Type */}
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Game Point Rules</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`btn ${matchType === '11' ? 'btn-primary' : ''}`}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '12px',
              }}
              onClick={() => setMatchType('11')}
            >
              🏓 Up to 11
            </button>
            <button
              type="button"
              className={`btn ${matchType === '21' ? 'btn-primary' : ''}`}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '12px',
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
                    required
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
                    required
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
