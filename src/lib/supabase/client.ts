import { createBrowserClient } from '@supabase/ssr'

let adminClient: ReturnType<typeof createBrowserClient> | null = null
let customerClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient(isAdmin = false) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_U || "https://sstduefzeufwmltjzknc.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_A || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdGR1ZWZ6ZXVmd21sdGp6a25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzM3NzIsImV4cCI6MjA5NjQwOTc3Mn0.iG8vBeSWTP_rFgX5nEHM5w-25BjopBXugv6i9bn3jFU";

  if (isAdmin) {
    if (!adminClient) {
      adminClient = createBrowserClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          isSingleton: false,
          cookieOptions: { name: 'sb-admin-auth-token' },
          auth: {
            storageKey: 'sb-admin-auth-token',
          }
        }
      )
    }
    return adminClient;
  } else {
    if (!customerClient) {
      customerClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          isSingleton: false,
        }
      )
    }
    return customerClient;
  }
}
