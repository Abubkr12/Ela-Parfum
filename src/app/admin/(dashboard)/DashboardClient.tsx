"use client";

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Truck,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Lightbulb,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Eye,
  Archive,
  Bot
} from 'lucide-react';
import { toast } from 'sonner';
import { formatRupiah } from '@/lib/types';
import { DashboardData, getDashboardData, CriticalStockItem } from './actions';
import DashboardTrendChart from './DashboardTrendChart';

interface DashboardClientProps {
  initialData: DashboardData;
  userName: string;
}

export default function DashboardClient({ initialData, userName }: DashboardClientProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isPending, startTransition] = useTransition();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date(initialData.lastUpdated));

  // Branch filter for Critical Stocks: 'all' or storeId
  const [stockStoreFilter, setStockStoreFilter] = useState<'all' | number>('all');

  // Relative time formatter
  const [timeAgoText, setTimeAgoText] = useState('Baru saja');

  const updateRelativeTime = () => {
    const diffSec = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
    if (diffSec < 15) {
      setTimeAgoText('Baru saja');
    } else if (diffSec < 60) {
      setTimeAgoText(`${diffSec} detik lalu`);
    } else {
      const diffMin = Math.floor(diffSec / 60);
      setTimeAgoText(`${diffMin} menit lalu`);
    }
  };

  useEffect(() => {
    const timer = setInterval(updateRelativeTime, 5000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Refresh data handler
  const handleRefresh = async (showToast = true) => {
    setIsManualRefreshing(true);
    try {
      const fresh = await getDashboardData();
      startTransition(() => {
        setData(fresh);
        setLastUpdated(new Date(fresh.lastUpdated));
      });
      if (showToast) {
        toast.success('Data operasional berhasil disegarkan!');
      }
    } catch (err: any) {
      console.error('Gagal menyegarkan data dashboard:', err);
      if (showToast) {
        toast.error('Gagal menyegarkan data. Periksa koneksi Anda.');
      }
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // Smart Auto-Polling every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Auto-poll silently without toast popup
      handleRefresh(false);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filtered critical stocks by store
  const filteredCriticalStocks = useMemo(() => {
    if (stockStoreFilter === 'all') return data.criticalStocks;
    return data.criticalStocks.filter(item => item.store_id === stockStoreFilter);
  }, [data.criticalStocks, stockStoreFilter]);

  // Dynamic Operational Guidance
  const dynamicAdvice = useMemo(() => {
    if (data.todo.pendingVerificationCount > 0) {
      return {
        title: 'Verifikasi Pembayaran Manual',
        message: `Ada ${data.todo.pendingVerificationCount} pesanan menunggu konfirmasi bukti bayar. Segera periksa di tab Pesanan agar pesanan tidak tertunda.`,
        actionLabel: 'Verifikasi Pesanan',
        actionHref: '/admin/pesanan'
      };
    }
    if (data.todo.processingCount > 0) {
      return {
        title: 'Pesanan Siap Dikirim',
        message: `Ada ${data.todo.processingCount} pesanan siap dipacking. Terbitkan resi Biteship sekarang agar kurir dapat melakukan pickup tepat waktu.`,
        actionLabel: 'Proses Resi',
        actionHref: '/admin/pesanan'
      };
    }
    if (data.criticalStocks.length > 0) {
      return {
        title: 'Radar Stok Menipis',
        message: `Terdapat ${data.criticalStocks.length} item stok menipis di cabang toko Anda. Segera lakukan penyesuaian di menu Stok.`,
        actionLabel: 'Buka Manajemen Stok',
        actionHref: '/admin/stok'
      };
    }
    return {
      title: 'Toko Berjalan Optimal',
      message: 'Semua pesanan terproses rapi dan stok barang dalam batas aman. Pantau grafik penjualan untuk melihat tren hari ini.',
      actionLabel: 'Lihat Katalog',
      actionHref: '/admin/bibit'
    };
  }, [data]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 40 }}>
      {/* 1. Header Bar with Welcome & Live Pulse */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.1rem',
              color: 'var(--c-ink)',
              fontWeight: 500,
              margin: 0,
              letterSpacing: '-0.02em'
            }}>
              Selamat Datang, <span style={{ color: 'var(--c-gold)' }}>{userName}</span>!
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 'var(--r-pill)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10b981',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
              Live Monitor
            </span>
          </div>
          <p style={{ color: 'var(--c-ink-dim)', margin: 0, fontSize: '0.92rem' }}>
            Operational Command Center • Ringkasan performa real-time & pusat aksi harian toko Ela Parfum.
          </p>
        </div>

        {/* Sync Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--c-ink-muted)' }}>Auto-sync 60 dtk</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--c-ink-dim)', fontWeight: 500 }}>{timeAgoText}</span>
          </div>

          <button
            type="button"
            onClick={() => handleRefresh(true)}
            disabled={isManualRefreshing || isPending}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 'var(--r-md)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: isManualRefreshing ? 'wait' : 'pointer'
            }}
          >
            <RefreshCw
              size={15}
              className={isManualRefreshing || isPending ? 'animate-spin' : ''}
              style={{ color: 'var(--c-gold)' }}
            />
            {isManualRefreshing ? 'Memperbarui...' : 'Segarkan Data'}
          </button>
        </div>
      </div>

      {/* 2. Urgent Action Items / Operational Pipeline */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16
      }}>
        {/* Verification Needed */}
        <Link
          href="/admin/pesanan"
          style={{ textDecoration: 'none' }}
        >
          <div style={{
            background: data.todo.pendingVerificationCount > 0 ? 'rgba(239, 68, 68, 0.07)' : 'var(--c-surface-1)',
            border: `1px solid ${data.todo.pendingVerificationCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'var(--c-border)'}`,
            borderRadius: 'var(--r-lg)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--r-md)',
                background: data.todo.pendingVerificationCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'var(--c-surface-2)',
                color: data.todo.pendingVerificationCount > 0 ? '#ef4444' : 'var(--c-ink-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Perlu Konfirmasi Bayar</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: data.todo.pendingVerificationCount > 0 ? '#ef4444' : 'var(--c-ink)' }}>
                  {data.todo.pendingVerificationCount} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--c-ink-dim)' }}>pesanan</span>
                </div>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--c-ink-dim)' }} />
          </div>
        </Link>

        {/* Ready to Pack / Call Biteship */}
        <Link
          href="/admin/pesanan"
          style={{ textDecoration: 'none' }}
        >
          <div style={{
            background: data.todo.processingCount > 0 ? 'rgba(245, 158, 11, 0.07)' : 'var(--c-surface-1)',
            border: `1px solid ${data.todo.processingCount > 0 ? 'rgba(245, 158, 11, 0.3)' : 'var(--c-border)'}`,
            borderRadius: 'var(--r-lg)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--r-md)',
                background: data.todo.processingCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'var(--c-surface-2)',
                color: data.todo.processingCount > 0 ? '#f59e0b' : 'var(--c-ink-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Package size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Siap Dipacking / Resi</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: data.todo.processingCount > 0 ? '#f59e0b' : 'var(--c-ink)' }}>
                  {data.todo.processingCount} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--c-ink-dim)' }}>pesanan</span>
                </div>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--c-ink-dim)' }} />
          </div>
        </Link>

        {/* Shipped / On Delivery */}
        <Link
          href="/admin/pesanan"
          style={{ textDecoration: 'none' }}
        >
          <div style={{
            background: 'var(--c-surface-1)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-lg)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--r-md)',
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Truck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Dalam Pengiriman</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--c-ink)' }}>
                  {data.todo.shippedCount} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--c-ink-dim)' }}>paket</span>
                </div>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--c-ink-dim)' }} />
          </div>
        </Link>

        {/* Completed Today */}
        <div style={{
          background: 'var(--c-surface-1)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-lg)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--r-md)',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Selesai Hari Ini</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--c-ink)' }}>
                {data.todo.completedTodayCount} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--c-ink-dim)' }}>pesanan</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Primary Financial & Store KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 20
      }}>
        {/* Total Revenue */}
        <div style={{
          background: 'var(--c-surface-1)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-lg)',
          padding: 24,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Total Omzet Sukses</div>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.12)',
              color: 'var(--c-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--c-ink)', marginBottom: 8 }}>
            {formatRupiah(data.kpi.totalRevenueAll)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--c-ink-dim)' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              color: data.kpi.revenueGrowthPct >= 0 ? '#10b981' : '#ef4444',
              fontWeight: 600
            }}>
              {data.kpi.revenueGrowthPct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(data.kpi.revenueGrowthPct)}%
            </span>
            <span>Hari ini: {formatRupiah(data.kpi.totalRevenueToday)}</span>
          </div>
        </div>

        {/* Total Successful Orders */}
        <div style={{
          background: 'var(--c-surface-1)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-lg)',
          padding: 24
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Total Pesanan Aktif</div>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--c-ink)', marginBottom: 8 }}>
            {data.kpi.totalOrdersAll} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--c-ink-dim)' }}>transaksi</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--c-ink-dim)' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              color: data.kpi.ordersGrowthPct >= 0 ? '#10b981' : '#ef4444',
              fontWeight: 600
            }}>
              {data.kpi.ordersGrowthPct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(data.kpi.ordersGrowthPct)}%
            </span>
            <span>Masuk hari ini: {data.kpi.totalOrdersToday} order</span>
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div style={{
          background: 'var(--c-surface-1)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-lg)',
          padding: 24
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Rata-rata Order (AOV)</div>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--c-ink)', marginBottom: 8 }}>
            {formatRupiah(data.kpi.aovToday || Math.round(data.kpi.totalRevenueAll / (data.kpi.totalOrdersAll || 1)))}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--c-ink-dim)' }}>
            Rata-rata nilai belanja per transaksi
          </div>
        </div>

        {/* Active Customers */}
        <div style={{
          background: 'var(--c-surface-1)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-lg)',
          padding: 24
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Total Pelanggan Terdaftar</div>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(139, 92, 246, 0.12)',
              color: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--c-ink)', marginBottom: 8 }}>
            {data.kpi.totalCustomers} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--c-ink-dim)' }}>orang</span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--c-ink-dim)' }}>
            Basis pelanggan aktif Ela Parfum
          </div>
        </div>
      </div>

      {/* 4. Main Operational Layout (Two Columns) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        alignItems: 'start'
      }}>
        {/* LEFT COLUMN: Trend Chart + Recent Orders Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 2, minWidth: 0 }}>
          {/* 4a. Trend Chart Card */}
          <div style={{
            background: 'var(--c-surface-1)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-lg)',
            padding: 24
          }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--c-ink)', margin: 0 }}>
                Tren Penjualan & Pesanan
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--c-ink-dim)', margin: '4px 0 0' }}>
                Pergerakan omzet dan kuantitas transaksi toko dalam grafik interaktif.
              </p>
            </div>
            <DashboardTrendChart data={data.trendChart30Days} />
          </div>

          {/* 4b. Live Recent Orders Stream */}
          <div style={{
            background: 'var(--c-surface-1)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-lg)',
            padding: 24
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--c-ink)', margin: 0 }}>
                  Pesanan Masuk Terbaru
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--c-ink-dim)', margin: '4px 0 0' }}>
                  Aktivitas transaksi live terakhir dari pelanggan.
                </p>
              </div>
              <Link
                href="/admin/pesanan"
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--c-gold)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontWeight: 500
                }}
              >
                Lihat Semua <ExternalLink size={14} />
              </Link>
            </div>

            {/* Orders Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--c-border)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 10px', color: 'var(--c-ink-muted)', fontWeight: 500 }}>ID Pesanan</th>
                    <th style={{ padding: '12px 10px', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Pelanggan</th>
                    <th style={{ padding: '12px 10px', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Cabang</th>
                    <th style={{ padding: '12px 10px', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Status</th>
                    <th style={{ padding: '12px 10px', color: 'var(--c-ink-muted)', fontWeight: 500 }}>Total</th>
                    <th style={{ padding: '12px 10px', color: 'var(--c-ink-muted)', fontWeight: 500, textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--c-ink-dim)' }}>
                        Belum ada pesanan masuk.
                      </td>
                    </tr>
                  ) : (
                    data.recentOrders.map((order) => {
                      const isPaid = order.payment_status === 'paid' || ['processing', 'confirmed', 'shipped', 'completed'].includes(order.status);
                      return (
                        <tr
                          key={order.id}
                          style={{
                            borderBottom: '1px solid var(--c-border)',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '14px 10px', fontFamily: 'monospace', color: 'var(--c-gold)', fontWeight: 600 }}>
                            {order.order_code}
                          </td>
                          <td style={{ padding: '14px 10px' }}>
                            <div style={{ fontWeight: 500, color: 'var(--c-ink)' }}>{order.customer_name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--c-ink-dim)' }}>{order.customer_phone}</div>
                          </td>
                          <td style={{ padding: '14px 10px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: 'var(--r-sm)',
                              background: 'var(--c-surface-2)',
                              border: '1px solid var(--c-border)',
                              fontSize: '0.75rem',
                              color: 'var(--c-ink)'
                            }}>
                              {order.store_name}
                            </span>
                          </td>
                          <td style={{ padding: '14px 10px' }}>
                            <span style={{
                              padding: '3px 9px',
                              borderRadius: 'var(--r-pill)',
                              fontSize: '0.76rem',
                              fontWeight: 500,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: isPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              color: isPaid ? '#10b981' : '#f59e0b',
                              border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`
                            }}>
                              {isPaid ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                              {order.status === 'processing' ? 'Diproses' : (order.status === 'shipped' ? 'Dikirim' : (isPaid ? 'Lunas' : 'Menunggu Bayar'))}
                            </span>
                          </td>
                          <td style={{ padding: '14px 10px', fontWeight: 600, color: 'var(--c-ink)' }}>
                            {formatRupiah(order.total)}
                          </td>
                          <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                            <Link
                              href={`/admin/pesanan/${order.id}`}
                              className="btn btn-outline"
                              style={{
                                padding: '5px 10px',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <Eye size={13} /> Detail
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Critical Stocks (Filtered by Store), Branch Radar & Guidance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1, minWidth: 300 }}>
          {/* 4c. Radar Stok Kritis Multi-Cabang (WITH STORE FILTER!) */}
          <div style={{
            background: 'var(--c-surface-1)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-lg)',
            padding: 24
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--r-sm)',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--c-ink)', margin: 0 }}>
                    Radar Stok Kritis
                  </h3>
                </div>
              </div>
              <Link
                href="/admin/stok"
                style={{ fontSize: '0.8rem', color: 'var(--c-gold)', textDecoration: 'none', fontWeight: 500 }}
              >
                Kelola Stok
              </Link>
            </div>

            {/* Cabang Filter Dropdown (User's Comment Requirement) */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: '0.78rem', color: 'var(--c-ink-dim)' }}>
                <Filter size={13} /> Filter Cabang Toko:
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setStockStoreFilter('all')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--r-sm)',
                    border: stockStoreFilter === 'all' ? '1px solid var(--c-gold)' : '1px solid var(--c-border)',
                    background: stockStoreFilter === 'all' ? 'rgba(59, 130, 246, 0.12)' : 'var(--c-surface-2)',
                    color: stockStoreFilter === 'all' ? 'var(--c-gold)' : 'var(--c-ink-dim)',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    fontWeight: stockStoreFilter === 'all' ? 600 : 400
                  }}
                >
                  Semua ({data.criticalStocks.length})
                </button>
                {data.stores.map(store => {
                  const countForStore = data.criticalStocks.filter(item => item.store_id === store.id).length;
                  const isSelected = stockStoreFilter === store.id;
                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => setStockStoreFilter(store.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--r-sm)',
                        border: isSelected ? '1px solid var(--c-gold)' : '1px solid var(--c-border)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--c-surface-2)',
                        color: isSelected ? 'var(--c-gold)' : 'var(--c-ink-dim)',
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        fontWeight: isSelected ? 600 : 400
                      }}
                    >
                      {store.name} ({countForStore})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List of Critical Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
              {filteredCriticalStocks.length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: 'var(--c-surface-2)',
                  borderRadius: 'var(--r-md)',
                  color: 'var(--c-ink-dim)',
                  fontSize: '0.84rem'
                }}>
                  <CheckCircle2 size={24} style={{ color: '#10b981', margin: '0 auto 8px', display: 'block' }} />
                  Semua stok di cabang ini dalam kondisi aman!
                </div>
              ) : (
                filteredCriticalStocks.slice(0, 8).map((item) => (
                  <div
                    key={`${item.item_type}-${item.id}-${item.store_id}`}
                    style={{
                      background: 'var(--c-surface-2)',
                      border: '1px solid var(--c-border)',
                      borderRadius: 'var(--r-md)',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: item.store_id === 1 ? 'rgba(59, 130, 246, 0.15)' : (item.store_id === 2 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                          color: item.store_id === 1 ? '#3b82f6' : (item.store_id === 2 ? '#f59e0b' : '#10b981'),
                          fontWeight: 600
                        }}>
                          {item.store_name}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--c-ink-muted)', textTransform: 'capitalize' }}>
                          {item.item_type}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '0.84rem',
                        fontWeight: 500,
                        color: 'var(--c-ink)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.item_name}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: item.urgency === 'critical' ? '#ef4444' : '#f59e0b'
                      }}>
                        {item.current_stock} {item.unit}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--c-ink-dim)' }}>
                        Min. {item.threshold} {item.unit}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4d. Branch Performance Radar */}
          <div style={{
            background: 'var(--c-surface-1)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-lg)',
            padding: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Building2 size={18} style={{ color: 'var(--c-gold)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--c-ink)', margin: 0 }}>
                Distribusi Omzet Cabang
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.storeBreakdown.map((sb) => {
                const totalAllStoresRev = data.storeBreakdown.reduce((sum, s) => sum + s.revenue, 0) || 1;
                const percentage = Math.round((sb.revenue / totalAllStoresRev) * 100);
                return (
                  <div key={sb.store_id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, color: 'var(--c-ink)' }}>{sb.store_name}</span>
                      <span style={{ color: 'var(--c-ink-dim)' }}>
                        <b>{formatRupiah(sb.revenue)}</b> ({percentage}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--c-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.max(percentage, 3)}%`,
                        height: '100%',
                        background: sb.store_id === 1 ? '#3b82f6' : (sb.store_id === 2 ? '#f59e0b' : '#10b981'),
                        borderRadius: 3,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4e. System Health & Integration Status */}
          <div style={{
            background: 'var(--c-surface-1)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-lg)',
            padding: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <ShieldCheck size={18} style={{ color: '#10b981' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--c-ink)', margin: 0 }}>
                Status Integrasi Sistem
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{
                background: 'var(--c-surface-2)',
                padding: '8px 12px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--c-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.78rem'
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: data.systemHealth.database ? '#10b981' : '#ef4444' }} />
                <span style={{ color: 'var(--c-ink)', fontWeight: 500 }}>Supabase DB</span>
              </div>

              <div style={{
                background: 'var(--c-surface-2)',
                padding: '8px 12px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--c-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.78rem'
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: data.systemHealth.biteship ? '#10b981' : '#f59e0b' }} />
                <span style={{ color: 'var(--c-ink)', fontWeight: 500 }}>Biteship Kurir</span>
              </div>

              <div style={{
                background: 'var(--c-surface-2)',
                padding: '8px 12px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--c-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.78rem'
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: data.systemHealth.mayar ? '#10b981' : '#f59e0b' }} />
                <span style={{ color: 'var(--c-ink)', fontWeight: 500 }}>Mayar Gateway</span>
              </div>

              <div style={{
                background: 'var(--c-surface-2)',
                padding: '8px 12px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--c-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.78rem'
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: data.systemHealth.gemini ? '#10b981' : '#f59e0b' }} />
                <span style={{ color: 'var(--c-ink)', fontWeight: 500 }}>Gemini AI</span>
              </div>
            </div>
          </div>

          {/* 4f. Operational Guidance Box (REPLACES OLD "Tips Admin 💡" - NO STOCK EMOJIS!) */}
          <div style={{
            background: 'var(--glass-bg)',
            border: '1px dashed var(--c-gold)',
            borderRadius: 'var(--r-lg)',
            padding: 20,
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--c-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lightbulb size={16} />
              </div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--c-gold)', margin: 0 }}>
                {dynamicAdvice.title}
              </h4>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--c-ink-dim)', lineHeight: 1.5, margin: '0 0 12px' }}>
              {dynamicAdvice.message}
            </p>
            <Link
              href={dynamicAdvice.actionHref}
              style={{
                fontSize: '0.8rem',
                color: 'var(--c-gold)',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {dynamicAdvice.actionLabel} &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
