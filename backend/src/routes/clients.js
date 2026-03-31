const { Router } = require('express');
const Client = require('../models/Client');
const Appointment = require('../models/Appointment');

const router = Router();

// GET /api/clients
router.get('/', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = { deletedAt: null };

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ firstName: regex }, { lastName: regex }, { phone: regex }];
    }

    const [clients, total] = await Promise.all([
      Client.find(filter)
        .sort({ lastName: 1, firstName: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Client.countDocuments(filter),
    ]);

    res.json({ data: clients, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/clients/sync?since=<ISO>
router.get('/sync', async (req, res, next) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const clients = await Client.find({ updatedAt: { $gt: since } });
    res.json({ data: clients, since });
  } catch (err) {
    next(err);
  }
});

// GET /api/clients/:id
router.get('/:id', async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, deletedAt: null });
    if (!client) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Client introuvable' } });

    const appointmentCount = await Appointment.countDocuments({ client: client._id, deletedAt: null });
    res.json({ ...client.toObject(), appointmentCount });
  } catch (err) {
    next(err);
  }
});

// POST /api/clients
router.post('/', async (req, res, next) => {
  try {
    const client = new Client(req.body);
    await client.save();
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req, res, next) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      req.body,
      { new: true, runValidators: true }
    );
    if (!client) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Client introuvable' } });
    res.json(client);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/clients/:id (soft delete)
router.delete('/:id', async (req, res, next) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!client) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Client introuvable' } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
