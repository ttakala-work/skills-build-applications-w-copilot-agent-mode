import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Ranking = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson<{ leaderboard: Ranking[] }>('/api/leaderboard')
      .then((data) => setLeaderboard(data.leaderboard))
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CapabilityCard title="Leaderboard" description="Compare team point totals." loading={loading} error={error} empty={leaderboard.length === 0} emptyText="No leaderboard rankings found.">
      <ol>
        {leaderboard.map((entry) => (
          <li key={entry.teamName}>{entry.teamName} - {entry.totalPoints} points</li>
        ))}
      </ol>
    </CapabilityCard>
  );
}
