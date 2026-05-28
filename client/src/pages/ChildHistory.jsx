import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { rewardLabel } from '../config.js';
import AppHeader from '../components/AppHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function ChildHistory() {
  const [chores, setChores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/chores/mine')
      .then((data) => setChores(data.chores))
      .finally(() => setLoading(false));
  }, []);

  // History = chores that are submitted or approved (i.e. actioned by the child).
  const history = chores.filter((c) => c.status !== 'pending');

  return (
    <div className="page">
      <AppHeader title="History" subtitle="Chores you've completed" />
      <div className="row-between">
        <Link className="btn btn-ghost" to="/child">
          ← Back
        </Link>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : history.length === 0 ? (
        <div className="empty card">
          <p>No completed chores yet. Go earn some rewards! 💪</p>
        </div>
      ) : (
        <ul className="history-list">
          {history.map((c) => (
            <li key={c.assignmentId} className="card history-item">
              <div>
                <strong>{c.name}</strong>
                <div className="muted small">
                  {c.status === 'approved'
                    ? `Approved ${formatDate(c.approvedAt)}`
                    : `Submitted ${formatDate(c.submittedAt)}`}
                </div>
              </div>
              <div className="history-right">
                <span className={`reward-pill${c.rewardType === 'custom' ? ' reward-pill-custom' : ''}`}>
                  {rewardLabel(c.rewardType, c.rewardAmount, c.rewardText)}
                </span>
                <StatusBadge status={c.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
