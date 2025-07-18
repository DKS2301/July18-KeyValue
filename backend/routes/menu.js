const express = require('express');
const Menu = require('../models/Menu');

const router = express.Router();

// GET /api/menu/today
router.get('/today', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const menu = await Menu.findOne({ date: today });
  if (!menu) return res.status(404).json({ error: 'Menu not found' });
  res.json(menu);
});

module.exports = router; 