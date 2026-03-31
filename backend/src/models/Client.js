const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label: String,
  housenumber: String,
  street: String,
  postcode: String,
  city: String,
  coordinates: [Number], // [lon, lat]
}, { _id: false });

const clientSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  address: addressSchema,
  notes: { type: String },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

clientSchema.index({ lastName: 1, firstName: 1 });
clientSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Client', clientSchema);
