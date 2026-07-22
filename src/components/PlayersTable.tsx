'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PlayerStats } from '@/lib/types';
import { addPlayerAction } from '@/lib/actions';

interface PlayersTableProps {
  initialStats: PlayerStats[];
}

type SortField = 'name' | 'elo' | 'wins11' | 'wins21' | 'totalWins';
type SortOrder = 'asc' | 'desc';

export default function PlayersTable({ initialStats }: PlayersTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('elo');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to descending
    }
  };

  // Filter players by name (memoized)
  const filteredStats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return initialStats;
    return initialStats.filter(player =>
      player.name.toLowerCase().includes(term)
    );
  }, [initialStats, searchTerm]);

  // Sort players (memoized)
  const sortedStats = useMemo(() => {
    return [...filteredStats].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (sortField === 'name') {
        return sortOrder === 'asc'
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }

      // Numbers sort
      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [filteredStats, sortField, sortOrder]);

  // Add player modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanName = newPlayerName.trim();
    if (!cleanName) {
      setError('Name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    const result = await addPlayerAction(cleanName);
    setIsSubmitting(false);

    if (result.success) {
      setNewPlayerName('');
      setShowAddModal(false);
      router.refresh();
    } else {
      setError(result.error || 'Failed to create player.');
    }
  };

  // Celebration state and effect
  const [newLeaderToast, setNewLeaderToast] = useState<string | null>(null);
  const currentLeader = initialStats[0];
  const currentLeaderId = currentLeader?.id;
  const currentLeaderName = currentLeader?.name;

  useEffect(() => {
    if (!currentLeaderId || !currentLeaderName) return;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const previousLeaderId = localStorage.getItem('previous_leader_id');
    if (previousLeaderId && previousLeaderId !== currentLeaderId) {
      // Set toast message
      setNewLeaderToast(currentLeaderName);
      
      // Shower confetti!
      import('canvas-confetti').then((confetti) => {
        const duration = 4 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1200 };

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min;
        }

        intervalId = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(intervalId);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti.default({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti.default({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
      });

      // Clear toast after 5 seconds
      timeoutId = setTimeout(() => {
        setNewLeaderToast(null);
      }, 5000);
    }
    // Update local storage
    localStorage.setItem('previous_leader_id', currentLeaderId);
    return () => { clearInterval(intervalId); clearTimeout(timeoutId); };
  }, [currentLeaderId, currentLeaderName]);

  return (
    <div className="glass-panel glass-card" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Overall Rankings & stats</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Search player..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ maxWidth: '200px', padding: '10px 12px', fontSize: '14px' }}
          />
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{ padding: '10px 16px', fontSize: '14px', whiteSpace: 'nowrap' }}
          >
            ＋ Add Player
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center' }}>#</th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                Player Name {sortField === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSort('elo')}>
                Power Ranking (ELO) {sortField === 'elo' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSort('wins11')}>
                Games to 11 (W - L) {sortField === 'wins11' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSort('wins21')}>
                Games to 21 (W - L) {sortField === 'wins21' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSort('totalWins')}>
                Total Record {sortField === 'totalWins' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  No players found matching your query.
                </td>
              </tr>
            ) : (
              sortedStats.map((p, index) => (
                <tr key={p.id}>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{index + 1}</td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-color)' }}>
                    <span style={{ background: 'var(--accent-light)', padding: '4px 10px', borderRadius: '8px' }}>
                      {p.elo}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                      <span className="badge badge-win">{p.wins11} W</span>
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                      <span className="badge badge-loss">{p.losses11} L</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                      <span className="badge badge-win">{p.wins21} W</span>
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                      <span className="badge badge-loss">{p.losses21} L</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 500 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                      <span className="badge badge-neutral">
                        {p.totalWins}W - {p.totalLosses}L
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Player Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            <h2 className="modal-title">Create New Player</h2>
            <form onSubmit={handleCreatePlayer}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Player Name</label>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Roger Federer"
                  disabled={isSubmitting}
                  required
                  autoFocus
                />
              </div>
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
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn"
                  style={{ flex: 1 }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Leader Celebration Toast */}
      {newLeaderToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--accent-gradient)',
          color: 'white',
          padding: '16px 32px',
          borderRadius: '16px',
          boxShadow: '0 10px 25px var(--accent-glow)',
          zIndex: 1100,
          fontWeight: 700,
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideDownAndFade 5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
          👑 New ELO Leader: {newLeaderToast}! 🎉
        </div>
      )}
    </div>
  );
}
