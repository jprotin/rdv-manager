import { useState, useEffect, useCallback } from 'react';
import ClientCard from './ClientCard.jsx';
import { clientsService } from '../../services/firestore.js';

export default function ClientList() {
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientsService.getAll(search);
      setClients(data);
      setTotal(data.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchClients, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchClients]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Clients</h1>
        <p className="text-sm text-gray-500">{total} client{total !== 1 ? 's' : ''}</p>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par nom, téléphone..."
        className="input"
      />

      {loading ? (
        <div className="text-center py-10 text-gray-400">Chargement...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          {search ? 'Aucun client trouvé' : 'Aucun client enregistré'}
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <ClientCard key={client._id} client={client} onUpdate={fetchClients} />
          ))}
        </div>
      )}
    </div>
  );
}
