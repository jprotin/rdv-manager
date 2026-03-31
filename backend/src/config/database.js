const mongoose = require('mongoose');

const connectDB = async (attempt = 1) => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/rdvmanager', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connecté');
  } catch (err) {
    if (attempt >= 10) {
      console.error('Échec de connexion MongoDB après 10 tentatives');
      process.exit(1);
    }
    console.warn(`Tentative MongoDB ${attempt} échouée, nouvelle tentative dans 5s...`);
    await new Promise(r => setTimeout(r, 5000));
    return connectDB(attempt + 1);
  }
};

module.exports = connectDB;
