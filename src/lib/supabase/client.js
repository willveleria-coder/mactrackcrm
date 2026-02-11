import { createBrowserClient } from '@supabase/ssr'

let clientInstance = null;

export const createClient = () => {
  if (clientInstance) return clientInstance;
  
  clientInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'supabase.auth.token',
      },
      global: {
        headers: {
          'x-client-info': 'mactrack-crm'
        }
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    }
  );
  
  return clientInstance;
}