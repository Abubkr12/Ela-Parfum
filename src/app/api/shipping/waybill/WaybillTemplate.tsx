import React from 'react';

export default function WaybillTemplate({ order }: { order: any }) {
  const courierCompany = order.courier?.company || '';
  const courierType = order.courier?.type || '';
  const waybillNumber = order.courier?.waybill_id || order.id;
  const trackingId = order.courier?.tracking_id || order.reference_id || order.id;

  const origin = order.origin || {};
  const dest = order.destination || {};
  const items = order.items || [];

  const totalQty = items.reduce((acc: number, cur: any) => acc + (cur.quantity || 1), 0);
  const totalWeight = items.reduce((acc: number, cur: any) => acc + (cur.weight || 0), 0) / 1000; // in kg

  // Helper to format currency
  const formatIDR = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

  // Logo mapping
  let logoUrl = '';
  const comp = courierCompany.toLowerCase();
  if (comp.includes('grab')) logoUrl = '/assets/couriers/grab.png';
  else if (comp.includes('gojek') || comp.includes('gosend')) logoUrl = '/assets/couriers/gojek.svg';
  else if (comp.includes('jne')) logoUrl = '/assets/couriers/jne.png';
  else if (comp.includes('jnt') || comp.includes('j&t')) logoUrl = '/assets/couriers/jnt.png';
  else if (comp.includes('sicepat')) logoUrl = '/assets/couriers/sicepat.png';
  else if (comp.includes('anteraja')) logoUrl = '/assets/couriers/anteraja.png';
  else if (comp.includes('lalamove')) logoUrl = '/assets/couriers/lalamove.png';
  else if (comp.includes('ninja')) logoUrl = '/assets/couriers/ninja.svg';
  else if (comp.includes('lion')) logoUrl = '/assets/couriers/lion.png';
  else if (comp.includes('pos')) logoUrl = '/assets/couriers/pos.svg';
  else if (comp.includes('tiki')) logoUrl = '/assets/couriers/tiki.png';
  else if (comp.includes('spx') || comp.includes('shopee')) logoUrl = '/assets/couriers/spx.png';
  else if (comp.includes('indah')) logoUrl = '/assets/couriers/indah.svg';
  else if (comp.includes('wahana')) logoUrl = '/assets/couriers/wahana.png';

  const barcodeUrl1 = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(waybillNumber)}&scale=3&height=15&includetext=false`;
  const barcodeUrl2 = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(trackingId)}&scale=2&height=10&includetext=false`;

  return (
    <div style={{
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif',
      color: '#000',
      border: '2px solid #000',
      boxSizing: 'border-box'
    }}>
      {/* Header: Courier Logo & Store Logo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '2px solid #000' }}>
        <div>
          {logoUrl ? <img src={logoUrl} alt={courierCompany} style={{ height: '40px', objectFit: 'contain' }} /> : <h2 style={{ margin: 0, textTransform: 'uppercase' }}>{courierCompany}</h2>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/assets/Ela Parfum.svg" alt="Ela Parfum" style={{ height: '40px' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Ela Parfum</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#555' }}>elaparfum.com</p>
          </div>
        </div>
      </div>

      {/* Main Barcode & Resi */}
      <div style={{ textAlign: 'center', padding: '20px', borderBottom: '2px solid #000' }}>
        <img src={barcodeUrl1} alt="Barcode" style={{ width: '100%', maxHeight: '100px', objectFit: 'contain', marginBottom: '10px' }} />
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Nomor Resi - {waybillNumber}</h3>
      </div>

      {/* Pricing & Service */}
      <div style={{ textAlign: 'center', padding: '15px', borderBottom: '2px solid #000', lineHeight: 1.6 }}>
        <div>Ongkos Kirim: {formatIDR(order.price)}</div>
        <div>Jenis Layanan - {courierType.toUpperCase()}</div>
      </div>

      {/* Reference & Weight */}
      <div style={{ display: 'flex', borderBottom: '2px solid #000' }}>
        <div style={{ flex: 1, padding: '15px', borderRight: '2px solid #000' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '10px' }}>Reference Number</div>
          <img src={barcodeUrl2} alt="Barcode 2" style={{ width: '100%', maxHeight: '60px', objectFit: 'contain', marginBottom: '5px' }} />
          <div style={{ fontSize: '0.75rem', textAlign: 'center' }}>{trackingId}</div>
        </div>
        <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
          <div>Quantity: <strong>{totalQty} Pcs</strong></div>
          <div>Weight: <strong>{totalWeight.toFixed(3)} Kg</strong></div>
        </div>
      </div>

      {/* Addresses */}
      <div style={{ display: 'flex', borderBottom: '2px solid #000', fontSize: '0.9rem', lineHeight: 1.5 }}>
        <div style={{ flex: 1, padding: '15px', borderRight: '2px solid #000' }}>
          <strong style={{ display: 'block', marginBottom: '8px' }}>Alamat Penerima:</strong>
          <div>{dest.contact_name}</div>
          <div>{dest.contact_phone}</div>
          <div>{dest.address}</div>
          <div>{dest.postal_code}</div>
        </div>
        <div style={{ flex: 1, padding: '15px' }}>
          <strong style={{ display: 'block', marginBottom: '8px' }}>Alamat Pengirim:</strong>
          <div>{origin.contact_name}</div>
          <div>{origin.contact_phone}</div>
          <div>{origin.address}</div>
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: '15px', borderBottom: '2px solid #000', fontSize: '0.9rem', display: 'flex' }}>
        <strong style={{ minWidth: '120px' }}>Jenis Barang :</strong>
        <div style={{ flex: 1, lineHeight: 1.6 }}>
          {items.map((it: any, idx: number) => (
            <div key={idx}>{it.quantity}x {it.name} {it.description ? `- ${it.description}` : ''}</div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div style={{ padding: '15px', borderBottom: '2px solid #000', fontSize: '0.9rem', display: 'flex' }}>
        <strong style={{ minWidth: '120px' }}>Catatan :</strong>
        <div>Fragile, parfume{order.note ? ` - ${order.note}` : ''}</div>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px', textAlign: 'center', fontSize: '0.8rem', color: '#555', lineHeight: 1.4 }}>
        Pengiriman melalui platform <strong>Biteship</strong><br />
        biteship.com
      </div>
    </div>
  );
}
