import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 font-sans">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md border border-orange-100 flex flex-col items-center">
        {/* Logo placeholder */}
        <div className="w-16 h-16 mb-4 bg-orange-200 rounded-full flex items-center justify-center">
          <span className="text-2xl font-bold text-orange-800">XM</span>
        </div>
        <h1 className="text-4xl font-extrabold text-orange-900 mb-2 tracking-tight">XPressMeal</h1>
        <p className="mb-8 text-orange-700 text-lg text-center">Canteen Orders. No Chaos. Just Chai.</p>
        <div className="flex flex-col gap-4 w-full">
          <Link href="/login" className="w-full px-6 py-3 bg-blue-700 text-white rounded-lg font-semibold shadow hover:bg-blue-800 transition text-center">Student Login</Link>
          <Link href="/admin-login" className="w-full px-6 py-3 bg-orange-700 text-white rounded-lg font-semibold shadow hover:bg-orange-800 transition text-center">Admin Dashboard</Link>
        </div>
      </div>
      <footer className="mt-10 text-gray-400 text-xs">&copy; {new Date().getFullYear()} XPressMeal. All rights reserved.</footer>
    </div>
  );
} 