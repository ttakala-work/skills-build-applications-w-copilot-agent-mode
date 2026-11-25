import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Activity = { type: string; minutes?: number; points?: number };

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson<{ activities: Activity[] }>('/api/activities')
      .then((data) => setActivities(data.activities))
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points." loading={loading} error={error} empty={activities.length === 0} emptyText="No activities found.">
      <ul>
        {activities.map((activity, index) => (
          <li key={index}>{activity.type}{activity.minutes !== undefined ? ` - ${activity.minutes} minutes` : ''}{activity.points !== undefined ? ` - ${activity.points} points` : ''}</li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
