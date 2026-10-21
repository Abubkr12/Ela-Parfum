"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PosTransactionPayload,
  completePosCashTransaction,
  createPosQrisOrder,
  checkPosOrderStatus,
} from "../actions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  X,
  Banknote,
  QrCode,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { formatRupiah } from "@/lib/types";

interface KasirPaymentModalProps {
  payload: PosTransactionPayload;
  onClose: () => void;
  onPaymentSuccess: (result: {
    orderId: number;
    orderCode: string;
    paymentMethod: string;
    cashReceived?: number;
    cashChange?: number;
  }) => void;
}

export default function KasirPaymentModal({
  payload,
  onClose,
  onPaymentSuccess,
}: KasirPaymentModalProps) {
  const [activeTab, setActiveTab] = useState<"CASH" | "QRIS" | "TRANSFER">("CASH");

  // Cash State
  const [cashReceived, setCashReceived] = useState<number>(payload.total);
  const [cashSubmitting, setCashSubmitting] = useState<boolean>(false);
  const [cashError, setCashError] = useState<string | null>(null);

  // QRIS State
  const [qrisLoading, setQrisLoading] = useState<boolean>(false);
  const [qrisData, setQrisData] = useState<{
    orderId: number;
    orderCode: string;
    qrDataUrl: string;
    qrString: string;
    expiresAt: string;
    mayarLink?: string;
    isSandbox?: boolean;
  } | null>(null);
  const [qrisError, setQrisError] = useState<string | null>(null);
  const [qrisPaid, setQrisPaid] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(900); // 15 mins
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [simulatingPayment, setSimulatingPayment] = useState<boolean>(false);

  // Transfer State
  const [transferRef, setTransferRef] = useState<string>("");
  const [transferSubmitting, setTransferSubmitting] = useState<boolean>(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const supabase = createClient();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Kalkulasi Kembalian Tunai
  const cashChange = Math.max(0, cashReceived - payload.total);
  const isCashSufficient = cashReceived >= payload.total;

  // Auto-generate QRIS saat tab QRIS pertama kali dipilih
  useEffect(() => {
    if (activeTab === "QRIS" && !qrisData && !qrisLoading) {
      handleGenerateQris();
    }
  }, [activeTab]);

  // Timer Countdown 15 Menit untuk QRIS
  useEffect(() => {
    if (!qrisData || qrisPaid) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [qrisData, qrisPaid]);

  // Listener Realtime Supabase + Polling Fallback untuk Deteksi Lunas QRIS
  useEffect(() => {
    if (!qrisData || qrisPaid) return;

    const orderId = qrisData.orderId;

    // 1. Polling fallback setiap 2.5 detik
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/kasir/order?orderId=${orderId}&storeId=${payload.storeId}`);
        const data = await res.json();
        if (data.isPaid) {
          handleQrisSuccess(orderId, data.orderCode || qrisData.orderCode);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2500);

    // 2. Realtime listener Supabase
    const channel = supabase
      .channel(`pos-order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (change: any) => {
          const updated = change.new as any;
          if (updated?.payment_status === "paid" || updated?.status === "paid" || updated?.status === "completed") {
            handleQrisSuccess(orderId, qrisData.orderCode);
          }
        }
      )
      .subscribe();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      supabase.removeChannel(channel);
    };
  }, [qrisData, qrisPaid, payload.storeId]);

  const handleQrisSuccess = (orderId: number, orderCode: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setQrisPaid(true);

    // Bunyi audio beep opsional jika didukung browser
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {}

    setTimeout(() => {
      onPaymentSuccess({
        orderId,
        orderCode,
        paymentMethod: "QRIS",
      });
    }, 1200);
  };

  // Generate QRIS via Action
  const handleGenerateQris = async () => {
    setQrisLoading(true);
    setQrisError(null);
    try {
      const res = await fetch("/api/kasir/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_qris",
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setQrisError(data.error || "Gagal membuat QRIS Mayar.");
      } else {
        setQrisData({
          orderId: data.orderId,
          orderCode: data.orderCode,
          qrDataUrl: data.qrDataUrl,
          qrString: data.qrString || "",
          expiresAt: data.expiresAt || new Date(Date.now() + 900000).toISOString(),
          isSandbox: data.isSandbox,
        });
        setSecondsLeft(900);
      }
    } catch (err: any) {
      setQrisError(err.message || "Gagal menghubungi server pembayaran.");
    } finally {
      setQrisLoading(false);
    }
  };

  // Cek Status QRIS Manual
  const handleManualCheckStatus = async () => {
    if (!qrisData) return;
    setCheckingStatus(true);
    try {
      const res = await fetch(`/api/kasir/order?orderId=${qrisData.orderId}&storeId=${payload.storeId}`);
      const data = await res.json();
      if (data.isPaid) {
        toast.success("Pembayaran QRIS berhasil dikonfirmasi!");
        handleQrisSuccess(qrisData.orderId, data.orderCode || qrisData.orderCode);
      } else {
        toast.info("Pembayaran belum terdeteksi. Silakan coba beberapa saat lagi.");
      }
    } catch {
      toast.error("Gagal memeriksa status pembayaran.");
    } finally {
      setCheckingStatus(false);
    }
  };

  // Simulasi Bayar Lunas (Khusus Mode Sandbox Testing)
  const handleSimulateSandboxPayment = async () => {
    if (!qrisData) return;
    setSimulatingPayment(true);
    try {
      const res = await fetch("/api/kasir/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simulate_sandbox_pay",
          payload: {
            orderId: qrisData.orderId,
            storeId: payload.storeId,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Gagal mensimulasikan pembayaran.");
      } else {
        toast.success("Simulasi berhasil! Pembayaran QRIS dikonfirmasi lunas.");
        handleQrisSuccess(qrisData.orderId, data.orderCode || qrisData.orderCode);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menghubungi server.");
    } finally {
      setSimulatingPayment(false);
    }
  };

  // Submit Tunai
  const handleSubmitCash = async () => {
    if (!isCashSufficient) {
      setCashError("Nominal uang yang diterima kurang dari total tagihan.");
      return;
    }

    setCashSubmitting(true);
    setCashError(null);
    try {
      const res = await fetch("/api/kasir/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_cash",
          payload: {
            ...payload,
            cashReceived,
            cashChange,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCashError(data.error || "Gagal memproses transaksi tunai.");
        setCashSubmitting(false);
      } else {
        onPaymentSuccess({
          orderId: data.orderId,
          orderCode: data.orderCode,
          paymentMethod: "TUNAI",
          cashReceived,
          cashChange,
        });
      }
    } catch (err: any) {
      setCashError(err.message || "Terjadi kesalahan internal.");
      setCashSubmitting(false);
    }
  };

  // Submit Transfer
  const handleSubmitTransfer = async () => {
    setTransferSubmitting(true);
    setTransferError(null);
    try {
      const res = await fetch("/api/kasir/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_transfer",
          payload: {
            ...payload,
            transferRef,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setTransferError(data.error || "Gagal memproses transaksi transfer.");
        setTransferSubmitting(false);
      } else {
        onPaymentSuccess({
          orderId: data.orderId,
          orderCode: data.orderCode,
          paymentMethod: "TRANSFER",
        });
      }
    } catch (err: any) {
      setTransferError(err.message || "Terjadi kesalahan internal.");
      setTransferSubmitting(false);
    }
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 220,
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          backgroundColor: "var(--c-surface-1, #111614)",
          border: "1px solid var(--c-border-mid)",
          borderRadius: "22px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.9), 0 0 40px var(--c-gold-glow, rgba(59, 130, 246, 0.15))",
          color: "var(--c-ink, #f0ede8)",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--c-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(90deg, var(--c-gold-dim, rgba(59, 130, 246, 0.12)) 0%, transparent 100%)",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--c-gold-light, #60a5fa)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Terminal Kasir Pembayaran
            </span>
            <h2
              style={{
                fontSize: "1.35rem",
                fontWeight: 600,
                margin: 0,
                color: "var(--c-ink, #ffffff)",
                fontFamily: "var(--font-display, serif)",
              }}
            >
              Pilih Metode Bayar
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--c-border)",
              color: "var(--c-ink-muted)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Total Tagihan Bar */}
        <div
          style={{
            backgroundColor: "var(--c-surface-2, #181e1c)",
            padding: "1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--c-border)",
          }}
        >
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--c-ink-dim)" }}>Total Tagihan:</span>
            <div
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "var(--c-gold-light, #60a5fa)",
                fontFamily: "var(--font-display, serif)",
              }}
            >
              {formatRupiah(payload.total)}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "0.8rem", color: "var(--c-ink-muted)" }}>
            <span>Pelanggan: <strong style={{ color: "var(--c-ink)" }}>{payload.customerName || "Customer Toko"}</strong></span>
            <br />
            <span>{payload.items.length} jenis item</span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            padding: "0.75rem 1.5rem 0",
            gap: "0.5rem",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("CASH")}
            style={{
              padding: "0.75rem",
              borderRadius: "12px",
              cursor: "pointer",
              border: activeTab === "CASH" ? "1.5px solid var(--c-gold, #3b82f6)" : "1px solid var(--c-border)",
              background: activeTab === "CASH" ? "var(--c-gold-dim, rgba(59, 130, 246, 0.15))" : "var(--c-surface-2, #181e1c)",
              color: activeTab === "CASH" ? "var(--c-gold-light, #60a5fa)" : "var(--c-ink-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: "0.85rem",
              fontWeight: 600,
              transition: "all 0.15s ease",
            }}
          >
            <Banknote size={18} />
            <span>Tunai / Cash</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("QRIS")}
            style={{
              padding: "0.75rem",
              borderRadius: "12px",
              cursor: "pointer",
              border: activeTab === "QRIS" ? "1.5px solid var(--c-gold, #3b82f6)" : "1px solid var(--c-border)",
              background: activeTab === "QRIS" ? "var(--c-gold-dim, rgba(59, 130, 246, 0.15))" : "var(--c-surface-2, #181e1c)",
              color: activeTab === "QRIS" ? "var(--c-gold-light, #60a5fa)" : "var(--c-ink-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: "0.85rem",
              fontWeight: 600,
              transition: "all 0.15s ease",
            }}
          >
            <QrCode size={18} />
            <span>QRIS Mayar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TRANSFER")}
            style={{
              padding: "0.75rem",
              borderRadius: "12px",
              cursor: "pointer",
              border: activeTab === "TRANSFER" ? "1.5px solid var(--c-gold, #3b82f6)" : "1px solid var(--c-border)",
              background: activeTab === "TRANSFER" ? "var(--c-gold-dim, rgba(59, 130, 246, 0.15))" : "var(--c-surface-2, #181e1c)",
              color: activeTab === "TRANSFER" ? "var(--c-gold-light, #60a5fa)" : "var(--c-ink-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: "0.85rem",
              fontWeight: 600,
              transition: "all 0.15s ease",
            }}
          >
            <Building2 size={18} />
            <span>Transfer Bank</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto" }}>
          {/* TAB 1: TUNAI */}
          {activeTab === "CASH" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {cashError && (
                <div style={{ padding: "0.75rem 1rem", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#FCA5A5", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={18} />
                  <span>{cashError}</span>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink-muted)", marginBottom: 6 }}>
                  Uang Diterima dari Pelanggan (Rp):
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={cashReceived || ""}
                  onChange={(e) => setCashReceived(parseInt(e.target.value, 10) || 0)}
                  style={{
                    width: "100%",
                    padding: "0.85rem 1rem",
                    backgroundColor: "var(--c-bg, #0a0c0b)",
                    border: "1.5px solid var(--c-gold, #3b82f6)",
                    borderRadius: "12px",
                    color: "var(--c-ink, #ffffff)",
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Shortcut Pecahan Uang Cepat */}
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", display: "block", marginBottom: 6 }}>
                  Pilihan Cepat Nominal Uang:
                </span>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setCashReceived(payload.total)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: cashReceived === payload.total ? "var(--c-gold, #3b82f6)" : "var(--c-surface-2, #181e1c)",
                      color: cashReceived === payload.total ? "#ffffff" : "var(--c-ink)",
                      border: "1px solid var(--c-border)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Uang Pas
                  </button>
                  {[50000, 100000, 150000, 200000, 300000, 500000].map((amt) => {
                    if (amt < payload.total) return null;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashReceived(amt)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          background: cashReceived === amt ? "var(--c-gold, #3b82f6)" : "var(--c-surface-2, #181e1c)",
                          color: cashReceived === amt ? "#ffffff" : "var(--c-ink)",
                          border: "1px solid var(--c-border)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {formatRupiah(amt)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kembalian Display */}
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "14px",
                  background: isCashSufficient ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.1)",
                  border: isCashSufficient ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.8rem", color: isCashSufficient ? "#a7f3d0" : "#fca5a5" }}>
                    {isCashSufficient ? "Kembalian untuk Pelanggan:" : "Kurang Bayar:"}
                  </span>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: isCashSufficient ? "#10b981" : "#ef4444" }}>
                    {formatRupiah(isCashSufficient ? cashChange : payload.total - cashReceived)}
                  </div>
                </div>
                {isCashSufficient && <CheckCircle2 size={32} color="#10b981" />}
              </div>

              <button
                type="button"
                disabled={cashSubmitting || !isCashSufficient}
                onClick={handleSubmitCash}
                style={{
                  width: "100%",
                  padding: "0.95rem",
                  background: "linear-gradient(135deg, var(--c-gold, #3b82f6) 0%, #1e40af 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  fontSize: "1rem",
                  fontWeight: 700,
                  cursor: cashSubmitting || !isCashSufficient ? "not-allowed" : "pointer",
                  opacity: cashSubmitting || !isCashSufficient ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 10px 25px -5px var(--c-gold-glow, rgba(59, 130, 246, 0.4))",
                }}
              >
                {cashSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Menyimpan Transaksi...</span>
                  </>
                ) : (
                  <>
                    <span>Selesaikan Transaksi & Cetak Struk</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: QRIS MAYAR (INLINE) */}
          {activeTab === "QRIS" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              {qrisLoading && (
                <div style={{ padding: "3rem 1rem" }}>
                  <Loader2 size={36} className="animate-spin" color="var(--c-gold, #3b82f6)" style={{ margin: "0 auto 1rem" }} />
                  <p style={{ color: "var(--c-ink-muted)", fontSize: "0.95rem", fontWeight: 600 }}>
                    Menghubungkan ke Mayar & Membuat QRIS Dinamis...
                  </p>
                </div>
              )}

              {qrisError && (
                <div style={{ padding: "1.5rem", borderRadius: "12px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", width: "100%", boxSizing: "border-box" }}>
                  <AlertCircle size={28} style={{ margin: "0 auto 0.5rem" }} />
                  <p style={{ fontSize: "0.9rem", margin: "0 0 1rem" }}>{qrisError}</p>
                  <button
                    type="button"
                    onClick={handleGenerateQris}
                    style={{ padding: "8px 16px", background: "var(--c-gold, #3b82f6)", border: "none", color: "#ffffff", borderRadius: "8px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
                  >
                    Coba Lagi
                  </button>
                </div>
              )}

              {qrisPaid && (
                <div style={{ padding: "2.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(16, 185, 129, 0.2)",
                      border: "2px solid #10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#10b981",
                      marginBottom: "1rem",
                    }}
                  >
                    <CheckCircle2 size={44} />
                  </div>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#10b981", margin: 0, fontFamily: "var(--font-display, serif)" }}>
                    PEMBAYARAN LUNAS!
                  </h3>
                  <p style={{ color: "var(--c-ink-muted)", fontSize: "0.9rem", marginTop: 6 }}>
                    Sistem otomatis memverifikasi pembayaran QRIS Mayar. Menyiapkan struk...
                  </p>
                </div>
              )}

              {!qrisLoading && !qrisError && !qrisPaid && qrisData && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                  {/* Environment Mode Badge */}
                  <div style={{ marginBottom: "0.6rem" }}>
                    {qrisData.isSandbox ? (
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "999px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          letterSpacing: "0.03em",
                          background: "rgba(245, 158, 11, 0.15)",
                          border: "1px solid rgba(245, 158, 11, 0.4)",
                          color: "#f59e0b",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                        SANDBOX MODE (Testing - Mayar Sandbox)
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "999px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          letterSpacing: "0.03em",
                          background: "rgba(16, 185, 129, 0.15)",
                          border: "1px solid rgba(16, 185, 129, 0.4)",
                          color: "#10b981",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                        LIVE PUBLIK (Mayar Production)
                      </span>
                    )}
                  </div>

                  {/* Countdown Timer */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 12px",
                      borderRadius: "999px",
                      background: secondsLeft < 120 ? "rgba(239, 68, 68, 0.2)" : "var(--c-gold-dim, rgba(59, 130, 246, 0.15))",
                      border: secondsLeft < 120 ? "1px solid #ef4444" : "1px solid var(--c-gold, #3b82f6)",
                      color: secondsLeft < 120 ? "#f87171" : "var(--c-gold-light, #60a5fa)",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      marginBottom: "1rem",
                    }}
                  >
                    <Clock size={14} />
                    <span>Berlaku: {formatTime(secondsLeft)}</span>
                  </div>

                  {/* QRIS Image Container */}
                  <div
                    style={{
                      background: "#FFFFFF",
                      padding: "1rem",
                      borderRadius: "16px",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                      display: "inline-block",
                      marginBottom: "1rem",
                    }}
                  >
                    {qrisData.qrDataUrl ? (
                      <img
                        src={qrisData.qrDataUrl}
                        alt="QRIS Mayar Ela Parfum"
                        style={{ width: "240px", height: "240px", display: "block" }}
                      />
                    ) : (
                      <div style={{ width: "240px", height: "240px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Loader2 className="animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Auto-detect Indicator */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: "0.85rem",
                      color: "#a7f3d0",
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      padding: "0.5rem 1rem",
                      borderRadius: "10px",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "#10b981",
                        display: "inline-block",
                        boxShadow: "0 0 10px #10b981",
                      }}
                    />
                    <span>Menunggu scan & pembayaran pelanggan (Auto-Detect)...</span>
                  </div>

                  {/* Tombol Cek Manual */}
                  <button
                    type="button"
                    onClick={handleManualCheckStatus}
                    disabled={checkingStatus}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: "8px",
                      background: "var(--c-surface-2, #181e1c)",
                      border: "1px solid var(--c-border)",
                      color: "var(--c-ink, #ffffff)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: checkingStatus ? "not-allowed" : "pointer",
                      marginBottom: qrisData.isSandbox ? "0.75rem" : "0.85rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {checkingStatus ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    <span>{checkingStatus ? "Memeriksa Status..." : "Cek Status Lunas Sekarang"}</span>
                  </button>

                  {/* Panel Simulasi Sandbox (Hanya Muncul Jika Mode Sandbox Aktif) */}
                  {qrisData.isSandbox && (
                    <div
                      style={{
                        margin: "0 0 1rem",
                        padding: "0.85rem 1.25rem",
                        borderRadius: "12px",
                        background: "rgba(245, 158, 11, 0.08)",
                        border: "1px dashed rgba(245, 158, 11, 0.4)",
                        width: "100%",
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.75rem",
                          color: "#f59e0b",
                          fontWeight: 700,
                        }}
                      >
                        <Sparkles size={14} />
                        <span>Simulasi Pengujian Sandbox</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSimulateSandboxPayment}
                        disabled={simulatingPayment}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                          padding: "8px 18px",
                          borderRadius: "8px",
                          background: "linear-gradient(135deg, #d97706, #b45309)",
                          border: "none",
                          color: "#ffffff",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          cursor: simulatingPayment ? "not-allowed" : "pointer",
                          boxShadow: "0 4px 12px rgba(217, 119, 6, 0.35)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {simulatingPayment ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Mensimulasikan Lunas...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={15} />
                            <span>⚡ Simulasi Bayar Berhasil (Sandbox Testing)</span>
                          </>
                        )}
                      </button>
                      <span style={{ fontSize: "0.68rem", color: "var(--c-ink-dim)" }}>
                        *Tombol simulasi ini otomatis hilang saat sistem beralih ke mode Live Publik (Production).
                      </span>
                    </div>
                  )}

                  <p style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", margin: 0 }}>
                    Pelanggan dapat scan QRIS menggunakan BCA, Mandiri, GoPay, OVO, ShopeePay, DANA, atau seluruh e-wallet/m-banking.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRANSFER BANK */}
          {activeTab === "TRANSFER" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {transferError && (
                <div style={{ padding: "0.75rem 1rem", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={18} />
                  <span>{transferError}</span>
                </div>
              )}

              <div style={{ background: "var(--c-surface-2, #181e1c)", padding: "1.25rem", borderRadius: "14px", border: "1px solid var(--c-border)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--c-gold-light, #60a5fa)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Rekening Resmi Ela Parfum
                </span>
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--c-ink-muted)", fontSize: "0.9rem" }}>Bank Central Asia (BCA):</span>
                    <strong style={{ color: "var(--c-ink, #ffffff)", fontSize: "1rem" }}>8415-XXXX-XX</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--c-ink-muted)", fontSize: "0.9rem" }}>Atas Nama:</span>
                    <strong style={{ color: "var(--c-gold-light, #60a5fa)", fontSize: "0.95rem" }}>PT ELA PARFUM ARTISAN</strong>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink-muted)", marginBottom: 6 }}>
                  Nomor Referensi Transfer / Nama Pengirim:
                </label>
                <input
                  type="text"
                  placeholder="Cth: Ref BCA 123456 / An. Budi"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.85rem 1rem",
                    backgroundColor: "var(--c-bg, #0a0c0b)",
                    border: "1px solid var(--c-border-mid)",
                    borderRadius: "12px",
                    color: "var(--c-ink, #ffffff)",
                    fontSize: "0.95rem",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="button"
                disabled={transferSubmitting}
                onClick={handleSubmitTransfer}
                style={{
                  width: "100%",
                  padding: "0.95rem",
                  background: "linear-gradient(135deg, var(--c-gold, #3b82f6) 0%, #1e40af 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  fontSize: "1rem",
                  fontWeight: 700,
                  cursor: transferSubmitting ? "not-allowed" : "pointer",
                  opacity: transferSubmitting ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 10px 25px -5px var(--c-gold-glow, rgba(59, 130, 246, 0.4))",
                }}
              >
                {transferSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Konfirmasi Transfer...</span>
                  </>
                ) : (
                  <>
                    <span>Konfirmasi Transfer & Selesai</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
