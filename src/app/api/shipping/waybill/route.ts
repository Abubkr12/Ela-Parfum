import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new NextResponse("Missing Biteship Order ID", { status: 400 });
  }

  const isSandbox = process.env.NODE_ENV === "development";
  const biteshipUrl = "https://api.biteship.com/v1/orders/" + id;
  const apiKey = isSandbox 
    ? process.env.BITESHIP_SANDBOX_API_KEY 
    : process.env.BITESHIP_API_KEY;

  try {
    const res = await fetch(biteshipUrl, {
      method: "GET",
      headers: {
        "Authorization": apiKey || "",
      },
    });

    if (!res.ok) {
      console.error("Biteship fetch error:", await res.text());
      return new NextResponse("Failed to fetch order from Biteship", { status: 500 });
    }

    const data = await res.json();
    const order = data;

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
    if (comp.includes('grab')) logoUrl = '/assets/couriers/grab.svg';
    else if (comp.includes('gojek') || comp.includes('gosend')) logoUrl = '/assets/couriers/gojek.svg';
    else if (comp.includes('jne')) logoUrl = '/assets/couriers/jne.svg';
    else if (comp.includes('jnt') || comp.includes('j&t')) logoUrl = '/assets/couriers/jnt.svg';
    else if (comp.includes('sicepat')) logoUrl = '/assets/couriers/sicepat.svg';
    else if (comp.includes('anteraja')) logoUrl = '/assets/couriers/anteraja.svg';
    else if (comp.includes('lalamove')) logoUrl = '/assets/couriers/lalamove.svg';
    else if (comp.includes('ninja')) logoUrl = '/assets/couriers/ninja.svg';
    else if (comp.includes('lion')) logoUrl = '/assets/couriers/lion.svg';
    else if (comp.includes('pos')) logoUrl = '/assets/couriers/pos.svg';
    else if (comp.includes('tiki')) logoUrl = '/assets/couriers/tiki.svg';
    else if (comp.includes('spx') || comp.includes('shopee')) logoUrl = '/assets/couriers/spx.svg';
    else if (comp.includes('indah')) logoUrl = '/assets/couriers/indah.svg';
    else if (comp.includes('wahana')) logoUrl = '/assets/couriers/wahana.svg';

    const barcodeUrl1 = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(waybillNumber)}&scale=3&height=15&includetext=false`;
    const barcodeUrl2 = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(trackingId)}&scale=2&height=10&includetext=false`;

    const itemsHtml = items.map((it: any) => `<div style="margin-bottom:4px;">${it.quantity}x ${it.name} ${it.description ? `- ${it.description}` : ''}</div>`).join('');
    const logoHtml = logoUrl 
      ? `<img src="${logoUrl}" alt="${courierCompany}" style="height: 50px; object-fit: contain;" />` 
      : `<h2 style="margin: 0; text-transform: uppercase;">${courierCompany}</h2>`;

    const html = `
      <div class="print-controls" style="text-align: center; margin-bottom: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #000; color: #fff; border: none; border-radius: 5px; font-weight: bold;">🖨️ Cetak Resi Ulang</button>
      </div>

      <div style="width: 100%; max-width: 800px; margin: 0 auto; font-family: Arial, Helvetica, sans-serif; color: #000; border: 2px solid #000; box-sizing: border-box;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 25px; border-bottom: 2px solid #000;">
          <div>${logoHtml}</div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="/assets/Ela Parfum.svg" alt="Ela Parfum" style="height: 50px;" />
            <div style="text-align: left;">
              <h1 style="margin: 0; font-size: 1.6rem; font-weight: 900; letter-spacing: -0.5px; line-height: 1.1;">Ela Parfum</h1>
              <p style="margin: 0; font-size: 0.9rem; color: #333; font-weight: 500;">elaparfum.com</p>
            </div>
          </div>
        </div>

        <div style="text-align: center; padding: 25px 20px; border-bottom: 2px solid #000;">
          <img src="${barcodeUrl1}" alt="Barcode" style="width: 100%; max-height: 120px; object-fit: contain; margin-bottom: 12px;" />
          <h2 style="margin: 0; font-size: 1.3rem; font-weight: bold;">Nomor Resi - ${waybillNumber}</h2>
        </div>

        <div style="text-align: center; padding: 15px; border-bottom: 2px solid #000; line-height: 1.6; font-size: 1.05rem;">
          <div>Ongkos Kirim: ${formatIDR(order.price)}</div>
          <div>Jenis Layanan - ${courierType.toUpperCase()}</div>
        </div>

        <div style="display: flex; border-bottom: 2px solid #000;">
          <div style="flex: 1; padding: 15px 20px; border-right: 2px solid #000;">
            <div style="font-size: 0.9rem; font-weight: 800; margin-bottom: 10px;">Reference Number</div>
            <img src="${barcodeUrl2}" alt="Barcode 2" style="width: 100%; max-height: 60px; object-fit: contain; margin-bottom: 8px;" />
            <div style="font-size: 0.8rem; text-align: center; font-family: monospace;">${trackingId}</div>
          </div>
          <div style="flex: 1; padding: 15px 20px; display: flex; flex-direction: column; justify-content: center; gap: 15px; font-size: 1.05rem;">
            <div>Quantity: <strong style="font-weight: 800;">${totalQty} Pcs</strong></div>
            <div>Weight: <strong style="font-weight: 800;">${totalWeight.toFixed(3)} Kg</strong></div>
          </div>
        </div>

        <div style="display: flex; border-bottom: 2px solid #000; font-size: 0.95rem; line-height: 1.6;">
          <div style="flex: 1; padding: 15px 20px; border-right: 2px solid #000;">
            <strong style="display: block; margin-bottom: 8px; font-weight: 800; font-size: 1rem;">Alamat Penerima:</strong>
            <div>${dest.contact_name}</div>
            <div>${dest.contact_phone}</div>
            <div style="margin-top: 4px;">${dest.address}</div>
            <div style="margin-top: 4px;">${dest.postal_code || ''}</div>
          </div>
          <div style="flex: 1; padding: 15px 20px;">
            <strong style="display: block; margin-bottom: 8px; font-weight: 800; font-size: 1rem;">Alamat Pengirim:</strong>
            <div>${origin.contact_name}</div>
            <div>${origin.contact_phone}</div>
            <div style="margin-top: 4px;">${origin.address}</div>
          </div>
        </div>

        <div style="padding: 15px 20px; border-bottom: 2px solid #000; font-size: 0.95rem; display: flex;">
          <strong style="min-width: 130px; font-weight: 800; font-size: 1rem;">Jenis Barang :</strong>
          <div style="flex: 1; line-height: 1.6;">
            ${itemsHtml}
          </div>
        </div>

        <div style="padding: 15px 20px; border-bottom: 2px solid #000; font-size: 0.95rem; display: flex; align-items: center;">
          <strong style="min-width: 130px; font-weight: 800; font-size: 1rem;">Catatan :</strong>
          <div>Fragile, parfume${order.note ? ` - ${order.note}` : ''}</div>
        </div>

        <div style="padding: 12px; text-align: center; font-size: 0.85rem; color: #444; line-height: 1.4;">
          Pengiriman melalui platform <strong>Biteship</strong><br />
          biteship.com
        </div>
      </div>
    `;

    // Wrap in standard HTML boilerplate and auto-trigger print
    const fullHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cetak Resi - ${data.courier?.waybill_id || data.id}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #fff;
    }
    @media print {
      body {
        padding: 0;
      }
      .print-controls {
        display: none !important;
      }
      @page {
        size: A4;
        margin: 1cm;
      }
    }
  </style>
</head>
<body onload="window.print()">
  ${html}
</body>
</html>
    `;

    return new NextResponse(fullHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });

  } catch (err: any) {
    console.error("Waybill fetch error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
