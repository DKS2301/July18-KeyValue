const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  date: { type: String, required: true }, // e.g. '2025-07-18'
  items: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true }
    }
  ]
});

module.exports = mongoose.model('Menu', menuSchema); 