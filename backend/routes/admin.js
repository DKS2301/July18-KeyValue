const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const SlotConfig = require('../models/SlotConfig');
const Slot = require('../models/Slot');
const jwt = require('jsonwebtoken');
const Menu = require('../models/Menu');

const router = express.Router();

// JWT admin auth middleware
function jwtAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// POST /api/admin/orders
router.post('/orders', jwtAdminAuth, async (req, res) => {
  const orders = await Order.find().populate('userId', 'name roll').sort({ timestamp: -1 });
  res.json(orders);
});

// POST /api/admin/dues
router.post('/dues', jwtAdminAuth, async (req, res) => {
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
router.post('/clear', jwtAdminAuth, async (req, res) => {
  await Order.deleteMany({});
  await User.updateMany({}, { $set: { balance: 0 } });
  res.json({ message: 'Orders cleared and balances reset' });
});

// POST /api/admin/clear-dues
router.post('/clear-dues', jwtAdminAuth, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  await User.findByIdAndUpdate(userId, { balance: 0 });
  await require('../models/Order').updateMany({ userId, payLater: true }, { $set: { payLater: false } });
  res.json({ message: 'Dues cleared for user' });
});

// GET /api/admin/slots - get slot config
router.get('/slots', jwtAdminAuth, async (req, res) => {
  let config = await SlotConfig.findOne();
  if (!config) {
    config = await SlotConfig.create({ slots: ['1:00 PM', '1:10 PM', '1:20 PM', '1:30 PM', '1:40 PM', '1:50 PM', '2:00 PM'], capacity: 5 });
  }
  res.json(config);
});

// POST /api/admin/slots - update slot config (now expects slot objects)
router.post('/slots', jwtAdminAuth, async (req, res) => {
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
router.post('/createSlots', jwtAdminAuth, async (req, res) => {
  const { slots, date } = req.body;
  if (!Array.isArray(slots) || !date) return res.status(400).json({ error: 'Slots and date required' });
  // Remove existing slots for the date
  await Slot.deleteMany({ date });
  // Create new slots
  const created = await Slot.insertMany(slots.map(s => ({ ...s, date, currentOrders: 0, status: 'open' })));
  res.json({ message: 'Slots created', slots: created });
});

// PATCH /api/admin/slot/:id/status - update slot status
router.patch('/slot/:id/status', jwtAdminAuth, async (req, res) => {
  const { status } = req.body;
  if (!['open', 'closed', 'full'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const slot = await Slot.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!slot) return res.status(404).json({ error: 'Slot not found' });
  res.json(slot);
});

// GET /api/admin/summary - today's total orders per menu item
router.get('/summary', jwtAdminAuth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const Menu = require('../models/Menu');
  const menuDoc = await Menu.findOne({ date: today });
  const items = menuDoc ? menuDoc.items : [];
  // Aggregate order counts for today
  const Order = require('../models/Order');
  const agg = await Order.aggregate([
    { $match: { timestamp: { $gte: new Date(today) } } },
    { $unwind: "$items" },
    { $group: { _id: "$items", count: { $sum: 1 } } }
  ]);
  // Build summary with maxPerDay
  const summary = items.reduce((acc, item) => {
    const found = agg.find(a => a._id === item.name);
    acc[item.name] = {
      count: found ? found.count : 0,
      maxPerDay: item.maxPerDay
    };
    return acc;
  }, {});
  res.json(summary);
});

// POST /api/admin/menu - set today's menu for lunch or snacks
router.post('/menu', jwtAdminAuth, async (req, res) => {
  const { items, type } = req.body;
  if (!Array.isArray(items) || !type) return res.status(400).json({ error: 'Items and type required' });
  const today = new Date().toISOString().slice(0, 10);
  let menu = await Menu.findOne({ date: today });
  if (!menu) {
    menu = await Menu.create({ date: today, items: [] });
  }
  // Remove existing items of this type
  menu.items = menu.items.filter(i => i.type !== type);
  // Add new items
  menu.items.push(...items.map(i => ({ ...i, type })));
  await menu.save();
  res.json(menu);
});

// GET /api/admin/finance-summary - total gain and dues for today
router.get('/finance-summary', jwtAdminAuth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const Order = require('../models/Order');
  const User = require('../models/User');
  // Total gain: sum of all order totals for today
  const gainAgg = await Order.aggregate([
    { $match: { timestamp: { $gte: new Date(today) } } },
    { $group: { _id: null, total: { $sum: "$total" } } }
  ]);
  const totalGain = gainAgg.length ? gainAgg[0].total : 0;
  // Total dues: sum of all negative user balances
  const duesAgg = await User.aggregate([
    { $match: { balance: { $lt: 0 } } },
    { $group: { _id: null, total: { $sum: "$balance" } } }
  ]);
  const totalDues = duesAgg.length ? Math.abs(duesAgg[0].total) : 0;
  res.json({ totalGain, totalDues });
});

module.exports = router; 