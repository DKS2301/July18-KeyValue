import { useState, useEffect } from 'react';
import axios from 'axios';

const SLOT_TIMES = [
  '1:00 PM', '1:10 PM', '1:20 PM', '1:30 PM', '1:40 PM', '1:50 PM', '2:00 PM'
];

export default function Admin() {
  const [phone, setPhone] = useState('');
  const [roll, setRoll] = useState('');
  const [password, setPassword] = useState('');
  const [orders, setOrders] = useState([]);
  const [dues, setDues] = useState([]);
  const [error, setError] = useState('');
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/orders/slots')
      .then(res => setSlots(res.data))
      .catch(() => setSlots([]));
  }, []);

  const fetchData = async () => {
    setError('');
    try {
      const auth = { phone, roll, password };
      const [ordersRes, duesRes] = await Promise.all([
        axios.post('http://localhost:5000/api/admin/orders', auth),
        axios.post('http://localhost:5000/api/admin/dues', auth)
      ]);
      setOrders(ordersRes.data);
      setDues(duesRes.data);
    } catch (err) {
      setError('Invalid credentials or server error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
      <div className="mb-4 flex gap-2 items-center">
        <input type="text" placeholder="Admin Phone" value={phone} onChange={e => setPhone(e.target.value)} className="p-2 border rounded w-48" />
        <input type="text" placeholder="Admin Roll" value={roll} onChange={e => setRoll(e.target.value)} className="p-2 border rounded w-32" />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="p-2 border rounded w-48" />
        <button onClick={fetchData} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Fetch Data</button>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-semibold mb-2">Slot Summary</h3>
          <div className="bg-white rounded shadow p-4 mb-4">
            {SLOT_TIMES.map(slot => {
              const slotInfo = slots.find(s => s.slot === slot);
              const count = slotInfo ? slotInfo.count : 0;
              return (
                <div key={slot} className="flex justify-between border-b py-1">
                  <span>{slot}</span>
                  <span>{count}/5</span>
                </div>
              );
            })}
          </div>
          <h3 className="font-semibold mb-2">Orders</h3>
          <div className="bg-white rounded shadow p-4 max-h-96 overflow-y-auto">
            {orders.length === 0 ? <div>No orders</div> : orders.map(o => (
              <div key={o._id} className="border-b py-2">
                <div><b>{o.userId?.name}</b> ({o.userId?.roll})</div>
                <div>Items: {o.items.join(', ')}</div>
                <div>Slot: {o.slot}</div>
                <div>Total: ₹{o.total}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Dues</h3>
          <div className="bg-white rounded shadow p-4 max-h-96 overflow-y-auto">
            {dues.length === 0 ? <div>No dues</div> : dues.map(u => (
              <div key={u._id} className="border-b py-2">
                {u.name}: ₹{Math.abs(u.balance)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 