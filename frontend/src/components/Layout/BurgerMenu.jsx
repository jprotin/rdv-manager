import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/', label: 'Tableau de bord', icon: '🏠', end: true },
  { to: '/appointments', label: 'Liste des RDV', icon: '📅' },
  { to: '/clients', label: 'Liste des clients', icon: '👥' },
  { to: '/tags', label: 'Tags', icon: '🏷️' },
  { to: '/stats', label: 'Statistiques', icon: '📊' },
  { to: '/settings', label: 'Paramétrage', icon: '⚙️' },
];

export default function BurgerMenu({ open, onClose }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col
          transition-transform duration-200 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* 30% — En-tête du drawer : Gris Ardoise */}
        <div className="px-5 py-4 bg-primary-500 text-white flex items-center justify-between">
          <span className="font-bold text-lg text-snow">RDV Manager</span>
          <button
            onClick={onClose}
            className="text-2xl leading-none hover:text-white/70 transition-colors"
            aria-label="Fermer le menu"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_LINKS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-500'   /* 10% — actif : Orchidée */
                    : 'text-ink-700 hover:bg-ink-50'     /* 30% — inactif : Gris Ardoise */
                }`
              }
            >
              <span className="text-lg">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-ink-100">
          <button className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-medium transition-colors">
            <span className="text-lg">🚪</span>
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
