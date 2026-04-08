import { useState, useEffect, useCallback } from 'react';
import { tagsService } from '../../services/firestore.js';
import { useApp } from '../../context/AppContext.jsx';

export default function TagsPage() {
  const { notify } = useApp();
  const [tags, setTags]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTags = useCallback(async () => {
    setLoading(true);
    try { setTags(await tagsService.getAll()); }
    catch (err) { notify('error', err.message); }
    finally { setLoading(false); }
  }, [notify]);

  useEffect(() => { loadTags(); }, [loadTags]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    setSaving(true);
    try {
      await tagsService.create(newTag.trim());
      setNewTag('');
      await loadTags();
    } catch (err) {
      notify('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce tag ? Il sera retiré des prochains filtres.')) return;
    try {
      await tagsService.delete(id);
      await loadTags();
    } catch (err) {
      notify('error', err.message);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">Tags</h1>

      <form onSubmit={handleCreate} className="card flex gap-2 !p-3">
        <input
          type="text"
          className="input flex-1"
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          placeholder="Nouveau tag..."
        />
        <button type="submit" disabled={saving || !newTag.trim()} className="btn-primary shrink-0">
          Ajouter
        </button>
      </form>

      {loading ? (
        <div className="text-center py-6 text-gray-400">Chargement...</div>
      ) : tags.length === 0 ? (
        <div className="text-center py-6 text-gray-400">Aucun tag créé</div>
      ) : (
        <div className="card space-y-2">
          {tags.map(tag => (
            <div key={tag._id} className="flex items-center justify-between py-1">
              <span className="inline-flex items-center bg-primary-100 text-primary-700 text-sm font-medium px-3 py-1 rounded-full">
                {tag.name}
              </span>
              <button
                onClick={() => handleDelete(tag._id)}
                className="btn-danger"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
