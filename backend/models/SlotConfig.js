const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  start: { type: String, required: true }, // e.g. '13:00'
  end: { type: String, required: true },   // e.g. '13:10'
  type: { type: String, enum: ['lunch', 'snack'], required: true },
  capacity: { type: Number, default: 5 }
});

const slotConfigSchema = new mongoose.Schema({
  slots: [slotSchema]
});

module.exports = mongoose.model('SlotConfig', slotConfigSchema); 