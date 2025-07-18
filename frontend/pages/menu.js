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
  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
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

  const fetchOrders = async () => {
    setOrdersLoading(true);
    setError('');
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const res = await axios.post('http://localhost:5000/api/orders/mine', {
        phone: localStorage.getItem('phone'),
        roll: localStorage.getItem('roll'),
        password: localStorage.getItem('password')
      });
      setOrders(res.data);
    } catch (err) {
      setError('Failed to fetch previous orders');
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleShowOrders = () => {
    setShowOrders(v => !v);
    if (!showOrders) fetchOrders();
  };

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
      setOrderSuccess(true);
      setShowOrders(true);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.error || 'Order failed');
    }
  };

  if (error && !fallbackSlot) return <div className="min-h-screen flex items-center justify-center font-sans bg-gradient-to-br from-amber-50 to-orange-100">{error}</div>;
  if (!menu) return <div className="min-h-screen flex items-center justify-center font-sans bg-gradient-to-br from-amber-50 to-orange-100">Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 font-sans">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-lg border border-orange-100 flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <span className="text-4xl mb-2">🍽️</span>
          <h2 className="text-2xl font-extrabold text-orange-900 tracking-tight">Order Your Meal</h2>
          <p className="text-orange-700 text-sm mt-1">XPressMeal Canteen</p>
        </div>
        <div className="mb-4 w-full">
          <label className="block mb-1 font-semibold text-orange-800">Meal Type</label>
          <select value={mealType} onChange={e => setMealType(e.target.value)} className="w-full p-3 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="Lunch">Lunch</option>
            <option value="Snack">Snack</option>
          </select>
        </div>
        <div className="w-full mb-4">
          <label className="block mb-1 font-semibold text-orange-800">Menu</label>
          {menu.items.map(item => (
            <div key={item.name} className="flex justify-between items-center mb-2">
              <span className="text-orange-900">{item.name} <span className="text-gray-500">(₹{item.price})</span></span>
              <input type="number" min="0" value={quantities[item.name]} onChange={e => setQuantities(q => ({ ...q, [item.name]: Math.max(0, +e.target.value) }))} className="w-20 p-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          ))}
        </div>
        <div className="w-full mb-4">
          <label className="block mb-1 font-semibold text-orange-800">Select Pickup Slot</label>
          <div className="flex flex-col gap-2">
            {slots.map(slot => (
              <button
                key={slot._id || `${slot.slotStart}-${slot.slotEnd}`}
                disabled={slot.status !== 'open'}
                onClick={() => setSelectedSlot(slot.slotStart)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border text-base font-medium transition ${selectedSlot === slot.slotStart ? 'border-orange-600 bg-orange-50' : 'border-gray-300'} ${slot.status === 'full' ? 'bg-red-100 text-gray-400' : slot.status === 'open' && slot.currentOrders >= slot.maxOrders - 3 ? 'bg-yellow-100' : ''}`}
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
        <div className="w-full mb-4 flex gap-4 justify-center">
          <label className="flex items-center gap-2">
            <input type="radio" name="pay" checked={payLater === false} onChange={() => setPayLater(false)} />
            <span className="text-orange-800">Pay Now</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="pay" checked={payLater === true} onChange={() => setPayLater(true)} />
            <span className="text-orange-800">Pay Later</span>
          </label>
        </div>
        {fallbackSlot && (
          <div className="mt-4 text-yellow-700 bg-yellow-100 p-2 rounded-lg w-full text-center">
            <b>Suggested Slot:</b> {fallbackSlot.slotStart} - {fallbackSlot.slotEnd} ({fallbackSlot.currentOrders}/{fallbackSlot.maxOrders})
          </div>
        )}
        <button onClick={handleOrder} className="w-full mt-6 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-green-700 transition">Confirm Order</button>
        {orderSuccess && <div className="w-full mt-4 text-green-700 bg-green-100 p-3 rounded-lg text-center font-semibold">Order placed successfully! See your order below.</div>}
        {error && <div className="text-red-500 mt-3 w-full text-center">{error}</div>}
        <button type="button" onClick={handleShowOrders} className="w-full mt-4 bg-orange-100 text-orange-800 border border-orange-200 rounded-lg py-2 font-semibold hover:bg-orange-200 transition">{showOrders ? 'Hide' : 'View'} Previous Orders</button>
        {showOrders && (
          <div className="w-full mt-6 bg-orange-50 rounded-lg p-4 border border-orange-200">
            <h3 className="text-lg font-bold text-orange-900 mb-2">Previous Orders</h3>
            {ordersLoading ? (
              <div className="text-orange-700">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="text-gray-500">No previous orders found.</div>
            ) : (
              <ul className="space-y-2">
                {orders.map(order => (
                  <li key={order._id} className="bg-white rounded shadow p-3 flex flex-col md:flex-row md:items-center md:justify-between border border-orange-100">
                    <div>
                      <div className="font-semibold text-orange-800">{order.items.join(', ')}</div>
                      <div className="text-sm text-gray-500">Slot: {order.slot} | Total: ₹{order.total}</div>
                      <div className="text-xs text-gray-400">{new Date(order.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="mt-2 md:mt-0 text-xs text-orange-700 font-semibold">{order.payLater ? (order.paymentStatus === 'paid' ? 'Paid' : 'Pay Later') : 'Paid'}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 