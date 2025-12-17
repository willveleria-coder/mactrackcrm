"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PushNotificationManager({ userId, userType }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      registerServiceWorker();
    } else {
      setError('Push notifications not supported on this device');
    }
  }, []);

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
        await saveSubscription(existingSubscription);
      }
    } catch (err) {
      console.error('Service Worker registration failed:', err);
      setError('Service Worker failed: ' + err.message);
    }
  }

  async function subscribeToPush() {
    try {
      setError(null);
      
      // Check if VAPID key exists
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError('VAPID key not configured. Contact admin.');
        return;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Notification permission denied. Please enable in browser settings.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      setSubscription(subscription);
      setIsSubscribed(true);
      await saveSubscription(subscription);
      
      alert('✅ Push notifications enabled!');
    } catch (err) {
      console.error('Push subscription failed:', err);
      setError('Failed: ' + err.message);
    }
  }

  async function unsubscribeFromPush() {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        await removeSubscription();
        setSubscription(null);
        setIsSubscribed(false);
        alert('Push notifications disabled');
      }
    } catch (err) {
      console.error('Unsubscribe failed:', err);
      setError('Failed to unsubscribe: ' + err.message);
    }
  }

  async function saveSubscription(sub) {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          user_type: userType,
          subscription: JSON.stringify(sub),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,user_type'
        });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to save subscription:', err);
    }
  }

  async function removeSubscription() {
    try {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('user_type', userType);
    } catch (err) {
      console.error('Failed to remove subscription:', err);
    }
  }

  function urlBase64ToUint8Array(base64String) {
    if (!base64String) return new Uint8Array();
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  if (!isSupported) {
    return (
      <div className="bg-gray-100 rounded-xl p-4 border border-gray-200">
        <p className="text-sm text-gray-500">🔕 Push notifications not supported on this device/browser</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">🔔 Push Notifications</h3>
          <p className="text-sm text-gray-600">
            {isSubscribed ? "Enabled - You'll receive job alerts" : 'Enable to get instant job alerts'}
          </p>
          {error && <p className="text-xs text-red-600 mt-1">⚠️ {error}</p>}
        </div>
        <button
          onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
            isSubscribed 
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {isSubscribed ? 'Disable' : 'Enable'}
        </button>
      </div>
    </div>
  );
}