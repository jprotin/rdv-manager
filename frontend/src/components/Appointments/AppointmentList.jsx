import { useState, useEffect, useCallback } from 'react';
import AppointmentCard from './AppointmentCard.jsx';
import CreateAppointmentModal from './CreateAppointmentModal.jsx';
import DateTimePicker, { formatDateOnly } from '../common/DateTimePicker.jsx';
import SelectPicker from '../common/SelectPicker.jsx';
import { appointmentsService, tagsService } from '../../services/firestore.js';

const STATUS_OPTIONS = [
  { value: '',            label: 'Tous les statuts' },
  { value: 'confirmed',   label: 'Confirmé' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed',   label: 'Terminé' },
  { value: 'cancelled',   label: 'Annulé' },
];

const PAGE_SIZE = 20;

export default function AppointmentList() {
  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ status: '', tag: '', from: '', to: '' });
  const [datePicker, setDatePicker]     = useState(null);  // 'from' | 'to' | null
  const [statusPicker, setStatusPicker] = useState(false);
  const [tagPicker, setTagPicker]       = useState(false);
  const [allTags, setAllTags]           = useState([]);

  useEffect(() => {
    tagsService.getAll().then(setAllTags).catch(() => {});
  }, []);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (filters.status) params.status = filters.status;
      if (filters.tag)    params.tag    = filters.tag;
      if (filters.from) params.from = new Date(filters.from).toISOString();
      if (filters.to) {
        const end = new Date(filters.to);
        end.setHours(23, 59, 59, 999);
        params.to = end.toISOString();
      }
      const res = await appointmentsService.getAll(params);
      setAppointments(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const resetFilters = () => {
    setFilters({ status: '', tag: '', from: '', to: '' });
    setPage(1);
  };

  const TAG_OPTIONS = [
    { value: '', label: 'Tous les tags' },
    ...allTags.map(t => ({ value: t.name, label: t.name })),
  ];

  const hasFilters = filters.status || filters.tag || filters.from || filters.to;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
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

      <div className="card !p-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusPicker(true)}
          className={`border rounded-lg px-3 py-1.5 text-sm bg-white transition-colors
            ${filters.status
              ? 'border-primary-300 text-primary-600 font-medium'
              : 'border-ink-200 text-ink-400 hover:border-primary-300'}`}
        >
          {STATUS_OPTIONS.find(o => o.value === filters.status)?.label ?? 'Tous les statuts'}
        </button>
        {allTags.length > 0 && (
          <button
            type="button"
            onClick={() => setTagPicker(true)}
            className={`border rounded-lg px-3 py-1.5 text-sm bg-white transition-colors
              ${filters.tag
                ? 'border-primary-300 text-primary-600 font-medium'
                : 'border-ink-200 text-ink-400 hover:border-primary-300'}`}
          >
            {filters.tag ? `#${filters.tag}` : 'Tous les tags'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setDatePicker('from')}
          className={`border rounded-lg px-3 py-1.5 text-sm bg-white transition-colors
            ${filters.from
              ? 'border-primary-300 text-primary-600 font-medium'
              : 'border-ink-200 text-ink-400 hover:border-primary-300'}`}
        >
          {filters.from ? formatDateOnly(filters.from) : 'Du…'}
        </button>
        <button
          type="button"
          onClick={() => setDatePicker('to')}
          className={`border rounded-lg px-3 py-1.5 text-sm bg-white transition-colors
            ${filters.to
              ? 'border-primary-300 text-primary-600 font-medium'
              : 'border-ink-200 text-ink-400 hover:border-primary-300'}`}
        >
          {filters.to ? formatDateOnly(filters.to) : 'Au…'}
        </button>
        {hasFilters && (
          <button onClick={resetFilters} className="text-sm text-gray-500 hover:text-gray-700 px-2">
            Réinitialiser ×
          </button>
        )}
      </div>

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

      {statusPicker && (
        <SelectPicker
          label="Filtrer par statut"
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(v) => { setFilters(f => ({ ...f, status: v })); setPage(1); }}
          onClose={() => setStatusPicker(false)}
        />
      )}

      {tagPicker && (
        <SelectPicker
          label="Filtrer par tag"
          value={filters.tag}
          options={TAG_OPTIONS}
          onChange={(v) => { setFilters(f => ({ ...f, tag: v })); setPage(1); }}
          onClose={() => setTagPicker(false)}
        />
      )}

      {datePicker === 'from' && (
        <DateTimePicker
          dateOnly
          label="Filtrer à partir du"
          value={filters.from}
          onChange={(v) => { setFilters(f => ({ ...f, from: v })); setPage(1); }}
          onClose={() => setDatePicker(null)}
        />
      )}

      {datePicker === 'to' && (
        <DateTimePicker
          dateOnly
          label="Filtrer jusqu'au"
          value={filters.to}
          onChange={(v) => { setFilters(f => ({ ...f, to: v })); setPage(1); }}
          onClose={() => setDatePicker(null)}
        />
      )}
    </div>
  );
}
