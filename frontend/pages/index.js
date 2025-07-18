import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 font-sans">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md border border-orange-100 flex flex-col items-center">
        <span className="text-5xl mb-4">🍽️</span>
        <h1 className="text-4xl font-extrabold text-orange-900 mb-2 tracking-tight">XPressMeal</h1>
        <p className="mb-8 text-orange-700 text-lg text-center">Canteen Orders. No Chaos. Just Chai.</p>
        <div className="flex flex-col gap-4 w-full">
          <Link href="/login" className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition text-center">Student Login</Link>
          <Link href="/admin-login" className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold shadow hover:bg-orange-700 transition text-center">Admin Dashboard</Link>
        </div>
      </div>
    </div>
  );
} 