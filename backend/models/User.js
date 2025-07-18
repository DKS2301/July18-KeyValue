const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  roll: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  password: { type: String, required: true }, // TODO: Hash in production
  role: { type: String, enum: ['student', 'admin'], default: 'student' }
});

module.exports = mongoose.model('User', userSchema); 