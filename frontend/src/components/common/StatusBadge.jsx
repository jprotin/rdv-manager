const STATUS = {
  pending: { label: 'En attente', cls: 'badge-pending' },
  confirmed: { label: 'Confirmé', cls: 'badge-confirmed' },
  cancelled: { label: 'Annulé', cls: 'badge-cancelled' },
  completed: { label: 'Réalisé', cls: 'badge-completed' },
};

export default function StatusBadge({ status }) {
  const info = STATUS[status] || STATUS.pending;
  return <span className={info.cls}>{info.label}</span>;
}

export { STATUS };
