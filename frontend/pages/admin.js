import { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import dayjs from 'dayjs';

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
  const [slotConfig, setSlotConfig] = useState({ slots: [], capacity: 5 });
  const [editingSlots, setEditingSlots] = useState([]);
  const [slotEditMode, setSlotEditMode] = useState(false);
  const [slotError, setSlotError] = useState('');
  const [todaySlots, setTodaySlots] = useState([]);

  // Fetch slot config on load
  useEffect(() => {
    const fetchSlotConfig = async () => {
      try {
        const res = await axios.post('http://localhost:5000/api/admin/slots', { phone, roll, password });
        setSlotConfig(res.data);
        setEditingSlots(res.data.slots);
      } catch {}
    };
    fetchSlotConfig();
  }, [phone, roll, password]);

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
    const lunchCount = editingSlots.filter(s => s.type === 'lunch').length;
    const snackCount = editingSlots.filter(s => s.type === 'snack').length;
    try {
      const res = await axios.post('http://localhost:5000/api/admin/slots', {
        phone, roll, password,
        slots: editingSlots
      });
      setSlotConfig(res.data);
      setSlotEditMode(false);
      fetchData();
    } catch (e) {
      setSlotError(e.response?.data?.error || 'Failed to save slot config');
    }
  };

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

  const markAsPaid = async (userId) => {
    try {
      await axios.post('http://localhost:5000/api/admin/clear-dues', {
        phone, roll, password, userId
      });
      fetchData();
    } catch (err) {
      setError('Failed to clear dues');
    }
  };

  const handleSlotStatus = async (slotId, newStatus) => {
    try {
      await axios.patch(`http://localhost:5000/api/admin/slot/${slotId}/status`, {
        status: newStatus,
        phone, roll, password
      });
      fetchTodaySlots();
    } catch {}
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
        date: today,
        phone, roll, password
      });
      fetchTodaySlots();
    } catch {
      setError('Failed to create today\'s slots');
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <h3 className="font-semibold my-2">Dues</h3>
          <div className="bg-white rounded shadow p-4 max-h-96 overflow-y-auto">
            {dues.length === 0 ? <div>No dues</div> : dues.map(u => (
              <div key={u._id} className="border-b py-2 flex justify-between items-center">
                <span>{u.name}: ₹{Math.abs(u.balance)}</span>
                <button onClick={() => markAsPaid(u._id)} className="ml-4 px-2 py-1 bg-green-600 text-white rounded text-xs">Mark as Paid</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mb-8">
        <h3 className="font-semibold my-4">Slot Status (Today)</h3>
        <div className="bg-white rounded shadow p-4 mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Time</th>
                <th>Status</th>
                <th>Orders</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {todaySlots.map(slot => (
                <tr key={slot._id} className={slot.status === 'closed' ? 'bg-red-100' : slot.status === 'full' ? 'bg-yellow-100' : ''}>
                  <td>{slot.slotStart} - {slot.slotEnd}</td>
                  <td className="capitalize">{slot.status}</td>
                  <td>{slot.currentOrders}/{slot.maxOrders}</td>
                  <td>
                    {slot.status !== 'closed' && (
                      <button onClick={() => handleSlotStatus(slot._id, 'closed')} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Close</button>
                    )}
                    {slot.status === 'closed' && (
                      <button onClick={() => handleSlotStatus(slot._id, 'open')} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Open</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Slot Management</h3>
          <div className="flex gap-2">
            {!slotEditMode && <button onClick={() => setSlotEditMode(true)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Edit</button>}
            <button onClick={handleCreateTodaySlots} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Create Today's Slots</button>
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
    </div>
  );
} 