"use client";

import React, { useState } from "react";
import { formatRupiah } from "@/lib/types";
import { Eye, CheckCircle2, Clock, Building2, User, Receipt, Copy, Check } from "lucide-react";
import KasirReceiptAdminModal, { PosAdminOrder } from "./KasirReceiptAdminModal";

interface KasirOrdersTableProps {
  orders: PosAdminOrder[];
}

function getStoreBadge(storeId: number) {
  let name = "Rawa Belong";
  let color = "#6366f1";
  let bg = "rgba(99, 102, 241, 0.1)";

  if (storeId === 1) {
    name = "Condet";
    color = "#06b6d4";
    bg = "rgba(6, 182, 212, 0.1)";
  } else if (storeId === 3) {
    name = "Tangerang";
    color = "var(--c-gold, #D4AF37)";
    bg = "rgba(212, 175, 55, 0.12)";
  }

  return (
    <span
      style={{
        padding: "3px 8px",
        borderRadius: "6px",
        background: bg,
        color: color,
        fontSize: "0.75rem",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        width: "fit-content",
      }}
    >
      <Building2 size={12} /> {name}
    </span>
  );
}

function getPaymentBadge(order: PosAdminOrder) {
  const isPaid = order.payment_status === "paid" || order.status === "completed";
  const method = order.payment_method || "TUNAI";

  if (isPaid) {
    return (
      <span
        style={{
          padding: "4px 8px",
          borderRadius: "12px",
          background: "rgba(16, 185, 129, 0.12)",
          color: "#10b981",
          fontSize: "0.78rem",
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <CheckCircle2 size={12} /> Lunas ({method})
      </span>
    );
  }

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: "12px",
        background: "rgba(245, 158, 11, 0.12)",
        color: "#f59e0b",
        fontSize: "0.78rem",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <Clock size={12} /> Menunggu ({method})
    </span>
  );
}

export default function KasirOrdersTable({ orders }: KasirOrdersTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<PosAdminOrder | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ background: "var(--c-surface-2)", borderBottom: "1px solid var(--c-border)", textAlign: "left" }}>
              <th style={{ padding: "14px 16px", color: "var(--c-ink-dim)", fontWeight: 600 }}>No. Nota POS</th>
              <th style={{ padding: "14px 16px", color: "var(--c-ink-dim)", fontWeight: 600 }}>Cabang & Kasir</th>
              <th style={{ padding: "14px 16px", color: "var(--c-ink-dim)", fontWeight: 600 }}>Pelanggan</th>
              <th style={{ padding: "14px 16px", color: "var(--c-ink-dim)", fontWeight: 600 }}>Item Belanja</th>
              <th style={{ padding: "14px 16px", color: "var(--c-ink-dim)", fontWeight: 600 }}>Pembayaran</th>
              <th style={{ padding: "14px 16px", color: "var(--c-ink-dim)", fontWeight: 600 }}>Total</th>
              <th style={{ padding: "14px 16px", color: "var(--c-ink-dim)", fontWeight: 600, textAlign: "right" }}>
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const items = order.order_items || [];
              const itemCount = items.reduce((sum, it) => sum + (it.quantity || 1), 0);
              const firstItem = items[0]?.perfume_name || "Produk Kasir";

              return (
                <tr
                  key={order.id}
                  style={{
                    borderBottom: "1px solid var(--c-border)",
                    transition: "background-color 0.15s",
                  }}
                >
                  {/* No. Nota */}
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: "monospace", color: "var(--c-gold)", fontWeight: 700, fontSize: "0.9rem" }}>
                        {order.order_code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(order.order_code)}
                        title="Salin No Nota"
                        style={{
                          background: "none",
                          border: "none",
                          padding: 2,
                          color: copiedCode === order.order_code ? "#10b981" : "var(--c-ink-muted)",
                          cursor: "pointer",
                        }}
                      >
                        {copiedCode === order.order_code ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)", marginTop: 2 }}>
                      {new Date(order.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      WIB
                    </div>
                  </td>

                  {/* Cabang & Kasir */}
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {getStoreBadge(order.store_id)}
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--c-ink-dim)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <User size={11} /> {order.cashier_name || "Staf Toko"}
                      </div>
                    </div>
                  </td>

                  {/* Pelanggan */}
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 500, color: "var(--c-ink)" }}>{order.customer_name || "Customer Toko"}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--c-ink-muted)" }}>
                      {order.customer_phone || "-"}
                    </div>
                  </td>

                  {/* Item Belanja */}
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--c-ink)", fontWeight: 500 }}>
                      {firstItem}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--c-ink-muted)" }}>
                      {itemCount} item {items.length > 1 ? `(${items.length} varian)` : ""}
                    </div>
                  </td>

                  {/* Pembayaran */}
                  <td style={{ padding: "14px 16px" }}>{getPaymentBadge(order)}</td>

                  {/* Total */}
                  <td style={{ padding: "14px 16px", color: "var(--c-ink)", fontWeight: 700 }}>
                    {formatRupiah(order.total)}
                  </td>

                  {/* Aksi */}
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="btn btn-outline"
                      style={{
                        padding: "6px 12px",
                        fontSize: "0.8rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <Receipt size={14} style={{ color: "var(--c-gold)" }} />
                      <span>Lihat Struk</span>
                    </button>
                  </td>
                </tr>
              );
            })}

            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: "48px 16px",
                    textAlign: "center",
                    color: "var(--c-ink-dim)",
                    fontSize: "0.9rem",
                  }}
                >
                  Tidak ada transaksi kasir yang sesuai dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Detail & Print Struk */}
      {selectedOrder && (
        <KasirReceiptAdminModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </>
  );
}
