import { useState, useEffect } from 'react';
import { appointmentsService } from '../../services/firestore.js';

// ---- Constantes ----
const SLOT_START = 8;   // 08:00
const SLOT_END   = 19;  // dernier créneau 18:30
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS   = ['L','M','M','J','V','S','D'];

function pad(n) { return String(n).padStart(2, '0'); }

function generateSlots() {
  const slots = [];
  for (let h = SLOT_START; h < SLOT_END; h++) {
    slots.push(`${pad(h)}:00`);
    slots.push(`${pad(h)}:30`);
  }
  return slots;
}
const ALL_SLOTS = generateSlots();

function localToISO(year, month, day, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return new Date(year, month, day, h, m, 0, 0).toISOString();
}

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

function firstWeekday(y, m) {
  const d = new Date(y, m, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export function formatPickerValue(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDateOnly(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

// Ajoute N minutes à "HH:MM" → retourne { h: "HH", m: "MM" }
function addMinutesToTime(hour, minute, mins) {
  const total = parseInt(hour, 10) * 60 + parseInt(minute, 10) + mins;
  return { h: pad(Math.floor((total % 1440) / 60)), m: pad(total % 60) };
}

// ---- Spinner compact ----
function MiniSpinner({ value, onChange, step = 1, max = 59 }) {
  const inc = () => onChange(pad((parseInt(value, 10) + step) % (max + 1)));
  const dec = () => onChange(pad((parseInt(value, 10) - step + (max + 1)) % (max + 1)));
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button type="button" onClick={inc}
        className="w-8 h-7 rounded-lg bg-ink-50 hover:bg-primary-50 hover:text-primary-600 text-ink-500 font-bold text-sm flex items-center justify-center transition-colors"
      >▲</button>
      <span className="w-10 text-center text-lg font-bold text-ink-700 bg-snow border border-ink-200 rounded-lg py-0.5">
        {value}
      </span>
      <button type="button" onClick={dec}
        className="w-8 h-7 rounded-lg bg-ink-50 hover:bg-primary-50 hover:text-primary-600 text-ink-500 font-bold text-sm flex items-center justify-center transition-colors"
      >▼</button>
    </div>
  );
}

// ---- Contenu interne du picker ----
function PickerContent({ value, onChange, onClose, label, dateOnly = false, endValue, onEndChange, defaultDuration = 30 }) {
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
  const [startH, setStartH]    = useState(pad(initial.getHours()));
  const [startMn, setStartMn]  = useState(pad(initial.getMinutes()));
  const [booked, setBooked]     = useState(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);

  const endInit = endValue ? new Date(endValue) : null;
  const [endH, setEndH]   = useState(endInit ? pad(endInit.getHours()) : '00');
  const [endMn, setEndMn] = useState(endInit ? pad(endInit.getMinutes()) : '00');
  const [conflictMsg, setConflictMsg] = useState(null);
  const [checking, setChecking]       = useState(false);

  // Recalcule la fin quand le début change
  const syncEnd = (h, m) => {
    if (!onEndChange) return;
    const e = addMinutesToTime(h, m, defaultDuration);
    setEndH(e.h);
    setEndMn(e.m);
  };

  // Charger les RDV du jour sélectionné
  useEffect(() => {
    if (!selDate || dateOnly) return;
    setLoadingSlots(true);
    const from = new Date(selDate.y, selDate.m, selDate.d, 0, 0, 0).toISOString();
    const to   = new Date(selDate.y, selDate.m, selDate.d, 23, 59, 59).toISOString();

    appointmentsService.getInRange(from, to)
      .then((data) => {
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
  }, [selDate, dateOnly]);

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
      const mm = pad(viewM + 1), dd = pad(d);
      onChange(`${viewY}-${mm}-${dd}`);
      onClose();
      return;
    }
    setSelDate({ y: viewY, m: viewM, d });
  };

  const handleSlot = (slot) => {
    if (booked.has(slot)) return;
    const h = slot.split(':')[0];
    const m = slot.split(':')[1];
    setSelTime(slot);
    setStartH(h);
    setStartMn(m);
    syncEnd(h, m);
  };

  const handleStartHourChange = (h) => {
    setStartH(h);
    setSelTime(`${h}:${startMn}`);
    syncEnd(h, startMn);
  };
  const handleStartMinuteChange = (m) => {
    setStartMn(m);
    setSelTime(`${startH}:${m}`);
    syncEnd(startH, m);
  };

  const handleConfirm = async () => {
    if (!selDate || !selTime) return;
    const startISO = localToISO(selDate.y, selDate.m, selDate.d, selTime);
    const endISO   = onEndChange
      ? localToISO(selDate.y, selDate.m, selDate.d, `${endH}:${endMn}`)
      : null;

    // Vérification de conflit si on a début + fin
    if (endISO) {
      setConflictMsg(null);
      setChecking(true);
      try {
        const hasConflict = await appointmentsService.checkConflict(startISO, endISO);
        if (hasConflict) {
          setConflictMsg('Ce créneau chevauche un rendez-vous existant.');
          setChecking(false);
          return;
        }
      } catch { /* erreur réseau : on laisse passer */ }
      setChecking(false);
    }

    onChange(startISO);
    if (onEndChange && endISO) onEndChange(endISO);
    onClose();
  };

  const totalDays  = daysInMonth(viewY, viewM);
  const startBlank = firstWeekday(viewY, viewM);
  const cells      = [...Array(startBlank).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];

  const todayY = now.getFullYear(), todayM = now.getMonth(), todayD = now.getDate();
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
    <>
      {label && (
        <div className="px-5 pt-4 pb-1">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{label}</p>
        </div>
      )}

      <div className="bg-primary-500 text-white px-4 py-3 flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center hover:bg-primary-600 rounded-lg transition-colors text-lg font-bold">‹</button>
        <span className="font-semibold text-sm">{MONTHS[viewM]} {viewY}</span>
        <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center hover:bg-primary-600 rounded-lg transition-colors text-lg font-bold">›</button>
      </div>

      <div className="grid grid-cols-7 bg-primary-50 border-b border-primary-100">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-xs font-semibold text-primary-400 py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 p-2 gap-y-0.5">
        {cells.map((day, i) => (
          <div key={i} className="flex items-center justify-center h-9">
            {day && (
              <button
                type="button"
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

      {!dateOnly && <div className="border-t border-ink-100 px-4 py-3 space-y-3">
        {/* Créneaux rapides */}
        <div>
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-2">
            {loadingSlots ? 'Chargement...' : 'Créneaux disponibles'}
          </p>
          {!loadingSlots && (
            <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto pr-0.5">
              {ALL_SLOTS.map(slot => {
                const isTaken  = booked.has(slot);
                const isActive = selTime === slot;
                return (
                  <button
                    type="button"
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
        </div>

        {/* Spinners début / fin côte à côte */}
        <div className="pt-2 border-t border-ink-100">
          <div className={`grid gap-4 ${onEndChange ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* Début */}
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-2 text-center">Début</p>
              <div className="flex items-center justify-center gap-1">
                <MiniSpinner value={startH} onChange={handleStartHourChange} step={1} max={23} />
                <span className="text-xl font-bold text-ink-300 mb-1">:</span>
                <MiniSpinner value={startMn} onChange={handleStartMinuteChange} step={5} max={59} />
              </div>
            </div>

            {/* Fin */}
            {onEndChange && (
              <div>
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-2 text-center">Fin</p>
                <div className="flex items-center justify-center gap-1">
                  <MiniSpinner value={endH} onChange={setEndH} step={1} max={23} />
                  <span className="text-xl font-bold text-ink-300 mb-1">:</span>
                  <MiniSpinner value={endMn} onChange={setEndMn} step={5} max={59} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>}

      {/* Message de conflit */}
      {conflictMsg && (
        <div className="mx-4 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600 text-xs font-medium">{conflictMsg}</p>
        </div>
      )}

      {/* Actions */}
      {!dateOnly && (
        <div className="flex gap-2 px-4 pb-5 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 !py-2 text-sm">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selDate || !selTime || checking}
            className="btn-primary flex-1 !py-2 text-sm"
          >
            {checking ? 'Vérification...' : 'Confirmer'}
          </button>
        </div>
      )}

      {dateOnly && (
        <div className="px-4 pb-5 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary w-full !py-2 text-sm">
            Annuler
          </button>
        </div>
      )}
    </>
  );
}

// ---- Composant principal ----
// endValue / onEndChange : active le spinner heure de fin
// defaultDuration : durée par défaut en minutes (pour auto-calcul fin quand début change)
export default function DateTimePicker({ value, onChange, onClose, label, dateOnly = false, endValue, onEndChange, defaultDuration = 30 }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <PickerContent
          value={value}
          onChange={onChange}
          onClose={onClose}
          label={label}
          dateOnly={dateOnly}
          endValue={endValue}
          onEndChange={onEndChange}
          defaultDuration={defaultDuration}
        />
      </div>
    </div>
  );
}
