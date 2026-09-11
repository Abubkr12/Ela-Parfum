import { createAdminClient } from "@/lib/supabase/admin";
import { formatRupiah } from "@/lib/types";
import { Printer, ArrowLeft, Store, MapPin } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import PrintButton from "./PrintButton";
import { ELA_STORES } from "@/lib/stores";

export default async function InvoiceRegularPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient();
  const { id } = await params;

  // We fetch using a public call or user authenticated call.
  // Since this is for customer, we verify if they are logged in or just use the order ID.
  // We'll just fetch by ID. If someone has the ID they can view the invoice.
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (!order) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Invoice tidak ditemukan</h2>
        <Link href="/" style={{ color: "var(--c-gold)", textDecoration: "underline" }}>Kembali ke Beranda</Link>
      </div>
    );
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);

  const isPickup = order.fulfillment_type === 'pickup';
  const orderStore = ELA_STORES.find((s) => s.id === order.store_id) || ELA_STORES[1];

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'ready_for_pickup':
        return { label: 'SIAP DIAMBIL DI TOKO', color: '#d97706' };
      case 'paid':
        return { label: 'LUNAS', color: '#10b981' };
      case 'processing':
        return { label: isPickup ? 'SEDANG DIRACIK' : 'MENUNGGU DIKIRIM', color: '#8b5cf6' };
      case 'shipped':
        return { label: 'DALAM PENGIRIMAN', color: '#0ea5e9' };
      case 'completed':
        return { label: 'SELESAI', color: '#10b981' };
      case 'cancelled':
        return { label: 'DIBATALKAN', color: '#ef4444' };
      default:
        return { label: 'MENUNGGU PEMBAYARAN', color: '#f59e0b' };
    }
  };
  const statusInfo = getStatusDisplay(order.status);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", padding: "40px 20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        
        {/* Controls - Hide when printing */}
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, color: "#666", textDecoration: "none", fontWeight: 500 }}>
            <ArrowLeft size={16} /> Kembali
          </Link>
          <PrintButton />
        </div>

        {/* Invoice Paper */}
        <div className="invoice-paper" style={{ background: "#fff", padding: "40px 50px", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", color: "#222" }}>
          
          {/* Top Header Section */}
          <div className="invoice-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, borderBottom: "2px solid #eee", paddingBottom: 24 }}>
            {/* Left: Logo & Company Info */}
            <div>
              <img src="/assets/invoice/elaparfum_logo.png" alt="Ela Parfum" style={{ height: 60, marginBottom: 12, objectFit: "contain" }} />
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#666", lineHeight: "1.5" }}>
                <strong style={{ color: "#333" }}>{orderStore.name}</strong><br />
                {orderStore.address}<br />
                Email: admin@elaparfum.com
              </p>
            </div>

            {/* Right: Invoice Text */}
            <div style={{ textAlign: "right" }}>
              <h1 style={{ margin: 0, fontSize: "2.5rem", color: "#111", letterSpacing: "-1px" }}>INVOICE</h1>
              <p style={{ color: "#666", margin: "4px 0 0 0" }}>#{order.order_code}</p>
            </div>
          </div>

          {/* Customer & Order Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 }}>
            <div>
              <h3 style={{ fontSize: "0.85rem", color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
                {isPickup ? 'Informasi Pelanggan:' : 'Tagihan Kepada:'}
              </h3>
              <p style={{ fontWeight: 600, margin: "0 0 4px 0", fontSize: "1.1rem" }}>{order.customer_name}</p>
              <p style={{ margin: "0 0 8px 0", color: "#444" }}>{order.customer_whatsapp}</p>
              {isPickup ? (
                <div style={{ background: "#f9f9f9", padding: "10px 14px", borderRadius: "6px", border: "1px solid #eee", marginTop: "8px" }}>
                  <div style={{ fontSize: "0.8rem", color: "#b45309", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                    Titik Ambil di Toko:
                  </div>
                  <div style={{ fontWeight: 600, color: "#222", fontSize: "0.88rem" }}>{orderStore.name}</div>
                  <div style={{ color: "#666", fontSize: "0.82rem", lineHeight: 1.4, marginTop: 2 }}>{orderStore.address}</div>
                  <div style={{ color: "#888", fontSize: "0.8rem", marginTop: 4 }}>Jam Buka: 08:00 - 22:00 WIB</div>
                </div>
              ) : (
                <p style={{ margin: 0, color: "#444", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  {order.shipping_address}<br/>
                  {order.shipping_city}, {order.shipping_province} {order.shipping_postal_code}
                </p>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <h3 style={{ fontSize: "0.85rem", color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Detail Pesanan:</h3>
              <p style={{ margin: "0 0 4px 0", color: "#444" }}><span style={{ fontWeight: 600 }}>Tanggal:</span> {new Date(order.created_at).toLocaleDateString('id-ID')}</p>
              <p style={{ margin: "0 0 4px 0", color: "#444" }}>
                <span style={{ fontWeight: 600 }}>Tipe:</span> {isPickup ? 'Ambil di Toko' : 'Pengiriman Kurir'}
              </p>
              <p style={{ margin: "0 0 4px 0", color: "#444" }}>
                <span style={{ fontWeight: 600 }}>{isPickup ? 'Cabang Toko:' : 'Kirim Dari:'}</span> {orderStore.shortName}
              </p>
              {!isPickup && (
                <p style={{ margin: "0 0 4px 0", color: "#444" }}><span style={{ fontWeight: 600 }}>Kurir:</span> {order.courier_name?.toUpperCase()} {order.courier_service}</p>
              )}
              <p style={{ margin: "0 0 4px 0", color: "#444" }}>
                <span style={{ fontWeight: 600 }}>Metode Bayar:</span> {order.payment_method || 'Online'}
              </p>
              <p style={{ margin: "0 0 4px 0", color: "#444" }}><span style={{ fontWeight: 600 }}>Status:</span> <span style={{ color: statusInfo.color, fontWeight: 700 }}>{statusInfo.label}</span></p>
            </div>
          </div>

          {/* Items Table */}
          <div className="invoice-table-wrapper"><table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ddd", background: "#f9f9f9" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.85rem", color: "#666", textTransform: "uppercase" }}>Deskripsi Produk</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.85rem", color: "#666", textTransform: "uppercase", width: 100 }}>Qty</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.85rem", color: "#666", textTransform: "uppercase", width: 150 }}>Harga</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.85rem", color: "#666", textTransform: "uppercase", width: 150 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "16px", color: "#222" }}>
                    <div style={{ fontWeight: 600 }}>{item.perfume_name}</div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>Ukuran: {item.size_label}</div>
                  </td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#444" }}>{item.quantity}</td>
                  <td style={{ padding: "16px", textAlign: "right", color: "#444" }}>{formatRupiah(item.price)}</td>
                  <td style={{ padding: "16px", textAlign: "right", fontWeight: 600, color: "#111" }}>{formatRupiah(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>

          {/* Summary */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: "300px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", color: "#444" }}>
                <span>Subtotal</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", color: "#444" }}>
                <span>Ongkos Kirim</span>
                <span>{formatRupiah(order.shipping_cost)}</span>
              </div>
              {order.discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", color: "#10b981" }}>
                  <span>Diskon</span>
                  <span>-{formatRupiah(order.discount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderTop: "2px solid #ddd", marginTop: 8, fontWeight: "bold", fontSize: "1.2rem", color: "#111" }}>
                <span>TOTAL</span>
                <span style={{ color: "var(--c-gold)" }}>{formatRupiah(order.total)}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 60, borderTop: "1px dashed #ddd", paddingTop: 24, textAlign: "center", color: "#666", fontSize: "0.9rem" }}>
            <p style={{ margin: 0 }}>Terima kasih telah berbelanja di Ela Parfum!</p>
            <p style={{ margin: "4px 0 0 0" }}>Jika ada pertanyaan, silakan hubungi kami melalui WhatsApp.</p>
          </div>
          
        </div>
      </div>
      
      {/* Print CSS embedded */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          @page { margin: 0; }
        }
      `}} />
    </div>
  );
}
