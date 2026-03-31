import { useState, useEffect } from 'react';
import AddressSearch from '../common/AddressSearch.jsx';
import PhoneInput from '../common/PhoneInput.jsx';
import { appointmentsService, clientsService } from '../../services/firestore.js';
import { useApp } from '../../context/AppContext.jsx';

const toLocalDatetime = (date) => {
  const d = date || new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d.toISOString().slice(0, 16);
};

export default function CreateAppointmentModal({ onClose, onSaved, initialDate }) {
  const { notify } = useApp();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  const startDefault = initialDate ? initialDate.slice(0, 16) : toLocalDatetime(new Date());
  const endDefault = (() => {
    const d = new Date(startDefault);
    d.setMinutes(d.getMinutes() + 30);
    return d.toISOString().slice(0, 16);
  })();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: null,
    title: '',
    description: '',
    notes: '',
    startAt: startDefault,
    endAt: endDefault,
    status: 'pending',
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

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'Prénom requis';
    if (!form.lastName.trim()) errs.lastName = 'Nom requis';
    if (!form.title.trim()) errs.title = 'Intitulé requis';
    if (!form.startAt) errs.startAt = 'Date de début requise';
    if (!form.endAt) errs.endAt = 'Date de fin requise';
    if (form.startAt && form.endAt && new Date(form.endAt) <= new Date(form.startAt)) {
      errs.endAt = 'La fin doit être après le début';
    }
    return errs;
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setForm((f) => ({
      ...f,
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone || '',
      address: client.address || null,
    }));
    setClientResults([]);
    setClientSearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      let clientId = selectedClient?._id || null;

      if (!clientId) {
        const newClient = await clientsService.create({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.replace(/\s/g, ''),
          address: form.address,
        });
        clientId = newClient._id;
      }

      await appointmentsService.create({
        clientId,
        title: form.title.trim(),
        description: form.description.trim(),
        notes: form.notes.trim(),
        startAt: form.startAt,
        endAt: form.endAt,
        status: form.status,
        address: form.address,
      });

      notify('success', 'Rendez-vous enregistré');
      onSaved();
    } catch (err) {
      notify('error', err.message || 'Erreur lors de l\'enregistrement');
      setErrors({ submit: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-gray-800">Nouveau rendez-vous</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intitulé *</label>
            <input
              type="text"
              className="input"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ex: Consultation, Livraison..."
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Début *</label>
              <input
                type="datetime-local"
                className="input text-sm"
                value={form.startAt}
                onChange={(e) => set('startAt', e.target.value)}
              />
              {errors.startAt && <p className="text-red-500 text-xs mt-1">{errors.startAt}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin *</label>
              <input
                type="datetime-local"
                className="input text-sm"
                value={form.endAt}
                onChange={(e) => set('endAt', e.target.value)}
              />
              {errors.endAt && <p className="text-red-500 text-xs mt-1">{errors.endAt}</p>}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Client</p>

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
                  <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {clientResults.map((c) => (
                      <li
                        key={c._id}
                        className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm"
                        onMouseDown={() => handleClientSelect(c)}
                      >
                        <span className="font-medium">{c.lastName} {c.firstName}</span>
                        {c.phone && <span className="text-gray-400 ml-2">{c.phone}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {selectedClient && (
              <div className="bg-primary-50 rounded-xl p-3 flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-primary-800">{selectedClient.firstName} {selectedClient.lastName}</p>
                  {selectedClient.phone && <p className="text-xs text-primary-600">{selectedClient.phone}</p>}
                </div>
                <button type="button" onClick={() => { setSelectedClient(null); setForm(f => ({ ...f, firstName: '', lastName: '', phone: '', address: null })); }} className="text-xs text-primary-600 hover:text-primary-800">
                  Changer
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                <input type="text" className="input" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Jean" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input type="text" className="input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Dupont" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <PhoneInput value={form.phone} onChange={(v) => set('phone', v)} />
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <AddressSearch value={form.address} onChange={(v) => set('address', v)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmé</option>
              <option value="cancelled">Annulé</option>
              <option value="completed">Réalisé</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Détails du rendez-vous..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes complémentaires</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Remarques internes..." />
          </div>

          {errors.submit && <p className="text-red-500 text-sm">{errors.submit}</p>}

          <div className="flex gap-3 pt-2 pb-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
