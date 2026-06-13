'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Player, Match } from '@/lib/types';
import {
  deletePlayerAction,
  renamePlayerAction,
  deleteMatchAction,
  updateMatchScoreAction
} from '@/lib/actions';
import { isValidGameScore, formatDate } from '@/lib/elo';

function formatDateForInput(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface AdminDashboardProps {
  players: Player[];
  matches: Match[];
}

export default function AdminDashboard({ players, matches }: AdminDashboardProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [localPlayers, setLocalPlayers] = useState<Player[]>(players);
  const [localMatches, setLocalMatches] = useState<Match[]>(matches);

  useEffect(() => {
    setLocalPlayers(players);
  }, [players]);

  useEffect(() => {
    setLocalMatches(matches);
  }, [matches]);

  // Editing Player state
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState('');
  const [playerActionError, setPlayerActionError] = useState('');
  const [isDeletingPlayerId, setIsDeletingPlayerId] = useState<string | null>(null);
  const [isSavingPlayerName, setIsSavingPlayerName] = useState(false);
  const [confirmingDeletePlayer, setConfirmingDeletePlayer] = useState<{ id: string; name: string } | null>(null);
  const [confirmingDeleteMatch, setConfirmingDeleteMatch] = useState<number | null>(null);

  // Editing Match state (opens edit score modal)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editedGames, setEditedGames] = useState<(number | '')[][]>([]);
  const [editedDate, setEditedDate] = useState('');
  const [matchActionError, setMatchActionError] = useState('');
  const [isSavingMatch, setIsSavingMatch] = useState(false);

  // Check sessionStorage for authentication on mount
  useEffect(() => {
    const savedPass = sessionStorage.getItem('admin_pass');
    if (savedPass === 'tabletennis') {
      setIsAuthenticated(true);
    }
  }, []);

  // Handle Admin login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'tabletennis') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_pass', 'tabletennis');
      setLoginError('');
    } else {
      setLoginError('Incorrect password. Try again.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_pass');
    setPassword('');
  };

  // Handle Delete Player - called after confirmation
  const executeDeletePlayer = async (id: string) => {
    setConfirmingDeletePlayer(null);
    setPlayerActionError('');
    setIsDeletingPlayerId(id);
    try {
      const result = await deletePlayerAction(id);
      if (result.success) {
        setLocalPlayers(prev => prev.filter(p => p.id !== id));
        setLocalMatches(prev => prev.filter(m => m.player1_id !== id && m.player2_id !== id));
        router.refresh();
      } else {
        setPlayerActionError(result.error || 'Failed to delete player.');
      }
    } catch (err: any) {
      setPlayerActionError(err?.message || 'An unexpected error occurred while deleting.');
    } finally {
      setIsDeletingPlayerId(null);
    }
  };

  // Handle Rename Player
  const handleRenamePlayerSubmit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (isSavingPlayerName || isDeletingPlayerId) return;
    setPlayerActionError('');
    const cleanName = editingPlayerName.trim();
    if (!cleanName) {
      setPlayerActionError('Name cannot be empty.');
      return;
    }

    setIsSavingPlayerName(true);
    try {
      const result = await renamePlayerAction(id, cleanName);
      if (result.success) {
        setLocalPlayers(prev => prev.map(p => p.id === id ? { ...p, name: cleanName } : p));
        setEditingPlayerId(null);
        setEditingPlayerName('');
        router.refresh();
      } else {
        setPlayerActionError(result.error || 'Failed to rename player.');
      }
    } catch (err: any) {
      setPlayerActionError(err?.message || 'An unexpected error occurred while renaming.');
    } finally {
      setIsSavingPlayerName(false);
    }
  };

  // Cancel rename on Escape key
  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditingPlayerId(null);
      setEditingPlayerName('');
      setPlayerActionError('');
    }
  };

  // Handle Delete Match - called after confirmation
  const executeDeleteMatch = async (id: number) => {
    setConfirmingDeleteMatch(null);
    setMatchActionError('');
    try {
      const result = await deleteMatchAction(id);
      if (result.success) {
        setLocalMatches(prev => prev.filter(m => m.id !== id));
        router.refresh();
      } else {
        setMatchActionError(result.error || 'Failed to delete match.');
      }
    } catch (err: any) {
      setMatchActionError(err?.message || 'An unexpected error occurred while deleting match.');
    }
  };

  // Open Edit Match Modal
  const openEditMatchModal = (match: Match) => {
    setEditingMatch(match);
    setEditedGames(match.game_scores);
    setEditedDate(formatDateForInput(match.created_at));
    setMatchActionError('');
  };

  // Handle Score Change in Edit Modal
  const handleScoreChange = (gameIndex: number, playerIndex: 0 | 1, value: string) => {
    const numericValue = value === '' ? '' : parseInt(value);
    const safeValue = typeof numericValue === 'number' && isNaN(numericValue) ? '' : numericValue;
    const newGames = [...editedGames];
    newGames[gameIndex] = [...newGames[gameIndex]];
    newGames[gameIndex][playerIndex] = safeValue;
    setEditedGames(newGames);
  };

  const addGameRow = () => {
    setEditedGames([...editedGames, ['', '']]);
  };

  const removeGameRow = (index: number) => {
    if (editedGames.length <= 1) return;
    setEditedGames(editedGames.filter((_, i) => i !== index));
  };

  // Handle Save Edited Score
  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    setMatchActionError('');

    // Validate scores
    let p1Wins = 0;
    let p2Wins = 0;
    for (let i = 0; i < editedGames.length; i++) {
      const [s1, s2] = editedGames[i];
      if (s1 === '' || s2 === '') {
        setMatchActionError(`Please enter both scores for Game ${i + 1}.`);
        return;
      }
      if (!isValidGameScore(s1 as number, s2 as number, editingMatch.match_type)) {
        setMatchActionError(`Game ${i + 1} has an invalid score (${s1}-${s2}) for games to ${editingMatch.match_type}. Remember, players must win by 2 clear points.`);
        return;
      }
      if ((s1 as number) > (s2 as number)) p1Wins++;
      else p2Wins++;
    }

    if (p1Wins === p2Wins) {
      setMatchActionError('Matches cannot end in a tie of games.');
      return;
    }

    setIsSavingMatch(true);
    const result = await updateMatchScoreAction(editingMatch.id, editedGames as [number, number][], editedDate);
    setIsSavingMatch(false);

    if (result.success) {
      setLocalMatches(prev => prev.map(m => m.id === editingMatch.id ? {
        ...m,
        game_scores: editedGames as [number, number][],
        winner_id: p1Wins > p2Wins ? m.player1_id : m.player2_id,
        created_at: editedDate ? new Date(editedDate).toISOString() : m.created_at
      } : m));
      setEditingMatch(null);
      router.refresh();
    } else {
      setMatchActionError(result.error || 'Failed to update match score.');
    }
  };

  // Get Player Name from ID
  const getPlayerName = (id: string) => {
    const p = localPlayers.find(player => player.id === id);
    return p ? p.name : 'Deleted Player';
  };

  // RENDER LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="container login-container">
        <div className="glass-panel login-card">
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>
            ⚙️ Admin Access
          </h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Enter password..."
                required
                autoFocus
              />
            </div>
            {loginError && (
              <p style={{ color: 'var(--tag-loss-text)', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
                ❌ {loginError}
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <Link href="/" className="btn" style={{ flex: 1 }}>
                ← Dashboard
              </Link>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                Unlock Panel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // RENDER ADMIN PANEL
  return (
    <main className="container">
      {/* Admin Header */}
      <header className="glass-panel header admin-header-nav">
        <div>
          <h1 className="logo-text">Admin Panel</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Manage players, update match scores, and remove entries
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-sm">
            ← Back to Dashboard
          </Link>
          <button onClick={handleLogout} className="btn btn-sm btn-danger">
            🔓 Log Out
          </button>
        </div>
      </header>

      <div className="admin-grid">
        {/* Matches Management */}
        <section className="glass-panel glass-card">
          <div className="admin-header">
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Matches Management</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {localMatches.length} Total Matches
            </span>
          </div>

          {matchActionError && (
            <div style={{ background: 'var(--tag-loss-bg)', color: 'var(--tag-loss-text)', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px', fontWeight: 600 }}>
              ⚠️ {matchActionError}
            </div>
          )}

          {localMatches.length === 0 ? (
            <div className="empty-state">No matches recorded in the database.</div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Players & Winner</th>
                    <th className="hide-on-mobile">Score</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...localMatches].reverse().map((match) => (
                    <tr key={match.id}>
                      <td style={{ fontWeight: 700 }}>
                        #{match.id}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '4px' }}>
                          {formatDate(match.created_at)}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          <span style={match.winner_id === match.player1_id ? { color: 'var(--accent-color)' } : {}}>
                            {getPlayerName(match.player1_id)}
                          </span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>vs</span>
                          <span style={match.winner_id === match.player2_id ? { color: 'var(--accent-color)' } : {}}>
                            {getPlayerName(match.player2_id)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Rule: {match.match_type} pts
                          </span>
                          <div className="show-on-mobile" style={{ gap: '4px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>&bull; Scores:</span>
                            {match.game_scores.map(([s1, s2], idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: 'var(--input-bg)',
                                  border: '1px solid var(--input-border)',
                                  fontSize: '11px',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  color: 'var(--text-secondary)'
                                }}
                              >
                                {s1}:{s2}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="hide-on-mobile">
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {match.game_scores.map(([s1, s2], idx) => (
                            <span
                              key={idx}
                              style={{
                                background: 'var(--input-bg)',
                                border: '1px solid var(--input-border)',
                                fontSize: '12px',
                                padding: '2px 6px',
                                borderRadius: '6px'
                              }}
                            >
                              {s1}:{s2}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => openEditMatchModal(match)}
                            className="btn btn-sm"
                            style={{ padding: '6px 12px' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteMatch(match.id)}
                            className="btn btn-sm btn-danger"
                            style={{ padding: '6px 12px' }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Players Management */}
        <section className="glass-panel glass-card">
          <div className="admin-header">
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Players Management</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {localPlayers.length} Total Players
            </span>
          </div>

          {playerActionError && (
            <div style={{ background: 'var(--tag-loss-bg)', color: 'var(--tag-loss-text)', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px', fontWeight: 600 }}>
              ⚠️ {playerActionError}
            </div>
          )}

          {localPlayers.length === 0 ? (
            <div className="empty-state">No players found in the database.</div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {localPlayers.map((player) => {
                    const isEditing = editingPlayerId === player.id;
                    const isDeleting = isDeletingPlayerId === player.id;
                    const isBusy = isDeletingPlayerId !== null || isSavingPlayerName;

                    return (
                      <tr key={player.id} style={isDeleting ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
                        <td colSpan={isEditing ? 2 : undefined}>
                          {isEditing ? (
                            <form
                              onSubmit={(e) => handleRenamePlayerSubmit(e, player.id)}
                              style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}
                            >
                              <input
                                type="text"
                                value={editingPlayerName}
                                onChange={(e) => setEditingPlayerName(e.target.value)}
                                onKeyDown={handleRenameKeyDown}
                                className="form-input"
                                style={{ padding: '6px 12px', fontSize: '14px', flex: '1 1 120px', minWidth: '120px' }}
                                autoFocus
                                required
                                disabled={isSavingPlayerName}
                                placeholder="Enter new name..."
                              />
                              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                <button
                                  type="submit"
                                  className="btn btn-sm btn-primary"
                                  disabled={isSavingPlayerName}
                                >
                                  {isSavingPlayerName ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPlayerId(null);
                                    setEditingPlayerName('');
                                    setPlayerActionError('');
                                  }}
                                  className="btn btn-sm"
                                  disabled={isSavingPlayerName}
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div style={{ fontWeight: 600 }}>{player.name}</div>
                          )}
                        </td>
                        {!isEditing && (
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                onClick={() => {
                                  setEditingPlayerId(player.id);
                                  setEditingPlayerName(player.name);
                                  setPlayerActionError('');
                                }}
                                className="btn btn-sm"
                                style={{ padding: '6px 12px' }}
                                disabled={isBusy}
                              >
                                ✏️ Rename
                              </button>
                              <button
                                onClick={() => setConfirmingDeletePlayer({ id: player.id, name: player.name })}
                                className="btn btn-sm btn-danger"
                                style={{ padding: '6px 12px' }}
                                disabled={isBusy}
                              >
                                {isDeleting ? '⏳ Deleting...' : '🗑️ Delete'}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Confirm Delete Player Modal */}
      {confirmingDeletePlayer && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel" style={{ maxWidth: '420px' }}>
            <h2 className="modal-title">Delete Player</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{confirmingDeletePlayer.name}</strong>?
            </p>
            <p style={{ fontSize: '13px', color: 'var(--tag-loss-text)', marginBottom: '24px', fontWeight: 600 }}>
              ⚠️ This will also delete all matches they played in.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setConfirmingDeletePlayer(null)}
                className="btn"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() => executeDeletePlayer(confirmingDeletePlayer.id)}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                🗑️ Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Match Modal */}
      {confirmingDeleteMatch !== null && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel" style={{ maxWidth: '420px' }}>
            <h2 className="modal-title">Delete Match</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
              Are you sure you want to delete match <strong style={{ color: 'var(--text-primary)' }}>#{confirmingDeleteMatch}</strong>? Elo ratings will be recalculated.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setConfirmingDeleteMatch(null)}
                className="btn"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() => executeDeleteMatch(confirmingDeleteMatch)}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                🗑️ Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Match Score Modal */}
      {editingMatch && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel">
            <button onClick={() => setEditingMatch(null)} className="modal-close">
              ✕
            </button>
            <h2 className="modal-title">Edit Match Scores</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', fontWeight: 500 }}>
              Match #{editingMatch.id} &bull; {getPlayerName(editingMatch.player1_id)} vs {getPlayerName(editingMatch.player2_id)}
            </p>

            <form onSubmit={handleSaveScore}>
              {matchActionError && (
                <div style={{ background: 'var(--tag-loss-bg)', color: 'var(--tag-loss-text)', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: 600 }}>
                  ⚠️ {matchActionError}
                </div>
              )}

              {/* Match Date Picker */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Match Date</label>
                <input
                  type="date"
                  value={editedDate}
                  onChange={(e) => setEditedDate(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="form-label">Game Scores</span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={addGameRow}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    ＋ Add Game
                  </button>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {editedGames.map((game, index) => (
                    <div key={index} className="game-score-row">
                      <span className="game-score-label">Game {index + 1}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          min="0"
                          value={game[0]}
                          onChange={(e) => handleScoreChange(index, 0, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="form-input"
                          style={{ width: '60px' }}
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
                          style={{ width: '60px' }}
                          required
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-icon-only btn-danger"
                        onClick={() => removeGameRow(index)}
                        disabled={editedGames.length <= 1}
                        style={{ width: '28px', height: '28px', borderRadius: '8px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="btn"
                  style={{ flex: 1 }}
                  disabled={isSavingMatch}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={isSavingMatch}
                >
                  {isSavingMatch ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
