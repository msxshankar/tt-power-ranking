'use client';

import Link from 'next/link';

export default function HeaderLogo() {
  const handleRefresh = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.reload();
  };

  return (
    <Link
      href="/"
      onClick={handleRefresh}
      className="logo-section"
      title="Click to refresh page"
      style={{ textDecoration: 'none', cursor: 'pointer' }}
    >
      <div className="logo-icon" title="Refresh">🏓</div>
      <div>
        <h1 className="logo-text">TT Power Ranker</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Table Tennis Power Ranking
        </p>
      </div>
    </Link>
  );
}
