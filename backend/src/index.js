require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');
const clientsRouter = require('./routes/clients');
const appointmentsRouter = require('./routes/appointments');
const statsRouter = require('./routes/stats');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4201;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/clients', clientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/stats', statsRouter);

app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
});
