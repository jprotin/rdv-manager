import { useState, useEffect } from 'react';
import AddressSearch from '../common/AddressSearch.jsx';
import PhoneInput from '../common/PhoneInput.jsx';
import TagInput from '../common/TagInput.jsx';
import DateTimePicker, { formatPickerValue } from '../common/DateTimePicker.jsx';
import SelectPicker from '../common/SelectPicker.jsx';
import { appointmentsService, clientsService, tagsService } from '../../services/firestore.js';
import { useApp } from '../../context/AppContext.jsx';

const STATUS_OPTIONS = [
  { value: 'confirmed',   label: 'Confirmé' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed',   label: 'Terminé' },
  { value: 'cancelled',   label: 'Annulé' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSettings() {
  try { return JSON.parse(localStorage.getItem('rdv_settings') || '{}'); } catch { return {}; }
}

function computeEndAt(startISO, durationMin) {
  return new Date(new Date(startISO).getTime() + durationMin * 60000).toISOString();
}

export default function CreateAppointmentModal({ onClose, onSaved, initialDate }) {
  const { notify } = useApp();
  const settings = getSettings();
  const defaultDuration = parseInt(settings.defaultDuration || '30', 10);

  const [saving, setSaving]               = useState(false);
  const [errors, setErrors]               = useState({});
  const [clientSearch, setClientSearch]   = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [picker, setPicker]               = useState(null); // null | 'datetime'
  const [statusPicker, setStatusPicker]   = useState(false);

  const startDefault = initialDate
    ? new Date(initialDate).toISOString()
    : new Date().toISOString();

  const [form, setForm] = useState({
    firstName:   '',
    lastName:    '',
    phone:       '',
    email:       '',
    address:     null,
    description: '',
    startAt:     startDefault,
    endAt:       computeEndAt(startDefault, defaultDuration),
    status:      'confirmed',
    tags:        [],
  });

  useEffect(() => {
    if (!clientSearch || clientSearch.length < 2) { setClientResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const results = await clientsService.getAll(clientSearch);
        setClientResults(results.slice(0, 5));
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleStartChange = (iso) => {
    setForm(f => {
      // Recalcule la fin uniquement si elle n'a pas été ajustée manuellement
      const currentDiff = Math.round((new Date(f.endAt) - new Date(f.startAt)) / 60000);
      const duration = currentDiff > 0 ? currentDiff : defaultDuration;
      return { ...f, startAt: iso, endAt: computeEndAt(iso, duration) };
    });
  };

  const handleEndChange = (iso) => {
    set('endAt', iso);
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'Prénom requis';
    if (!form.lastName.trim())  errs.lastName  = 'Nom requis';
    if (!form.phone.trim())     errs.phone     = 'Téléphone requis';
    if (form.email && !EMAIL_RE.test(form.email)) errs.email = 'Email invalide';
    if (!form.startAt)          errs.startAt   = 'Date requise';
    if (form.startAt && form.endAt && new Date(form.endAt) <= new Date(form.startAt)) {
      errs.endAt = 'La fin doit être après le début';
    }
    return errs;
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setForm(f => ({
      ...f,
      firstName: client.firstName,
      lastName:  client.lastName,
      phone:     client.phone || '',
      email:     client.email || '',
      address:   client.address || null,
    }));
    setClientResults([]);
    setClientSearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    // Détection de conflit
    try {
      const hasConflict = await appointmentsService.checkConflict(form.startAt, form.endAt);
      if (hasConflict) {
        setErrors({ submit: 'Conflit : un rendez-vous existe déjà sur ce créneau.' });
        return;
      }
    } catch { /* si erreur réseau, on continue */ }

    setSaving(true);
    try {
      let clientId = selectedClient?._id || null;
      let clientSnapshot = null;

      if (!clientId) {
        const newClient = await clientsService.create({
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          phone:     form.phone.replace(/\s/g, ''),
          email:     form.email.trim(),
          address:   form.address,
        });
        clientId = newClient._id;
        clientSnapshot = {
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          phone:     form.phone.replace(/\s/g, ''),
          email:     form.email.trim(),
          address:   form.address,
        };
      } else {
        clientSnapshot = {
          firstName: selectedClient.firstName,
          lastName:  selectedClient.lastName,
          phone:     selectedClient.phone,
          email:     selectedClient.email || '',
          address:   selectedClient.address,
        };
      }

      await appointmentsService.create({
        clientId,
        clientSnapshot,
        description: form.description.trim(),
        startAt:     form.startAt,
        endAt:       form.endAt,
        status:      form.status,
        address:     form.address,
        tags:        form.tags,
      });

      // Persister les tags qui n'existent pas encore dans la collection tags
      if (form.tags.length > 0) {
        const existingTags = await tagsService.getAll();
        const existingNames = new Set(existingTags.map(t => t.name));
        await Promise.all(
          form.tags
            .filter(t => !existingNames.has(t))
            .map(t => tagsService.create(t))
        );
      }

      notify('success', 'Rendez-vous enregistré');
      onSaved();
    } catch (err) {
      notify('error', err.message || 'Erreur lors de l\'enregistrement');
      setErrors({ submit: err.message });
    } finally {
      setSaving(false);
    }
  };

  const formatEndTime = (iso) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const durationMin = Math.round((new Date(form.endAt) - new Date(form.startAt)) / 60000);

  return (
    <>
      {/* Overlay principal */}
      <div className="fixed inset-0 bg-black/50 z-50 md:flex md:items-center md:justify-center md:p-6" onClick={onClose}>
        <div
          className="bg-white w-full h-full overflow-y-auto
                     md:h-auto md:max-h-[90vh] md:w-[560px] md:rounded-2xl md:shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white px-5 py-4 border-b border-ink-100 flex items-center justify-between z-10 md:rounded-t-2xl">
            <h2 className="text-lg font-semibold text-ink-700">Nouveau rendez-vous</h2>
            <button type="button" onClick={onClose} className="text-ink-300 hover:text-ink-600 text-2xl leading-none">×</button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">

            {/* Date & Heure — bouton ouvrant la popup */}
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Date et heure *</label>
              <button
                type="button"
                onClick={() => setPicker('datetime')}
                className="w-full px-3 py-2.5 border border-ink-200 rounded-xl text-sm text-left
                           hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-300
                           transition-colors bg-white"
              >
                <span className="text-ink-700">
                  {formatPickerValue(form.startAt)}
                  <span className="text-ink-400 mx-1">→</span>
                  {formatEndTime(form.endAt)}
                  <span className="text-ink-300 ml-2 text-xs">{durationMin > 0 ? `${durationMin} min` : ''}</span>
                </span>
              </button>
              {errors.startAt && <p className="text-red-500 text-xs mt-1">{errors.startAt}</p>}
              {errors.endAt && <p className="text-red-500 text-xs mt-1">{errors.endAt}</p>}
            </div>

            {/* Client */}
            <div className="border-t border-ink-100 pt-4">
              <p className="text-sm font-medium text-ink-700 mb-3">Client</p>

              {!selectedClient && (
                <div className="relative mb-3">
                  <input
                    type="text"
                    className="input text-sm"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Rechercher un client existant..."
                  />
                  {clientResults.length > 0 && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-ink-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                      {clientResults.map((c) => (
                        <li
                          key={c._id}
                          className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm"
                          onMouseDown={() => handleClientSelect(c)}
                        >
                          <span className="font-medium text-ink-700">{c.lastName} {c.firstName}</span>
                          {c.phone && <span className="text-ink-300 ml-2">{c.phone}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {selectedClient && (
                <div className="bg-primary-50 rounded-xl p-3 flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-primary-700">{selectedClient.firstName} {selectedClient.lastName}</p>
                    {selectedClient.phone && <p className="text-xs text-primary-500">{selectedClient.phone}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setForm(f => ({ ...f, firstName: '', lastName: '', phone: '', email: '', address: null }));
                    }}
                    className="text-xs text-primary-500 hover:text-primary-700"
                  >
                    Changer
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Prénom *</label>
                  <input type="text" className="input" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Jean" />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Nom *</label>
                  <input type="text" className="input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Dupont" />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Téléphone *</label>
                  <PhoneInput value={form.phone} onChange={(v) => set('phone', v)} />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="jean@example.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-ink-700 mb-1">Adresse</label>
                <AddressSearch value={form.address} onChange={(v) => set('address', v)} />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Tags</label>
              <TagInput value={form.tags} onChange={(v) => set('tags', v)} />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Description</label>
              <textarea
                className="input resize-none"
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Détails du rendez-vous..."
              />
            </div>

            {/* Statut */}
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Statut</label>
              <button
                type="button"
                onClick={() => setStatusPicker(true)}
                className="w-full px-3 py-2.5 border border-ink-200 rounded-xl text-sm text-left hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-colors bg-white text-ink-700"
              >
                {STATUS_OPTIONS.find(o => o.value === form.status)?.label ?? 'Choisir…'}
              </button>
            </div>

            {errors.submit && <p className="text-red-500 text-sm">{errors.submit}</p>}

            <div className="flex gap-3 pt-2 pb-8 md:pb-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Picker statut */}
      {statusPicker && (
        <SelectPicker
          label="Statut du rendez-vous"
          value={form.status}
          options={STATUS_OPTIONS}
          onChange={(v) => set('status', v)}
          onClose={() => setStatusPicker(false)}
        />
      )}

      {/* Picker date + heure début/fin */}
      {picker === 'datetime' && (
        <DateTimePicker
          label="Date et heure"
          value={form.startAt}
          endValue={form.endAt}
          onChange={handleStartChange}
          onEndChange={handleEndChange}
          onClose={() => setPicker(null)}
          defaultDuration={defaultDuration}
        />
      )}
    </>
  );
}
