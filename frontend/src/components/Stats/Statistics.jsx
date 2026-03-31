import { useState, useEffect } from 'react';
import { statsService } from '../../services/firestore.js';

function StatCard({ label, value, color, sub }) {
  const colors = {
    blue: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <div className={`rounded-2xl p-4 ${colors[color]}`}>
      <div className="text-3xl font-bold">{value ?? '-'}</div>
      <div className="text-sm mt-1 opacity-80 font-medium">{label}</div>
      {sub && <div className="text-xs mt-0.5 opacity-60">{sub}</div>}
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-28 mt-2">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          {d.count > 0 && (
            <span className="text-xs text-gray-500 leading-none">{d.count}</span>
          )}
          <div
            className="w-full bg-primary-500 rounded-t-sm transition-all min-h-[2px]"
            style={{ height: `${(d.count / max) * 100}%` }}
          />
          <span className="text-xs text-gray-400 leading-none">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

export default function Statistics() {
  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    Promise.all([
      statsService.getOverview(),
      statsService.getMonthly(year),
      statsService.getUpcoming(),
    ])
      .then(([ov, mo, up]) => {
        setOverview(ov);
        setMonthly(mo.data);
        setUpcoming(up);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <div className="text-center py-10 text-gray-400">Chargement...</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-800">Statistiques</h1>

      {overview && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Clients" value={overview.totalClients} color="blue" />
          <StatCard label="RDV total" value={overview.totalAppointments} color="gray" />
          <StatCard label="Aujourd'hui" value={overview.todayCount} color="amber" />
          <StatCard label="Cette semaine" value={overview.weekCount} color="green" />
        </div>
      )}

      {overview?.statusBreakdown && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-3">Répartition par statut</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'pending', label: 'En attente', color: 'text-amber-600' },
              { key: 'confirmed', label: 'Confirmés', color: 'text-green-600' },
              { key: 'completed', label: 'Réalisés', color: 'text-gray-600' },
              { key: 'cancelled', label: 'Annulés', color: 'text-red-500' },
            ].map(({ key, label, color }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600">{label}</span>
                <span className={`font-semibold ${color}`}>{overview.statusBreakdown[key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {monthly && (
        <div className="card">
          <h2 className="font-semibold text-gray-700">Rendez-vous par mois ({year})</h2>
          <BarChart data={monthly} />
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-3">Prochains rendez-vous</h2>
          <ul className="space-y-2">
            {upcoming.map((apt) => (
              <li key={apt._id} className="flex items-center gap-3 text-sm">
                <span className="text-primary-600 font-medium w-24 shrink-0">
                  {new Date(apt.startAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
                <span className="flex-1 text-gray-700 font-medium truncate">{apt.title}</span>
                {apt.client && (
                  <span className="text-gray-400 shrink-0">{apt.client.firstName} {apt.client.lastName}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
