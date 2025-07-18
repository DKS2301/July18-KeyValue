require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Menu = require('./models/Menu');
const Order = require('./models/Order');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Clear users and orders
  await User.deleteMany({});
  await Order.deleteMany({});

  // Create admin user
  const admin = await User.findOneAndUpdate(
    { phone: '9999999999' },
    { name: 'Chandrettan', phone: '9999999999', roll: 'ADMIN', role: 'admin', balance: 0, password: 'test123' },
    { upsert: true, new: true }
  );

  // Create sample students
  const students = [
    { name: 'Hari', phone: '9000000001', roll: 'STU001', balance: 0, password: 'test123' },
    { name: 'Anjali', phone: '9000000002', roll: 'STU002', balance: 0, password: 'test123' },
    { name: 'Ravi', phone: '9000000003', roll: 'STU003', balance: 0, password: 'test123' },
    { name: 'Priya', phone: '9000000004', roll: 'STU004', balance: 0, password: 'test123' },
    { name: 'Amit', phone: '9000000005', roll: 'STU005', balance: 0, password: 'test123' }
  ];
  const studentDocs = await Promise.all(students.map(s =>
    User.findOneAndUpdate(
      { phone: s.phone },
      { ...s, role: 'student' },
      { upsert: true, new: true }
    )
  ));
  console.log('Seeded students:', studentDocs);

  // Create today's menu
  const today = new Date().toISOString().slice(0, 10);
  const menu = await Menu.findOneAndUpdate(
    { date: today },
    {
      date: today,
      items: [
        { name: 'Meal', price: 40 },
        { name: 'Chai', price: 5 },
        { name: 'Snack', price: 15 }
      ]
    },
    { upsert: true, new: true }
  );

  // Create sample orders for students
  const menuItems = menu.items;
  const orders = [
    {
      user: studentDocs[0], // Hari
      items: ['Meal', 'Chai'],
      total: menuItems.find(i => i.name === 'Meal').price + menuItems.find(i => i.name === 'Chai').price,
      slot: '1:00 PM',
      timestamp: new Date()
    },
    {
      user: studentDocs[1], // Anjali
      items: ['Meal'],
      total: menuItems.find(i => i.name === 'Meal').price,
      slot: '1:10 PM',
      timestamp: new Date()
    },
    {
      user: studentDocs[2], // Ravi
      items: ['Snack', 'Chai'],
      total: menuItems.find(i => i.name === 'Snack').price + menuItems.find(i => i.name === 'Chai').price,
      slot: '1:20 PM',
      timestamp: new Date()
    }
  ];
  const orderDocs = await Promise.all(orders.map(o =>
    Order.create({
      userId: o.user._id,
      items: o.items,
      total: o.total,
      slot: o.slot,
      timestamp: o.timestamp
    })
  ));
  console.log('Seeded orders:', orderDocs);

  console.log('Seeded admin:', admin);
  console.log('Seeded menu:', menu);
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); }); 