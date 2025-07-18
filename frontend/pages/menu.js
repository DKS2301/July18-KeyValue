import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

const SLOT_TIMES = [
  '1:00 PM', '1:10 PM', '1:20 PM', '1:30 PM', '1:40 PM', '1:50 PM', '2:00 PM'
];

export default function Menu() {
  const [menu, setMenu] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [payLater, setPayLater] = useState(null);
  const router = useRouter();

  useEffect(() => {
    axios.get('http://localhost:5000/api/menu/today')
      .then(res => {
        setMenu(res.data);
        const initial = {};
        res.data.items.forEach(item => { initial[item.name] = 0; });
        setQuantities(initial);
      })
      .catch(() => setError('Menu not found'));
    // Fetch slot availability
    axios.get('http://localhost:5000/api/orders/slots')
      .then(res => setSlots(res.data))
      .catch(() => setSlots([]));
  }, []);

  const handleChange = (name, val) => {
    setQuantities(q => ({ ...q, [name]: Math.max(0, val) }));
  };

  const handleOrder = async () => {
    setError('');
    const items = Object.entries(quantities).filter(([_, q]) => q > 0).flatMap(([name, q]) => Array(q).fill(name));
    if (!items.length) return setError('Select at least one item');
    if (!selectedSlot) return setError('Select a slot');
    if (payLater === null) return setError('Choose Pay Now or Pay Later');
    const total = items.reduce((sum, name) => sum + (menu.items.find(i => i.name === name)?.price || 0), 0);
    try {
      await axios.post('http://localhost:5000/api/orders', {
        items,
        total,
        slot: selectedSlot,
        payLater,
        phone: localStorage.getItem('phone'),
        roll: localStorage.getItem('roll'),
        password: localStorage.getItem('password')
      });
      router.push('/success');
    } catch (err) {
      setError(err.response?.data?.error || 'Order failed');
    }
  };

  if (error) return <div className="min-h-screen flex items-center justify-center">{error}</div>;
  if (!menu) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h2 className="text-2xl font-bold mb-4">Today’s Menu</h2>
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md mb-4">
        {menu.items.map(item => (
          <div key={item.name} className="flex justify-between items-center mb-2">
            <span>{item.name} (₹{item.price})</span>
            <input type="number" min="0" value={quantities[item.name]} onChange={e => handleChange(item.name, +e.target.value)} className="w-16 p-1 border rounded" />
          </div>
        ))}
        <div className="mt-4">
          <label className="block mb-1 font-semibold">Select Pickup Slot</label>
          <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)} className="w-full p-2 border rounded">
            <option value="">-- Select Slot --</option>
            {SLOT_TIMES.map(slot => {
              const slotInfo = slots.find(s => s.slot === slot);
              const count = slotInfo ? slotInfo.count : 0;
              return (
                <option key={slot} value={slot} disabled={count >= 5}>
                  {slot} ({count}/5)
                </option>
              );
            })}
          </select>
        </div>
        <div className="mt-4 flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="pay" checked={payLater === false} onChange={() => setPayLater(false)} />
            Pay Now
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="pay" checked={payLater === true} onChange={() => setPayLater(true)} />
            Pay Later
          </label>
        </div>
      </div>
      <button onClick={handleOrder} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Confirm Order</button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
} 