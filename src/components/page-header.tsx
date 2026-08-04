"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, X, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { label: "Beranda", href: "/" },
  { label: "Katalog", href: "/katalog" },
  { label: "Refill", href: "/refill" },
  { label: "Tentang", href: "/about" },
  { label: "Kontak", href: "/kontak" },
  { label: "FAQ", href: "/faq" },
];

export function PageHeader() {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('customer_profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();
      if (data?.avatar_url) {
        if (data.avatar_url.startsWith('http')) {
          setAvatarUrl(data.avatar_url);
        } else {
          setAvatarUrl(supabase.storage.from('avatars').getPublicUrl(data.avatar_url).data.publicUrl);
        }
      } else {
        setAvatarUrl(null);
      }

      // Track online status max once per 5 minutes per session
      const lastUpdate = sessionStorage.getItem('last_seen_update');
      const now = Date.now();
      if (!lastUpdate || now - parseInt(lastUpdate) > 5 * 60 * 1000) {
        sessionStorage.setItem('last_seen_update', now.toString());
        await supabase.from('customer_profiles').upsert({
          id: userId,
          last_seen_at: new Date().toISOString()
        }, { onConflict: 'id' });
      }
    };

    supabase.auth.getUser().then((response: any) => {
      const u = response.data.user;
      setUser(u);
      if (u) fetchProfile(u.id);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: any, session: any) => {
        const u = session?.user || null;
        setUser(u);
        if (u) {
          fetchProfile(u.id);
        } else {
          setAvatarUrl(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <header className="topbar">
        <Link href="/" className="topbar__brand">
          <img src="/assets/Ela Parfum.svg" alt="Ela Parfum Logo" style={{ height: "40px", width: "auto" }} />
        </Link>

        <div className="topbar__spacer" />

        <nav className="topbar__nav" style={{ gap: "2px" }}>
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href.replace("/#", "/"));
            return (
              <Link
                key={link.href}
                href={link.href}
                className="topbar__nav-link"
                style={
                  isActive
                    ? { color: "var(--c-gold)", background: "var(--c-gold-dim)" }
                    : undefined
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="topbar__actions">
          <ThemeToggle />
          
          {user ? (
            <Link href="/profil" className="btn-icon" aria-label="Profil Saya">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--c-gold)' }} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                  {user.user_metadata?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </Link>
          ) : (
            <Link href="/login" className="btn" style={{ padding: '0 16px', height: '36px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.06)' }}>
              Masuk
            </Link>
          )}

          {user && (
            <Link
              href="/riwayat-pesanan"
              className="btn-icon"
              aria-label="Riwayat Pesanan"
            >
              <ClipboardList size={18} />
            </Link>
          )}

          <Link
            href="/keranjang"
            className="btn-icon"
            aria-label="Keranjang belanja"
            style={{ position: "relative" }}
          >
            <ShoppingBag size={18} />
            {totalItems > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "var(--c-gold)",
                  color: "#0a0c0b",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  display: "grid",
                  placeItems: "center",
                  lineHeight: 1,
                }}
              >
                {totalItems}
              </span>
            )}
          </Link>

          {/* Mobile hamburger */}
          <button
            className="btn-icon"
            aria-label="Menu"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ display: "none" }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>


      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            top: "64px",
            zIndex: 99,
            background: "var(--c-bg)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            animation: "fadeSlideIn 200ms var(--ease-out) both",
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                padding: "14px 16px",
                borderRadius: "var(--r-md)",
                fontSize: "1rem",
                fontWeight: 500,
                color:
                  pathname === link.href || pathname.startsWith(link.href.replace("/#", "/"))
                    ? "var(--c-gold)"
                    : "var(--c-ink-muted)",
                background:
                  pathname === link.href || pathname.startsWith(link.href.replace("/#", "/"))
                    ? "var(--c-gold-dim)"
                    : "transparent",
                transition: "all 140ms",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
