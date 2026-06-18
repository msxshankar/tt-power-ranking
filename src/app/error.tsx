'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <main className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="glass-panel glass-card" style={{ maxWidth: '480px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
          Something went wrong
        </h2>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          marginBottom: '24px',
          lineHeight: 1.6,
        }}>
          An unexpected error occurred while loading the page. This could be a temporary issue — please try again.
        </p>
        {error.digest && (
          <p style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginBottom: '16px',
            fontFamily: 'monospace',
          }}>
            Error ID: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => unstable_retry()}
            className="btn btn-primary"
            style={{ padding: '10px 20px' }}
          >
            🔄 Try Again
          </button>
          <Link href="/" className="btn" style={{ padding: '10px 20px' }}>
            ← Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
