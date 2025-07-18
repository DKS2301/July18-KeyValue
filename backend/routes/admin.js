const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const SlotConfig = require('../models/SlotConfig');
const Slot = require('../models/Slot');

const router = express.Router();

// Helper: authenticate admin by phone/roll and password
async function adminAuth(req, res, next) {
  const { phone, roll, password } = req.body;
  if ((!phone && !roll) || !password) return res.status(401).json({ error: 'Phone or roll and password required' });
  const user = await User.findOne({ $or: [{ phone }, { roll }] });
  if (!user || user.password !== password || user.role !== 'admin') return res.status(401).json({ error: 'Invalid admin credentials' });
  req.user = user;
  next();
}

// POST /api/admin/orders
router.post('/orders', adminAuth, async (req, res) => {
  const orders = await Order.find().populate('userId', 'name roll').sort({ timestamp: -1 });
  res.json(orders);
});

// POST /api/admin/dues
router.post('/dues', adminAuth, async (req, res) => {
  // Only count dues from payLater orders
  const users = await User.find({ balance: { $lt: 0 } }, 'name balance');
  // For each user, check if their negative balance is due to payLater orders
  const Order = require('../models/Order');
  const filtered = [];
  for (const user of users) {
    const payLaterTotal = await Order.aggregate([
      { $match: { userId: user._id, payLater: true } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    if (payLaterTotal.length && payLaterTotal[0].total + user.balance === 0) {
      filtered.push(user);
    } else if (payLaterTotal.length && payLaterTotal[0].total > 0) {
      filtered.push(user);
    }
  }
  res.json(filtered);
});

// POST /api/admin/clear
router.post('/clear', adminAuth, async (req, res) => {
  await Order.deleteMany({});
  await User.updateMany({}, { $set: { balance: 0 } });
  res.json({ message: 'Orders cleared and balances reset' });
});

// POST /api/admin/clear-dues
router.post('/clear-dues', adminAuth, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  await User.findByIdAndUpdate(userId, { balance: 0 });
  await require('../models/Order').updateMany({ userId, payLater: true }, { $set: { payLater: false } });
  res.json({ message: 'Dues cleared for user' });
});

// GET /api/admin/slots - get slot config
router.get('/slots', adminAuth, async (req, res) => {
  let config = await SlotConfig.findOne();
  if (!config) {
    config = await SlotConfig.create({ slots: ['1:00 PM', '1:10 PM', '1:20 PM', '1:30 PM', '1:40 PM', '1:50 PM', '2:00 PM'], capacity: 5 });
  }
  res.json(config);
});

// POST /api/admin/slots - update slot config (now expects slot objects)
router.post('/slots', adminAuth, async (req, res) => {
  const { slots } = req.body;
  if (!Array.isArray(slots) || slots.some(s => !s.start || !s.end || !s.type || typeof s.capacity !== 'number')) {
    return res.status(400).json({ error: 'Invalid slot data' });
  }
  let config = await SlotConfig.findOne();
  if (!config) {
    config = await SlotConfig.create({ slots });
  } else {
    config.slots = slots;
    await config.save();
  }
  res.json(config);
});

// POST /api/admin/createSlots - create slots for the day
router.post('/createSlots', adminAuth, async (req, res) => {
  const { slots, date } = req.body;
  if (!Array.isArray(slots) || !date) return res.status(400).json({ error: 'Slots and date required' });
  // Remove existing slots for the date
  await Slot.deleteMany({ date });
  // Create new slots
  const created = await Slot.insertMany(slots.map(s => ({ ...s, date, currentOrders: 0, status: 'open' })));
  res.json({ message: 'Slots created', slots: created });
});

// PATCH /api/admin/slot/:id/status - update slot status
router.patch('/slot/:id/status', adminAuth, async (req, res) => {
  const { status } = req.body;
  if (!['open', 'closed', 'full'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const slot = await Slot.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!slot) return res.status(404).json({ error: 'Slot not found' });
  res.json(slot);
});

module.exports = router; 