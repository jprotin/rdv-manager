import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import BurgerMenu from './BurgerMenu.jsx';

export default function Header() {
  const { isOnline, isSyncing } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="bg-primary-600 text-white sticky top-0 z-40 shadow-md">
        <div className="container mx-auto px-4 max-w-2xl h-14 flex items-center justify-between">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 hover:bg-primary-700 rounded-xl transition-colors"
            aria-label="Ouvrir le menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h1 className="text-base font-semibold tracking-wide">RDV Manager</h1>

          <div className="flex items-center gap-2">
            {isSyncing && (
              <svg className="w-4 h-4 animate-spin text-white/70" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isOnline ? 'bg-white/20 text-white' : 'bg-red-400/30 text-red-100'
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
