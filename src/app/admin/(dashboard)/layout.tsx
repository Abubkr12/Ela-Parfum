"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Package, LayoutDashboard, Users, Settings, LogOut, MessageCircle, ChevronLeft, TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import "../admin.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient(true);
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const toggleSubmenu = (menuName: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { 
      name: "Pesanan", 
      href: "/admin/pesanan", 
      icon: Package,
      subItems: [
        { name: "Pesanan Reguler", href: "/admin/pesanan" },
        { name: "Pesanan Kustom", href: "/admin/pesanan-kustom" },
      ]
    },
    { name: "Chat", href: "/admin/chat", icon: MessageCircle },
    { 
      name: "Statistik", 
      href: "/admin/statistik", 
      icon: TrendingUp,
      subItems: [
        { name: "Penjualan", href: "/admin/statistik" }
      ]
    },
    { 
      name: "Katalog", 
      href: "/admin/bibit", 
      icon: Package,
      subItems: [
        { name: "Bibit", href: "/admin/bibit" },
        { name: "Botol", href: "/admin/botol" },
        { name: "Produk", href: "/admin/produk" },
        { name: "Kategori", href: "/admin/kategori" },
        { name: "Voucher", href: "/admin/voucher" },
      ]
    },
    { name: "Pelanggan", href: "/admin/pelanggan", icon: Users },
    { name: "Karyawan", href: "/admin/karyawan", icon: Users },
    { 
      name: "Pengaturan", 
      href: "/admin/pengaturan", 
      icon: Settings,
      subItems: [
        { name: "Personalisasi AI", href: "/admin/pengaturan/ai" },
        { name: "Integrasi API", href: "/admin/pengaturan/api" },
        { name: "Metode Pembayaran", href: "/admin/pengaturan/pembayaran" },
        { name: "Mayar Debug", href: "/admin/pengaturan/mayar-debug" },
        { name: "Akun Saya", href: "/admin/pengaturan/akun" },
      ]
    },
  ];

  return (
    <div className="admin-layout" style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-color)" }}>
      {/* Sidebar */}
      <aside className={`pro-sidebar ${isCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-collapser" onClick={() => setIsCollapsed(!isCollapsed)}>
          <ChevronLeft size={16} />
        </div>
        
        <div className="sidebar-layout">
          <div className="sidebar-header">
            <Link href="/admin" className="pro-sidebar-logo">
              <div className="logo-icon">E</div>
              <h5>Ela Parfum</h5>
            </Link>
          </div>

          <div className="sidebar-content">
            <nav className="menu">
              <ul>
                <li className="menu-header"><span>UTAMA</span></li>
                {navItems.map((item) => {
                  const hasSubItems = !!item.subItems;
                  const isRouteActive = item.href === "/admin" 
                    ? pathname === "/admin" 
                    : hasSubItems
                      ? item.subItems!.some(sub => pathname.startsWith(sub.href)) || pathname.startsWith(item.href)
                      : pathname.startsWith(item.href);
                      
                  const isOpen = openMenus[item.name] || isRouteActive; 
                  
                  const Icon = item.icon;
                  
                  return (
                    <li key={item.name} className={`menu-item ${hasSubItems ? 'sub-menu' : ''} ${isOpen && hasSubItems ? 'open' : ''} ${isRouteActive && !hasSubItems ? 'active' : ''}`}>
                      <a onClick={() => hasSubItems ? toggleSubmenu(item.name) : router.push(item.href)}>
                        <span className="menu-icon">
                          <Icon size={18} />
                        </span>
                        <span className="menu-title">{item.name}</span>
                      </a>
                      
                      {hasSubItems && (
                        <div className="sub-menu-list">
                          <ul>
                            {item.subItems!.map(sub => {
                              const isSubActive = pathname === sub.href;
                              return (
                                <li key={sub.name} className={`menu-item ${isSubActive ? 'active' : ''}`}>
                                  <Link href={sub.href}>
                                    <span className="menu-title">{sub.name}</span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
          
          <div className="sidebar-footer">
            <button 
              onClick={handleLogout}
              style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--c-rose)", background: "transparent", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: 500, width: "100%" }}
            >
              <LogOut size={18} />
              <span style={{ display: isCollapsed ? "none" : "block" }}>Keluar Dasbor</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-content-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{ height: 72, background: "var(--c-surface-1)", borderBottom: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
          <div style={{ fontWeight: 500, color: "var(--c-ink)" }}>
            {navItems.find(n => pathname === n.href || pathname.startsWith(n.href + "/"))?.name || "Dashboard"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ThemeToggle />
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink)" }}>
              A
            </div>
          </div>
        </header>
        
        <div style={{ padding: 32, flex: 1, overflowY: "auto", background: "var(--bg-color)" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
