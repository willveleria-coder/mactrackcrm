"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export function useAuth(redirectTo = "/admin/login") {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        // Use getSession first (checks local storage, no network call)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (mounted) router.push(redirectTo);
          return;
        }

        if (mounted) {
          setUser(session.user);
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        // Don't redirect on error - might be a temporary network issue
        // Only redirect if there's truly no session in local storage
        if (mounted) setLoading(false);
      }
    }

    checkSession();

    // Listen for auth state changes (handles token refresh, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_OUT" || !session) {
          router.push(redirectTo);
        } else if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
          setUser(session.user);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, supabase };
}