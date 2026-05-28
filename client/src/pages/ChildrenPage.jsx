import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatReward, formatMonth } from '../config.js';
import AppHeader from '../components/AppHeader.jsx';

export default function ChildrenPage() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api.get('/children');
      setChildren(data.children);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/children', {
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
      });
      setForm({ name: '', username: '', password: '' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <AppHeader title="Children" subtitle="Create and view child accounts" />
      <div className="row-between">
        <Link className="btn btn-ghost" to="/parent">
          ← Back
        </Link>
      </div>

      <section className="card">
        <h2>Add a child</h2>
        <form onSubmit={onSubmit}>
          <label htmlFor="c-name">Name</label>
          <input
            id="c-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Alice"
            required
          />
          <label htmlFor="c-username">Username</label>
          <input
            id="c-username"
            type="text"
            autoCapitalize="none"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="e.g. alice"
            required
          />
          <label htmlFor="c-password">Password</label>
          <input
            id="c-password"
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Pick a simple password"
            required
          />
          {error && <p className="error-text" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy} type="submit">
            {busy ? 'Creating…' : 'Create child account'}
          </button>
        </form>
      </section>

      <h2>Existing children</h2>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : children.length === 0 ? (
        <div className="empty card">
          <p>No child accounts yet.</p>
        </div>
      ) : (
        <ul className="child-list">
          {children.map((c) => (
            <li key={c.id} className="card child-card">
              <div className="child-card-top">
                <div>
                  <strong>{c.name}</strong>
                  <div className="muted small">@{c.username}</div>
                </div>
                <span className="reward-pill">{formatReward(c.rewardTotal)} total</span>
              </div>
              {c.monthly && c.monthly.length > 0 ? (
                <ul className="monthly-list">
                  {c.monthly.map((m) => (
                    <li key={m.month} className="monthly-row">
                      <span>{formatMonth(m.month)}</span>
                      <span className="monthly-amounts">
                        {(m.total > 0 || m.customCount === 0) && (
                          <span className="reward-pill">{formatReward(m.total)}</span>
                        )}
                        {m.customCount > 0 && (
                          <span className="reward-pill reward-pill-custom">🎁 {m.customCount}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">No approved rewards yet.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
