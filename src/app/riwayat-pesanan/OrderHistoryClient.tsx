'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, Search, Filter, Store, MapPin, CheckCircle2 } from 'lucide-react'
import { formatRupiah } from '@/lib/types'
import { TrackingWidget } from './TrackingWidget'
import { TanyaStatusButton } from '@/components/tanya-status-button'
import { ELA_STORES } from '@/lib/stores'

const statusColors: Record<string, { bg: string, text: string, label: string }> = {
  pending: { bg: 'var(--c-gold-dim)', text: 'var(--c-gold-light)', label: 'Menunggu Pembayaran' },
  confirmed: { bg: 'rgba(59, 130, 246, 0.1)', text: 'rgb(59, 130, 246)', label: 'Dikonfirmasi' },
  processing: { bg: 'rgba(168, 85, 247, 0.1)', text: 'rgb(168, 85, 247)', label: 'Sedang Disiapkan' },
  ready_for_pickup: { bg: 'rgba(234, 179, 8, 0.15)', text: '#d97706', label: 'Siap Diambil di Toko' },
  shipped: { bg: 'rgba(14, 165, 233, 0.1)', text: 'rgb(14, 165, 233)', label: 'Dikirim' },
  paid: { bg: 'rgba(59, 130, 246, 0.1)', text: 'rgb(59, 130, 246)', label: 'Dibayar' },
  completed: { bg: 'rgba(34, 197, 94, 0.1)', text: 'rgb(34, 197, 94)', label: 'Selesai' },
  cancelled: { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--c-rose)', label: 'Dibatalkan' }
}

export function OrderHistoryClient({ initialOrders }: { initialOrders: any[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredOrders = initialOrders.filter((order) => {
    // Search match
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = 
      order.order_code.toLowerCase().includes(searchLower) ||
      order.order_items?.some((item: any) => item.perfume_name.toLowerCase().includes(searchLower))

    // Status match
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div style={{ background: 'var(--glass-bg)', padding: '32px', borderRadius: 'var(--r-lg)', border: '1px solid var(--glass-border)', minHeight: '600px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--c-ink)', marginBottom: '8px' }}>Riwayat Pesanan</h1>
          <p className="text-muted">Pantau status dan detail riwayat pembelian Anda.</p>
        </div>
        
        {/* Search and Filter Controls */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-ink-dim)' }} />
            <input 
              type="text" 
              placeholder="Cari pesanan atau nama parfum..." 
              className="form-control"
              style={{ paddingLeft: 38, height: 42, background: 'var(--c-surface-1)', color: 'var(--c-ink)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Filter size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--c-ink-muted)' }} />
            <select 
              className="form-control" 
              style={{ paddingLeft: 38, height: 42, appearance: 'none', background: 'var(--c-surface-1)', color: 'var(--c-ink)', border: '1px solid var(--c-border)', minWidth: 200, borderRadius: 'var(--r-md)' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu Pembayaran</option>
              <option value="paid">Dibayar</option>
              <option value="processing">Sedang Disiapkan</option>
              <option value="ready_for_pickup">Siap Diambil di Toko</option>
              <option value="shipped">Dikirim</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
            <Filter size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-ink-dim)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>
      
      {(!filteredOrders || filteredOrders.length === 0) ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--c-surface-1)', display: 'grid', placeItems: 'center', marginBottom: '16px', color: 'var(--c-ink-dim)' }}>
            <Package size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--c-ink)', marginBottom: '8px' }}>
            {initialOrders.length === 0 ? "Belum ada pesanan" : "Pesanan tidak ditemukan"}
          </h3>
          <p style={{ color: 'var(--c-ink-muted)', marginBottom: '24px', maxWidth: '300px' }}>
            {initialOrders.length === 0 
              ? "Anda belum melakukan pemesanan parfum apapun sejauh ini." 
              : "Tidak ada pesanan yang cocok dengan pencarian atau filter Anda."}
          </p>
          {initialOrders.length === 0 && (
            <Link href="/#catalog" className="btn btn-primary" style={{ padding: '0 24px', height: '44px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Mulai Belanja
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {filteredOrders.map((order: any) => {
            const statusConfig = statusColors[order.status] || { bg: 'var(--c-surface-1)', text: 'var(--c-ink)', label: order.status };
            const orderStore = ELA_STORES.find(s => s.id === order.store_id) || ELA_STORES[1]; // default Rawa Belong
            
            return (
              <div key={order.id} style={{ background: 'var(--c-surface-1)', borderRadius: 'var(--r-md)', border: '1px solid var(--c-border)', overflow: 'hidden' }}>
                
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--c-ink-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span>{new Date(order.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      {order.fulfillment_type === 'pickup' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(234, 179, 8, 0.12)', color: 'var(--c-gold)', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
                          <Store size={12} /> Ambil di Toko ({orderStore.shortName})
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
                          <MapPin size={12} /> Kurir dari {orderStore.shortName}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--c-ink)', fontWeight: 600 }}>
                      {order.order_code}
                    </div>
                  </div>
                  
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ padding: '6px 12px', borderRadius: 'var(--r-sm)', fontSize: '0.85rem', fontWeight: 500, background: statusConfig.bg, color: statusConfig.text }}>
                        {statusConfig.label}
                      </div>
                      
                      {order.status === 'pending' && (!order.payment_proof || !order.payment_proof.startsWith('http')) && (
                        <Link href={order.payment_link || `/checkout/success?id=${order.id}`} className="btn btn-primary" style={{ padding: '0 16px', height: '36px', fontSize: '0.9rem' }}>
                          Bayar Sekarang
                        </Link>
                      )}
                      {order.status === 'pending' && order.payment_proof && order.payment_proof.startsWith('http') && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ padding: '0 16px', height: '36px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', background: 'var(--c-surface-2)', color: 'var(--c-ink-dim)', borderRadius: 'var(--r-sm)', fontWeight: 500, border: '1px solid var(--c-border)' }}>
                            Menunggu Verifikasi
                          </div>
                          <TanyaStatusButton />
                        </div>
                      )}
                    </div>
                </div>
                
                <div style={{ padding: '24px' }}>
                  {order.status === 'ready_for_pickup' && (
                    <div style={{ padding: '16px 20px', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: 'var(--r-md)', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#d97706', fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>
                        <Store size={18} /> Pesanan Sudah Siap Diambil di Toko!
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--c-ink)', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                        Parfum pesanan Anda sudah selesai diracik dan dikemas. Silakan tunjukkan <strong>Kode Pesanan #{order.order_code}</strong> ke kasir toko di cabang:
                      </p>
                      <div style={{ fontWeight: 600, color: 'var(--c-gold)', fontSize: '0.92rem' }}>
                        {orderStore.name}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--c-ink-dim)', marginTop: 2 }}>
                        {orderStore.address}
                      </div>
                      {order.payment_method?.toLowerCase().includes('tunai') && (
                        <div style={{ fontSize: '0.82rem', color: '#d97706', marginTop: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle2 size={14} /> Bayar Tunai: Siapkan uang pas {formatRupiah(order.total)} saat mengambil pesanan.
                        </div>
                      )}
                    </div>
                  )}

                  {order.fulfillment_type === 'pickup' && order.status !== 'ready_for_pickup' && order.status !== 'completed' && order.status !== 'cancelled' && (
                    <div style={{ padding: '12px 16px', background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-sm)', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.85rem', color: 'var(--c-ink-dim)' }}>
                      <Store size={16} style={{ color: 'var(--c-gold)', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div>Lokasi Pengambilan: <strong style={{ color: 'var(--c-ink)' }}>{orderStore.name}</strong></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--c-ink-muted)', marginTop: 2 }}>{orderStore.address} (Jam Operasional: 08:00 - 22:00 WIB)</div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {order.order_items && order.order_items.length > 0 ? (
                      order.order_items.map((item: any) => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 500, color: 'var(--c-ink)' }}>{item.perfume_name}</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--c-ink-muted)' }}>Ukuran: {item.size_label} x {item.quantity}</div>
                          </div>
                          <div style={{ fontWeight: 500, color: 'var(--c-ink)' }}>
                            {formatRupiah(item.subtotal)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--c-ink)' }}>
                            {order.notes?.includes('[Custom Refill]') ? 'Pesanan Custom Refill' : 'Pesanan Produk'}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--c-ink-muted)' }}>
                            {order.notes?.split('|')[0] || '-'}
                          </div>
                        </div>
                        <div style={{ fontWeight: 500, color: 'var(--c-ink)' }}>
                          {formatRupiah(order.subtotal)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: 'var(--c-ink-muted)' }}>Total Belanja</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <Link href={`/riwayat-pesanan/invoice/${order.id}`} target="_blank" className="btn btn-outline" style={{ padding: '4px 16px', fontSize: '0.85rem', height: '32px' }}>Lihat Invoice</Link>
                      <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--c-gold)' }}>
                        {formatRupiah(order.total)}
                      </div>
                    </div>
                  </div>

                  {order.waybill_number && order.courier_name && (
                    <div style={{ marginTop: '24px' }}>
                      <TrackingWidget waybill={order.waybill_number} courier={order.courier_name} />
                    </div>
                  )}
                </div>
                
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}
