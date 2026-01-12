'use client';
import { LoyaltyDashboard } from '@/components/LoyaltyProgram';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import HamburgerMenu from '@/components/HamburgerMenu';

export default function LoyaltyPage() {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const menuItems = [
    { href: "/client-portal/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/client-portal/new-order", icon: "📦", label: "New Order" },
    { href: "/client-portal/orders", icon: "📋", label: "My Orders" },
    { href: "/client-portal/loyalty", icon: "🎁", label: "Rewards" },
    { href: "/client-portal/settings", icon: "⚙️", label: "Settings" },
  ];

  useEffect(() => {
    loadClient();
  }, []);

  async function loadClient() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/client-portal/login');
        return;
      }
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (!clientData) {
        router.push('/client-portal/login');
        return;
      }
      setClient(clientData);
    } catch (error) {
      console.error('Error loading client:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/client-portal/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEF2F2] via-[#ffffff] to-[#FEE2E2] flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF2F2] via-[#ffffff] to-[#FEE2E2]">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/bus-icon.png" alt="Mac Track" width={40} height={40} className="object-contain" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-red-600">Mac Track</h1>
                <p className="text-xs text-gray-500">Client Portal</p>
              </div>
            </div>
            <HamburgerMenu items={menuItems} onLogout={handleLogout} userName={client?.name} userRole="Client" />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Back Link */}
        <Link href="/client-portal/dashboard" className="inline-flex items-center text-red-600 font-semibold mb-6 hover:text-red-700">
          ← Back to Dashboard
        </Link>

        {/* Page Title */}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">🎁 Rewards & Loyalty</h2>

        {/* Loyalty Program Card */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-6 text-white shadow-xl text-center">
            <p className="text-2xl font-bold">🎁 Loyalty Program</p>
            <p className="mt-3 text-lg">Contact us to join Mac With A Van loyalty program.</p>
            <p className="mt-3 text-xl font-semibold">📞 1300 170 718</p>
          </div>
        </div>

        {/* Loyalty Dashboard */}
        {client && <LoyaltyDashboard customerEmail={client.email} />}
      </main>
    </div>
  );
}
