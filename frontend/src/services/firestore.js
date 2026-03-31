import { db } from '../config/firebase.js';
import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, limit,
  Timestamp, serverTimestamp, getCountFromServer,
} from 'firebase/firestore';

const col = (name) => collection(db, name);

const toTS = (date) => {
  if (!date) return null;
  if (date instanceof Timestamp) return date;
  return Timestamp.fromDate(new Date(date));
};

const fromDoc = (snap) =>
  snap.exists() ? { _id: snap.id, ...snap.data() } : null;

const fromDocs = (snap) =>
  snap.docs.map((d) => ({ _id: d.id, ...d.data() }));

const normalizeAppointment = (apt) => ({
  ...apt,
  startAt: apt.startAt?.toDate ? apt.startAt.toDate().toISOString() : apt.startAt,
  endAt:   apt.endAt?.toDate   ? apt.endAt.toDate().toISOString()   : apt.endAt,
});

// ---- Clients ----

export const clientsService = {
  async getAll(search = '') {
    const q = query(col('clients'), where('deletedAt', '==', null), orderBy('lastName'));
    const snap = await getDocs(q);
    let clients = fromDocs(snap);
    if (search) {
      const s = search.toLowerCase();
      clients = clients.filter(
        (c) =>
          c.firstName?.toLowerCase().includes(s) ||
          c.lastName?.toLowerCase().includes(s) ||
          c.phone?.includes(s)
      );
    }
    return clients;
  },

  async create(data) {
    const ref = await addDoc(col('clients'), {
      ...data,
      phone: data.phone?.replace(/\s/g, '') || '',
      deletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { _id: ref.id, ...data };
  },

  async delete(id) {
    await updateDoc(doc(db, 'clients', id), {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },
};

// ---- Appointments ----

export const appointmentsService = {
  async getToday() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    const q = query(
      col('appointments'),
      where('deletedAt', '==', null),
      where('startAt', '>=', toTS(start)),
      where('startAt', '<=', toTS(end)),
      orderBy('startAt')
    );
    return fromDocs(await getDocs(q)).map(normalizeAppointment);
  },

  async getTomorrow() {
    const start = new Date(); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0);
    const end   = new Date(start); end.setHours(23, 59, 59, 999);
    const q = query(
      col('appointments'),
      where('deletedAt', '==', null),
      where('startAt', '>=', toTS(start)),
      where('startAt', '<=', toTS(end)),
      orderBy('startAt')
    );
    return fromDocs(await getDocs(q)).map(normalizeAppointment);
  },

  async getAll({ status, from, to, page = 1, limit: lim = 20 } = {}) {
    const constraints = [where('deletedAt', '==', null), orderBy('startAt', 'desc')];
    if (status) constraints.push(where('status', '==', status));
    if (from)   constraints.push(where('startAt', '>=', toTS(new Date(from))));
    if (to)     constraints.push(where('startAt', '<=', toTS(new Date(to))));
    const snap = await getDocs(query(col('appointments'), ...constraints));
    const all  = fromDocs(snap).map(normalizeAppointment);
    return { data: all.slice((page - 1) * lim, page * lim), total: all.length };
  },

  async create({ clientId, clientSnapshot, ...rest }) {
    // Récupère le snapshot client si non fourni
    let snap = clientSnapshot || null;
    if (!snap && clientId) {
      const clientDoc = await getDoc(doc(db, 'clients', clientId));
      if (clientDoc.exists()) {
        const c = clientDoc.data();
        snap = { firstName: c.firstName, lastName: c.lastName, phone: c.phone, address: c.address };
      }
    }
    const ref = await addDoc(col('appointments'), {
      ...rest,
      clientId:        clientId || null,
      client:          snap,
      startAt:         toTS(rest.startAt),
      endAt:           toTS(rest.endAt),
      deletedAt:       null,
      createdAt:       serverTimestamp(),
      updatedAt:       serverTimestamp(),
    });
    return { _id: ref.id, ...rest, client: snap };
  },

  async updateStatus(id, status) {
    await updateDoc(doc(db, 'appointments', id), { status, updatedAt: serverTimestamp() });
  },

  async delete(id) {
    await updateDoc(doc(db, 'appointments', id), {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },
};

// ---- Statistiques ----

export const statsService = {
  async getOverview() {
    const now        = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const weekStart  = new Date(now); weekStart.setDate(now.getDate() - ((now.getDay() || 7) - 1)); weekStart.setHours(0, 0, 0, 0);
    const weekEnd    = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);

    const base = [where('deletedAt', '==', null)];

    const [totalClients, totalApts, todayApts, weekApts, allApts] = await Promise.all([
      getCountFromServer(query(col('clients'),      ...base)),
      getCountFromServer(query(col('appointments'), ...base)),
      getCountFromServer(query(col('appointments'), ...base, where('startAt', '>=', toTS(todayStart)), where('startAt', '<=', toTS(todayEnd)))),
      getCountFromServer(query(col('appointments'), ...base, where('startAt', '>=', toTS(weekStart)),  where('startAt', '<=', toTS(weekEnd)))),
      getDocs(query(col('appointments'), ...base)),
    ]);

    const breakdown = { pending: 0, confirmed: 0, cancelled: 0, completed: 0 };
    allApts.docs.forEach((d) => { const s = d.data().status; if (s in breakdown) breakdown[s]++; });

    return {
      totalClients:      totalClients.data().count,
      totalAppointments: totalApts.data().count,
      todayCount:        todayApts.data().count,
      weekCount:         weekApts.data().count,
      statusBreakdown:   breakdown,
    };
  },

  async getMonthly(year) {
    const snap = await getDocs(query(
      col('appointments'),
      where('deletedAt', '==', null),
      where('startAt', '>=', toTS(new Date(year, 0, 1))),
      where('startAt', '<',  toTS(new Date(year + 1, 0, 1))),
    ));
    const counts = Array(12).fill(0);
    snap.docs.forEach((d) => counts[d.data().startAt.toDate().getMonth()]++);
    const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return { year, data: MONTHS.map((month, i) => ({ month, count: counts[i] })) };
  },

  async getUpcoming() {
    const snap = await getDocs(query(
      col('appointments'),
      where('deletedAt', '==', null),
      where('startAt', '>=', Timestamp.now()),
      where('status', 'in', ['pending', 'confirmed']),
      orderBy('startAt'),
      limit(5),
    ));
    return fromDocs(snap).map(normalizeAppointment);
  },
};
