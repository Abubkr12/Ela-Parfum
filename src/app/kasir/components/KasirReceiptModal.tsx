"use client";

import React, { useRef, useState } from "react";
import { PosBillItem } from "../actions";
import { Printer, MessageCircle, PlusCircle, CheckCircle2, Store, AlertCircle } from "lucide-react";
import { formatRupiah } from "@/lib/types";

interface KasirReceiptModalProps {
  orderId: number;
  orderCode: string;
  storeName: string;
  storeAddress: string;
  cashierName: string;
  customerName: string;
  customerPhone?: string;
  paymentMethod: string;
  items: PosBillItem[];
  subtotal: number;
  discount: number;
  total: number;
  cashReceived?: number;
  cashChange?: number;
  onNewTransaction: () => void;
}

export default function KasirReceiptModal({
  orderCode,
  storeName,
  storeAddress,
  cashierName,
  customerName,
  customerPhone,
  paymentMethod,
  items,
  subtotal,
  discount,
  total,
  cashReceived,
  cashChange,
  onNewTransaction,
}: KasirReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [waNotice, setWaNotice] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = (customerPhone || "").replace(/\D/g, "");
    if (!cleanPhone) {
      setWaNotice("Nomor WhatsApp pelanggan belum diisi pada saat transaksi.");
      setTimeout(() => setWaNotice(null), 4000);
      return;
    }
    const formattedPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;

    const itemsSummary = items
      .map((it, idx) => `${idx + 1}. *${it.title}* (${it.quantity}x)\n   ${it.subtitle || ""}\n   Subtotal: ${formatRupiah(it.subtotal)}`)
      .join("\n\n");

    const text = `*NOTA RESMI TRANSAKSI ELA PARFUM*\n` +
      `No. Nota: ${orderCode}\n` +
      `Cabang: ${storeName}\n` +
      `Kasir: ${cashierName}\n` +
      `Pelanggan: ${customerName || "Customer Toko"}\n` +
      `--------------------------------\n` +
      `${itemsSummary}\n` +
      `--------------------------------\n` +
      `Subtotal: ${formatRupiah(subtotal)}\n` +
      (discount > 0 ? `Diskon: -${formatRupiah(discount)}\n` : "") +
      `*TOTAL: ${formatRupiah(total)}*\n` +
      `Metode Bayar: ${paymentMethod}\n` +
      (paymentMethod === "TUNAI" && cashReceived ? `Diterima: ${formatRupiah(cashReceived)}\nKembalian: ${formatRupiah(cashChange || 0)}\n` : "") +
      `--------------------------------\n` +
      `Terima kasih telah berbelanja di Ela Parfum! ✨`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 250,
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "#121614",
          border: "1px solid rgba(212, 175, 55, 0.35)",
          borderRadius: "22px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.9)",
          color: "#F3F4F6",
        }}
      >
        {/* Screen Header */}
        <div
          style={{
            padding: "1.25rem",
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            borderBottom: "1px solid rgba(16, 185, 129, 0.25)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <CheckCircle2 size={24} color="#10B981" />
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10B981", margin: 0 }}>
              Transaksi Selesai & Lunas
            </h3>
            <span style={{ fontSize: "0.8rem", color: "#A7F3D0" }}>
              Nomor Nota: {orderCode}
            </span>
          </div>
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

        {/* Scrollable Receipt Preview */}
        <div
          style={{
            padding: "1.25rem",
            maxHeight: "55vh",
            overflowY: "auto",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {/* Paper Thermal Receipt Simulator */}
          <div
            id="pos-receipt-print"
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
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Artisan Perfumery & Custom Refill</div>
              <div style={{ fontSize: "10px", marginTop: "4px" }}>Cabang {storeName}</div>
              <div style={{ fontSize: "9px", color: "#333", maxWidth: "240px", margin: "2px auto 0" }}>{storeAddress}</div>
            </div>

            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

            {/* Meta Info */}
            <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
              <span>No: {orderCode}</span>
              <span>{new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</span>
            </div>
            <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
              <span>Kasir: {cashierName}</span>
              <span>{new Date().toLocaleDateString("id-ID")}</span>
            </div>
            <div style={{ fontSize: "10px" }}>
              Cust: {customerName || "Customer Toko"}
            </div>

            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {items.map((it, idx) => (
                <div key={idx}>
                  <div style={{ fontWeight: 700, fontSize: "11px" }}>{it.title}</div>
                  {it.subtitle && (
                    <div style={{ fontSize: "9px", color: "#444" }}>{it.subtitle}</div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span>{it.quantity} x {formatRupiah(it.price)}</span>
                    <span style={{ fontWeight: 700 }}>{formatRupiah(it.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

            {/* Total Section */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span>Subtotal:</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                <span>Diskon:</span>
                <span>-{formatRupiah(discount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 900, marginTop: "4px" }}>
              <span>TOTAL:</span>
              <span>{formatRupiah(total)}</span>
            </div>

            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span>Metode:</span>
              <span style={{ fontWeight: 700 }}>{paymentMethod}</span>
            </div>
            {paymentMethod === "TUNAI" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span>Diterima:</span>
                  <span>{formatRupiah(cashReceived || total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span>Kembali:</span>
                  <span style={{ fontWeight: 700 }}>{formatRupiah(cashChange || 0)}</span>
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

        {/* Action Buttons */}
        <div
          style={{
            padding: "1.25rem",
            backgroundColor: "#0A0D0C",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
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
              <span>Cetak Thermal</span>
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
              <span>Struk WhatsApp</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onNewTransaction}
            style={{
              padding: "0.9rem",
              borderRadius: "12px",
              background: "linear-gradient(135deg, var(--c-gold, #D4AF37) 0%, #B8972E 100%)",
              border: "none",
              color: "#0B0D0C",
              fontWeight: 800,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 6px 20px -4px rgba(212, 175, 55, 0.4)",
            }}
          >
            <PlusCircle size={18} />
            <span>Transaksi Baru (F10)</span>
          </button>
        </div>
      </div>

      {/* Global CSS for Print Media */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #pos-receipt-print,
          #pos-receipt-print * {
            visibility: visible;
          }
          #pos-receipt-print {
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
