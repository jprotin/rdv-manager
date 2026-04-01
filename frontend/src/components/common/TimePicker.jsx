import { useState } from 'react';

function pad(n) { return String(n).padStart(2, '0'); }

function generateSlots() {
  const slots = [];
  for (let h = 5; h <= 23; h++) {
    slots.push(`${pad(h)}:00`);
    if (h < 23) slots.push(`${pad(h)}:30`);
  }
  return slots;
}
const ALL_SLOTS = generateSlots();

// Props: label, value (HH:MM), onChange(HH:MM), onClose
export default function TimePicker({ label, value, onChange, onClose }) {
  const [selSlot, setSelSlot] = useState(value || '08:00');
  const [customH, setCustomH] = useState(value ? value.split(':')[0] : '08');
  const [customM, setCustomM] = useState(value ? value.split(':')[1] : '00');

  const handleSlot = (slot) => {
    setSelSlot(slot);
    setCustomH(slot.split(':')[0]);
    setCustomM(slot.split(':')[1]);
  };

  const handleHourChange = (h) => {
    setCustomH(h);
    setSelSlot(`${h}:${customM}`);
  };

  const handleMinuteChange = (m) => {
    setCustomM(m);
    setSelSlot(`${customH}:${m}`);
  };

  const handleConfirm = () => {
    onChange(`${customH}:${customM}`);
    onClose();
  };

  const currentTime = `${customH}:${customM}`;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="bg-primary-500 text-white px-5 py-4 flex items-center justify-between">
          <span className="font-semibold">{label}</span>
          <button
            onClick={onClose}
            className="text-2xl leading-none hover:text-white/70 transition-colors"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* Grille de créneaux */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-2">
            Créneaux rapides
          </p>
          <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
            {ALL_SLOTS.map((slot) => {
              const isActive = selSlot === slot;
              return (
                <button
                  key={slot}
                  onClick={() => handleSlot(slot)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${isActive
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-snow border border-ink-200 text-ink-700 hover:border-primary-300 hover:text-primary-500 hover:bg-primary-50'
                    }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* Saisie manuelle heure / minutes */}
        <div className="border-t border-ink-100 px-4 py-3">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-3">
            Heure personnalisée
          </p>
          <div className="flex items-center justify-center gap-3">
            {/* Heures */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => {
                  const h = pad((parseInt(customH, 10) + 1) % 24);
                  handleHourChange(h);
                }}
                className="w-9 h-9 rounded-xl bg-ink-50 hover:bg-primary-50 hover:text-primary-600 text-ink-500 font-bold text-lg flex items-center justify-center transition-colors"
              >
                ▲
              </button>
              <span className="w-14 text-center text-2xl font-bold text-ink-700 bg-snow border border-ink-200 rounded-xl py-1.5">
                {customH}
              </span>
              <button
                onClick={() => {
                  const h = pad((parseInt(customH, 10) - 1 + 24) % 24);
                  handleHourChange(h);
                }}
                className="w-9 h-9 rounded-xl bg-ink-50 hover:bg-primary-50 hover:text-primary-600 text-ink-500 font-bold text-lg flex items-center justify-center transition-colors"
              >
                ▼
              </button>
              <span className="text-xs text-ink-400">Heure</span>
            </div>

            <span className="text-3xl font-bold text-ink-300 mb-5">:</span>

            {/* Minutes */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => {
                  const m = pad((parseInt(customM, 10) + 5) % 60);
                  handleMinuteChange(m);
                }}
                className="w-9 h-9 rounded-xl bg-ink-50 hover:bg-primary-50 hover:text-primary-600 text-ink-500 font-bold text-lg flex items-center justify-center transition-colors"
              >
                ▲
              </button>
              <span className="w-14 text-center text-2xl font-bold text-ink-700 bg-snow border border-ink-200 rounded-xl py-1.5">
                {customM}
              </span>
              <button
                onClick={() => {
                  const m = pad((parseInt(customM, 10) - 5 + 60) % 60);
                  handleMinuteChange(m);
                }}
                className="w-9 h-9 rounded-xl bg-ink-50 hover:bg-primary-50 hover:text-primary-600 text-ink-500 font-bold text-lg flex items-center justify-center transition-colors"
              >
                ▼
              </button>
              <span className="text-xs text-ink-400">Minutes</span>
            </div>
          </div>

          {/* Résumé de l'heure sélectionnée */}
          <p className="text-center text-sm text-ink-400 mt-3">
            Heure sélectionnée :{' '}
            <span className="font-semibold text-primary-600">{currentTime}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-5 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 !py-2 text-sm">
            Annuler
          </button>
          <button onClick={handleConfirm} className="btn-primary flex-1 !py-2 text-sm">
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
