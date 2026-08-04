import { createServerSupabase } from "@/lib/supabase-server";
import { formatRupiah } from "@/lib/types";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function InvoiceCustomPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabase();
  const { id } = params;

  const { data: order } = await supabase
    .from("custom_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!order) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Invoice Custom tidak ditemukan</h2>
        <Link href="/" style={{ color: "var(--c-gold)", textDecoration: "underline" }}>Kembali ke Beranda</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", padding: "40px 20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        
        {/* Controls - Hide when printing */}
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, color: "#666", textDecoration: "none", fontWeight: 500 }}>
            <ArrowLeft size={16} /> Kembali
          </Link>
          <button 
            onClick={() => window.print()}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--c-gold)", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
          >
            <Printer size={16} /> Cetak Invoice
          </button>
        </div>

        {/* Invoice Paper */}
        <div style={{ background: "#fff", padding: "40px 50px", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", color: "#222" }}>
          
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #eee", paddingBottom: 24, marginBottom: 32 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "2rem", color: "#111", letterSpacing: "-0.5px" }}>INVOICE CUSTOM</h1>
              <p style={{ color: "#666", margin: "4px 0 0 0" }}>ID: {order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", fontFamily: "var(--font-display)", color: "var(--c-gold)" }}>Ela Parfum</div>
              <p style={{ color: "#666", margin: "4px 0 0 0", fontSize: "0.9rem" }}>Jl. Contoh Alamat No. 123<br/>Jakarta Selatan, Indonesia</p>
            </div>
          </div>

          {/* Customer Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 40 }}>
            <div>
              <h3 style={{ fontSize: "0.85rem", color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Tagihan Kepada:</h3>
              <p style={{ fontWeight: 600, margin: "0 0 4px 0", fontSize: "1.1rem" }}>{order.customer_name}</p>
              <p style={{ margin: "0 0 4px 0", color: "#444" }}>{order.customer_whatsapp}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <h3 style={{ fontSize: "0.85rem", color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Detail Pesanan:</h3>
              <p style={{ margin: "0 0 4px 0", color: "#444" }}><span style={{ fontWeight: 600 }}>Tanggal:</span> {new Date(order.created_at).toLocaleDateString('id-ID')}</p>
              <p style={{ margin: "0 0 4px 0", color: "#444" }}><span style={{ fontWeight: 600 }}>Status:</span> <span style={{ color: order.status === 'paid' || order.status === 'completed' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{order.status.toUpperCase()}</span></p>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ddd", background: "#f9f9f9" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.85rem", color: "#666", textTransform: "uppercase" }}>Deskripsi Racikan</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.85rem", color: "#666", textTransform: "uppercase", width: 150 }}>Harga</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "16px", color: "#222" }}>
                  <div style={{ fontWeight: 600, color: "var(--c-gold)" }}>{order.ai_recipe?.name_suggestion || "Custom Parfum"}</div>
                  <div style={{ fontSize: "0.85rem", color: "#666", marginTop: 4 }}>Ukuran: {order.volume_ml} ML</div>
                  <div style={{ fontSize: "0.85rem", color: "#666", marginTop: 4 }}>Base Note: {order.base_note}</div>
                  <div style={{ fontSize: "0.85rem", color: "#666", marginTop: 4, fontStyle: "italic" }}>"{order.description}"</div>
                </td>
                <td style={{ padding: "16px", textAlign: "right", fontWeight: 600, color: "#111", verticalAlign: "top" }}>
                  {formatRupiah(order.price_perfume || 0)}
                </td>
              </tr>
              {order.price_bottle > 0 && (
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "16px", color: "#222" }}>Biaya Botol</td>
                  <td style={{ padding: "16px", textAlign: "right", fontWeight: 600, color: "#111" }}>{formatRupiah(order.price_bottle)}</td>
                </tr>
              )}
              {order.price_service > 0 && (
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "16px", color: "#222" }}>Biaya Jasa Tambahan</td>
                  <td style={{ padding: "16px", textAlign: "right", fontWeight: 600, color: "#111" }}>{formatRupiah(order.price_service)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Summary */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: "300px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderTop: "2px solid #ddd", marginTop: 8, fontWeight: "bold", fontSize: "1.2rem", color: "#111" }}>
                <span>TOTAL</span>
                <span style={{ color: "var(--c-gold)" }}>{formatRupiah(order.total_price || 0)}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 60, borderTop: "1px dashed #ddd", paddingTop: 24, textAlign: "center", color: "#666", fontSize: "0.9rem" }}>
            <p>Terima kasih telah mempercayakan racikan parfum Anda kepada Ela Parfum!</p>
            <p>Jika ada pertanyaan, silakan hubungi kami melalui WhatsApp.</p>
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
