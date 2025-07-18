import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import dayjs from 'dayjs';

const SLOT_TIMES = [
  '1:00 PM', '1:10 PM', '1:20 PM', '1:30 PM', '1:40 PM', '1:50 PM', '2:00 PM'
];

export default function Admin() {
  const [slotConfig, setSlotConfig] = useState({ slots: [], capacity: 5 });
  const [editingSlots, setEditingSlots] = useState([]);
  const [slotEditMode, setSlotEditMode] = useState(false);
  const [slotError, setSlotError] = useState('');
  const [todaySlots, setTodaySlots] = useState([]);
  const [summary, setSummary] = useState({});
  const [error, setError] = useState('');
  const [dues, setDues] = useState([]);
  const [menuLunch, setMenuLunch] = useState([]);
  const [menuSnacks, setMenuSnacks] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [finance, setFinance] = useState({ totalGain: 0, totalDues: 0 });
  const router = useRouter();

  // Get admin token
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

  useEffect(() => {
    if (!token) router.push('/admin-login');
  }, [token]);

  // Helper for auth headers
  const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  // Fetch slot config on load
  useEffect(() => {
    const fetchSlotConfig = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/admin/slots', authHeaders);
        setSlotConfig(res.data);
        setEditingSlots(res.data.slots);
      } catch {}
    };
    if (token) fetchSlotConfig();
  }, [token]);

  // Fetch today's slots for status management
  const fetchTodaySlots = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/orders/slots/today');
      setTodaySlots(res.data);
    } catch {
      setTodaySlots([]);
    }
  };

  useEffect(() => {
    fetchTodaySlots();
  }, []);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const newSlots = Array.from(editingSlots);
    const [removed] = newSlots.splice(result.source.index, 1);
    newSlots.splice(result.destination.index, 0, removed);
    setEditingSlots(newSlots);
  };

  // Helper to get next available slot time
  const getNextSlotTime = () => {
    if (editingSlots.length === 0) return { start: '13:00', end: '13:10' };
    const last = editingSlots[editingSlots.length - 1];
    const [h, m] = last.end.split(':').map(Number);
    let newM = m + 10;
    let newH = h;
    if (newM >= 60) {
      newH += 1;
      newM -= 60;
    }
    const pad = n => n.toString().padStart(2, '0');
    return { start: `${pad(newH)}:${pad(newM)}`, end: `${pad(newH)}:${pad(newM + 10)}` };
  };

  const handleAddSlot = () => {
    const { start, end } = getNextSlotTime();
    setEditingSlots([...editingSlots, { start, end, type: 'lunch', capacity: 5 }]);
  };

  const handleRemoveSlot = (idx) => {
    setEditingSlots(editingSlots.filter((_, i) => i !== idx));
  };

  const handleSlotChange = (idx, field, value) => {
    setEditingSlots(editingSlots.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const handleSaveSlots = async () => {
    setSlotError('');
    for (const slot of editingSlots) {
      if (!slot.start || !slot.end || !slot.type || !slot.capacity) {
        setSlotError('All slot fields are required.');
        return;
      }
    }
      try {
      const res = await axios.post('http://localhost:5000/api/admin/slots', {
        slots: editingSlots
      }, authHeaders);
      setSlotConfig(res.data);
      setSlotEditMode(false);
      fetchTodaySlots();
    } catch (e) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin-login';
      }
      setSlotError(e.response?.data?.error || 'Failed to save slot config');
    }
  };

  useEffect(() => {
    fetchTodaySlots();
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

  const markAsPaid = async (userId) => {
    try {
      await axios.post('http://localhost:5000/api/admin/clear-dues', {
        userId
      }, authHeaders);
      fetchData();
    } catch (err) {
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin-login';
      }
      setError('Failed to clear dues');
    }
  };

  const handleSlotStatus = async (slotId, newStatus) => {
    try {
      await axios.patch(`http://localhost:5000/api/admin/slot/${slotId}/status`, { status: newStatus }, authHeaders);
      fetchTodaySlots();
    } catch (err) {
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin-login';
      }
    }
  };

  const handleCreateTodaySlots = async () => {
    if (!slotConfig.slots.length) {
      setError('No slot config to create slots from.');
      return;
    }
    const today = dayjs().format('YYYY-MM-DD');
    try {
      await axios.post('http://localhost:5000/api/admin/createSlots', {
        slots: slotConfig.slots.map(s => ({
          slotStart: s.start,
          slotEnd: s.end,
          maxOrders: s.capacity
        })),
        date: today
      }, authHeaders);
      fetchTodaySlots();
    } catch (err) {
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin-login';
      }
      setError('Failed to create today\'s slots');
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/summary', authHeaders);
      setSummary(res.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin-login';
      }
      setSummary({});
    }
  };

  useEffect(() => {
    if (token) fetchSummary();
  }, [token]);

  const fetchDues = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/admin/dues', {}, authHeaders);
      setDues(res.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin-login';
      }
      setDues([]);
    }
  };

  useEffect(() => {
    if (token) fetchDues();
  }, [token]);

  // Fetch today's menu
  const fetchMenu = async () => {
    setMenuLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await axios.get('http://localhost:5000/api/menu/today');
      setMenuLunch(res.data.items.filter(i => i.type === 'lunch'));
      setMenuSnacks(res.data.items.filter(i => i.type === 'snack'));
    } catch {
      setMenuLunch([]);
      setMenuSnacks([]);
    } finally {
      setMenuLoading(false);
    }
  };
  useEffect(() => { fetchMenu(); }, []);

  // Add/remove menu items
  const addMenuItem = (type) => {
    if (type === 'lunch') setMenuLunch([...menuLunch, { name: '', price: '', type: 'lunch', maxPerDay: 200 }]);
    else setMenuSnacks([...menuSnacks, { name: '', price: '', type: 'snack', maxPerDay: 200 }]);
  };
  const removeMenuItem = (type, idx) => {
    if (type === 'lunch') setMenuLunch(menuLunch.filter((_, i) => i !== idx));
    else setMenuSnacks(menuSnacks.filter((_, i) => i !== idx));
  };
  const updateMenuItem = (type, idx, field, value) => {
    if (type === 'lunch') setMenuLunch(menuLunch.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    else setMenuSnacks(menuSnacks.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const saveMenu = async (type) => {
    try {
      const items = (type === 'lunch' ? menuLunch : menuSnacks).filter(i => i.name && i.price).map(i => ({ ...i, type, price: Number(i.price), maxPerDay: Number(i.maxPerDay) }));
      await axios.post('http://localhost:5000/api/admin/menu', { items, type }, authHeaders);
      fetchMenu();
    } catch {}
  };

  const fetchFinance = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/finance-summary', authHeaders);
      setFinance(res.data);
    } catch {}
  };
  useEffect(() => { if (token) fetchFinance(); }, [token]);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 font-sans p-0">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-orange-200 flex items-center justify-between px-8 py-6 shadow-sm">
        <h2 className="text-3xl font-extrabold tracking-tight text-orange-900">🍽️ XPressMeal Admin</h2>
        <button onClick={handleLogout} className="px-5 py-2 bg-orange-600 text-white rounded-lg shadow hover:bg-orange-700 transition">Logout</button>
      </div>
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-10">
        {/* Finance Summary */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="flex-1 bg-green-50 border border-green-200 rounded-2xl shadow p-6 flex flex-col items-center justify-center">
            <div className="text-lg text-green-800 font-semibold mb-1">Total Gain (Today)</div>
            <div className="text-3xl font-extrabold text-green-900">₹{finance.totalGain}</div>
          </div>
          <div className="flex-1 bg-orange-50 border border-orange-200 rounded-2xl shadow p-6 flex flex-col items-center justify-center">
            <div className="text-lg text-orange-800 font-semibold mb-1">Total Dues</div>
            <div className="text-3xl font-extrabold text-orange-900">₹{finance.totalDues}</div>
          </div>
        </div>
        {/* Slot Management Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-orange-800">Slot Management</h3>
            <div className="flex gap-2">
              {!slotEditMode && <button onClick={() => setSlotEditMode(true)} className="px-3 py-1 bg-orange-500 text-white rounded-lg shadow hover:bg-orange-600 transition text-sm">Edit</button>}
              <button onClick={handleCreateTodaySlots} className="px-3 py-1 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition text-sm">Create Today's Slots</button>
            </div>
          </div>
          {slotEditMode ? (
            <div className="bg-white rounded shadow p-4 mb-4">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="slots">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {editingSlots.map((slot, idx) => (
                        <Draggable key={idx} draggableId={String(idx)} index={idx}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="flex items-center mb-2 gap-2">
                              <input type="time" value={slot.start} onChange={e => handleSlotChange(idx, 'start', e.target.value)} className="p-2 border rounded w-28" />
                              <span>-</span>
                              <input type="time" value={slot.end} onChange={e => handleSlotChange(idx, 'end', e.target.value)} className="p-2 border rounded w-28" />
                              <select value={slot.type} onChange={e => handleSlotChange(idx, 'type', e.target.value)} className="p-2 border rounded">
                                <option value="lunch">Lunch</option>
                                <option value="snack">Snack</option>
                              </select>
                              <input type="number" min="1" value={slot.capacity} onChange={e => handleSlotChange(idx, 'capacity', Number(e.target.value))} className="p-2 border rounded w-20" />
                              <button onClick={() => handleRemoveSlot(idx)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Remove</button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              <button onClick={handleAddSlot} className="mt-2 px-2 py-1 bg-gray-600 text-white rounded text-xs">Add Slot</button>
              {slotError && <div className="text-red-500 mt-2">{slotError}</div>}
              <div className="mt-4 flex gap-2">
                <button onClick={handleSaveSlots} className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
                <button onClick={() => setSlotEditMode(false)} className="px-4 py-2 bg-gray-400 text-white rounded">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded shadow p-4 mb-4">
              <div className="mb-2">Slots:</div>
              <div className="flex flex-col gap-2">
                {slotConfig.slots.map((slot, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-200 rounded-full">
                    {slot.type.toUpperCase()} {slot.start} - {slot.end} (Cap: {slot.capacity})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Slot Status Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
          <h3 className="text-xl font-bold text-orange-800 mb-4">Slot Status (Today)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left font-semibold text-orange-700">Time</th>
                  <th className="font-semibold text-orange-700">Status</th>
                  <th className="font-semibold text-orange-700">Orders</th>
                  <th className="font-semibold text-orange-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {todaySlots.map((slot, idx) => (
                  <tr key={slot._id || `${slot.slotStart}-${slot.slotEnd}` || `slot-row-${idx}`} className={slot.status === 'closed' ? 'bg-red-50' : slot.status === 'full' ? 'bg-yellow-50' : ''}>
                    <td className="py-2">{slot.slotStart} - {slot.slotEnd}</td>
                    <td className="capitalize py-2">{slot.status}</td>
                    <td className="py-2">{slot.currentOrders}/{slot.maxOrders}</td>
                    <td className="py-2">
                      {slot.status !== 'closed' && (
                        <button onClick={() => handleSlotStatus(slot._id, 'closed')} className="px-2 py-1 bg-red-500 text-white rounded shadow hover:bg-red-600 transition text-xs">Close</button>
                      )}
                      {slot.status === 'closed' && (
                        <button onClick={() => handleSlotStatus(slot._id, 'open')} className="px-2 py-1 bg-green-600 text-white rounded shadow hover:bg-green-700 transition text-xs">Open</button>
                      )
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Order Summary Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
          <h3 className="text-xl font-bold text-orange-800 mb-4">Today's Order Summary</h3>
          <div className="overflow-x-auto">
            {Object.keys(summary).length === 0 ? (
              <div className="text-gray-500">No orders yet today.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left font-semibold text-orange-700">Item</th>
                    <th className="font-semibold text-orange-700">Total Orders</th>
                    <th className="font-semibold text-orange-700">Max/Day</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary).map(([item, data], idx) => (
                    <tr key={item + '-' + idx}>
                      <td className="py-2">{item}</td>
                      <td className="py-2">{data.count}</td>
                      <td className="py-2">{data.maxPerDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {/* Dues Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
          <h3 className="text-xl font-bold text-orange-800 mb-4">Dues</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {dues.length === 0 ? (
                  <tr key="no-dues"><td colSpan="2" className="text-gray-500">No dues</td></tr>
                ) : (
                  dues.map(u => (
                    <tr key={u._id || `${u.name}-${u.balance}`}> 
                      <td className="py-2">{u.name}: ₹{Math.abs(u.balance)}</td>
                      <td className="py-2"><button onClick={() => markAsPaid(u._id)} className="ml-4 px-2 py-1 bg-green-600 text-white rounded shadow hover:bg-green-700 transition text-xs">Mark as Paid</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Today's Menu Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
          <h3 className="text-xl font-bold text-orange-800 mb-4">Today's Menu</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Lunch Menu */}
            <div>
              <h4 className="font-semibold text-orange-700 mb-2">Lunch</h4>
              {menuLunch.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-2 items-center">
                  <input type="text" placeholder="Item name" value={item.name} onChange={e => updateMenuItem('lunch', idx, 'name', e.target.value)} className="p-2 border border-orange-200 rounded-lg w-32" />
                  <input type="number" placeholder="Price" value={item.price} onChange={e => updateMenuItem('lunch', idx, 'price', e.target.value)} className="p-2 border border-orange-200 rounded-lg w-24" />
                  <select value={item.type} onChange={e => updateMenuItem('lunch', idx, 'type', e.target.value)} className="p-2 border border-orange-200 rounded-lg w-28">
                    <option value="lunch">Lunch</option>
                    <option value="snack">Snack</option>
                  </select>
                  <input type="number" placeholder="Max/Day" value={item.maxPerDay} onChange={e => updateMenuItem('lunch', idx, 'maxPerDay', e.target.value)} className="p-2 border border-orange-200 rounded-lg w-24" />
                  <button onClick={() => removeMenuItem('lunch', idx)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Remove</button>
                </div>
              ))}
              <button onClick={() => addMenuItem('lunch')} className="mt-2 px-2 py-1 bg-orange-500 text-white rounded text-xs">Add Lunch Item</button>
              <button onClick={() => saveMenu('lunch')} className="mt-2 ml-2 px-2 py-1 bg-green-600 text-white rounded text-xs">Save Lunch Menu</button>
              {/* List current lunch menu */}
              <div className="mt-6">
                <h5 className="font-semibold text-orange-600 mb-2">Current Lunch Menu</h5>
                <ul className="space-y-1">
                  {menuLunch.filter(i => i.name && i.price).map((item, idx) => (
                    <li key={item.name + '-' + item.price + '-' + idx} className="flex justify-between text-orange-900 bg-orange-50 rounded px-3 py-1">
                      <span>{item.name}</span>
                      <span>₹{item.price}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Snacks Menu */}
            <div>
              <h4 className="font-semibold text-orange-700 mb-2">Snacks</h4>
              {menuSnacks.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-2 items-center">
                  <input type="text" placeholder="Item name" value={item.name} onChange={e => updateMenuItem('snack', idx, 'name', e.target.value)} className="p-2 border border-orange-200 rounded-lg w-32" />
                  <input type="number" placeholder="Price" value={item.price} onChange={e => updateMenuItem('snack', idx, 'price', e.target.value)} className="p-2 border border-orange-200 rounded-lg w-24" />
                  <select value={item.type} onChange={e => updateMenuItem('snack', idx, 'type', e.target.value)} className="p-2 border border-orange-200 rounded-lg w-28">
                    <option value="lunch">Lunch</option>
                    <option value="snack">Snack</option>
                  </select>
                  <input type="number" placeholder="Max/Day" value={item.maxPerDay} onChange={e => updateMenuItem('snack', idx, 'maxPerDay', e.target.value)} className="p-2 border border-orange-200 rounded-lg w-24" />
                  <button onClick={() => removeMenuItem('snack', idx)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Remove</button>
                </div>
              ))}
              <button onClick={() => addMenuItem('snack')} className="mt-2 px-2 py-1 bg-orange-500 text-white rounded text-xs">Add Snack Item</button>
              <button onClick={() => saveMenu('snack')} className="mt-2 ml-2 px-2 py-1 bg-green-600 text-white rounded text-xs">Save Snacks Menu</button>
              {/* List current snacks menu */}
              <div className="mt-6">
                <h5 className="font-semibold text-orange-600 mb-2">Current Snacks Menu</h5>
                <ul className="space-y-1">
                  {menuSnacks.filter(i => i.name && i.price).map((item, idx) => (
                    <li key={item.name + '-' + item.price + '-' + idx} className="flex justify-between text-orange-900 bg-orange-50 rounded px-3 py-1">
                      <span>{item.name}</span>
                      <span>₹{item.price}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 