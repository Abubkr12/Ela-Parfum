"use client";

import { useEffect, useState } from 'react';
import { Truck, MapPin, Loader2, Package } from 'lucide-react';

export function TrackingWidget({ waybill, courier }: { waybill: string, courier: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTracking() {
      try {
        const res = await fetch(`/api/shipping/track?waybill=${waybill}&courier=${courier}`);
        const result = await res.json();
        
        if (result.error) throw new Error(result.error);
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat status pengiriman');
      } finally {
        setLoading(false);
      }
    }

    if (waybill && courier) {
      fetchTracking();
    }
  }, [waybill, courier]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', background: 'var(--c-surface-2)', borderRadius: 'var(--r-md)', color: 'var(--c-ink-dim)', fontSize: '0.9rem' }}>
        <Loader2 size={16} className="animate-spin" />
        Melacak resi {waybill}...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', background: 'rgba(225,29,72,0.1)', color: 'var(--c-rose)', borderRadius: 'var(--r-md)', fontSize: '0.9rem' }}>
        {error}
      </div>
    );
  }

  const history = data?.history || [];
  const latestStatus = history.length > 0 ? history[0] : null;

  return (
    <div style={{ background: 'var(--c-surface-2)', borderRadius: 'var(--r-md)', padding: '16px', border: '1px solid var(--c-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--c-ink)', fontWeight: 600 }}>
          <Truck size={18} style={{ color: 'var(--c-gold)' }} />
          Lacak Pengiriman
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--c-ink-dim)', background: 'var(--c-surface-1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--c-border)' }}>
          {courier} - {waybill}
        </div>
      </div>

      {latestStatus ? (
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--c-gold-dim)', color: 'var(--c-gold)', display: 'grid', placeItems: 'center' }}>
              <Package size={16} />
            </div>
            {history.length > 1 && <div style={{ width: '2px', height: '100%', background: 'var(--c-border)', margin: '4px 0' }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: history.length > 1 ? '16px' : '0' }}>
            <div style={{ fontWeight: 500, color: 'var(--c-ink)', fontSize: '0.95rem' }}>{latestStatus.note}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--c-ink-dim)', marginTop: '4px' }}>
              {new Date(latestStatus.updated_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '0.9rem', color: 'var(--c-ink-dim)' }}>
          Informasi pelacakan belum tersedia.
        </div>
      )}

      {history.length > 1 && (
        <details style={{ marginTop: '16px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--c-gold)', fontWeight: 500 }}>Lihat Riwayat Lengkap</summary>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '15px', borderLeft: '2px solid var(--c-border)' }}>
            {history.slice(1).map((h: any, idx: number) => (
              <div key={idx} style={{ position: 'relative', paddingLeft: '16px' }}>
                <div style={{ position: 'absolute', left: '-21px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--c-border)' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--c-ink-muted)' }}>{h.note}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--c-ink-dim)', marginTop: '2px' }}>
                  {new Date(h.updated_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
