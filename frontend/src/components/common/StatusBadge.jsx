const STATUS = {
  confirmed:   { label: 'Confirmé',  cls: 'badge-confirmed' },
  in_progress: { label: 'En cours',  cls: 'badge-in-progress' },
  completed:   { label: 'Terminé',   cls: 'badge-completed' },
  cancelled:   { label: 'Annulé',    cls: 'badge-cancelled' },
  // legacy — mappe vers confirmé
  pending:     { label: 'Confirmé',  cls: 'badge-confirmed' },
};

export default function StatusBadge({ status }) {
  const info = STATUS[status] || STATUS.confirmed;
  return <span className={info.cls}>{info.label}</span>;
}

export { STATUS };
