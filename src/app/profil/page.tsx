import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { User, LogOut, Package, Tag, Info, MapPin, CheckCircle2 } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { PageHeader } from '@/components/page-header'
import { updateProfile, updateAvatarUrl } from './actions'
import AddressActions from './AddressActions'
import { AvatarUpload } from '@/components/avatar-upload'

export const metadata = {
  title: 'Profil Saya — Ela Parfum',
  description: 'Kelola akun dan profil pelanggan',
}

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch multiple addresses
  const { data: addresses } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  const fullName = user.user_metadata?.full_name || 'Pelanggan Setia'

  return (
    <div className="customer-page">
      <PageHeader />

      <main className="workspace" style={{ paddingTop: '100px' }}>
        <div className="workspace-grid" style={{ gridTemplateColumns: '280px 1fr' }}>
          
          {/* SIDEBAR NAVIGATION */}
          <aside className="catalog-col" style={{ background: 'var(--glass-bg)', padding: '24px', borderRadius: 'var(--r-lg)', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--c-gold)', marginBottom: '24px' }}>Akun Saya</h3>
            
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/profil" className="topbar__nav-link" style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--c-gold)' }}>
                <User size={18} /> Profil Saya
              </Link>
              <Link href="/voucher" className="topbar__nav-link">
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
          <div className="catalog-col" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div style={{ background: 'var(--glass-bg)', padding: '32px', borderRadius: 'var(--r-lg)', border: '1px solid var(--glass-border)' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--c-ink)', marginBottom: '8px' }}>Profil Akun</h1>
              <p className="text-muted" style={{ marginBottom: '32px' }}>Kelola informasi data diri dan kontak Anda di sini.</p>
              
              <AvatarUpload 
                currentAvatarUrl={profile?.avatar_url || null}
                userId={user.id}
                onUploadSuccess={updateAvatarUrl}
              />
              
              <form action={updateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '500px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--c-ink-dim)', marginBottom: '8px' }}>Nama Lengkap</label>
                  <input type="text" name="full_name" defaultValue={profile?.full_name || fullName} className="input-field" style={{ width: '100%', padding: '12px 16px', background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', color: 'var(--c-ink)' }} required />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--c-ink-dim)', marginBottom: '8px' }}>Email</label>
                  <input type="email" defaultValue={user.email} className="input-field" disabled style={{ width: '100%', padding: '12px 16px', background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', color: 'var(--c-ink)' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--c-ink-dim)', marginBottom: '8px' }}>Nomor Telepon</label>
                  <input type="tel" name="phone" defaultValue={profile?.phone || ''} className="input-field" style={{ width: '100%', padding: '12px 16px', background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', color: 'var(--c-ink)' }} />
                </div>

                <div style={{ marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Simpan Perubahan Profil</button>
                </div>

                <div style={{ padding: '16px', background: 'var(--c-gold-dim)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 'var(--r-md)', marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ color: 'var(--c-gold-light)', marginTop: '2px' }}><Info size={16} /></div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--c-gold-light)' }}>Untuk mengubah data email atau password, silakan hubungi tim Support kami melalui WhatsApp.</p>
                </div>
              </form>
            </div>

            {/* BUKU ALAMAT SECTION */}
            <div style={{ background: 'var(--glass-bg)', padding: '32px', borderRadius: 'var(--r-lg)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--c-ink)' }}>Buku Alamat</h2>
                  <p className="text-muted" style={{ fontSize: '0.9rem' }}>Atur alamat pengiriman untuk mempermudah Checkout.</p>
                </div>
                <Link href="/profil/alamat/tambah" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
                  + Tambah Alamat
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {addresses && addresses.length > 0 ? (
                  addresses.map((addr) => (
                    <div key={addr.id} style={{ padding: '20px', background: addr.is_default ? 'var(--c-gold-dim)' : 'var(--c-surface-1)', border: addr.is_default ? '1px solid rgba(201,168,76,0.35)' : '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', position: 'relative' }}>
                      
                      {addr.is_default && (
                        <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--c-gold)', fontSize: '0.85rem', fontWeight: 600 }}>
                          <CheckCircle2 size={16} /> Alamat Utama
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <MapPin size={18} style={{ color: addr.is_default ? 'var(--c-gold)' : 'var(--c-ink-muted)' }} />
                        <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--c-ink)' }}>{addr.label}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                        <div style={{ fontWeight: 600, color: 'var(--c-ink)', fontSize: '0.95rem' }}>{addr.recipient_name} <span style={{ fontWeight: 400, color: 'var(--c-ink-dim)' }}>| {addr.phone}</span></div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--c-ink-dim)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {addr.full_address}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 12 }}>
                        <AddressActions addressId={addr.id} isDefault={addr.is_default} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '40px 20px', textAlign: 'center', border: '1px dashed var(--c-border)', borderRadius: 'var(--r-lg)', color: 'var(--c-ink-dim)' }}>
                    Belum ada alamat tersimpan. Tambahkan alamat pengiriman pertama Anda.
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  )
}
