"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PosBillItem } from "../actions";
import { Printer, MessageCircle, PlusCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { formatRupiah } from "@/lib/types";
import { useModalFocusTrap } from "./useModalFocusTrap";

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
  const modalCardRef = useRef<HTMLDivElement>(null);
  const waNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [waNotice, setWaNotice] = useState<string | null>(null);

  const printedAt = useMemo(() => {
    const now = new Date();
    return {
      time: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      date: now.toLocaleDateString("id-ID"),
    };
  }, []);

  useModalFocusTrap(true, modalCardRef, {
    onEscape: onNewTransaction,
  });

  useEffect(() => {
    const handleF10 = (e: KeyboardEvent) => {
      if (e.key === "F10") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onNewTransaction();
      }
    };
    window.addEventListener("keydown", handleF10, true);
    return () => {
      window.removeEventListener("keydown", handleF10, true);
    };
  }, [onNewTransaction]);

  useEffect(() => {
    return () => {
      if (waNoticeTimerRef.current) clearTimeout(waNoticeTimerRef.current);
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = (customerPhone || "").replace(/\D/g, "");
    if (!cleanPhone) {
      setWaNotice("Nomor WhatsApp pelanggan belum diisi pada saat transaksi.");
      if (waNoticeTimerRef.current) clearTimeout(waNoticeTimerRef.current);
      waNoticeTimerRef.current = setTimeout(() => setWaNotice(null), 4000);
      return;
    }
    const formattedPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;

    const itemsSummary = items
      .map(
        (it, idx) =>
          `${idx + 1}. *${it.title}* (${it.quantity}x)\n   ${it.subtitle || ""}\n   Subtotal: ${formatRupiah(it.subtotal)}`
      )
      .join("\n\n");

    const text =
      `*NOTA RESMI TRANSAKSI ELA PARFUM*\n` +
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
      (paymentMethod === "TUNAI" && cashReceived !== undefined
        ? `Diterima: ${formatRupiah(cashReceived)}\nKembalian: ${formatRupiah(cashChange || 0)}\n`
        : "") +
      `--------------------------------\n` +
      `Terima kasih telah berbelanja di Ela Parfum.`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div
      className="pos-modal-overlay"
      style={{ zIndex: 250 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-receipt-modal-title"
    >
      <div
        ref={modalCardRef}
        tabIndex={-1}
        className="pos-modal-card pos-receipt-modal-card"
      >
        <div
          className="pos-receipt-header"
          style={{
            padding: "1.15rem 1.25rem",
            backgroundColor: "var(--pos-soft-success-bg)",
            borderBottom: "1px solid var(--pos-soft-success-border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <CheckCircle2 size={24} aria-hidden="true" color="var(--pos-success)" style={{ flexShrink: 0 }} />
          <div>
            <h2
              id="pos-receipt-modal-title"
              style={{
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "var(--c-ink)",
                margin: 0,
                fontFamily: "var(--font-display, serif)",
              }}
            >
              Transaksi Selesai & Lunas
            </h2>
            <span style={{ fontSize: "0.82rem", color: "var(--pos-success)", fontWeight: 600 }}>
              Nomor Nota: {orderCode}
            </span>
          </div>
        </div>

        {waNotice && (
          <div
            role="alert"
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "var(--pos-soft-danger-bg)",
              borderBottom: "1px solid var(--pos-soft-danger-border)",
              color: "var(--pos-danger)",
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>{waNotice}</span>
          </div>
        )}

        <div className="pos-receipt-scroll">
          <div
            id="pos-receipt-print"
            style={{
              width: "100%",
              maxWidth: "340px",
              backgroundColor: "#FFFFFF",
              color: "#000000",
              padding: "1.5rem 1.25rem 2rem",
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: "12px",
              lineHeight: 1.45,
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              margin: "0 auto 1rem",
              flexShrink: 0,
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <div style={{ fontWeight: 900, fontSize: "16px", letterSpacing: "1px" }}>ELA PARFUM</div>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Artisan Perfumery & Custom Refill
              </div>
              <div style={{ fontSize: "10px", marginTop: "4px" }}>Cabang {storeName}</div>
              <div style={{ fontSize: "9px", color: "#333", maxWidth: "240px", margin: "2px auto 0" }}>
                {storeAddress}
              </div>
            </div>

            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

            <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
              <span>No: {orderCode}</span>
              <span>{printedAt.time} WIB</span>
            </div>
            <div style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
              <span>Kasir: {cashierName}</span>
              <span>{printedAt.date}</span>
            </div>
            <div style={{ fontSize: "10px" }}>Cust: {customerName || "Customer Toko"}</div>

            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {items.map((it, idx) => (
                <div key={idx}>
                  <div style={{ fontWeight: 700, fontSize: "11px" }}>{it.title}</div>
                  {it.subtitle && <div style={{ fontSize: "9px", color: "#444" }}>{it.subtitle}</div>}
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
                  <span>{formatRupiah(cashReceived !== undefined ? cashReceived : total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span>Kembali:</span>
                  <span style={{ fontWeight: 700 }}>{formatRupiah(cashChange || 0)}</span>
                </div>
              </>
            )}

            <div style={{ borderTop: "1px dashed #000", margin: "12px 0 8px" }} />

            <div style={{ textAlign: "center", fontSize: "9px", color: "#333" }}>
              <div>Terima kasih atas kunjungan Anda</div>
              <div>Barang yang dibeli tidak dapat ditukar</div>
              <div style={{ fontWeight: 700, marginTop: "4px" }}>www.elaparfum.web.id</div>
            </div>
          </div>
        </div>

        <div className="pos-receipt-actions">
          <div className="pos-receipt-actions-grid">
            <button
              type="button"
              onClick={handlePrint}
              className="pos-btn-secondary"
              style={{
                padding: "0.7rem 1rem",
                fontSize: "0.85rem",
              }}
            >
              <Printer size={16} aria-hidden="true" />
              <span>Cetak Thermal</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="pos-wa-btn"
            >
              <MessageCircle size={16} aria-hidden="true" />
              <span>Struk WhatsApp</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onNewTransaction}
            className="pos-btn-primary"
            style={{
              minHeight: "48px",
              padding: "0.85rem",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "0.95rem",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <PlusCircle size={18} aria-hidden="true" />
            <span>
              Transaksi Baru<span className="pos-kbd-hint"> (F10)</span>
            </span>
          </button>
        </div>
      </div>

      {/* Preserve 80mm thermal print isolation */}
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            background: #ffffff !important;
          }
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
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 2mm 3mm 8mm 3mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>
    </div>
  );
}
