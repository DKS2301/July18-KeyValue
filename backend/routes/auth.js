const express = require('express');
const User = require('../models/User');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { phone, roll, name, password } = req.body;
  if ((!phone && !roll) || !password) {
    return res.status(400).json({ error: 'Phone or roll and password required' });
  }
  let user = await User.findOne({ $or: [{ phone }, { roll }] });
  if (!user) {
    if (!name) return res.status(400).json({ error: 'Name required for new user' });
    user = await User.create({ phone, roll, name, password });
  } else {
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }
  }
  res.json({ user });
});

module.exports = router; 