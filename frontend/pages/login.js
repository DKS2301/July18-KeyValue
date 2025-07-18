import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [roll, setRoll] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { phone, roll, name, password });
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('phone', phone);
      localStorage.setItem('roll', roll);
      localStorage.setItem('password', password);
      router.push('/menu');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4">Student Login</h2>
        <input type="text" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} className="mb-2 w-full p-2 border rounded" />
        <input type="text" placeholder="Roll Number" value={roll} onChange={e => setRoll(e.target.value)} className="mb-2 w-full p-2 border rounded" />
        <input type="text" placeholder="Name (if new)" value={name} onChange={e => setName(e.target.value)} className="mb-2 w-full p-2 border rounded" />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="mb-4 w-full p-2 border rounded" />
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Login</button>
      </form>
    </div>
  );
} 