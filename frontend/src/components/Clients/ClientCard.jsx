import { useState } from 'react';
import { clientsService } from '../../services/firestore.js';
import { useApp } from '../../context/AppContext.jsx';

function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

export default function ClientCard({ client, onUpdate }) {
  const { notify } = useApp();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Supprimer ${client.firstName} ${client.lastName} ?`)) return;
    setLoading(true);
    try {
      await clientsService.delete(client._id);
      notify('success', 'Client supprimé');
      onUpdate();
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`card transition-all ${loading ? 'opacity-60' : ''}`}>
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800">
              {client.lastName} {client.firstName}
            </p>
            {client.phone && (
              <p className="text-sm text-gray-500 mt-0.5">{formatPhone(client.phone)}</p>
            )}
            {client.address?.city && (
              <p className="text-xs text-gray-400 mt-0.5">
                {client.address.city} {client.address.postcode && `(${client.address.postcode})`}
              </p>
            )}
          </div>
          <span className="text-gray-400 text-sm shrink-0 mt-0.5">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          {client.address?.label && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address.label)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-primary-600 flex items-start gap-1 group"
            >
              <span className="shrink-0">📍</span>
              <span className="group-hover:underline">{client.address.label}</span>
            </a>
          )}
          {client.email && (
            <p className="text-sm text-gray-600">
              <span className="text-gray-400 mr-1">✉</span>{client.email}
            </p>
          )}
          {client.notes && <p className="text-sm text-gray-400 italic">{client.notes}</p>}

          <div className="flex justify-end pt-1">
            <button onClick={handleDelete} className="btn-danger">
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
