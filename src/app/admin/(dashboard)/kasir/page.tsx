import { createAdminClient } from "@/lib/supabase/admin";
import { formatRupiah } from "@/lib/types";
import { DollarSign, Receipt, CreditCard, Banknote, ExternalLink, Store } from "lucide-react";
import KasirFilters from "./KasirFilters";
import KasirOrdersTable from "./KasirOrdersTable";
import { PosAdminOrder } from "./KasirReceiptAdminModal";

export const dynamic = "force-dynamic";

export default async function AdminKasirPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; store?: string; payment?: string; range?: string }>;
}) {
  const params = await searchParams;
  const supabase = createAdminClient();

  const range = params.range || "today";
  const store = params.store || "all";
  const payment = params.payment || "all";
  const search = params.search?.trim() || "";

  let query = supabase
    .from("orders")
    .select(`
      id,
      order_code,
      created_at,
      customer_name,
      customer_phone,
      store_id,
      cashier_name,
      payment_method,
      payment_status,
      status,
      subtotal,
      discount,
      total,
      cash_received,
      cash_change,
      notes,
      order_items (
        id,
        perfume_name,
        size_label,
        quantity,
        price,
        subtotal
      )
    `)
    .or("cashier_name.not.is.null,order_code.ilike.%POS-%,notes.ilike.%Transaksi Kasir%")
    .order("created_at", { ascending: false });

  // Filter Store Cabang
  if (store !== "all") {
    query = query.eq("store_id", parseInt(store, 10));
  }

  // Filter Metode Bayar
  if (payment !== "all") {
    query = query.eq("payment_method", payment);
  }

  // Filter Range Waktu
  const now = new Date();
  if (range === "today") {
    // Start of today in WIB (UTC+7)
    const todayWIB = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const startOfDayWIB = new Date(
      Date.UTC(todayWIB.getUTCFullYear(), todayWIB.getUTCMonth(), todayWIB.getUTCDate(), -7, 0, 0, 0)
    );
    query = query.gte("created_at", startOfDayWIB.toISOString());
  } else if (range === "7d") {
    const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    query = query.gte("created_at", d.toISOString());
  } else if (range === "30d") {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    query = query.gte("created_at", d.toISOString());
  }

  // Filter Search
  if (search.length > 0) {
    query = query.or(
      `order_code.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,cashier_name.ilike.%${search}%`
    );
  }

  let rawOrders: any[] = [];
  try {
    const { data: qData, error: qErr } = await query.limit(50);
    if (!qErr && qData) {
      rawOrders = qData;
    } else if (qErr) {
      console.error("[AdminKasirPage] Query error:", qErr);
    }
  } catch (err) {
    console.error("[AdminKasirPage] Fatal fetch error:", err);
  }

  const orders: PosAdminOrder[] = rawOrders.map((o: any) => ({
    id: o.id,
    order_code: o.order_code,
    created_at: o.created_at,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    store_id: o.store_id || 1,
    cashier_name: o.cashier_name,
    payment_method: o.payment_method || "TUNAI",
    payment_status: o.payment_status || "paid",
    status: o.status || "completed",
    subtotal: Number(o.subtotal || 0),
    discount: Number(o.discount || 0),
    total: Number(o.total || 0),
    cash_received: o.cash_received ? Number(o.cash_received) : null,
    cash_change: o.cash_change ? Number(o.cash_change) : null,
    notes: o.notes,
    order_items: (o.order_items || []).map((it: any) => ({
      id: it.id,
      perfume_name: it.perfume_name,
      size_label: it.size_label,
      quantity: Number(it.quantity || 1),
      price: Number(it.price || 0),
      subtotal: Number(it.subtotal || 0),
    })),
  }));

  // Calculate Metrics
  const totalOmzet = orders.reduce((sum, o) => sum + o.total, 0);
  const totalStruk = orders.length;

  const tunaiOrders = orders.filter((o) => o.payment_method === "TUNAI");
  const omzetTunai = tunaiOrders.reduce((sum, o) => sum + o.total, 0);

  const nonTunaiOrders = orders.filter((o) => o.payment_method !== "TUNAI");
  const omzetNonTunai = nonTunaiOrders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Top Header & External POS Link */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              fontSize: "2rem",
              color: "var(--c-ink)",
              fontWeight: 400,
              marginBottom: 6,
            }}
          >
            Laporan & Manajemen Kasir (POS)
          </h1>
          <p style={{ color: "var(--c-ink-dim)", margin: 0, fontSize: "0.9rem" }}>
            Pantau transaksi kasir cabang, audit omzet tunai vs QRIS, dan cetak ulang nota penjualan toko.
          </p>
        </div>

        {/* Shortcut to POS Subdomain */}
        <a
          href="https://cashier.elaparfum.web.id"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            fontSize: "0.88rem",
            fontWeight: 700,
            textDecoration: "none",
            borderRadius: "var(--r-md)",
            background: "linear-gradient(135deg, var(--c-gold, #D4AF37) 0%, #B8972E 100%)",
            color: "#0B0D0C",
            boxShadow: "0 6px 20px -4px rgba(212, 175, 55, 0.4)",
          }}
        >
          <Store size={16} />
          <span>Buka Terminal Kasir</span>
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Metric Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {/* Omzet Kasir */}
        <div
          className="card"
          style={{
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            borderLeft: "4px solid var(--c-gold, #D4AF37)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--c-ink-muted)", fontWeight: 600, textTransform: "uppercase" }}>
              Total Omzet Kasir
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: "rgba(212, 175, 55, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--c-gold, #D4AF37)",
              }}
            >
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--c-ink)" }}>
            {formatRupiah(totalOmzet)}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)" }}>
            {range === "today" ? "Khusus transaksi hari ini" : `Total dari filter periode`}
          </span>
        </div>

        {/* Total Struk */}
        <div
          className="card"
          style={{
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            borderLeft: "4px solid #6366f1",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--c-ink-muted)", fontWeight: 600, textTransform: "uppercase" }}>
              Total Transaksi
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: "rgba(99, 102, 241, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6366f1",
              }}
            >
              <Receipt size={16} />
            </div>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--c-ink)" }}>
            {totalStruk} <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--c-ink-muted)" }}>Struk</span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)" }}>
            Rata-rata {totalStruk > 0 ? formatRupiah(Math.round(totalOmzet / totalStruk)) : "Rp 0"}/transaksi
          </span>
        </div>

        {/* Omzet Tunai */}
        <div
          className="card"
          style={{
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            borderLeft: "4px solid #10b981",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--c-ink-muted)", fontWeight: 600, textTransform: "uppercase" }}>
              Kas Masuk (Tunai)
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
              }}
            >
              <Banknote size={16} />
            </div>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981" }}>
            {formatRupiah(omzetTunai)}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)" }}>
            {tunaiOrders.length} transaksi tunai toko
          </span>
        </div>

        {/* Omzet QRIS / Non-Tunai */}
        <div
          className="card"
          style={{
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            borderLeft: "4px solid #3b82f6",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--c-ink-muted)", fontWeight: 600, textTransform: "uppercase" }}>
              QRIS Mayar & Transfer
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: "rgba(59, 130, 246, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#3b82f6",
              }}
            >
              <CreditCard size={16} />
            </div>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3b82f6" }}>
            {formatRupiah(omzetNonTunai)}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)" }}>
            {nonTunaiOrders.length} transaksi non-tunai
          </span>
        </div>
      </div>

      {/* Filters */}
      <KasirFilters />

      {/* Table of Orders */}
      <KasirOrdersTable orders={orders} />
    </div>
  );
}
