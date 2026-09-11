"use client";

import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatRupiah } from '@/lib/types';
import { DailyTrendPoint } from './actions';
import { TrendingUp, ShoppingBag } from 'lucide-react';

interface DashboardTrendChartProps {
  data: DailyTrendPoint[];
}

export default function DashboardTrendChart({ data }: DashboardTrendChartProps) {
  const [range, setRange] = useState<7 | 14 | 30>(7);
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');

  // Filter the points according to selected range
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.slice(-range);
  }, [data, range]);

  const maxRevenue = useMemo(() => {
    if (filteredData.length === 0) return 1000000;
    const max = Math.max(...filteredData.map(d => d.revenue));
    return max === 0 ? 500000 : max;
  }, [filteredData]);

  const maxOrders = useMemo(() => {
    if (filteredData.length === 0) return 10;
    const max = Math.max(...filteredData.map(d => d.orders));
    return max === 0 ? 5 : max;
  }, [filteredData]);

  const isRevenue = metric === 'revenue';
  const strokeColor = isRevenue ? 'var(--c-gold)' : '#3b82f6';
  const gradientId = isRevenue ? 'colorRevenue' : 'colorOrders';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Chart Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        {/* Metric Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--c-surface-2)', padding: 4, borderRadius: 'var(--r-pill)', border: '1px solid var(--c-border)' }}>
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--r-pill)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isRevenue ? 'var(--c-gold)' : 'transparent',
              color: isRevenue ? '#fff' : 'var(--c-ink-dim)',
              transition: 'all 0.2s ease'
            }}
          >
            <TrendingUp size={14} /> Omzet (Rp)
          </button>
          <button
            type="button"
            onClick={() => setMetric('orders')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--r-pill)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: !isRevenue ? '#3b82f6' : 'transparent',
              color: !isRevenue ? '#fff' : 'var(--c-ink-dim)',
              transition: 'all 0.2s ease'
            }}
          >
            <ShoppingBag size={14} /> Jumlah Pesanan
          </button>
        </div>

        {/* Range Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {([7, 14, 30] as const).map(days => (
            <button
              key={days}
              type="button"
              onClick={() => setRange(days)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--r-sm)',
                border: range === days ? '1px solid var(--c-gold)' : '1px solid var(--c-border)',
                background: range === days ? 'rgba(59, 130, 246, 0.12)' : 'var(--c-surface-2)',
                color: range === days ? 'var(--c-gold)' : 'var(--c-ink-dim)',
                fontSize: '0.78rem',
                fontWeight: range === days ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {days} Hari
            </button>
          ))}
        </div>
      </div>

      {/* Recharts Area */}
      <div style={{ width: '100%', height: 320 }}>
        {filteredData.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-ink-dim)', fontSize: '0.9rem' }}>
            Belum ada aktivitas penjualan pada periode ini.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--c-gold)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--c-gold)" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--c-border)" />

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--c-ink-dim)', fontSize: 11 }}
                dy={10}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--c-ink-dim)', fontSize: 11 }}
                tickFormatter={(val: number) => {
                  if (isRevenue) {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                    if (val >= 1000) return `${Math.round(val / 1000)}k`;
                    return String(val);
                  }
                  return String(val);
                }}
                domain={isRevenue ? [0, Math.ceil(maxRevenue * 1.15)] : [0, Math.max(5, maxOrders + 2)]}
                allowDecimals={false}
                tickCount={5}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as DailyTrendPoint;
                    return (
                      <div style={{
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--r-md)',
                        padding: '10px 14px',
                        boxShadow: 'var(--shadow-float)',
                        color: 'var(--c-ink)',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ fontWeight: 600, color: 'var(--c-ink)', marginBottom: 4 }}>
                          {item.label} ({item.date})
                        </div>
                        <div style={{ color: 'var(--c-gold)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                          <span>Pendapatan:</span>
                          <b>{formatRupiah(item.revenue)}</b>
                        </div>
                        <div style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', marginTop: 2 }}>
                          <span>Jumlah Pesanan:</span>
                          <b>{item.orders} transaksi</b>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey={isRevenue ? 'revenue' : 'orders'}
                stroke={strokeColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                activeDot={{ r: 6, stroke: 'var(--c-surface-1)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
