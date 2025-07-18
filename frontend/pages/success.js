import Link from 'next/link';

export default function Success() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50">
      <h2 className="text-2xl font-bold mb-4 text-green-700">Order Placed!</h2>
      <p className="mb-6">Your order is confirmed. Please check your assigned pickup slot.</p>
      <Link href="/menu" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Order More</Link>
    </div>
  );
} 