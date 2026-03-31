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
          {appointments.map((apt) => (
            <li key={apt._id} className="py-3 flex items-start gap-3">
              <div className="text-primary-600 font-semibold text-sm w-12 shrink-0 mt-0.5">
                {formatTime(apt.startAt)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm">{apt.title}</p>
                {apt.client && (
                  <p className="text-sm text-gray-500">
                    {apt.client.firstName} {apt.client.lastName}
                    {apt.client.phone && <span className="ml-1 text-gray-400">• {apt.client.phone}</span>}
                  </p>
                )}
                {apt.address?.label && <p className="text-xs text-gray-400 truncate mt-0.5">{apt.address.label}</p>}
                {apt.notes && <p className="text-xs text-gray-400 italic mt-0.5">{apt.notes}</p>}
              </div>
              <div className="shrink-0 flex flex-col gap-1.5 items-end">
                <StatusBadge status={apt.status} />
                {(apt.status === 'pending' || apt.status === 'confirmed') && (
                  <button
                    onClick={() => handleStatusChange(apt._id, 'completed')}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full hover:bg-green-200 transition-colors"
                  >Terminer</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
