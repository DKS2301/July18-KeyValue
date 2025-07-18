const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const Slot = require('../models/Slot');

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
  // Enforce daily meal cap (200 meals per day)
  const today = new Date().toISOString().slice(0, 10);
  const mealCount = await Order.countDocuments({
    timestamp: { $gte: new Date(today) },
    items: { $in: ['Meal'] }
  });
  const newMealOrders = items.filter(i => i === 'Meal').length;
  if (mealCount + newMealOrders > 200) {
    return res.status(400).json({ error: 'Daily meal limit reached. No more meals can be ordered today.' });
  }
  // Enforce per-item maxPerDay
  const Menu = require('../models/Menu');
  const menuDoc = await Menu.findOne({ date: today });
  if (menuDoc) {
    const itemCounts = {};
    for (const itemName of items) {
      itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
    }
    for (const item of menuDoc.items) {
      const orderedQty = itemCounts[item.name] || 0;
      if (orderedQty > 0) {
        const todayCount = await Order.countDocuments({ timestamp: { $gte: new Date(today) }, items: { $in: [item.name] } });
        if (todayCount + orderedQty > item.maxPerDay) {
          return res.status(400).json({ error: `Limit reached for ${item.name}. Max per day: ${item.maxPerDay}` });
        }
      }
    }
  }
  // Check slot count
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

// POST /api/order - slot booking
router.post('/order', async (req, res) => {
  const { userId, mealType, preferredSlotTime, payLater, total, items } = req.body;
  if (!userId || !mealType || !preferredSlotTime || !items) return res.status(400).json({ error: 'Missing fields' });
  const today = new Date().toISOString().slice(0, 10);
  // Enforce per-item maxPerDay
  const Menu = require('../models/Menu');
  const menuDoc = await Menu.findOne({ date: today });
  if (menuDoc) {
    const itemCounts = {};
    for (const itemName of items) {
      itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
    }
    for (const item of menuDoc.items) {
      const orderedQty = itemCounts[item.name] || 0;
      if (orderedQty > 0) {
        const todayCount = await Order.countDocuments({ timestamp: { $gte: new Date(today) }, items: { $in: [item.name] } });
        if (todayCount + orderedQty > item.maxPerDay) {
          return res.status(400).json({ error: `Out of stock: ${item.name}. Only ${item.maxPerDay - todayCount} left for today.` });
        }
      }
    }
  }
  // Try preferred slot first
  let slot = await Slot.findOne({
    slotStart: preferredSlotTime,
    date: today,
    status: 'open',
    $expr: { $lt: ["$currentOrders", "$maxOrders"] }
  });
  if (!slot) {
    // Find next available slot
    slot = await Slot.findOne({
      date: today,
      status: 'open',
      $expr: { $lt: ["$currentOrders", "$maxOrders"] }
    }).sort({ slotStart: 1 });
    if (!slot) return res.status(400).json({ error: 'All slots full' });
    // Suggest fallback
    return res.status(200).json({ message: 'Preferred slot full, assigned next available', slot });
  }
  // Atomically increment currentOrders and check capacity
  const updated = await Slot.findOneAndUpdate(
    { _id: slot._id, currentOrders: { $lt: slot.maxOrders } },
    { $inc: { currentOrders: 1 }, $set: { status: (slot.currentOrders + 1 >= slot.maxOrders) ? 'full' : 'open' } },
    { new: true }
  );
  if (!updated) return res.status(400).json({ error: 'Slot just filled, try again' });
  // Create order
  const order = await Order.create({
    userId,
    items,
    mealType,
    slotId: slot._id,
    total,
    slot: `${slot.slotStart} - ${slot.slotEnd}`,
    payLater,
    orderStatus: 'confirmed',
    paymentStatus: payLater ? 'unpaid' : 'paid'
  });
  // Update dues if payLater
  if (payLater) {
    await User.findByIdAndUpdate(userId, { $inc: { balance: -total } });
  }
  res.json({ message: 'Order confirmed', slot: updated, order });
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

// GET /api/slots/today - get all slots for today
router.get('/slots/today', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const slots = await Slot.find({ date: today }).sort({ slotStart: 1 });
  res.json(slots);
});

module.exports = router; 