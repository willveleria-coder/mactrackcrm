'use client';

import { LoyaltyDashboard } from '@/components/LoyaltyProgram';
import { useState } from 'react';

export default function LoyaltyPage() {
  // In real app, get from auth/session
  const [customerEmail] = useState('customer@email.com');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <LoyaltyDashboard customerEmail={customerEmail} />
    </div>
  );
}