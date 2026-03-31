const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label: String,
  housenumber: String,
  street: String,
  postcode: String,
  city: String,
  coordinates: [Number], // [lon, lat]
}, { _id: false });

const appointmentSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending',
  },
  address: addressSchema,
  notes: { type: String },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

appointmentSchema.index({ startAt: 1 });
appointmentSchema.index({ client: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
