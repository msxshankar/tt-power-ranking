'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDate } from '@/lib/elo';
import { Match, Player } from '@/lib/types';

interface RecentMatchesSectionProps {
  matches: Match[];
  players: Player[];
}

function getMatchTime(match: Match) {
  const timestamp = Date.parse(match.created_at);
  return isNaN(timestamp) ? match.id : timestamp;
}

function formatMatchDateTime(createdAt: string) {
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return formatDate(createdAt);
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return `${formatDate(createdAt)} · ${time}`;
}

function isWithinDateFilter(createdAt: string, dateFilter: string) {
  if (dateFilter === 'all') return true;

  const matchDate = new Date(createdAt);
  if (isNaN(matchDate.getTime())) return false;

  const now = new Date();
  if (dateFilter === 'year') return matchDate.getFullYear() === now.getFullYear();

  const days = dateFilter === 'week' ? 7 : 30;
  const earliestDate = new Date(now);
  earliestDate.setDate(now.getDate() - days);
  return matchDate >= earliestDate;
}

export default function RecentMatchesSection({ matches, players }: RecentMatchesSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [playerFilter, setPlayerFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('win');
  const [dateFilter, setDateFilter] = useState('all');

  const playerNames = useMemo(
    () => Object.fromEntries(players.map(player => [player.id, player.name])),
    [players]
  );
  const chronologicalMatches = useMemo(
    () => [...matches].sort((a, b) => getMatchTime(a) - getMatchTime(b) || a.id - b.id),
    [matches]
  );
  const recentMatches = useMemo(
    () => [...matches].sort((a, b) => getMatchTime(b) - getMatchTime(a) || b.id - a.id).slice(0, 5),
    [matches]
  );

  const filteredMatches = chronologicalMatches.filter(match => {
    const matchesPlayer = playerFilter === 'all'
      || match.player1_id === playerFilter
      || match.player2_id === playerFilter;
    const matchResult = playerFilter === 'all'
      ? 'win'
      : match.winner_id === playerFilter
        ? 'win'
        : 'loss';
    return matchesPlayer
      && (playerFilter === 'all' || resultFilter === 'all' || matchResult === resultFilter)
      && isWithinDateFilter(match.created_at, dateFilter);
  });

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const resetFilters = () => {
    setPlayerFilter('all');
    setResultFilter('win');
    setDateFilter('all');
  };

  const handlePlayerFilterChange = (playerId: string) => {
    setPlayerFilter(playerId);
    setResultFilter(playerId === 'all' ? 'win' : 'all');
  };

  const renderMatch = (match: Match, preferredLeftPlayerId: string = 'all') => {
    const isPlayerFilterActive = preferredLeftPlayerId !== 'all';

    let leftPlayerId: string;
    let rightPlayerId: string;

    let p1Games = 0;
    let p2Games = 0;
    for (const [s1, s2] of match.game_scores) {
      if (s1 > s2) p1Games++;
      else p2Games++;
    }
    const isTied = p1Games === p2Games;

    if (isPlayerFilterActive) {
      leftPlayerId = preferredLeftPlayerId;
      rightPlayerId = match.player1_id === preferredLeftPlayerId ? match.player2_id : match.player1_id;
    } else if (isTied) {
      leftPlayerId = match.player1_id;
      rightPlayerId = match.player2_id;
    } else {
      leftPlayerId = match.winner_id;
      rightPlayerId = match.player1_id === match.winner_id ? match.player2_id : match.player1_id;
    }

    const leftPlayerName = playerNames[leftPlayerId] || 'Deleted Player';
    const rightPlayerName = playerNames[rightPlayerId] || 'Deleted Player';

    const isLeftWinner = !isTied && match.winner_id === leftPlayerId;
    const isRightWinner = !isTied && match.winner_id === rightPlayerId;

    return (
      <div key={match.id} className="match-item">
        <div className="match-header">
          <span>Match #{match.id} &bull; {formatMatchDateTime(match.created_at)}</span>
          <span className="match-rules">
            {isTied ? `Tied (${p1Games}-${p2Games}) · ` : ''}Rules: {match.match_type} pts
          </span>
        </div>
        <div className="match-details">
          <div className={`match-player p1 ${isLeftWinner ? 'winner' : ''}`}>
            {leftPlayerName} {isLeftWinner && '🏆'}
          </div>
          <span className="match-versus">vs</span>
          <div className={`match-player p2 ${isRightWinner ? 'winner' : ''}`}>
            {isRightWinner && '🏆'} {rightPlayerName}
          </div>
        </div>
        <div className="match-scores-summary">
          {match.game_scores.map(([s1, s2], index) => {
            const leftScore = match.player1_id === leftPlayerId ? s1 : s2;
            const rightScore = match.player1_id === leftPlayerId ? s2 : s1;

            const badgeClass = leftScore > rightScore ? 'win' : 'loss';

            return (
              <span key={index} className={`match-score-badge ${badgeClass}`}>
                {leftScore}:{rightScore}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="glass-panel glass-card recent-matches-card" style={{ height: '100%' }}>
        <div className="recent-matches-title-row">
          <h2 className="card-title">
            🕒 Last 5 Recent Matches
            <span>Newest first</span>
          </h2>
          <button
            type="button"
            className="btn btn-sm recent-matches-view-all"
            onClick={() => setIsOpen(true)}
            aria-haspopup="dialog"
          >
            View all <span aria-hidden="true">→</span>
          </button>
        </div>
        {recentMatches.length === 0 ? (
          <div className="empty-state">No matches have been played yet.</div>
        ) : (
          <div className="matches-list">{recentMatches.map(match => renderMatch(match, 'all'))}</div>
        )}
      </div>

      {isOpen && (
        <div className="match-history-backdrop" onMouseDown={() => setIsOpen(false)}>
          <section
            className="match-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-history-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="match-history-modal-header">
              <div>
                <p className="match-history-eyebrow">Complete match log · oldest first</p>
                <h2 id="match-history-title">All matches</h2>
                <p className="match-history-count">
                  {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'} shown
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-icon-only match-history-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close all matches"
                title="Close"
              >
                ✕
              </button>
            </header>

            <div className="match-history-filters" aria-label="Filter matches">
              <label>
                <span>Player</span>
                <select value={playerFilter} onChange={(event) => handlePlayerFilterChange(event.target.value)} className="form-select">
                  <option value="all">All players</option>
                  {players.map(player => <option key={player.id} value={player.id}>{player.name}</option>)}
                </select>
              </label>
              <label>
                <span>Result</span>
                <select value={resultFilter} onChange={(event) => setResultFilter(event.target.value)} className="form-select">
                  {playerFilter === 'all' ? (
                    <option value="win">All wins</option>
                  ) : (
                    <>
                      <option value="all">All results</option>
                      <option value="win">Wins</option>
                      <option value="loss">Losses</option>
                    </>
                  )}
                </select>
              </label>
              <label>
                <span>Date</span>
                <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="form-select">
                  <option value="all">All time</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                  <option value="year">This year</option>
                </select>
              </label>
              <button type="button" className="btn btn-sm match-history-reset" onClick={resetFilters}>
                Reset filters
              </button>
            </div>

            <div className="match-history-list">
              {filteredMatches.length === 0 ? (
                <div className="empty-state">No matches match those filters.</div>
              ) : (
                filteredMatches.map(match => renderMatch(match, playerFilter))
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
