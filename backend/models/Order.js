const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{ type: String, required: true }],
  total: { type: Number, required: true },
  slot: { type: String, required: true },
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot' },
  mealType: { type: String },
  orderStatus: { type: String, default: 'confirmed' },
  paymentStatus: { type: String, default: 'unpaid' },
  payLater: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema); 