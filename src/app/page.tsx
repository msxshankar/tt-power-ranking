import Link from 'next/link';
import { db } from '@/lib/db';
import { calculateRankings, formatDate } from '@/lib/elo';
import AddMatchSection from '@/components/AddMatchSection';
import PlayersTable from '@/components/PlayersTable';
import ThemeToggle from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch data on the server
  const players = await db.getPlayers();
  const matches = await db.getMatches();

  // Run ELO ranking calculations
  const { playerStats, top5, recentMatches } = calculateRankings(players, matches);

  return (
    <main className="container">
      {/* Header Panel */}
      <header className="glass-panel header">
        <div className="logo-section">
          <div className="logo-icon">🏓</div>
          <div>
            <h1 className="logo-text">TT Power Ranker</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Table Tennis Power Ranking
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeToggle />
          <Link
            href="/admin"
            className="btn btn-sm btn-icon-only"
            style={{
              fontSize: '18px',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Admin Panel"
            aria-label="Admin Panel"
          >
            ⚙️
          </Link>
        </div>
      </header>

      {/* Grid: Top 5, Record Match, Recent Matches */}
      <div className="rankings-grid">
        {/* Top 5 Power Rankings */}
        <section>
          <div className="glass-panel glass-card" style={{ height: '100%' }}>
            <h2 className="card-title">
              🏆 Top 5 Power Rankings
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                By ELO Score
              </span>
            </h2>
            {top5.length === 0 ? (
              <div className="empty-state">
                No rankings available yet. Create players and record a match!
              </div>
            ) : (
              <div className="podium-container">
                {top5.map((player, index) => {
                  const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
                  return (
                    <div key={player.id} className={`podium-item ${rankClass}`}>
                      <div className="podium-rank">
                        {index + 1}
                      </div>
                      <div className="podium-info">
                        <div className="podium-name">{player.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Record: {player.totalWins}W - {player.totalLosses}L
                        </div>
                      </div>
                      <div className="podium-elo">
                        {player.elo}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Record Match Section */}
        <section>
          <AddMatchSection players={players} />
        </section>

        {/* Recent Matches */}
        <section>
          <div className="glass-panel glass-card" style={{ height: '100%' }}>
            <h2 className="card-title">
              🕒 Last 5 Recent Matches
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Live Log
              </span>
            </h2>
            {recentMatches.length === 0 ? (
              <div className="empty-state">
                No matches have been played yet.
              </div>
            ) : (
              <div className="matches-list">
                {recentMatches.map((match) => (
                  <div key={match.id} className="match-item">
                    <div className="match-header">
                      <span>Match #{match.id} &bull; {formatDate(match.created_at)}</span>
                      <span style={{
                        background: 'var(--input-bg)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px'
                      }}>
                        Rules: {match.match_type} pts
                      </span>
                    </div>
                    <div className="match-details">
                      <div className={`match-player p1 ${match.winner_id === match.player1_id ? 'winner' : ''}`}>
                        {match.player1_name} {match.winner_id === match.player1_id && '🏆'}
                      </div>
                      <span className="match-versus">vs</span>
                      <div className={`match-player p2 ${match.winner_id === match.player2_id ? 'winner' : ''}`}>
                        {match.winner_id === match.player2_id && '🏆'} {match.player2_name}
                      </div>
                    </div>
                    <div className="match-scores-summary">
                      {match.game_scores.map(([s1, s2], idx) => {
                        const isS1Win = s1 > s2;
                        return (
                          <span key={idx} className={`match-score-badge ${isS1Win ? 'win' : 'loss'}`}>
                            {s1}:{s2}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Overall Rankings & Stats Table */}
      <section>
        <PlayersTable initialStats={playerStats} />
      </section>

      {/* Footer */}
      <footer style={{ marginTop: '64px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
        TT Power Ranker &copy; {new Date().getFullYear()} &bull; Built with Next.js &amp; Vercel
      </footer>
    </main>
  );
}
