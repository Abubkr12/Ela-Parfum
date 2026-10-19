"use client";

import React, { useRef, useState } from "react";
import { Printer, MessageCircle, X, Store, CheckCircle2, AlertCircle } from "lucide-react";
import { formatRupiah } from "@/lib/types";

export interface PosAdminOrder {
  id: number;
  order_code: string;
  created_at: string;
  customer_name: string;
  customer_phone?: string | null;
  store_id: number;
  cashier_name?: string | null;
  payment_method: string;
  payment_status: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  cash_received?: number | null;
  cash_change?: number | null;
  notes?: string | null;
  order_items?: {
    id: number;
    perfume_name: string;
    size_label?: string | null;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
}

const STORE_CONFIG: Record<number, { name: string; address: string }> = {
  1: { name: "Condet", address: "Jl. Raya Condet No. 12, Jakarta Timur" },
  2: { name: "Rawa Belong", address: "Jl. Rawa Belong No. 45, Kebon Jeruk, Jakarta Barat" },
  3: { name: "Tangerang", address: "Jl. Kisamaun No. 88, Sukasari, Tangerang" },
};

interface KasirReceiptAdminModalProps {
  order: PosAdminOrder;
  onClose: () => void;
}

export default function KasirReceiptAdminModal({ order, onClose }: KasirReceiptAdminModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [waNotice, setWaNotice] = useState<string | null>(null);

  const storeInfo = STORE_CONFIG[order.store_id] || {
    name: `Cabang #${order.store_id}`,
    address: "Ela Parfum Official Store",
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = (order.customer_phone || "").replace(/\D/g, "");
    if (!cleanPhone) {
      setWaNotice("Nomor WhatsApp pelanggan tidak tercatat di transaksi ini.");
      setTimeout(() => setWaNotice(null), 4000);
      return;
    }
    const formattedPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;

    const itemsSummary = (order.order_items || [])
      .map(
        (it, idx) =>
          `${idx + 1}. *${it.perfume_name}* (${it.quantity}x)\n   Varian: ${it.size_label || "-"}\n   Subtotal: ${formatRupiah(it.subtotal)}`
      )
      .join("\n\n");

    const text =
      `*SALINAN NOTA RESMI TRANSAKSI ELA PARFUM*\n` +
      `No. Nota: ${order.order_code}\n` +
      `Cabang: ${storeInfo.name}\n` +
      `Kasir: ${order.cashier_name || "Staf Toko"}\n` +
      `Pelanggan: ${order.customer_name || "Customer Toko"}\n` +
      `--------------------------------\n` +
      `${itemsSummary}\n` +
      `--------------------------------\n` +
      `Subtotal: ${formatRupiah(order.subtotal)}\n` +
      (order.discount > 0 ? `Diskon: -${formatRupiah(order.discount)}\n` : "") +
      `*TOTAL: ${formatRupiah(order.total)}*\n` +
      `Metode Bayar: ${order.payment_method}\n` +
      (order.payment_method === "TUNAI" && order.cash_received
        ? `Diterima: ${formatRupiah(order.cash_received)}\nKembalian: ${formatRupiah(order.cash_change || 0)}\n`
        : "") +
      `--------------------------------\n` +
      `Terima kasih telah berbelanja di Ela Parfum!`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "var(--c-surface-1, #121614)",
          border: "1px solid rgba(212, 175, 55, 0.35)",
          borderRadius: "22px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.9)",
          color: "var(--c-ink, #F3F4F6)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.1rem 1.25rem",
            backgroundColor: "rgba(212, 175, 55, 0.08)",
            borderBottom: "1px solid rgba(212, 175, 55, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: "rgba(212, 175, 55, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--c-gold, #D4AF37)",
              }}
            >
              <Store size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--c-gold, #D4AF37)" }}>
                Detail Transaksi Kasir
              </h3>
              <span style={{ fontSize: "0.78rem", color: "var(--c-ink-dim, #9CA3AF)" }}>
                Nota: <strong style={{ fontFamily: "monospace", color: "#FFFFFF" }}>{order.order_code}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9CA3AF",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* WhatsApp Notice Banner */}
        {waNotice && (
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              borderBottom: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#FCA5A5",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, color: "#EF4444" }} />
            <span>{waNotice}</span>
          </div>
        )}

        {/* Receipt Container */}
        <div
          style={{
            padding: "1.25rem",
            maxHeight: "56vh",
            overflowY: "auto",
            display: "flex",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.25)",
          }}
        >
          {/* Thermal Slip Simulation */}
          <div
            id="admin-receipt-print"
            ref={receiptRef}
            style={{
              width: "100%",
              maxWidth: "340px",
              backgroundColor: "#FFFFFF",
              color: "#000000",
              padding: "1.25rem 1rem",
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: "12px",
              lineHeight: 1.4,
              borderRadius: "4px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
            }}
          >
            {/* Store Header */}
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <div style={{ fontWeight: 900, fontSize: "16px", letterSpacing: "1px" }}>ELA PARFUM</div>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Artisan Perfumery & Custom Refill
              </div>
              <div style={{ fontSize: "10px", marginTop: "4px", fontWeight: 700 }}>Cabang {storeInfo.name}</div>
              <div style={{ fontSize: "9px", color: "#333", maxWidth: "240px", margin: "2px auto 0" }}>
                {storeInfo.address}
              </div>
            </div>

            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

            {/* Meta Info */}
            <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
              <span>No: {order.order_code}</span>
              <span>
                {new Date(order.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
              </span>
            </div>
            <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
              <span>Kasir: {order.cashier_name || "Staf Toko"}</span>
              <span>
                {new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <div style={{ fontSize: "10px" }}>
              Cust: {order.customer_name || "Customer Toko"} {order.customer_phone ? `(${order.customer_phone})` : ""}
            </div>

            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {(order.order_items || []).map((it, idx) => (
                <div key={idx}>
                  <div style={{ fontWeight: 700, fontSize: "11px" }}>{it.perfume_name}</div>
                  {it.size_label && <div style={{ fontSize: "9px", color: "#444" }}>{it.size_label}</div>}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span>
                      {it.quantity} x {formatRupiah(it.price)}
                    </span>
                    <span style={{ fontWeight: 700 }}>{formatRupiah(it.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

            {/* Total Section */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span>Subtotal:</span>
              <span>{formatRupiah(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                <span>Diskon:</span>
                <span>-{formatRupiah(order.discount)}</span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "14px",
                fontWeight: 900,
                marginTop: "4px",
              }}
            >
              <span>TOTAL:</span>
              <span>{formatRupiah(order.total)}</span>
            </div>

            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span>Metode:</span>
              <span style={{ fontWeight: 700 }}>{order.payment_method}</span>
            </div>
            {order.payment_method === "TUNAI" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span>Diterima:</span>
                  <span>{formatRupiah(order.cash_received || order.total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span>Kembali:</span>
                  <span style={{ fontWeight: 700 }}>{formatRupiah(order.cash_change || 0)}</span>
                </div>
              </>
            )}

            <div style={{ borderTop: "1px dashed #000", margin: "12px 0 8px" }} />

            {/* Footer */}
            <div style={{ textAlign: "center", fontSize: "9px", color: "#333" }}>
              <div>Terima kasih atas kunjungan Anda</div>
              <div>Barang yang dibeli tidak dapat ditukar</div>
              <div style={{ fontWeight: 700, marginTop: "4px" }}>www.elaparfum.web.id</div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div
          style={{
            padding: "1.1rem 1.25rem",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: "0.8rem",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Printer size={16} />
            <span>Cetak Ulang</span>
          </button>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            style={{
              padding: "0.8rem",
              borderRadius: "12px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              color: "#10B981",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <MessageCircle size={16} />
            <span>Kirim WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Global CSS for Print Media */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #admin-receipt-print,
          #admin-receipt-print * {
            visibility: visible;
          }
          #admin-receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
