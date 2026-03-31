import { useState } from 'react';
import StatusBadge from '../common/StatusBadge.jsx';
import { appointmentsService } from '../../services/firestore.js';
import { useApp } from '../../context/AppContext.jsx';

function formatDT(iso) {
  return new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function formatDuration(startAt, endAt) {
  const diff = Math.round((new Date(endAt) - new Date(startAt)) / 60000);
  return diff < 60 ? `${diff} min` : `${Math.floor(diff/60)}h${diff%60 > 0 ? diff%60 : ''}`;
}

export default function AppointmentCard({ appointment, onUpdate }) {
  const { notify } = useApp();
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { client, title, startAt, endAt, status, address, description, notes } = appointment;

  const doAction = async (fn) => {
    setLoading(true);
    try { await fn(); onUpdate(); } catch (err) { notify('error', err.message); } finally { setLoading(false); }
  };

  return (
    <div className={`card transition-all ${loading ? 'opacity-60' : ''}`}>
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800">{title}</span>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm text-primary-600 font-medium mt-0.5">
              {formatDT(startAt)} • {formatDuration(startAt, endAt)}
            </p>
            {client && (
              <p className="text-sm text-gray-500 mt-0.5">
                {client.firstName} {client.lastName}
                {client.phone && <span className="text-gray-400"> • {client.phone}</span>}
              </p>
            )}
          </div>
          <span className="text-gray-400 text-sm shrink-0 mt-0.5">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          {address?.label && <p className="text-sm text-gray-600"><span className="text-gray-400 mr-1">📍</span>{address.label}</p>}
          {description && <p className="text-sm text-gray-600">{description}</p>}
          {notes && <p className="text-sm text-gray-400 italic">{notes}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            {(status === 'pending' || status === 'confirmed') && (
              <button onClick={() => doAction(() => appointmentsService.updateStatus(appointment._id, 'completed'))} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-200 font-medium">Terminer</button>
            )}
            {status === 'pending' && (
              <button onClick={() => doAction(() => appointmentsService.updateStatus(appointment._id, 'confirmed'))} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-200 font-medium">Confirmer</button>
            )}
            {status !== 'cancelled' && status !== 'completed' && (
              <button onClick={() => doAction(() => appointmentsService.updateStatus(appointment._id, 'cancelled'))} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-200 font-medium">Annuler</button>
            )}
            {(status === 'cancelled' || status === 'completed') && (
              <button onClick={() => doAction(() => appointmentsService.updateStatus(appointment._id, 'pending'))} className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full hover:bg-amber-200 font-medium">Réouvrir</button>
            )}
            <button onClick={() => { if (confirm('Supprimer ce rendez-vous ?')) doAction(() => appointmentsService.delete(appointment._id)); }} className="btn-danger ml-auto">Supprimer</button>
          </div>
        </div>
      )}
    </div>
  );
}
