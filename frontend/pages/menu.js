import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function Menu() {
  const [menu, setMenu] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [payLater, setPayLater] = useState(null);
  const [mealType, setMealType] = useState('Lunch');
  const [fallbackSlot, setFallbackSlot] = useState(null);
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
    // Fetch available slots for today
    axios.get('http://localhost:5000/api/orders/slots/today')
      .then(res => setSlots(res.data))
      .catch(() => setSlots([]));
  }, []);

  const handleOrder = async () => {
    setError('');
    setFallbackSlot(null);
    const items = Object.entries(quantities).filter(([_, q]) => q > 0).flatMap(([name, q]) => Array(q).fill(name));
    if (!items.length) return setError('Select at least one item');
    if (!selectedSlot) return setError('Select a slot');
    if (payLater === null) return setError('Choose Pay Now or Pay Later');
    const total = items.reduce((sum, name) => sum + (menu.items.find(i => i.name === name)?.price || 0), 0);
    const user = JSON.parse(localStorage.getItem('user'));
    try {
      const res = await axios.post('http://localhost:5000/api/orders/order', {
        userId: user._id,
        mealType,
        preferredSlotTime: selectedSlot,
        payLater,
        total
      });
      if (res.data.message && res.data.slot && res.data.message.includes('Preferred slot full')) {
        setFallbackSlot(res.data.slot);
        setError('Preferred slot full. Assigned next available slot. Click confirm again to accept.');
        setSelectedSlot(res.data.slot.slotStart);
        return;
      }
      router.push('/success');
    } catch (err) {
      setError(err.response?.data?.error || 'Order failed');
    }
  };

  if (error && !fallbackSlot) return <div className="min-h-screen flex items-center justify-center">{error}</div>;
  if (!menu) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h2 className="text-2xl font-bold mb-4">Today’s Menu</h2>
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md mb-4">
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Meal Type</label>
          <select value={mealType} onChange={e => setMealType(e.target.value)} className="w-full p-2 border rounded">
            <option value="Lunch">Lunch</option>
            <option value="Snack">Snack</option>
          </select>
        </div>
        {menu.items.map(item => (
          <div key={item.name} className="flex justify-between items-center mb-2">
            <span>{item.name} (₹{item.price})</span>
            <input type="number" min="0" value={quantities[item.name]} onChange={e => setQuantities(q => ({ ...q, [item.name]: Math.max(0, +e.target.value) }))} className="w-16 p-1 border rounded" />
          </div>
        ))}
        <div className="mt-4">
          <label className="block mb-1 font-semibold">Select Pickup Slot</label>
          <div className="flex flex-col gap-2">
            {slots.map(slot => (
              <button
                key={slot._id}
                disabled={slot.status !== 'open'}
                onClick={() => setSelectedSlot(slot.slotStart)}
                className={`flex items-center justify-between px-3 py-2 rounded border ${selectedSlot === slot.slotStart ? 'border-blue-600 bg-blue-50' : 'border-gray-300'} ${slot.status === 'full' ? 'bg-red-100 text-gray-400' : slot.status === 'open' && slot.currentOrders >= slot.maxOrders - 3 ? 'bg-yellow-100' : ''}`}
              >
                <span>{slot.slotStart} - {slot.slotEnd}</span>
                <span>({slot.currentOrders}/{slot.maxOrders})</span>
                <span className="ml-2 text-xs font-bold">
                  {slot.status === 'open' && slot.currentOrders >= slot.maxOrders - 3 ? 'Almost Full' : slot.status === 'full' ? 'Full' : 'Open'}
                </span>
              </button>
            ))}
          </div>
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
        {fallbackSlot && (
          <div className="mt-4 text-yellow-700 bg-yellow-100 p-2 rounded">
            <b>Suggested Slot:</b> {fallbackSlot.slotStart} - {fallbackSlot.slotEnd} ({fallbackSlot.currentOrders}/{fallbackSlot.maxOrders})
          </div>
        )}
      </div>
      <button onClick={handleOrder} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Confirm Order</button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
} 