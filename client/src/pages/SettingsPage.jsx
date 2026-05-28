import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import AppHeader from '../components/AppHeader.jsx';

export default function SettingsPage() {
  const { user } = useAuth();
  const home = user?.role === 'parent' ? '/parent' : '/child';

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (next !== confirm) {
      setError('New passwords do not match');
      return;
    }
    if (next.length < 4) {
      setError('New password must be at least 4 characters');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: current,
        newPassword: next,
      });
      setSuccess('Password updated.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <AppHeader title="Account" subtitle={user ? `Signed in as ${user.name}` : ''} />
      <div className="row-between">
        <Link className="btn btn-ghost" to={home}>
          ← Back
        </Link>
      </div>

      <form className="card" onSubmit={onSubmit}>
        <h2>Change password</h2>
        <label htmlFor="current">Current password</label>
        <input
          id="current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
        <label htmlFor="newpw">New password</label>
        <input
          id="newpw"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        <label htmlFor="confirm">Confirm new password</label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && <p className="error-text" role="alert">{error}</p>}
        {success && <p className="success-text" role="status">{success}</p>}
        <button className="btn btn-primary btn-block" disabled={busy} type="submit">
          {busy ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
