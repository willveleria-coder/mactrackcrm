'use client';

import { ReviewForm } from '@/components/ReviewForm';
import { useParams } from 'next/navigation';

export default function OrderCompletePage() {
  const params = useParams();
  const orderId = params.id;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Order Complete! 🎉</h1>
      
      {/* Show Review Form */}
      <ReviewForm 
        orderId={orderId}
        customerName="John Doe" // Get from order data
        onSuccess={() => {
          alert('Thank you for your review!');
        }}
      />
    </div>
  );
}