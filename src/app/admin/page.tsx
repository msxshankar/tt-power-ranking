import { db } from '@/lib/db';
import AdminDashboard from '@/components/AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Fetch latest players and matches on the server
  const players = await db.getPlayers();
  const matches = await db.getMatches();

  return <AdminDashboard players={players} matches={matches} />;
}
