import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const SETTINGS_KEY = 'rdv_settings';

const defaultSettings = {
  defaultDuration: 30,
  workStart: '08:00',
  workEnd: '18:00',
};

export default function Settings() {
  const { isOnline, notify } = useApp();
  const [settings, setSettings] = useState(() => {
    try {
      return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
    } catch {
      return defaultSettings;
    }
  });
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    notify('success', 'Paramètres sauvegardés');
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-800">Paramétrage</h1>

      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-3">Connexion</h2>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isOnline ? 'En ligne — données synchronisées avec Firestore' : 'Hors ligne — données en cache local'}
          </span>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700">Préférences</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Durée par défaut des RDV
          </label>
          <select
            value={settings.defaultDuration}
            onChange={(e) => set('defaultDuration', Number(e.target.value))}
            className="input"
          >
            {[15, 30, 45, 60, 90, 120].map((d) => (
              <option key={d} value={d}>{d} minutes</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Début journée</label>
            <input
              type="time"
              value={settings.workStart}
              onChange={(e) => set('workStart', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fin journée</label>
            <input
              type="time"
              value={settings.workEnd}
              onChange={(e) => set('workEnd', e.target.value)}
              className="input"
            />
          </div>
        </div>

        <button onClick={handleSave} className="btn-primary w-full">
          Sauvegarder
        </button>
      </div>

      {installPrompt && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-2">Application mobile</h2>
          <p className="text-sm text-gray-500 mb-3">
            Installez l'application sur votre écran d'accueil pour un accès rapide.
          </p>
          <button onClick={handleInstall} className="btn-primary w-full">
            📲 Installer l'application
          </button>
        </div>
      )}

      <div className="text-center text-xs text-gray-400 py-2">
        RDV Manager v1.0.0
      </div>
    </div>
  );
}
