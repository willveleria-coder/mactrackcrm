"use client";
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SessionRefresh() {
  useEffect(() => {
    const supabase = createClient();

    // Refresh session every 30 minutes
    const refreshInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.refreshSession();
        console.log('Session refreshed');
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      }
    });

    return () => {
      clearInterval(refreshInterval);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}