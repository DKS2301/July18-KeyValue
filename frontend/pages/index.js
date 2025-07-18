import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">XPressMeal</h1>
      <p className="mb-8">Canteen Orders. No Chaos. Just Chai.</p>
      <div className="flex gap-4">
        <Link href="/login" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Student Login</Link>
        <Link href="/admin" className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900">Admin Dashboard</Link>
      </div>
    </div>
  );
} 