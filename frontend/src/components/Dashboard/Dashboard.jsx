import { useState, useEffect, useCallback } from 'react';
import AppointmentBlock from './AppointmentBlock.jsx';
import CreateAppointmentModal from '../Appointments/CreateAppointmentModal.jsx';
import { appointmentsApi } from '../../services/api.js';
import { getLocalAppointments } from '../../services/db.js';
import { useApp } from '../../context/AppContext.jsx';

function todayLabel() {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function Dashboard() {
  const { isOnline } = useApp();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      if (isOnline) {
        const { data } = await appointmentsApi.today();
        setAppointments(data);
      } else {
        const local = await getLocalAppointments({ today: true });
        setAppointments(local);
      }
    } catch {
      // Fallback to local DB on any error
      const local = await getLocalAppointments({ today: true });
      setAppointments(local);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const pending = appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed');
  const completed = appointments.filter((a) => a.status === 'completed');

  return (
    <div className="space-y-5">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 capitalize">{todayLabel()}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{appointments.length} rendez-vous aujourd'hui</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-12 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-2xl font-bold shadow-md flex items-center justify-center transition-colors active:scale-95"
          aria-label="Nouveau rendez-vous"
        >
          +
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center py-5">
          <div className="text-3xl font-bold text-primary-600">{pending.length}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">À venir</div>
        </div>
        <div className="card text-center py-5">
          <div className="text-3xl font-bold text-green-600">{completed.length}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Réalisés</div>
        </div>
      </div>

      {/* Today's appointments */}
      <AppointmentBlock
        title="Rendez-vous du jour"
        appointments={pending}
        loading={loading}
        onRefresh={fetchAppointments}
      />

      {/* Completed */}
      {completed.length > 0 && (
        <AppointmentBlock
          title="Réalisés aujourd'hui"
          appointments={completed}
          loading={false}
          onRefresh={fetchAppointments}
        />
      )}

      {/* Modal */}
      {showModal && (
        <CreateAppointmentModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchAppointments(); }}
        />
      )}
    </div>
  );
}
