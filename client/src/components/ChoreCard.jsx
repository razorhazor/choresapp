import StatusBadge from './StatusBadge.jsx';
import { rewardLabel } from '../config.js';

function formatDate(d) {
  if (!d) return 'No due date';
  const date = new Date(d + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// Card for a child's own chore. `onComplete` is provided only when actionable.
export default function ChoreCard({ chore, onComplete, busy }) {
  return (
    <article className="card chore-card">
      <div className="chore-card-top">
        <h3>{chore.name}</h3>
        <span className={`reward-pill${chore.rewardType === 'custom' ? ' reward-pill-custom' : ''}`}>
          {rewardLabel(chore.rewardType, chore.rewardAmount, chore.rewardText)}
        </span>
      </div>
      {chore.description && <p className="muted">{chore.description}</p>}
      <div className="chore-card-meta">
        <span className="due">📅 {formatDate(chore.dueDate)}</span>
        <StatusBadge status={chore.status} />
      </div>
      {chore.status === 'pending' && onComplete && (
        <button className="btn btn-primary btn-block" disabled={busy} onClick={onComplete}>
          Mark complete
        </button>
      )}
      {chore.status === 'submitted' && (
        <p className="awaiting-note">Waiting for a grown-up to approve ⏳</p>
      )}
    </article>
  );
}
