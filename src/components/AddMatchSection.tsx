'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Player, Match } from '@/lib/types';
import { addMatchAction, appendGameToSessionAction } from '@/lib/actions';
import { isValidGameScore } from '@/lib/elo';

interface AddMatchSectionProps {
  players: Player[];
  matches?: Match[];
}

function isMatchOnDate(createdAt: string, dateStr: string): boolean {
  if (!createdAt || !dateStr) return false;
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}` === dateStr;
}

export default function AddMatchSection({ players: initialPlayers, matches = [] }: AddMatchSectionProps) {
  const router = useRouter();

  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [matchType, setMatchType] = useState<'11' | '21'>('11');
  const [games, setGames] = useState<(number | '')[][]>([
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

  const [sessionMode, setSessionMode] = useState<'continue' | 'new'>('continue');
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  // Scan for existing sessions between selected players on the chosen date
  const matchingSessions = useMemo(() => {
    if (!player1Id || !player2Id || player1Id === player2Id || !matches) return [];
    return matches
      .filter(m => {
        const isSamePair =
          (m.player1_id === player1Id && m.player2_id === player2Id) ||
          (m.player1_id === player2Id && m.player2_id === player1Id);
        return isSamePair && isMatchOnDate(m.created_at, matchDate);
      })
      .sort((a, b) => b.id - a.id); // Newest session first
  }, [player1Id, player2Id, matches, matchDate]);

  // Automatically select the most recent session if available
  useEffect(() => {
    if (matchingSessions.length > 0) {
      if (!selectedSessionId || !matchingSessions.some(s => s.id === selectedSessionId)) {
        setSelectedSessionId(matchingSessions[0].id);
        setSessionMode('continue');
      }
    } else {
      setSelectedSessionId(null);
      setSessionMode('new');
    }
  }, [matchingSessions, selectedSessionId]);

  // Active session object
  const activeSession = useMemo(() => {
    if (sessionMode !== 'continue' || !selectedSessionId) return null;
    return matchingSessions.find(s => s.id === selectedSessionId) || null;
  }, [sessionMode, selectedSessionId, matchingSessions]);

  // When continuing an active session, sync game point rules (11 vs 21)
  useEffect(() => {
    if (activeSession) {
      setMatchType(activeSession.match_type);
    }
  }, [activeSession]);

  // Orient existing game scores to match the Player 1 (left) / Player 2 (right) selection
  const existingScoresOriented = useMemo(() => {
    if (!activeSession) return [];
    const isP1Left = activeSession.player1_id === player1Id;
    return activeSession.game_scores.map(([s1, s2]) => (isP1Left ? [s1, s2] : [s2, s1]));
  }, [activeSession, player1Id]);

  const existingCount = existingScoresOriented.length;

  const { p1ExistingWins, p2ExistingWins } = useMemo(() => {
    let p1Wins = 0;
    let p2Wins = 0;
    for (const [s1, s2] of existingScoresOriented) {
      if (s1 > s2) p1Wins++;
      else if (s2 > s1) p2Wins++;
    }
    return { p1ExistingWins: p1Wins, p2ExistingWins: p2Wins };
  }, [existingScoresOriented]);

  // Handle score input change
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

  // Handle Match / Session submission
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

    // Process filled game rows
    const completedGames: [number, number][] = [];
    for (let i = 0; i < games.length; i++) {
      const [s1, s2] = games[i];
      if (s1 === '' && s2 === '') {
        continue;
      }
      if (s1 === '' || s2 === '') {
        const gameNumber = (activeSession ? existingCount : 0) + i + 1;
        setError(`Please enter both scores for Game ${gameNumber}.`);
        return;
      }
      if (!isValidGameScore(s1 as number, s2 as number, matchType)) {
        const gameNumber = (activeSession ? existingCount : 0) + i + 1;
        setError(`Game ${gameNumber} has an invalid score (${s1}-${s2}) for games to ${matchType}. Remember, players must win by 2 clear points.`);
        return;
      }
      completedGames.push([s1 as number, s2 as number]);
    }

    if (completedGames.length === 0) {
      setError('Please enter scores for at least one game.');
      return;
    }

    setIsSubmitting(true);

    if (activeSession) {
      // Continuing existing session: map games to activeSession player orientation
      const isP1Left = activeSession.player1_id === player1Id;
      const gamesToAppend: [number, number][] = completedGames.map(([s1, s2]) =>
        isP1Left ? [s1, s2] : [s2, s1]
      );

      const result = await appendGameToSessionAction(activeSession.id, gamesToAppend);
      setIsSubmitting(false);

      if (result.success) {
        setSuccess(`Added ${completedGames.length} ${completedGames.length === 1 ? 'game' : 'games'} to Session #${activeSession.id}!`);
        setGames([['', '']]);
        router.refresh();
        setTimeout(() => setSuccess(''), 3500);
      } else {
        setError(result.error || 'Failed to update session.');
      }
    } else {
      // Creating a brand new session/match
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
      const result = await addMatchAction(
        player1Id,
        player2Id,
        matchType,
        completedGames,
        dateObj.toISOString()
      );
      setIsSubmitting(false);

      if (result.success) {
        setSuccess('New session recorded successfully!');
        setPlayer1Id('');
        setPlayer2Id('');
        setGames([['', '']]);
        router.refresh();
        setTimeout(() => setSuccess(''), 3500);
      } else {
        setError(result.error || 'Failed to record match.');
      }
    }
  };

  const p1Name = initialPlayers.find(p => p.id === player1Id)?.name || 'Player 1';
  const p2Name = initialPlayers.find(p => p.id === player2Id)?.name || 'Player 2';

  return (
    <div className="glass-panel glass-card match-entry-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="card-title">
        🏓 {activeSession ? `Session #${activeSession.id}` : 'Record Match'}
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
          {activeSession ? `${existingCount} games played` : 'Singles Only'}
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
        <div className="match-player-selection">
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

        {/* Session Continuity Switcher */}
        {matchingSessions.length > 0 && (
          <div style={{
            background: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            borderRadius: '12px',
            padding: '10px 12px',
            marginBottom: '14px'
          }}>
            <div className="session-continuity-header">
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                ⚡ Existing Session Found
              </span>
              {matchingSessions.length > 1 && (
                <select
                  value={selectedSessionId || ''}
                  onChange={(e) => {
                    setSelectedSessionId(Number(e.target.value));
                    setSessionMode('continue');
                  }}
                  className="form-select"
                  style={{ fontSize: '11px', padding: '2px 6px', maxWidth: '140px' }}
                >
                  {matchingSessions.map(s => (
                    <option key={s.id} value={s.id}>
                      Session #{s.id} ({s.game_scores.length}G)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="session-mode-controls" style={{ marginBottom: activeSession ? '10px' : '0' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setSessionMode('continue')}
                style={{
                  flex: 1,
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  padding: '6px 8px',
                  background: sessionMode === 'continue' ? 'var(--accent-gradient)' : 'transparent',
                  color: sessionMode === 'continue' ? 'white' : 'var(--text-secondary)',
                  border: sessionMode === 'continue' ? 'none' : '1px solid var(--input-border)',
                }}
              >
                Continue Session #{selectedSessionId}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setSessionMode('new')}
                style={{
                  flex: 1,
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  padding: '6px 8px',
                  background: sessionMode === 'new' ? 'var(--accent-gradient)' : 'transparent',
                  color: sessionMode === 'new' ? 'white' : 'var(--text-secondary)',
                  border: sessionMode === 'new' ? 'none' : '1px solid var(--input-border)',
                }}
              >
                ＋ Start New Session
              </button>
            </div>

            {/* Existing games in this session */}
            {activeSession && existingScoresOriented.length > 0 && (
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '8px', marginTop: '4px' }}>
                <div className="session-score-summary">
                  <span>Recorded Games:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {p1Name} ({p1ExistingWins}) - ({p2ExistingWins}) {p2Name}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {existingScoresOriented.map(([s1, s2], idx) => (
                    <span
                      key={idx}
                      style={{
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: s1 > s2 ? 'var(--tag-win-text)' : s2 > s1 ? 'var(--tag-loss-text)' : 'var(--text-secondary)'
                      }}
                    >
                      G{idx + 1}: {s1}:{s2}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Match Type */}
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Game Point Rules</label>
          <div className="match-rule-options">
            <button
              type="button"
              className="btn"
              disabled={!!activeSession}
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '12px',
                opacity: activeSession && matchType !== '11' ? 0.5 : 1,
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
              disabled={!!activeSession}
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '12px',
                opacity: activeSession && matchType !== '21' ? 0.5 : 1,
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
        <div className="game-score-section" style={{ flexGrow: 1 }}>
          <div className="game-score-section-header">
            <span className="form-label">
              {activeSession ? `Add Games to Session #${activeSession.id}` : 'Game Scores'}
            </span>
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
            {games.map((game, index) => {
              const gameNumber = (activeSession ? existingCount : 0) + index + 1;
              return (
                <div key={index} className="game-score-row" style={{ marginBottom: '6px' }}>
                  <span className="game-score-label">G{gameNumber}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      min="0"
                      value={game[0]}
                      onChange={(e) => handleScoreChange(index, 0, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="form-input"
                      placeholder={p1Name ? p1Name.slice(0, 3) : 'P1'}
                      style={{ width: '48px', padding: '6px', fontSize: '14px', textAlign: 'center' }}
                    />
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>:</span>
                    <input
                      type="number"
                      min="0"
                      value={game[1]}
                      onChange={(e) => handleScoreChange(index, 1, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="form-input"
                      placeholder={p2Name ? p2Name.slice(0, 3) : 'P2'}
                      style={{ width: '48px', padding: '6px', fontSize: '14px', textAlign: 'center' }}
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
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', marginTop: 'auto' }}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Saving...'
            : activeSession
              ? `💾 Add Game to Session #${activeSession.id}`
              : '🏓 Save Match'}
        </button>
      </form>
    </div>
  );
}
