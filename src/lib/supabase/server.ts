import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient(isAdmin = false) {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_U || "https://sstduefzeufwmltjzknc.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_A || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdGR1ZWZ6ZXVmd21sdGp6a25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzM3NzIsImV4cCI6MjA5NjQwOTc3Mn0.iG8vBeSWTP_rFgX5nEHM5w-25BjopBXugv6i9bn3jFU";

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      cookieOptions: isAdmin ? { name: 'sb-admin-auth-token' } : undefined,
      auth: isAdmin ? {
        storageKey: 'sb-admin-auth-token',
      } : undefined
    }
  )
}
