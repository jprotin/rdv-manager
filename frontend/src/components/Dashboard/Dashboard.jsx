import { useState, useEffect, useCallback } from 'react';
import AppointmentBlock from './AppointmentBlock.jsx';
import CreateAppointmentModal from '../Appointments/CreateAppointmentModal.jsx';
import { appointmentsApi } from '../../services/api.js';
import { getLocalAppointments } from '../../services/db.js';
import { useApp } from '../../context/AppContext.jsx';

function tomorrowLabel() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

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
  const [tomorrowAppointments, setTomorrowAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      if (isOnline) {
        const [todayRes, tomorrowRes] = await Promise.all([
          appointmentsApi.today(),
          appointmentsApi.tomorrow(),
        ]);
        setAppointments(todayRes.data);
        setTomorrowAppointments(tomorrowRes.data);
      } else {
        const todayLocal = await getLocalAppointments({ today: true });
        setAppointments(todayLocal);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowLocal = await getLocalAppointments({ date: tomorrow.toISOString().slice(0, 10) });
        setTomorrowAppointments(tomorrowLocal);
      }
    } catch {
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

      {/* Completed today */}
      {completed.length > 0 && (
        <AppointmentBlock
          title="Réalisés aujourd'hui"
          appointments={completed}
          loading={false}
          onRefresh={fetchAppointments}
        />
      )}

      {/* Tomorrow */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-700">Demain</h2>
            <p className="text-xs text-gray-400 capitalize">{tomorrowLabel()}</p>
          </div>
          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {tomorrowAppointments.length}
          </span>
        </div>
        <AppointmentBlock
          appointments={tomorrowAppointments}
          loading={loading}
          onRefresh={fetchAppointments}
          hideHeader
        />
      </div>

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
