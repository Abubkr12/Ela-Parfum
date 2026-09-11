import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_U || "https://sstduefzeufwmltjzknc.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_A || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdGR1ZWZ6ZXVmd21sdGp6a25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzM3NzIsImV4cCI6MjA5NjQwOTc3Mn0.iG8vBeSWTP_rFgX5nEHM5w-25BjopBXugv6i9bn3jFU";

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
      cookieOptions: request.nextUrl.pathname.startsWith('/admin') ? { name: 'sb-admin-auth-token' } : undefined,
      auth: request.nextUrl.pathname.startsWith('/admin') ? {
        storageKey: 'sb-admin-auth-token',
      } : undefined
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define protected routes mapping here
  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // If trying to access /admin/login while already logged in as admin, redirect to /admin
    if (request.nextUrl.pathname === '/admin/login' && user) {
      const { data: adminUser } = await supabase.from('admin_users').select('id').eq('id', user.id).single();
      if (adminUser) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }
    }

    // Allow access to /admin/login if not logged in
    if (request.nextUrl.pathname === '/admin/login') {
      return supabaseResponse;
    }

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
    
    // Check if user is in admin_users table
    const { data: adminUser } = await supabase.from('admin_users').select('id').eq('id', user.id).single();
    
    if (!adminUser) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Protect customer specific pages
  const protectedRoutes = ['/profil', '/pesanan', '/voucher', '/keranjang', '/checkout/success']
  if (protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route)) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirect to home if accessing login/register while authenticated
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/register')) && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
