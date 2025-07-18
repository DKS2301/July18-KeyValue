const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  slotStart: { type: String, required: true }, // e.g., '10:30'
  slotEnd: { type: String, required: true },   // e.g., '10:50'
  maxOrders: { type: Number, required: true },
  currentOrders: { type: Number, default: 0 },
  date: { type: String, required: true }, // e.g., '2025-07-18'
  status: { type: String, enum: ['open', 'full', 'closed'], default: 'open' }
});

module.exports = mongoose.model('Slot', slotSchema); 