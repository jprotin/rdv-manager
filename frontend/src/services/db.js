import { openDB } from 'idb';
import { clientsApi, appointmentsApi } from './api.js';

const DB_NAME = 'rdv-manager';
const DB_VERSION = 1;

let _db;

async function getDB() {
  if (!_db) {
    _db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('clients')) {
          db.createObjectStore('clients', { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains('appointments')) {
          db.createObjectStore('appointments', { keyPath: '_id' });
        }
      },
    });
  }
  return _db;
}

function generateId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---- Clients ----

export async function getLocalClients() {
  const db = await getDB();
  const all = await db.getAll('clients');
  return all.filter((d) => !d._deleted);
}

export async function saveLocalClient(client) {
  const db = await getDB();
  const id = client._id || client.remoteId || generateId();
  const existing = await db.get('clients', id);
  const doc = {
    ...(existing || {}),
    ...client,
    _id: id,
    _synced: false,
    updatedAt: new Date().toISOString(),
    ...(!existing ? { createdAt: new Date().toISOString() } : {}),
  };
  await db.put('clients', doc);
  return doc;
}

export async function deleteLocalClient(id) {
  const db = await getDB();
  const existing = await db.get('clients', id);
  if (existing) {
    await db.put('clients', { ...existing, _deleted: true, _synced: false, updatedAt: new Date().toISOString() });
  }
}

// ---- Appointments ----

export async function getLocalAppointments(filter = {}) {
  const db = await getDB();
  let all = await db.getAll('appointments');
  all = all.filter((d) => !d._deleted);

  if (filter.status) all = all.filter((d) => d.status === filter.status);

  if (filter.today || filter.date) {
    const ref = filter.date ? new Date(filter.date) : new Date();
    const start = new Date(ref); start.setHours(0, 0, 0, 0);
    const end = new Date(ref); end.setHours(23, 59, 59, 999);
    all = all.filter((d) => {
      const dt = new Date(d.startAt);
      return dt >= start && dt <= end;
    });
  }

  return all.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
}

export async function saveLocalAppointment(appointment) {
  const db = await getDB();
  const id = appointment._id || appointment.remoteId || generateId();
  const existing = await db.get('appointments', id);
  const doc = {
    ...(existing || {}),
    ...appointment,
    _id: id,
    _synced: false,
    updatedAt: new Date().toISOString(),
    ...(!existing ? { createdAt: new Date().toISOString() } : {}),
  };
  await db.put('appointments', doc);
  return doc;
}

export async function deleteLocalAppointment(id) {
  const db = await getDB();
  const existing = await db.get('appointments', id);
  if (existing) {
    await db.put('appointments', { ...existing, _deleted: true, _synced: false, updatedAt: new Date().toISOString() });
  }
}

// ---- Sync ----

async function getUnsynced(storeName) {
  const db = await getDB();
  const all = await db.getAll(storeName);
  return all.filter((d) => d._synced === false);
}

async function upsertFromServer(storeName, serverDoc) {
  const db = await getDB();
  const localId = serverDoc._id.toString();
  const existing = await db.get(storeName, localId);
  if (!existing || new Date(serverDoc.updatedAt) > new Date(existing.updatedAt || 0)) {
    await db.put(storeName, { ...serverDoc, _id: localId, _synced: true });
  }
}

export async function syncClients() {
  const since = localStorage.getItem('lastClientSync') || new Date(0).toISOString();
  const { data: serverDocs } = await clientsApi.sync(since);
  for (const doc of serverDocs) await upsertFromServer('clients', doc);

  const db = await getDB();
  const unsynced = await getUnsynced('clients');
  for (const doc of unsynced) {
    try {
      const saved = doc.remoteId
        ? await clientsApi.update(doc.remoteId, doc)
        : await clientsApi.create(doc);
      await db.put('clients', { ...doc, remoteId: saved._id, _synced: true });
    } catch (err) {
      console.warn('Sync client échoué:', err.message);
    }
  }
  localStorage.setItem('lastClientSync', new Date().toISOString());
}

export async function syncAppointments() {
  const since = localStorage.getItem('lastAppointmentSync') || new Date(0).toISOString();
  const { data: serverDocs } = await appointmentsApi.sync(since);
  for (const doc of serverDocs) await upsertFromServer('appointments', doc);

  const db = await getDB();
  const unsynced = await getUnsynced('appointments');
  for (const doc of unsynced) {
    try {
      const saved = doc.remoteId
        ? await appointmentsApi.update(doc.remoteId, doc)
        : await appointmentsApi.create(doc);
      await db.put('appointments', { ...doc, remoteId: saved._id, _synced: true });
    } catch (err) {
      console.warn('Sync RDV échoué:', err.message);
    }
  }
  localStorage.setItem('lastAppointmentSync', new Date().toISOString());
}

export async function syncAll() {
  await Promise.allSettled([syncClients(), syncAppointments()]);
}

export function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((reg) => reg.sync.register('sync-rdv'));
  }
}
