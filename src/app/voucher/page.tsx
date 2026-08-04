import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { User, LogOut, Package, Tag, Ticket } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { PageHeader } from '@/components/page-header'

export const metadata = {
  title: 'Voucher & Promo — Ela Parfum',
  description: 'Kupon diskon yang Anda miliki',
}

export default async function VoucherPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="customer-page">
      <PageHeader />

      <main className="workspace" style={{ paddingTop: '100px' }}>
        <div className="workspace-grid" style={{ gridTemplateColumns: '280px 1fr' }}>
          
          {/* SIDEBAR NAVIGATION */}
          <aside className="catalog-col" style={{ background: 'var(--glass-bg)', padding: '24px', borderRadius: 'var(--r-lg)', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--c-gold)', marginBottom: '24px' }}>Akun Saya</h3>
            
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/profil" className="topbar__nav-link">
                <User size={18} /> Profil Saya
              </Link>
              <Link href="/voucher" className="topbar__nav-link" style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--c-gold)' }}>
                <Tag size={18} /> Voucher & Promo
              </Link>
              <div style={{ margin: '16px 0', height: '1px', background: 'var(--c-border)' }} />
              
              <form action="/auth/signout" method="post">
                <button type="submit" className="topbar__nav-link" style={{ width: '100%', color: 'var(--c-rose)', justifyContent: 'flex-start' }}>
                  <LogOut size={18} /> Keluar Akun
                </button>
              </form>
            </nav>
          </aside>

          {/* MAIN CONTENT */}
          <div className="catalog-col">
            <div style={{ background: 'var(--glass-bg)', padding: '32px', borderRadius: 'var(--r-lg)', border: '1px solid var(--glass-border)', minHeight: '400px' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--c-ink)', marginBottom: '8px' }}>Voucher Saya</h1>
              <p className="text-muted" style={{ marginBottom: '32px' }}>Klaim dan gunakan diskon menarik khusus untuk Anda.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {/* Dummy Voucher 1 */}
                <div style={{ display: 'flex', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'rgba(201, 168, 76, 0.04)' }}>
                  <div style={{ background: 'rgba(201, 168, 76, 0.15)', width: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px dashed rgba(201, 168, 76, 0.4)' }}>
                    <Ticket size={28} color="var(--c-gold)" />
                  </div>
                  <div style={{ padding: '16px', flex: 1 }}>
                    <h4 style={{ color: 'var(--c-ink)', fontWeight: 600, marginBottom: '4px' }}>Diskon Member Baru</h4>
                    <p style={{ color: 'var(--c-ink-dim)', fontSize: '0.85rem', marginBottom: '12px' }}>Potongan 15% untuk pembelian pertama.</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--c-gold)', fontWeight: 600 }}>Kode: NEWBIE15</span>
                      <button className="btn" style={{ padding: '4px 12px', fontSize: '0.8rem', height: 'auto', background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-ink)' }}>Salin</button>
                    </div>
                  </div>
                </div>

                {/* Dummy Voucher 2 */}
                <div style={{ display: 'flex', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'rgba(45, 212, 180, 0.03)' }}>
                  <div style={{ background: 'rgba(45, 212, 180, 0.12)', width: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px dashed rgba(45, 212, 180, 0.4)' }}>
                    <Ticket size={28} color="var(--c-teal)" />
                  </div>
                  <div style={{ padding: '16px', flex: 1 }}>
                    <h4 style={{ color: 'var(--c-ink)', fontWeight: 600, marginBottom: '4px' }}>Gratis Ongkir</h4>
                    <p style={{ color: 'var(--c-ink-dim)', fontSize: '0.85rem', marginBottom: '12px' }}>Khusus pulau Jawa s/d Rp 20.000.</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--c-teal)', fontWeight: 600 }}>Kode: FREESHIP</span>
                      <button className="btn" style={{ padding: '4px 12px', fontSize: '0.8rem', height: 'auto', background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-ink)' }}>Salin</button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </main>
    </div>
  )
}
