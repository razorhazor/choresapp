import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { formatReward, formatMonth } from '../config.js';
import AppHeader from '../components/AppHeader.jsx';
import ChoreCard from '../components/ChoreCard.jsx';

export default function ChildDashboard() {
  const { user, refresh } = useAuth();
  const [chores, setChores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.get('/chores/mine');
      setChores(data.chores);
      await refresh(); // keep the reward total current
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    load();
  }, [load]);

  async function complete(choreId) {
    setBusyId(choreId);
    setError('');
    try {
      await api.post(`/chores/${choreId}/submit`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const active = chores.filter((c) => c.status !== 'approved');

  return (
    <div className="page">
      <AppHeader title={`Hi, ${user.name}! 👋`} subtitle="Here are your chores" />

      <section className="reward-banner card">
        <span className="muted">Earned this month</span>
        <strong className="reward-total">{formatReward(user.currentMonthTotal)}</strong>
      </section>

      <div className="row-between">
        <h2>My chores</h2>
        <Link className="btn btn-ghost" to="/child/history">
          History
        </Link>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : active.length === 0 ? (
        <div className="empty card">
          <p>🎉 All done! No chores to do right now.</p>
        </div>
      ) : (
        <div className="card-grid">
          {active.map((c) => (
            <ChoreCard
              key={c.assignmentId}
              chore={c}
              busy={busyId === c.choreId}
              onComplete={() => complete(c.choreId)}
            />
          ))}
        </div>
      )}

      {user.monthly && user.monthly.length > 0 && (
        <section className="card monthly-card">
          <h2>Earned by month</h2>
          <ul className="monthly-list">
            {user.monthly.map((m) => (
              <li key={m.month} className="monthly-row">
                <span>{formatMonth(m.month)}</span>
                <span className="reward-pill">{formatReward(m.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
