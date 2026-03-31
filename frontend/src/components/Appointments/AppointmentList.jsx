import { useState, useEffect, useCallback } from 'react';
import AppointmentCard from './AppointmentCard.jsx';
import CreateAppointmentModal from './CreateAppointmentModal.jsx';
import { appointmentsApi } from '../../services/api.js';
import { getLocalAppointments } from '../../services/db.js';
import { useApp } from '../../context/AppContext.jsx';

const PAGE_SIZE = 20;

export default function AppointmentList() {
  const { isOnline } = useApp();
  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ status: '', from: '', to: '' });

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      if (isOnline) {
        const params = { page, limit: PAGE_SIZE };
        if (filters.status) params.status = filters.status;
        if (filters.from) params.from = new Date(filters.from).toISOString();
        if (filters.to) {
          const end = new Date(filters.to);
          end.setHours(23, 59, 59, 999);
          params.to = end.toISOString();
        }
        const res = await appointmentsApi.list(params);
        setAppointments(res.data);
        setTotal(res.total);
      } else {
        const local = await getLocalAppointments(filters.status ? { status: filters.status } : {});
        setAppointments(local.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
        setTotal(local.length);
      }
    } catch {
      const local = await getLocalAppointments({});
      setAppointments(local);
      setTotal(local.length);
    } finally {
      setLoading(false);
    }
  }, [isOnline, page, filters]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const resetFilters = () => {
    setFilters({ status: '', from: '', to: '' });
    setPage(1);
  };

  const hasFilters = filters.status || filters.from || filters.to;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Rendez-vous</h1>
          <p className="text-sm text-gray-500">{total} au total</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-10 h-10 bg-primary-600 text-white rounded-xl text-xl flex items-center justify-center shadow hover:bg-primary-700 transition-colors"
          aria-label="Nouveau rendez-vous"
        >
          +
        </button>
      </div>

      {/* Filters */}
      <div className="card !p-3 flex flex-wrap gap-2">
        <select
          value={filters.status}
          onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="confirmed">Confirmé</option>
          <option value="completed">Réalisé</option>
          <option value="cancelled">Annulé</option>
        </select>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => { setFilters((f) => ({ ...f, from: e.target.value })); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none"
          placeholder="Du"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => { setFilters((f) => ({ ...f, to: e.target.value })); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none"
          placeholder="Au"
        />
        {hasFilters && (
          <button onClick={resetFilters} className="text-sm text-gray-500 hover:text-gray-700 px-2">
            Réinitialiser ×
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Chargement...</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-10 text-gray-400">Aucun rendez-vous trouvé</div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <AppointmentCard key={apt._id} appointment={apt} onUpdate={fetchAppointments} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-2">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}

      {showModal && (
        <CreateAppointmentModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchAppointments(); }}
        />
      )}
    </div>
  );
}
