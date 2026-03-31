const { Router } = require('express');
const Appointment = require('../models/Appointment');

const router = Router();

// GET /api/appointments
router.get('/', async (req, res, next) => {
  try {
    const { status, clientId, from, to, page = 1, limit = 50 } = req.query;
    const filter = { deletedAt: null };

    if (status) filter.status = status;
    if (clientId) filter.client = clientId;
    if (from || to) {
      filter.startAt = {};
      if (from) filter.startAt.$gte = new Date(from);
      if (to) filter.startAt.$lte = new Date(to);
    }

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('client', 'firstName lastName phone address')
        .sort({ startAt: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Appointment.countDocuments(filter),
    ]);

    res.json({ data: appointments, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/today
router.get('/today', async (req, res, next) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      startAt: { $gte: start, $lte: end },
      deletedAt: null,
    })
      .populate('client', 'firstName lastName phone address')
      .sort({ startAt: 1 });

    res.json({ data: appointments });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/tomorrow
router.get('/tomorrow', async (req, res, next) => {
  try {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      startAt: { $gte: start, $lte: end },
      deletedAt: null,
    })
      .populate('client', 'firstName lastName phone address')
      .sort({ startAt: 1 });

    res.json({ data: appointments });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/week
router.get('/week', async (req, res, next) => {
  try {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1); // Monday
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Sunday
    end.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      startAt: { $gte: start, $lte: end },
      deletedAt: null,
    })
      .populate('client', 'firstName lastName phone address')
      .sort({ startAt: 1 });

    res.json({ data: appointments });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/sync?since=<ISO>
router.get('/sync', async (req, res, next) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const appointments = await Appointment.find({ updatedAt: { $gt: since } })
      .populate('client', 'firstName lastName phone address');
    res.json({ data: appointments, since });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, deletedAt: null })
      .populate('client');
    if (!appointment) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rendez-vous introuvable' } });
    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

// POST /api/appointments
router.post('/', async (req, res, next) => {
  try {
    if (new Date(req.body.endAt) <= new Date(req.body.startAt)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'La fin doit être après le début' } });
    }
    const appointment = new Appointment(req.body);
    await appointment.save();
    await appointment.populate('client', 'firstName lastName phone address');
    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});

// PUT /api/appointments/:id
router.put('/:id', async (req, res, next) => {
  try {
    if (req.body.startAt && req.body.endAt && new Date(req.body.endAt) <= new Date(req.body.startAt)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'La fin doit être après le début' } });
    }
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      req.body,
      { new: true, runValidators: true }
    ).populate('client', 'firstName lastName phone address');
    if (!appointment) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rendez-vous introuvable' } });
    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { status },
      { new: true, runValidators: true }
    ).populate('client', 'firstName lastName phone address');
    if (!appointment) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rendez-vous introuvable' } });
    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/appointments/:id (soft delete)
router.delete('/:id', async (req, res, next) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!appointment) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rendez-vous introuvable' } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
