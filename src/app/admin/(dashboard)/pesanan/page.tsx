import { createAdminClient } from "@/lib/supabase/admin";
import { formatRupiah } from "@/lib/types";
import Link from "next/link";
import { Eye, Clock, CheckCircle2, Package, Truck, XCircle, Sparkles, Building2 } from "lucide-react";
import OrderFilters from "./OrderFilters";

function getPaymentBadge(order: any) {
  const isPaid = order.payment_status === "paid" || order.status === "paid";

  if (isPaid) {
    const method = order.payment_method?.toLowerCase().includes("tunai") ? "Tunai" : "QRIS";
    return (
      <span style={{ padding: "4px 8px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.12)", color: "#10b981", fontSize: "0.78rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
        <CheckCircle2 size={12} /> Lunas ({method})
      </span>
    );
  }

  if (order.payment_status === "waiting_confirmation" || (order.payment_proof && order.payment_proof.startsWith("http"))) {
    return (
      <span style={{ padding: "4px 8px", borderRadius: "12px", background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", fontSize: "0.78rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Clock size={12} /> Verifikasi
      </span>
    );
  }

  return (
    <span style={{ padding: "4px 8px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", fontSize: "0.78rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Clock size={12} /> Belum Bayar
    </span>
  );
}

function getFulfillmentBadge(order: any) {
  const isPickup = order.fulfillment_type === "pickup";
  const status = order.status;

  if (status === "cancelled") {
    return (
      <span style={{ padding: "4px 8px", borderRadius: "12px", background: "rgba(225, 29, 72, 0.12)", color: "#e11d48", fontSize: "0.78rem", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
        <XCircle size={12} /> Dibatalkan
      </span>
    );
  }

  if (isPickup) {
    if (status === "completed") {
      return (
        <span style={{ padding: "4px 8px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.12)", color: "#10b981", fontSize: "0.78rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <CheckCircle2 size={12} /> Sudah Diambil
        </span>
      );
    }
    if (status === "ready_for_pickup") {
      return (
        <span style={{ padding: "4px 8px", borderRadius: "12px", background: "rgba(234, 179, 8, 0.15)", color: "var(--c-gold)", border: "1px solid rgba(234, 179, 8, 0.3)", fontSize: "0.78rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Sparkles size={12} /> Siap Diambil di Toko
        </span>
      );
    }
    return (
      <span style={{ padding: "4px 8px", borderRadius: "12px", background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", fontSize: "0.78rem", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Package size={12} /> Menyiapkan Pesanan
      </span>
    );
  }

  // Delivery Kurir
  if (status === "completed") {
    return (
      <span style={{ padding: "4px 8px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.12)", color: "#10b981", fontSize: "0.78rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
        <CheckCircle2 size={12} /> Terkirim
      </span>
    );
  }
  if (status === "shipped") {
    return (
      <span style={{ padding: "4px 8px", borderRadius: "12px", background: "rgba(139, 92, 246, 0.12)", color: "#8b5cf6", fontSize: "0.78rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Truck size={12} /> Dalam Pengiriman
      </span>
    );
  }
  return (
    <span style={{ padding: "4px 8px", borderRadius: "12px", background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", fontSize: "0.78rem", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Package size={12} /> Diproses / Siap Kirim
    </span>
  );
}

function getStoreBadge(order: any) {
  const storeId = order.store_id || 2;
  const isPickup = order.fulfillment_type === "pickup";

  let storeName = "Rawa Belong";
  let badgeColor = "#6366f1";
  let badgeBg = "rgba(99, 102, 241, 0.1)";

  if (storeId === 1) {
    storeName = "Condet";
    badgeColor = "#06b6d4";
    badgeBg = "rgba(6, 182, 212, 0.1)";
  } else if (storeId === 3) {
    storeName = "Tangerang";
    badgeColor = "#f59e0b";
    badgeBg = "rgba(245, 158, 11, 0.1)";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ padding: "3px 8px", borderRadius: "6px", background: badgeBg, color: badgeColor, fontSize: "0.75rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, width: "fit-content" }}>
        <Building2 size={12} /> {storeName}
      </span>
      <span style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
        {isPickup ? (
          <><Package size={11} style={{ color: "var(--c-gold)" }} /> Ambil di Toko</>
        ) : (
          <><Truck size={11} /> {order.courier_name?.split(" - ")[0] || "Kurir"}</>
        )}
      </span>
    </div>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; store?: string; fulfillment?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = createAdminClient();

  let query = supabase.from("orders").select("*").order("created_at", { ascending: false });

  if (params.search && params.search.trim().length > 0) {
    const s = params.search.trim();
    query = query.or(`order_code.ilike.%${s}%,customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`);
  }

  if (params.store && params.store !== "all") {
    query = query.eq("store_id", parseInt(params.store, 10));
  }

  if (params.fulfillment && params.fulfillment !== "all") {
    query = query.eq("fulfillment_type", params.fulfillment);
  }

  if (params.status && params.status !== "all") {
    if (params.status === "unpaid") {
      query = query.eq("payment_status", "unpaid");
    } else if (params.status === "ready_for_pickup") {
      query = query.eq("status", "ready_for_pickup");
    } else if (params.status === "processing") {
      query = query.in("status", ["processing", "paid", "confirmed", "pending_verification"]);
    } else if (params.status === "shipped") {
      query = query.eq("status", "shipped");
    } else if (params.status === "completed") {
      query = query.eq("status", "completed");
    } else if (params.status === "cancelled") {
      query = query.eq("status", "cancelled");
    }
  }

  const { data: orders } = await query;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--c-ink)", fontWeight: 400, marginBottom: 8 }}>
          Daftar Pesanan
        </h1>
        <p style={{ color: "var(--c-ink-dim)" }}>
          Kelola pesanan antar-cabang, proses pengambilan di toko (kasir), dan pengiriman ekspedisi kurir.
        </p>
      </div>

      <OrderFilters />

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ background: "var(--c-surface-2)", borderBottom: "1px solid var(--c-border)", textAlign: "left" }}>
              <th style={{ padding: "14px 16px", color: "var(--c-ink-dim)", fontWeight: 600 }}>ID Pesanan</th>
              <th style={{ padding: "14px 16px", color: "var(--c-ink-dim)", fontWeight: 600 }}>Pelanggan</th>
              <th style={{ padding: "14px 16px", color: "var(--c-ink-dim)", fontWeight: 600 }}>Cabang & Metode</th>
              <th style={{ padding: "14px 16px", color: "var(--c-ink-dim)", fontWeight: 600 }}>Pembayaran</th>
              <th style={{ padding: "14px 16px", color: "var(--c-ink-dim)", fontWeight: 600 }}>Status Barang</th>
              <th style={{ padding: "14px 16px", color: "var(--c-ink-dim)", fontWeight: 600 }}>Total</th>
              <th style={{ padding: "14px 16px", color: "var(--c-ink-dim)", fontWeight: 600, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((order) => (
              <tr key={order.id} style={{ borderBottom: "1px solid var(--c-border)" }}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontFamily: "monospace", color: "var(--c-gold)", fontWeight: 600 }}>{order.order_code}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)" }}>
                    {new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontWeight: 500, color: "var(--c-ink)" }}>{order.customer_name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--c-ink-muted)" }}>{order.customer_phone}</div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {getStoreBadge(order)}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {getPaymentBadge(order)}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {getFulfillmentBadge(order)}
                </td>
                <td style={{ padding: "14px 16px", color: "var(--c-ink)", fontWeight: 600 }}>
                  {formatRupiah(order.total)}
                </td>
                <td style={{ padding: "14px 16px", textAlign: "right" }}>
                  <Link href={`/admin/pesanan/${order.id}`} className="btn btn-outline" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                    <Eye size={14} /> Detail
                  </Link>
                </td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--c-ink-dim)", fontSize: "0.9rem" }}>
                  Tidak ada pesanan yang sesuai dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
