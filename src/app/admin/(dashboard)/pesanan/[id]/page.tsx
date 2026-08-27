import { createAdminClient } from "@/lib/supabase/admin";
import { formatRupiah } from "@/lib/types";
import Link from "next/link";
import { ChevronLeft, Truck, Package, User, MapPin, CheckCircle, XCircle, FileImage } from "lucide-react";
import { markAsPaid, updateResiStatus, rejectPayment, retryWebhook } from "../actions";
import { PaymentProofModal } from "../PaymentProofModal";
import { SyncWebhookButton } from "./SyncWebhookButton";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient();
  const { id } = await params;

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", parseInt(id, 10))
    .single();

  if (error || !order) {
    return <div>Pesanan tidak ditemukan atau terjadi kesalahan: {error?.message}</div>;
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("*, perfumes(image_url)")
    .eq("order_id", parseInt(id, 10));

  let customRequest = null;
  const customMatch = order.notes?.match(/CustomRequestID:\s*([a-f0-9\-]+)/i);
  if (customMatch && customMatch[1]) {
    const { data: reqData } = await supabase
      .from("custom_requests")
      .select("*")
      .eq("id", customMatch[1])
      .single();
    if (reqData) {
      customRequest = reqData;
      if (typeof customRequest.ai_recipe === 'string') {
        try {
          customRequest.ai_recipe = JSON.parse(customRequest.ai_recipe);
        } catch(e) {}
      }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <Link href="/admin/pesanan" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--c-ink-dim)", fontSize: "0.9rem", marginBottom: 16 }}>
          <ChevronLeft size={16} /> Kembali ke Daftar Pesanan
        </Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--c-ink)", fontWeight: 400, marginBottom: 8, display: "flex", alignItems: "center", gap: 16 }}>
          Detail Pesanan <span style={{ fontSize: "1.2rem", padding: "4px 12px", background: "var(--glass-bg)", border: "1px solid var(--c-gold)", color: "var(--c-gold)", borderRadius: 100 }}>{order.order_code}</span>
        </h1>
        <p style={{ color: "var(--c-ink-dim)" }}>
          Dibuat pada {new Date(order.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 32, alignItems: "start" }}>
        
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Order Items */}
          <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: 24 }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 20 }}>
              <Package size={18} style={{ color: "var(--c-gold)" }} />
              Daftar Produk
            </h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {items?.map((item: any) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid var(--c-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ position: "relative", width: 56, height: 56, borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--c-surface-2)", border: "1px solid var(--c-border)", flexShrink: 0 }}>
                      {item.perfumes?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.perfumes.image_url} alt={item.perfume_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Package size={20} style={{ color: "var(--c-ink-muted)" }} />
                        </div>
                      )}
                      <div style={{ position: "absolute", bottom: 0, right: 0, background: "var(--c-gold)", color: "#000", fontSize: "0.7rem", fontWeight: 700, padding: "2px 6px", borderTopLeftRadius: "var(--r-md)" }}>
                        {item.quantity}x
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, color: "var(--c-ink)" }}>{item.perfume_name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)" }}>Ukuran: {item.size_label}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, color: "var(--c-ink)" }}>
                    {formatRupiah(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
              <div style={{ display: "flex", width: 300, justifyContent: "space-between", fontSize: "0.9rem", color: "var(--c-ink-muted)" }}>
                <span>Subtotal</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              <div style={{ display: "flex", width: 300, justifyContent: "space-between", fontSize: "0.9rem", color: "var(--c-ink-muted)" }}>
                <span>Ongkos Kirim {order.courier_name ? `(${order.courier_name})` : ''}</span>
                <span>{formatRupiah(order.shipping_cost || 0)}</span>
              </div>
              {order.unique_code > 0 && (
                <div style={{ display: "flex", width: 300, justifyContent: "space-between", fontSize: "0.9rem", color: "var(--c-ink-muted)" }}>
                  <span>Kode Unik</span>
                  <span style={{ color: "var(--c-gold)" }}>+{order.unique_code}</span>
                </div>
              )}
              <div style={{ height: 1, width: 300, background: "var(--c-border)", margin: "8px 0" }} />
              <div style={{ display: "flex", width: 300, justifyContent: "space-between", fontSize: "1.1rem", fontWeight: 600, color: "var(--c-gold)" }}>
                <span>Total Pembayaran</span>
                <span>{formatRupiah(order.total)}</span>
              </div>
            </div>
          </div>

          {customRequest && customRequest.ai_recipe && (
            <div style={{ marginTop: 24, background: "var(--c-surface-1)", padding: 24, borderRadius: "var(--r-lg)", border: "1px solid var(--c-border)", position: "relative", overflow: "hidden", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.02)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(45deg, transparent, rgba(0,0,0,0.02))", pointerEvents: "none" }}></div>
              <h3 style={{ fontSize: "1.1rem", color: "var(--c-ink)", fontWeight: 600, marginBottom: 16 }}>Resep Racikan AI (Technical Recipe)</h3>
              
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Saran Nama:</span>
                <p style={{ fontSize: "1.2rem", fontFamily: "var(--font-display)", color: "var(--c-gold)", lineHeight: 1.2, marginTop: 4 }}>{customRequest.ai_recipe?.name_suggestion}</p>
              </div>

              {customRequest.ai_recipe?.admin_recipe ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {customRequest.ai_recipe.admin_recipe.split('\n').map((line: string, i: number) => {
                    const isSeparator = line.includes('â” â” â” ') || line.includes('===');
                    if (isSeparator || !line.trim()) return null;
                    
                    const isHeader = line.includes('RACIKAN PARFUM');
                    const isTotal = line.includes('Total Volume');
                    
                    return (
                      <div key={i} style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        padding: isHeader || isTotal ? "10px 14px" : "6px 14px",
                        background: isHeader || isTotal ? "var(--c-surface-2)" : "rgba(0,0,0,0.02)",
                        borderRadius: "var(--r-md)",
                        border: "1px solid var(--c-border)",
                        fontWeight: isHeader || isTotal ? 600 : 500,
                        color: isHeader ? "var(--c-gold)" : "var(--c-ink)",
                        fontSize: "0.9rem"
                      }}>
                        <span>{line}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "16px", background: "var(--c-surface-2)", borderRadius: "var(--r-md)", border: "1px dashed var(--c-border)", color: "var(--c-ink-dim)", fontSize: "0.9rem", textAlign: "center" }}>
                  Resep teknikal tidak tersedia atau gagal digenerate.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Customer Info */}
          <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: 24 }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 20 }}>
              <User size={18} style={{ color: "var(--c-gold)" }} />
              Informasi Pelanggan
            </h2>
            <div style={{ fontSize: "0.9rem", color: "var(--c-ink)", fontWeight: 500, marginBottom: 4 }}>{order.customer_name}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 16 }}>{order.customer_phone}</div>
            
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>
              <MapPin size={16} style={{ color: "var(--c-ink-muted)", flexShrink: 0, marginTop: 2 }} />
              <div style={{ lineHeight: 1.5 }}>{order.customer_address}</div>
            </div>
          </div>

          {/* Payment Verification Block */}
          {order.payment_status === "waiting_confirmation" && order.payment_proof && (
            <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-gold)", borderRadius: "var(--r-lg)", padding: 24, boxShadow: "0 4px 20px rgba(234, 179, 8, 0.05)" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 16 }}>
                <FileImage size={18} style={{ color: "var(--c-gold)" }} />
                Verifikasi Pembayaran
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 16 }}>
                Pelanggan telah mengunggah bukti pembayaran. Silakan periksa keabsahan bukti transfer di bawah ini sebelum memproses pesanan.
              </p>
              
              <PaymentProofModal orderId={order.id.toString()} paymentProof={order.payment_proof} />
            </div>
          )}

          {/* Shipping Update Form */}
          <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: 24 }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 20 }}>
              <Truck size={18} style={{ color: "var(--c-gold)" }} />
              Status Pengiriman
            </h2>
            
            <div style={{ padding: "12px", background: "var(--glass-bg)", borderRadius: "var(--r-md)", fontSize: "0.85rem", color: "var(--c-ink)", marginBottom: 20, border: "1px solid var(--glass-border)" }}>
              {order.notes}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 12, background: "var(--c-surface-2)", borderRadius: "var(--r-md)", border: "1px solid var(--c-border)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", marginBottom: 4 }}>Metode Bayar</div>
                <div style={{ fontSize: "0.85rem", color: "var(--c-ink)", fontWeight: 600 }}>{order.payment_method || "Manual"}</div>
              </div>
              <div style={{ padding: 12, background: "var(--c-surface-2)", borderRadius: "var(--r-md)", border: "1px solid var(--c-border)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", marginBottom: 4 }}>Status Bayar</div>
                <div style={{ fontSize: "0.85rem", color: order.payment_status === "paid" ? "var(--c-teal)" : (order.payment_status === "waiting_confirmation" ? "var(--c-gold)" : "var(--c-ink-dim)"), fontWeight: 600 }}>
                  {order.payment_status === "paid" ? "Lunas" : (order.payment_status === "waiting_confirmation" ? "Dibayar (Menunggu Verifikasi)" : "Belum Dibayar")}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <SyncWebhookButton orderCode={order.order_code} />
            </div>

            {(() => {
              const bsMatch = order.notes?.match(/Biteship Order ID:\s*([a-zA-Z0-9_-]+)/i);
              const biteshipOrderId = bsMatch ? bsMatch[1] : null;

              if (biteshipOrderId) {
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ padding: 16, background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "var(--r-md)" }}>
                      <h4 style={{ fontSize: "0.95rem", color: "var(--c-ink)", marginBottom: 12, fontWeight: 600 }}>Pengiriman via Biteship</h4>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>Nomor Resi / AWB:</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink)" }}>{order.waybill_number || "Menunggu Pickup"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)" }}>Status Pengiriman:</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink)" }}>
                          {order.status === 'completed' ? 'Selesai' : (order.waybill_number ? 'Dalam Pengiriman' : 'Diproses')}
                        </span>
                      </div>
                    </div>
                    <a 
                      href={`/api/shipping/waybill?id=${biteshipOrderId}`} 
                      target="_blank" 
                      className="btn btn-primary" 
                      style={{ width: "100%", justifyContent: "center", padding: "12px", textAlign: "center", textDecoration: "none" }}
                    >
                      Cetak Label Pengiriman (Resi)
                    </a>
                  </div>
                );
              }

              return (
                <form action={updateResiStatus} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 8 }}>Nomor Resi Manual (AWB)</label>
                    <input 
                      type="text" 
                      name="waybillNumber" 
                      defaultValue={order.waybill_number || ''}
                      className="input-field" 
                      style={{ width: "100%", padding: "10px 16px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", color: "var(--c-ink)" }} 
                      placeholder="Misal: JP71829038" 
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: "100%", justifyContent: "center", padding: "12px" }}
                  >
                    Tandai Sudah Dikirim
                  </button>
                </form>
              );
            })()}
          </div>

        </div>
      </div>
    </div>
  );
}
