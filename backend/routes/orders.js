const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');

const router = express.Router();

// Helper: authenticate user by phone/roll and password
async function authUser(req, res, next) {
  const { phone, roll, password } = req.body;
  if ((!phone && !roll) || !password) return res.status(401).json({ error: 'Phone or roll and password required' });
  const user = await User.findOne({ $or: [{ phone }, { roll }] });
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
  req.user = user;
  next();
}

// POST /api/orders (place order)
router.post('/', authUser, async (req, res) => {
  const { items, total, slot, payLater } = req.body;
  if (!items || !total || !slot || typeof payLater !== 'boolean') return res.status(400).json({ error: 'Missing fields' });
  // Check slot count
  const today = new Date().toISOString().slice(0, 10);
  const slotCount = await Order.countDocuments({ slot, timestamp: { $gte: new Date(today) } });
  if (slotCount >= 5) return res.status(400).json({ error: 'Slot full, pick another' });
  const order = await Order.create({ userId: req.user._id, items, total, slot, payLater });
  if (payLater) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { balance: -total } });
  }
  res.json(order);
});

// POST /api/orders/mine (get user’s orders)
router.post('/mine', authUser, async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).sort({ timestamp: -1 });
  res.json(orders);
});

// GET /api/orders/slots - get slot counts for today
router.get('/slots', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const orders = await Order.find({ timestamp: { $gte: new Date(today) } });
  const slotCounts = {};
  orders.forEach(o => {
    slotCounts[o.slot] = (slotCounts[o.slot] || 0) + 1;
  });
  const slots = [
    '1:00 PM', '1:10 PM', '1:20 PM', '1:30 PM', '1:40 PM', '1:50 PM', '2:00 PM'
  ].map(slot => ({ slot, count: slotCounts[slot] || 0 }));
  res.json(slots);
});

module.exports = router; 