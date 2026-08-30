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

    const itemsHtml = items.map((it: any) => `<div>${it.quantity}x ${it.name} ${it.description ? `- ${it.description}` : ''}</div>`).join('');
    const logoHtml = logoUrl 
      ? `<img src="${logoUrl}" alt="${courierCompany}" style="height: 40px; object-fit: contain;" />` 
      : `<h2 style="margin: 0; text-transform: uppercase;">${courierCompany}</h2>`;

    const html = `
      <div style="width: 100%; max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif; color: #000; border: 2px solid #000; box-sizing: border-box;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 2px solid #000;">
          <div>${logoHtml}</div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="/assets/Ela Parfum.svg" alt="Ela Parfum" style="height: 40px;" />
            <div>
              <h2 style="margin: 0; font-size: 1.2rem; font-weight: 800;">Ela Parfum</h2>
              <p style="margin: 0; font-size: 0.8rem; color: #555;">elaparfum.com</p>
            </div>
          </div>
        </div>

        <div style="text-align: center; padding: 20px; border-bottom: 2px solid #000;">
          <img src="${barcodeUrl1}" alt="Barcode" style="width: 100%; max-height: 100px; object-fit: contain; margin-bottom: 10px;" />
          <h3 style="margin: 0; font-size: 1.1rem;">Nomor Resi - ${waybillNumber}</h3>
        </div>

        <div style="text-align: center; padding: 15px; border-bottom: 2px solid #000; line-height: 1.6;">
          <div>Ongkos Kirim: ${formatIDR(order.price)}</div>
          <div>Jenis Layanan - ${courierType.toUpperCase()}</div>
        </div>

        <div style="display: flex; border-bottom: 2px solid #000;">
          <div style="flex: 1; padding: 15px; border-right: 2px solid #000;">
            <div style="font-size: 0.9rem; font-weight: bold; margin-bottom: 10px;">Reference Number</div>
            <img src="${barcodeUrl2}" alt="Barcode 2" style="width: 100%; max-height: 60px; object-fit: contain; margin-bottom: 5px;" />
            <div style="font-size: 0.75rem; text-align: center;">${trackingId}</div>
          </div>
          <div style="flex: 1; padding: 15px; display: flex; flex-direction: column; justify-content: center; gap: 10px;">
            <div>Quantity: <strong>${totalQty} Pcs</strong></div>
            <div>Weight: <strong>${totalWeight.toFixed(3)} Kg</strong></div>
          </div>
        </div>

        <div style="display: flex; border-bottom: 2px solid #000; font-size: 0.9rem; line-height: 1.5;">
          <div style="flex: 1; padding: 15px; border-right: 2px solid #000;">
            <strong style="display: block; margin-bottom: 8px;">Alamat Penerima:</strong>
            <div>${dest.contact_name}</div>
            <div>${dest.contact_phone}</div>
            <div>${dest.address}</div>
            <div>${dest.postal_code}</div>
          </div>
          <div style="flex: 1; padding: 15px;">
            <strong style="display: block; margin-bottom: 8px;">Alamat Pengirim:</strong>
            <div>${origin.contact_name}</div>
            <div>${origin.contact_phone}</div>
            <div>${origin.address}</div>
          </div>
        </div>

        <div style="padding: 15px; border-bottom: 2px solid #000; font-size: 0.9rem; display: flex;">
          <strong style="min-width: 120px;">Jenis Barang :</strong>
          <div style="flex: 1; line-height: 1.6;">
            ${itemsHtml}
          </div>
        </div>

        <div style="padding: 15px; border-bottom: 2px solid #000; font-size: 0.9rem; display: flex;">
          <strong style="min-width: 120px;">Catatan :</strong>
          <div>Fragile, parfume${order.note ? ` - ${order.note}` : ''}</div>
        </div>

        <div style="padding: 10px; text-align: center; font-size: 0.8rem; color: #555; line-height: 1.4;">
          Pengiriman melalui platform <strong>Biteship</strong><br />
          biteship.com
        </div>
      </div>
    `;

    // Wrap in standard HTML boilerplate and auto-trigger print
    const fullHtml = \`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cetak Resi - \${data.courier?.waybill_id || data.id}</title>
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
      @page {
        size: A4;
        margin: 1cm;
      }
    }
  </style>
</head>
<body onload="window.print()">
  \${html}
</body>
</html>
    \`;

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
