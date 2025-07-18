const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  type: { type: String, enum: ['lunch', 'snack'], required: true },
  maxPerDay: { type: Number, default: 200 }
});

const menuSchema = new mongoose.Schema({
  date: { type: String, required: true }, // e.g. '2025-07-18'
  items: [menuItemSchema]
});

module.exports = mongoose.model('Menu', menuSchema); 