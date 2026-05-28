import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { formatReward } from '../config.js';
import AppHeader from '../components/AppHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

function formatDate(d) {
  if (!d) return 'No due date';
  const date = new Date(d + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [chores, setChores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get('/chores');
      setChores(data.chores);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const approve = (assignmentId) =>
    act(() => api.post(`/assignments/${assignmentId}/approve`));
  const reject = (assignmentId) =>
    act(() => api.post(`/assignments/${assignmentId}/reject`));

  function remove(chore) {
    if (!window.confirm(`Delete "${chore.name}"? This cannot be undone.`)) return;
    act(() => api.del(`/chores/${chore.id}`));
  }

  const pendingApprovals = chores.reduce(
    (n, c) => n + c.assignments.filter((a) => a.status === 'submitted').length,
    0
  );

  return (
    <div className="page">
      <AppHeader title="Parent dashboard" subtitle="Manage chores and rewards" />

      <div className="action-bar">
        <Link className="btn btn-primary" to="/parent/chores/new">
          + New chore
        </Link>
        <Link className="btn btn-secondary" to="/parent/children">
          👧 Children
        </Link>
      </div>

      {pendingApprovals > 0 && (
        <div className="notice">
          {pendingApprovals} submission{pendingApprovals > 1 ? 's' : ''} awaiting your approval
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : chores.length === 0 ? (
        <div className="empty card">
          <p>No chores yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="card-grid">
          {chores.map((chore) => (
            <article key={chore.id} className="card chore-card">
              <div className="chore-card-top">
                <h3>{chore.name}</h3>
                <span className="reward-pill">{formatReward(chore.reward_amount)}</span>
              </div>
              {chore.description && <p className="muted">{chore.description}</p>}
              <div className="chore-card-meta">
                <span className="due">📅 {formatDate(chore.due_date)}</span>
              </div>

              <ul className="assignee-list">
                {chore.assignments.map((a) => (
                  <li key={a.assignmentId} className="assignee-row">
                    <span className="assignee-name">{a.childName}</span>
                    <span className="assignee-actions">
                      <StatusBadge status={a.status} />
                      {a.status === 'submitted' && (
                        <>
                          <button
                            className="btn btn-small btn-success"
                            disabled={busy}
                            onClick={() => approve(a.assignmentId)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-small btn-ghost"
                            disabled={busy}
                            onClick={() => reject(a.assignmentId)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="chore-card-footer">
                <button
                  className="btn btn-small btn-ghost"
                  onClick={() => navigate(`/parent/chores/${chore.id}/edit`)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-small btn-danger"
                  disabled={busy}
                  onClick={() => remove(chore)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
