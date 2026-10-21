import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_U || "https://sstduefzeufwmltjzknc.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_A || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdGR1ZWZ6ZXVmd21sdGp6a25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzM3NzIsImV4cCI6MjA5NjQwOTc3Mn0.iG8vBeSWTP_rFgX5nEHM5w-25BjopBXugv6i9bn3jFU";

  const host = (
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.hostname ||
    ''
  ).toLowerCase()
  const isCashierHost = host.includes('cashier.')
  const isKasirRoute = request.nextUrl.pathname.startsWith('/kasir')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const useAdminAuth = isAdminRoute || isKasirRoute || isCashierHost

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
      cookieOptions: useAdminAuth ? { name: 'sb-admin-auth-token' } : undefined,
      auth: useAdminAuth ? {
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

  // 1. Handle Cashier Subdomain (cashier.elaparfum.web.id)
  if (isCashierHost) {
    const pathname = request.nextUrl.pathname

    // Allow static files, Next.js internal assets, and API routes
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/assets') ||
      pathname.startsWith('/images') ||
      pathname === '/favicon.ico'
    ) {
      return supabaseResponse
    }

    // Login routes handling
    const isLoginPath = pathname === '/login' || pathname === '/kasir/login'
    if (isLoginPath) {
      const allowLogin = request.nextUrl.searchParams.has('force') || request.nextUrl.searchParams.has('reauth') || request.nextUrl.searchParams.has('error');
      if (user && !allowLogin) {
        return NextResponse.redirect(new URL('/', request.url), 307)
      }
      if (pathname === '/login') {
        return NextResponse.rewrite(new URL('/kasir/login', request.url))
      }
      return supabaseResponse
    }

    // Protected cashier routes: if not logged in, redirect to login
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url), 307)
    }

    // Root '/' on cashier subdomain rewrites internally to '/kasir'
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/kasir', request.url))
    }

    // Allow direct /kasir and subpaths without redirect loop
    if (pathname.startsWith('/kasir')) {
      return supabaseResponse
    }

    // Any other arbitrary paths on cashier subdomain, redirect to root '/'
    return NextResponse.redirect(new URL('/', request.url), 307)
  }

  // 2. Handle /kasir routes on main domain: eliminate duplicate URLs by redirecting to cashier subdomain
  if (isKasirRoute && !isCashierHost) {
    if (host.includes('elaparfum.web.id')) {
      return NextResponse.redirect(new URL('https://cashier.elaparfum.web.id/'), 307)
    }

    // Localhost development fallback
    if (request.nextUrl.pathname === '/kasir/login') {
      if (user) {
        const { data: adminUser } = await supabase.from('admin_users').select('id').eq('id', user.id).single()
        if (adminUser) {
          return NextResponse.redirect(new URL('/kasir', request.url), 307)
        }
      }
      return supabaseResponse
    }

    if (!user) {
      return NextResponse.redirect(new URL('/kasir/login', request.url), 307)
    }

    const { data: adminUser } = await supabase.from('admin_users').select('id').eq('id', user.id).single()
    if (!adminUser) {
      return NextResponse.redirect(new URL('/', request.url), 307)
    }

    return supabaseResponse
  }

  // 3. Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // If trying to access /admin/login while already logged in as admin, redirect to /admin
    if (request.nextUrl.pathname === '/admin/login' && user) {
      const { data: adminUser } = await supabase.from('admin_users').select('id').eq('id', user.id).single();
      if (adminUser) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url, { status: 307, headers: supabaseResponse.headers })
      }
    }

    // Allow access to /admin/login if not logged in
    if (request.nextUrl.pathname === '/admin/login') {
      return supabaseResponse;
    }

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url, { status: 307, headers: supabaseResponse.headers })
    }
    
    // Check if user is in admin_users table
    const { data: adminUser } = await supabase.from('admin_users').select('id').eq('id', user.id).single();
    
    if (!adminUser) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url, { status: 307, headers: supabaseResponse.headers })
    }
  }

  // 4. Protect customer specific pages
  const protectedRoutes = ['/profil', '/pesanan', '/voucher', '/keranjang', '/checkout/success']
  if (protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route)) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url, { status: 307, headers: supabaseResponse.headers })
  }

  // 5. Redirect to home if accessing customer login/register while authenticated
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/register')) && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url, { status: 307, headers: supabaseResponse.headers })
  }

  return supabaseResponse
}

