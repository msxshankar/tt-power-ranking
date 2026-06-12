'use client';

import { useState } from 'react';
import { PlayerStats } from '@/lib/types';

interface PlayersTableProps {
  initialStats: PlayerStats[];
}

type SortField = 'name' | 'elo' | 'wins11' | 'wins21' | 'totalWins';
type SortOrder = 'asc' | 'desc';

export default function PlayersTable({ initialStats }: PlayersTableProps) {
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

  // Filter players by name
  const filteredStats = initialStats.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort players
  const sortedStats = [...filteredStats].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'name') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    // Numbers sort
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return (
    <div className="glass-panel glass-card" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Overall Rankings & stats</h2>
        <input
          type="text"
          placeholder="🔍 Search player..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ maxWidth: '250px' }}
        />
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
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
                <td colSpan={5} className="empty-state">
                  No players found matching your query.
                </td>
              </tr>
            ) : (
              sortedStats.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-color)' }}>
                    <span style={{ background: 'var(--accent-light)', padding: '4px 10px', borderRadius: '8px' }}>
                      {p.elo}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-win">{p.wins11} W</span>
                    <span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>-</span>
                    <span className="badge badge-loss">{p.losses11} L</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-win">{p.wins21} W</span>
                    <span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>-</span>
                    <span className="badge badge-loss">{p.losses21} L</span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 500 }}>
                    <span className="badge badge-neutral">
                      {p.totalWins}W - {p.totalLosses}L
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
