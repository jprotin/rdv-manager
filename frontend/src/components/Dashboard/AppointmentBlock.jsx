import StatusBadge from '../common/StatusBadge.jsx';
import { appointmentsService } from '../../services/firestore.js';
import { useApp } from '../../context/AppContext.jsx';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function AppointmentBlock({ title, appointments, loading, onRefresh, hideHeader = false }) {
  const { notify } = useApp();

  const handleStatusChange = async (id, status) => {
    try {
      await appointmentsService.updateStatus(id, status);
      notify('success', 'Statut mis à jour');
      onRefresh?.();
    } catch (err) {
      notify('error', err.message);
    }
  };

  return (
    <div className={hideHeader ? '' : 'card'}>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">{title}</h2>
          <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {appointments.length}
          </span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-6 text-gray-400 text-sm">Chargement...</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">Aucun rendez-vous</div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {appointments.map((apt) => {
            const isConfirmed  = apt.status === 'confirmed' || apt.status === 'pending';
            const isInProgress = apt.status === 'in_progress';
            return (
              <li key={apt._id} className="py-3 flex items-start gap-3">
                <div className="shrink-0 mt-0.5 w-14 text-center">
                  <div className="text-primary-600 font-semibold text-sm leading-tight">{formatTime(apt.startAt)}</div>
                  <div className="text-ink-400 text-[11px] leading-tight">{formatTime(apt.endAt)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  {apt.client && (
                    <p className="font-medium text-gray-800 text-sm">
                      {apt.client.firstName} {apt.client.lastName}
                    </p>
                  )}
                  {apt.description && (
                    <p className="text-sm text-gray-500 truncate">{apt.description}</p>
                  )}
                  {apt.address?.label && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(apt.address.label)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-primary-600 truncate mt-0.5 hover:underline block"
                    >
                      📍 {apt.address.label}
                    </a>
                  )}
                  {apt.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {apt.tags.map(tag => (
                        <span key={tag} className="text-xs bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex flex-col gap-1.5 items-end">
                  <StatusBadge status={apt.status} />
                  {isConfirmed && (
                    <button
                      onClick={() => handleStatusChange(apt._id, 'in_progress')}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
                    >Démarrer</button>
                  )}
                  {isInProgress && (
                    <button
                      onClick={() => handleStatusChange(apt._id, 'completed')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full hover:bg-green-200 transition-colors"
                    >Terminer</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
