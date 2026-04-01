import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import SelectPicker from '../common/SelectPicker.jsx';
import TimePicker from '../common/TimePicker.jsx';

const DURATION_OPTIONS = [
  { value: 15,  label: '15 minutes' },
  { value: 30,  label: '30 minutes' },
  { value: 45,  label: '45 minutes' },
  { value: 60,  label: '1 heure' },
  { value: 90,  label: '1 heure 30' },
  { value: 120, label: '2 heures' },
];

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
  const [installPrompt, setInstallPrompt]   = useState(null);
  const [durationPicker, setDurationPicker] = useState(false);
  const [timePicker, setTimePicker]         = useState(null); // 'workStart' | 'workEnd' | null

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
      <h1 className="text-xl font-bold text-ink-700">Paramétrage</h1>

      <div className="card">
        <h2 className="font-semibold text-ink-700 mb-3">Connexion</h2>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-mint-400' : 'bg-red-500'}`} />
          <span className="text-sm text-ink-600">
            {isOnline ? 'En ligne — données synchronisées avec Firestore' : 'Hors ligne — données en cache local'}
          </span>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-ink-700">Préférences</h2>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">
            Durée par défaut des RDV
          </label>
          <button
            type="button"
            onClick={() => setDurationPicker(true)}
            className="w-full px-3 py-2.5 border border-ink-200 rounded-xl text-sm text-left
                       hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-300
                       transition-colors bg-white text-ink-700"
          >
            {DURATION_OPTIONS.find(o => o.value === settings.defaultDuration)?.label ?? '30 minutes'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Début journée</label>
            <button
              type="button"
              onClick={() => setTimePicker('workStart')}
              className="w-full px-3 py-2.5 border border-ink-200 rounded-xl text-sm text-left
                         hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-300
                         transition-colors bg-white text-ink-700"
            >
              {settings.workStart}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Fin journée</label>
            <button
              type="button"
              onClick={() => setTimePicker('workEnd')}
              className="w-full px-3 py-2.5 border border-ink-200 rounded-xl text-sm text-left
                         hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-300
                         transition-colors bg-white text-ink-700"
            >
              {settings.workEnd}
            </button>
          </div>
        </div>

        <button onClick={handleSave} className="btn-primary w-full">
          Sauvegarder
        </button>
      </div>

      {installPrompt && (
        <div className="card">
          <h2 className="font-semibold text-ink-700 mb-2">Application mobile</h2>
          <p className="text-sm text-ink-400 mb-3">
            Installez l'application sur votre écran d'accueil pour un accès rapide.
          </p>
          <button onClick={handleInstall} className="btn-primary w-full">
            📲 Installer l'application
          </button>
        </div>
      )}

      <div className="text-center text-xs text-ink-300 py-2">
        RDV Manager v1.0.0
      </div>

      {durationPicker && (
        <SelectPicker
          label="Durée par défaut des RDV"
          value={settings.defaultDuration}
          options={DURATION_OPTIONS}
          onChange={(v) => set('defaultDuration', v)}
          onClose={() => setDurationPicker(false)}
        />
      )}

      {timePicker === 'workStart' && (
        <TimePicker
          label="Début de journée"
          value={settings.workStart}
          onChange={(v) => set('workStart', v)}
          onClose={() => setTimePicker(null)}
        />
      )}

      {timePicker === 'workEnd' && (
        <TimePicker
          label="Fin de journée"
          value={settings.workEnd}
          onChange={(v) => set('workEnd', v)}
          onClose={() => setTimePicker(null)}
        />
      )}
    </div>
  );
}
