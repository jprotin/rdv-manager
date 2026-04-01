import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import BurgerMenu from './BurgerMenu.jsx';

export default function Header() {
  const { isOnline } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* 30% — Gris Ardoise pour la structure de navigation */}
      <header className="bg-primary-500 text-white sticky top-0 z-40 shadow-md">
        <div className="container mx-auto px-4 max-w-2xl h-14 flex items-center justify-between">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 hover:bg-primary-600 rounded-xl transition-colors"
            aria-label="Ouvrir le menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* 10% — Améthyste Douce pour l'identité de marque */}
          <h1 className="text-base font-semibold tracking-wide text-snow">RDV Manager</h1>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isOnline ? 'bg-white/15 text-white' : 'bg-red-400/30 text-red-100'
              }`}
            >
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
        </div>
      </header>

      <BurgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
