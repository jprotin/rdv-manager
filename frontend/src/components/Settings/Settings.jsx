import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const SETTINGS_KEY = 'rdv_settings';

const defaultSettings = {
  defaultDuration: 30,
  workStart: '08:00',
  workEnd: '18:00',
};

export default function Settings() {
  const { isOnline, triggerSync, notify } = useApp();
  const [settings, setSettings] = useState(() => {
    try {
      return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
    } catch {
      return defaultSettings;
    }
  });
  const [installPrompt, setInstallPrompt] = useState(null);
  const [syncing, setSyncing] = useState(false);

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

  const handleSync = async () => {
    setSyncing(true);
    await triggerSync();
    notify('success', 'Synchronisation terminée');
    setSyncing(false);
  };

  const handleClearCache = () => {
    if (!confirm('Effacer les données locales ? Les données non synchronisées seront perdues.')) return;
    localStorage.removeItem('lastClientSync');
    localStorage.removeItem('lastAppointmentSync');
    notify('success', 'Cache effacé');
  };

  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-800">Paramétrage</h1>

      {/* Connection status */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-3">Connexion</h2>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">{isOnline ? 'Connecté au serveur' : 'Hors ligne'}</span>
        </div>
        <button
          onClick={handleSync}
          disabled={!isOnline || syncing}
          className="btn-secondary w-full text-sm"
        >
          {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
        </button>
      </div>

      {/* App settings */}
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

      {/* PWA install */}
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

      {/* Data management */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-3">Données locales</h2>
        <p className="text-sm text-gray-400 mb-3">
          Les données sont stockées localement pour le mode hors ligne.
          Dernière synchro clients : {localStorage.getItem('lastClientSync')
            ? new Date(localStorage.getItem('lastClientSync')).toLocaleString('fr-FR')
            : 'Jamais'}
        </p>
        <button
          onClick={handleClearCache}
          className="text-sm text-red-500 hover:text-red-700 font-medium"
        >
          Effacer le cache local
        </button>
      </div>

      {/* Version */}
      <div className="text-center text-xs text-gray-400 py-2">
        RDV Manager v1.0.0
      </div>
    </div>
  );
}
