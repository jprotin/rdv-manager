const { Router } = require('express');
const Appointment = require('../models/Appointment');
const Client = require('../models/Client');

const router = Router();

// GET /api/stats/overview
router.get('/overview', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [totalClients, totalAppointments, todayCount, weekCount, statusBreakdown] = await Promise.all([
      Client.countDocuments({ deletedAt: null }),
      Appointment.countDocuments({ deletedAt: null }),
      Appointment.countDocuments({ startAt: { $gte: today, $lte: todayEnd }, deletedAt: null }),
      Appointment.countDocuments({ startAt: { $gte: weekStart, $lte: weekEnd }, deletedAt: null }),
      Appointment.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const breakdown = { pending: 0, confirmed: 0, cancelled: 0, completed: 0 };
    statusBreakdown.forEach(({ _id, count }) => { breakdown[_id] = count; });

    res.json({ totalClients, totalAppointments, todayCount, weekCount, statusBreakdown: breakdown });
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/monthly?year=<YYYY>
router.get('/monthly', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const data = await Appointment.aggregate([
      { $match: { startAt: { $gte: start, $lt: end }, deletedAt: null } },
      { $group: { _id: { $month: '$startAt' }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } },
    ]);

    const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const monthly = MONTHS.map((month, i) => {
      const found = data.find(d => d._id === i + 1);
      return { month, count: found ? found.count : 0 };
    });

    res.json({ year, data: monthly });
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/upcoming
router.get('/upcoming', async (req, res, next) => {
  try {
    const appointments = await Appointment.find({
      startAt: { $gte: new Date() },
      status: { $in: ['pending', 'confirmed'] },
      deletedAt: null,
    })
      .populate('client', 'firstName lastName phone')
      .sort({ startAt: 1 })
      .limit(5);

    res.json({ data: appointments });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
