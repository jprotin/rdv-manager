import { useState, useEffect } from 'react';
import { appointmentsService } from '../../services/firestore.js';

// ---- Constantes ----
const SLOT_START = 8;   // 08:00
const SLOT_END   = 19;  // dernier créneau 18:30
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS   = ['L','M','M','J','V','S','D'];

function pad(n) { return String(n).padStart(2, '0'); }

// Génère tous les créneaux de la journée (ex. ['08:00','08:30',...,'18:30'])
function generateSlots() {
  const slots = [];
  for (let h = SLOT_START; h < SLOT_END; h++) {
    slots.push(`${pad(h)}:00`);
    slots.push(`${pad(h)}:30`);
  }
  return slots;
}
const ALL_SLOTS = generateSlots();

// Construit un ISO UTC à partir de composants locaux
function localToISO(year, month, day, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return new Date(year, month, day, h, m, 0, 0).toISOString();
}

// Nombre de jours dans le mois
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

// Premier jour du mois — ramené à lundi=0 … dimanche=6
function firstWeekday(y, m) {
  const d = new Date(y, m, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

// Formatte un ISO pour affichage dans le bouton déclencheur
export function formatPickerValue(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

// Formatte une date YYYY-MM-DD pour affichage
export function formatDateOnly(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ---- Composant ----
// dateOnly=true : sélection de date uniquement, retourne "YYYY-MM-DD", ferme au clic
export default function DateTimePicker({ value, onChange, onClose, label, dateOnly = false }) {
  const now     = new Date();
  const initial = value ? new Date(value) : now;

  const [viewY, setViewY]       = useState(initial.getFullYear());
  const [viewM, setViewM]       = useState(initial.getMonth());
  const [selDate, setSelDate]   = useState({
    y: initial.getFullYear(),
    m: initial.getMonth(),
    d: initial.getDate(),
  });
  const [selTime, setSelTime]   = useState(`${pad(initial.getHours())}:${pad(initial.getMinutes())}`);
  const [customH, setCustomH]   = useState(pad(initial.getHours()));
  const [customM, setCustomM]   = useState(pad(initial.getMinutes()));
  const [booked, setBooked]     = useState(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Charger les RDV du jour sélectionné pour calculer les créneaux pris
  useEffect(() => {
    if (!selDate) return;
    setLoadingSlots(true);
    const from = new Date(selDate.y, selDate.m, selDate.d, 0, 0, 0).toISOString();
    const to   = new Date(selDate.y, selDate.m, selDate.d, 23, 59, 59).toISOString();

    appointmentsService.getAll({ from, to, limit: 200 })
      .then(({ data }) => {
        const active = data.filter(a => a.status !== 'cancelled');
        const taken  = new Set();
        ALL_SLOTS.forEach(slot => {
          const [h, mins] = slot.split(':').map(Number);
          const slotMs = new Date(selDate.y, selDate.m, selDate.d, h, mins).getTime();
          const isTaken = active.some(a => {
            const s = new Date(a.startAt).getTime();
            const e = new Date(a.endAt).getTime();
            return slotMs >= s && slotMs < e;
          });
          if (isTaken) taken.add(slot);
        });
        setBooked(taken);
      })
      .catch(console.error)
      .finally(() => setLoadingSlots(false));
  }, [selDate]);

  // Navigation mois
  const prevMonth = () => {
    if (viewM === 0) { setViewM(11); setViewY(y => y - 1); }
    else setViewM(m => m - 1);
  };
  const nextMonth = () => {
    if (viewM === 11) { setViewM(0); setViewY(y => y + 1); }
    else setViewM(m => m + 1);
  };

  const handleDay = (d) => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const clicked = new Date(viewY, viewM, d);
    if (!dateOnly && clicked < today) return;
    if (dateOnly) {
      // Retourne YYYY-MM-DD et ferme immédiatement
      const mm = pad(viewM + 1), dd = pad(d);
      onChange(`${viewY}-${mm}-${dd}`);
      onClose();
      return;
    }
    setSelDate({ y: viewY, m: viewM, d });
  };

  const handleSlot = (slot) => {
    if (booked.has(slot)) return;
    setSelTime(slot);
    setCustomH(slot.split(':')[0]);
    setCustomM(slot.split(':')[1]);
  };

  const handleHourChange = (h) => {
    setCustomH(h);
    setSelTime(`${h}:${customM}`);
  };

  const handleMinuteChange = (m) => {
    setCustomM(m);
    setSelTime(`${customH}:${m}`);
  };

  const handleConfirm = () => {
    if (!selDate || !selTime) return;
    onChange(localToISO(selDate.y, selDate.m, selDate.d, selTime));
    onClose();
  };

  // Calcul de la grille calendrier
  const totalDays  = daysInMonth(viewY, viewM);
  const startBlank = firstWeekday(viewY, viewM);
  const cells      = [...Array(startBlank).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];

  const todayY = now.getFullYear(), todayM = now.getMonth(), todayD = now.getDate();
  // En mode dateOnly, "sélectionné" = valeur actuelle du filtre
  const selectedDateOnly = dateOnly && value ? value : null;
  const isSelected = (d) => {
    if (dateOnly) {
      const mm = pad(viewM + 1), dd = pad(d);
      return selectedDateOnly === `${viewY}-${mm}-${dd}`;
    }
    return selDate && selDate.y === viewY && selDate.m === viewM && selDate.d === d;
  };
  const isToday = (d) => viewY === todayY && viewM === todayM && d === todayD;
  const isPast  = (d) => !dateOnly && new Date(viewY, viewM, d) < new Date(todayY, todayM, todayD);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* En-tête avec label */}
        {label && (
          <div className="px-5 pt-4 pb-1">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{label}</p>
          </div>
        )}

        {/* Navigation mois — couleur primaire */}
        <div className="bg-primary-500 text-white px-4 py-3 flex items-center justify-between">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center hover:bg-primary-600 rounded-lg transition-colors text-lg font-bold">‹</button>
          <span className="font-semibold text-sm">{MONTHS[viewM]} {viewY}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center hover:bg-primary-600 rounded-lg transition-colors text-lg font-bold">›</button>
        </div>

        {/* Entêtes jours */}
        <div className="grid grid-cols-7 bg-primary-50 border-b border-primary-100">
          {DAYS.map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold text-primary-400 py-2">{d}</div>
          ))}
        </div>

        {/* Grille calendrier */}
        <div className="grid grid-cols-7 p-2 gap-y-0.5">
          {cells.map((day, i) => (
            <div key={i} className="flex items-center justify-center h-9">
              {day && (
                <button
                  onClick={() => handleDay(day)}
                  disabled={isPast(day)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-colors
                    ${isSelected(day)
                      ? 'bg-primary-500 text-white shadow-sm'
                      : isToday(day)
                      ? 'border-2 border-primary-300 text-primary-600 font-bold'
                      : isPast(day)
                      ? 'text-ink-200 cursor-not-allowed'
                      : 'text-ink-700 hover:bg-primary-50 hover:text-primary-600'
                    }`}
                >
                  {day}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Créneaux horaires — masqués en mode dateOnly */}
        {!dateOnly && <div className="border-t border-ink-100 px-4 py-3">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-2">
            {loadingSlots ? 'Chargement...' : 'Créneaux disponibles'}
          </p>

          {!loadingSlots && (
            <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-0.5">
              {ALL_SLOTS.map(slot => {
                const isTaken  = booked.has(slot);
                const isActive = selTime === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => handleSlot(slot)}
                    disabled={isTaken}
                    title={isTaken ? 'Créneau réservé' : slot}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors
                      ${isActive
                        ? 'bg-primary-500 text-white shadow-sm'
                        : isTaken
                        ? 'bg-ink-50 text-ink-300 line-through cursor-not-allowed'
                        : 'bg-snow border border-ink-200 text-ink-700 hover:border-primary-300 hover:text-primary-500 hover:bg-primary-50'
                      }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          )}

          {/* Contrôle heure / minutes */}
          <div className="mt-3 pt-2 border-t border-ink-100">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-2">
              Heure personnalisée
            </p>
            <div className="flex items-center justify-center gap-3">
              {/* Heures */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => handleHourChange(pad((parseInt(customH, 10) + 1) % 24))}
                  className="w-9 h-9 rounded-xl bg-ink-50 hover:bg-primary-50 hover:text-primary-600 text-ink-500 font-bold text-lg flex items-center justify-center transition-colors"
                >▲</button>
                <span className="w-12 text-center text-xl font-bold text-ink-700 bg-snow border border-ink-200 rounded-xl py-1">
                  {customH}
                </span>
                <button
                  onClick={() => handleHourChange(pad((parseInt(customH, 10) - 1 + 24) % 24))}
                  className="w-9 h-9 rounded-xl bg-ink-50 hover:bg-primary-50 hover:text-primary-600 text-ink-500 font-bold text-lg flex items-center justify-center transition-colors"
                >▼</button>
                <span className="text-xs text-ink-400">Heure</span>
              </div>
              <span className="text-2xl font-bold text-ink-300 mb-5">:</span>
              {/* Minutes */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => handleMinuteChange(pad((parseInt(customM, 10) + 5) % 60))}
                  className="w-9 h-9 rounded-xl bg-ink-50 hover:bg-primary-50 hover:text-primary-600 text-ink-500 font-bold text-lg flex items-center justify-center transition-colors"
                >▲</button>
                <span className="w-12 text-center text-xl font-bold text-ink-700 bg-snow border border-ink-200 rounded-xl py-1">
                  {customM}
                </span>
                <button
                  onClick={() => handleMinuteChange(pad((parseInt(customM, 10) - 5 + 60) % 60))}
                  className="w-9 h-9 rounded-xl bg-ink-50 hover:bg-primary-50 hover:text-primary-600 text-ink-500 font-bold text-lg flex items-center justify-center transition-colors"
                >▼</button>
                <span className="text-xs text-ink-400">Minutes</span>
              </div>
            </div>
          </div>
        </div>}

        {/* Actions — masquées en mode dateOnly (fermeture auto au clic) */}
        {!dateOnly && (
          <div className="flex gap-2 px-4 pb-5 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 !py-2 text-sm">
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selDate || !selTime}
              className="btn-primary flex-1 !py-2 text-sm"
            >
              Confirmer
            </button>
          </div>
        )}

        {/* En mode dateOnly, juste un bouton Annuler */}
        {dateOnly && (
          <div className="px-4 pb-5 pt-1">
            <button onClick={onClose} className="btn-secondary w-full !py-2 text-sm">
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
