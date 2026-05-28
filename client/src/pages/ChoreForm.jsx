import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { CURRENCY } from '../config.js';
import AppHeader from '../components/AppHeader.jsx';

export default function ChoreForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();

  const [children, setChildren] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reward, setReward] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const childrenData = await api.get('/children');
        setChildren(childrenData.children);

        if (editing) {
          const data = await api.get('/chores');
          const chore = data.chores.find((c) => String(c.id) === String(id));
          if (!chore) {
            setError('Chore not found');
          } else {
            setName(chore.name);
            setDescription(chore.description || '');
            setDueDate(chore.due_date || '');
            setReward(String(chore.reward_amount));
            setSelected(new Set(chore.assignments.map((a) => a.childId)));
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [editing, id]);

  function toggle(childId) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(childId) ? next.delete(childId) : next.add(childId);
      return next;
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (selected.size === 0) {
      setError('Assign the chore to at least one child');
      return;
    }
    setBusy(true);
    const payload = {
      name: name.trim(),
      description: description.trim(),
      due_date: dueDate || null,
      reward_amount: Number(reward || 0),
      child_ids: [...selected],
    };
    try {
      if (editing) {
        await api.put(`/chores/${id}`, payload);
      } else {
        await api.post('/chores', payload);
      }
      navigate('/parent', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <AppHeader title={editing ? 'Edit chore' : 'New chore'} />
      <div className="row-between">
        <Link className="btn btn-ghost" to="/parent">
          ← Cancel
        </Link>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <form className="card" onSubmit={onSubmit}>
          <label htmlFor="name">Chore name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Take out the bins"
            required
          />

          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details"
          />

          <label htmlFor="due">Due date</label>
          <input
            id="due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <label htmlFor="reward">Reward ({CURRENCY})</label>
          <input
            id="reward"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            placeholder="0.00"
            required
          />

          <fieldset className="assign-fieldset">
            <legend>Assign to</legend>
            {children.length === 0 ? (
              <p className="muted small">
                No children yet. <Link to="/parent/children">Add one first.</Link>
              </p>
            ) : (
              children.map((c) => (
                <label key={c.id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <span>{c.name}</span>
                </label>
              ))
            )}
          </fieldset>

          {error && <p className="error-text" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy} type="submit">
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create chore'}
          </button>
        </form>
      )}
    </div>
  );
}
