import { useState } from 'react';
import StatusBadge from '../common/StatusBadge.jsx';
import { appointmentsService } from '../../services/firestore.js';
import { useApp } from '../../context/AppContext.jsx';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function formatDuration(startAt, endAt) {
  const diff = Math.round((new Date(endAt) - new Date(startAt)) / 60000);
  return diff < 60 ? `${diff} min` : `${Math.floor(diff/60)}h${diff%60 > 0 ? String(diff%60).padStart(2,'0') : ''}`;
}

export default function AppointmentCard({ appointment, onUpdate }) {
  const { notify } = useApp();
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { client, description, title, startAt, endAt, status, address, tags } = appointment;
  const displayText = description || title || '';

  const doAction = async (fn) => {
    setLoading(true);
    try { await fn(); onUpdate(); } catch (err) { notify('error', err.message); } finally { setLoading(false); }
  };

  const isActive     = status === 'confirmed' || status === 'in_progress' || status === 'pending';
  const isConfirmed  = status === 'confirmed' || status === 'pending';
  const isInProgress = status === 'in_progress';
  const isDone       = status === 'completed' || status === 'cancelled';

  return (
    <div className={`card transition-all ${loading ? 'opacity-60' : ''}`}>
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {client && (
                <span className="font-semibold text-gray-800">{client.firstName} {client.lastName}</span>
              )}
              <StatusBadge status={status} />
            </div>
            <p className="text-sm text-primary-600 font-medium mt-0.5">
              {formatDate(startAt)} · {formatTime(startAt)}<span className="text-ink-300 mx-0.5">→</span>{formatTime(endAt)}
              <span className="text-ink-400 ml-1.5 text-xs">{formatDuration(startAt, endAt)}</span>
            </p>
            {displayText && (
              <p className="text-sm text-gray-500 mt-0.5 truncate">{displayText}</p>
            )}
            {tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tags.map(tag => (
                  <span key={tag} className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-medium">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <span className="text-gray-400 text-sm shrink-0 mt-0.5">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          {address?.label && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.label)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-primary-600 flex items-start gap-1 group"
            >
              <span className="shrink-0">📍</span>
              <span className="group-hover:underline">{address.label}</span>
            </a>
          )}
          {client?.phone && (
            <p className="text-sm text-gray-500">📞 {client.phone}</p>
          )}
          {client?.email && (
            <p className="text-sm text-gray-500">✉ {client.email}</p>
          )}
          {displayText && (
            <p className="text-sm text-gray-600">{displayText}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {isConfirmed && (
              <button onClick={() => doAction(() => appointmentsService.updateStatus(appointment._id, 'in_progress'))} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-200 font-medium">Démarrer</button>
            )}
            {isActive && (
              <button onClick={() => doAction(() => appointmentsService.updateStatus(appointment._id, 'completed'))} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-200 font-medium">Terminer</button>
            )}
            {!isDone && (
              <button onClick={() => doAction(() => appointmentsService.updateStatus(appointment._id, 'cancelled'))} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-200 font-medium">Annuler</button>
            )}
            {isDone && (
              <button onClick={() => doAction(() => appointmentsService.updateStatus(appointment._id, 'confirmed'))} className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full hover:bg-amber-200 font-medium">Réouvrir</button>
            )}
            <button onClick={() => { if (confirm('Supprimer ce rendez-vous ?')) doAction(() => appointmentsService.delete(appointment._id)); }} className="btn-danger ml-auto">Supprimer</button>
          </div>
        </div>
      )}
    </div>
  );
}
