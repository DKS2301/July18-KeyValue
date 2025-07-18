import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function AdminLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { phone, password });
      if (res.data.user.role !== 'admin') {
        setError('Not an admin account');
        return;
      }
      localStorage.setItem('adminToken', res.data.token);
      localStorage.setItem('adminUser', JSON.stringify(res.data.user));
      router.push('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 font-sans">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-sm border border-orange-100 flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <span className="text-4xl mb-2">🍽️</span>
          <h2 className="text-2xl font-extrabold text-orange-900 tracking-tight">Admin Login</h2>
          <p className="text-orange-700 text-sm mt-1">XPressMeal Canteen</p>
        </div>
        <input type="text" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} className="mb-3 w-full p-3 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="mb-4 w-full p-3 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
        {error && <div className="text-red-500 mb-3 w-full text-center">{error}</div>}
        <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold shadow hover:bg-orange-700 transition">Login</button>
        <button type="button" onClick={() => router.push('/')} className="w-full mt-3 text-orange-700 hover:underline text-sm">Back to Home</button>
      </form>
    </div>
  );
} 