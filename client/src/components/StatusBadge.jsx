const LABELS = {
  pending: 'To do',
  submitted: 'Awaiting approval',
  approved: 'Approved',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>{LABELS[status] || status}</span>
  );
}
