const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');

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

module.exports = router; 