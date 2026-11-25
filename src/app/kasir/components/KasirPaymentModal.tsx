"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { PosTransactionPayload } from "../actions";
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
  FlaskConical,
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { formatRupiah } from "@/lib/types";
import { useModalFocusTrap } from "./useModalFocusTrap";

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

const PAY_TABS = ["CASH", "QRIS", "TRANSFER"] as const;

export default function KasirPaymentModal({
  payload,
  onClose,
  onPaymentSuccess,
}: KasirPaymentModalProps) {
  const [activeTab, setActiveTab] = useState<"CASH" | "QRIS" | "TRANSFER">("CASH");

  const [cashReceived, setCashReceived] = useState<number>(payload.total);
  const [cashSubmitting, setCashSubmitting] = useState<boolean>(false);
  const [cashError, setCashError] = useState<string | null>(null);

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
  const [secondsLeft, setSecondsLeft] = useState<number>(900);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [simulatingPayment, setSimulatingPayment] = useState<boolean>(false);

  const [transferRef, setTransferRef] = useState<string>("");
  const [transferSubmitting, setTransferSubmitting] = useState<boolean>(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(true), []);
  const modalCardRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrisSuccessHandledRef = useRef<boolean>(false);
  const qrisSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const manualCheckAbortRef = useRef<AbortController | null>(null);
  const isPollInFlightRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const activeQrisOrderIdRef = useRef<number | null>(qrisData?.orderId ?? null);
  activeQrisOrderIdRef.current = qrisData?.orderId ?? null;

  const isBusy = cashSubmitting || transferSubmitting || qrisLoading || simulatingPayment || checkingStatus;
  const cashChange = Math.max(0, cashReceived - payload.total);
  const isCashSufficient = cashReceived >= payload.total;

  useModalFocusTrap(true, modalCardRef, {
    onEscape: () => {
      if (!isBusy) onClose();
    },
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (qrisSuccessTimerRef.current) clearTimeout(qrisSuccessTimerRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollAbortRef.current?.abort();
      manualCheckAbortRef.current?.abort();
    };
  }, []);

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

  // Guard JSON parsing in case Cloudflare returns an HTML error page (e.g. 503/1102).
  const safeParseResponse = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Server respons HTTP ${res.status}: ${text.substring(0, 100)}`);
    }
  };

  const handleQrisSuccess = useCallback(
    (orderId: number, orderCode: string) => {
      if (qrisSuccessHandledRef.current) return;
      qrisSuccessHandledRef.current = true;

      if (pollingRef.current) clearInterval(pollingRef.current);
      pollAbortRef.current?.abort();
      setQrisPaid(true);

      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
        setTimeout(() => {
          audioCtx.close().catch(() => {});
        }, 500);
      } catch {}

      qrisSuccessTimerRef.current = setTimeout(() => {
        onPaymentSuccess({
          orderId,
          orderCode,
          paymentMethod: "QRIS",
        });
      }, 1200);
    },
    [onPaymentSuccess]
  );

  // Combine 3s Mayar polling, cross-tab storage broadcast, and Supabase realtime updates.
  useEffect(() => {
    if (!qrisData || qrisPaid) return;

    const orderId = qrisData.orderId;
    const orderCode = qrisData.orderCode;
    qrisSuccessHandledRef.current = false;

    pollingRef.current = setInterval(async () => {
      if (isPollInFlightRef.current || qrisSuccessHandledRef.current) return;
      isPollInFlightRef.current = true;
      pollAbortRef.current?.abort();
      const controller = new AbortController();
      pollAbortRef.current = controller;

      try {
        const res = await fetch(
          `/api/kasir/order?orderId=${orderId}&storeId=${payload.storeId}&checkMayar=true`,
          { signal: controller.signal }
        );
        const text = await res.text();
        if (controller.signal.aborted || !isMountedRef.current) return;
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch {
          return;
        }
        if (data.isPaid && activeQrisOrderIdRef.current === orderId) {
          handleQrisSuccess(orderId, data.orderCode || orderCode);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Polling error:", err);
        }
      } finally {
        isPollInFlightRef.current = false;
      }
    }, 3000);

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "elaparfum_pos_paid_broadcast" && e.newValue) {
        try {
          const val = JSON.parse(e.newValue);
          if (val.code === orderCode) {
            handleQrisSuccess(orderId, orderCode);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorageEvent);

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
            handleQrisSuccess(orderId, orderCode);
          }
        }
      )
      .subscribe();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollAbortRef.current?.abort();
      isPollInFlightRef.current = false;
      window.removeEventListener("storage", handleStorageEvent);
      supabase.removeChannel(channel);
    };
  }, [qrisData, qrisPaid, payload.storeId, supabase, handleQrisSuccess]);

  // Manual trigger prevents creating unbilled QRIS invoices on tab switch.
  const handleGenerateQris = async () => {
    setQrisLoading(true);
    setQrisError(null);
    qrisSuccessHandledRef.current = false;
    try {
      const res = await fetch("/api/kasir/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_qris",
          payload,
        }),
      });
      const data = await safeParseResponse(res);
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
          mayarLink: data.mayarLink || undefined,
        });
        setSecondsLeft(900);
      }
    } catch (err: any) {
      setQrisError(err.message || "Gagal menghubungi server pembayaran.");
    } finally {
      setQrisLoading(false);
    }
  };

  const handleManualCheckStatus = async () => {
    if (!qrisData) return;
    const targetOrderId = qrisData.orderId;
    const targetOrderCode = qrisData.orderCode;

    manualCheckAbortRef.current?.abort();
    const controller = new AbortController();
    manualCheckAbortRef.current = controller;

    setCheckingStatus(true);
    try {
      const res = await fetch(
        `/api/kasir/order?orderId=${targetOrderId}&storeId=${payload.storeId}&checkMayar=true`,
        { signal: controller.signal }
      );
      const data = await safeParseResponse(res);
      if (!isMountedRef.current || controller.signal.aborted || activeQrisOrderIdRef.current !== targetOrderId) {
        return;
      }
      if (data.isPaid) {
        if (!qrisSuccessHandledRef.current) {
          toast.success("Pembayaran QRIS berhasil dikonfirmasi lunas!");
        }
        handleQrisSuccess(targetOrderId, data.orderCode || targetOrderCode);
      } else {
        toast.info("Pembayaran belum terdeteksi di sistem Mayar. Silakan coba beberapa saat lagi.");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError" && isMountedRef.current) {
        toast.error(err.message || "Gagal memeriksa status pembayaran.");
      }
    } finally {
      if (isMountedRef.current) {
        setCheckingStatus(false);
      }
    }
  };

  const handleSimulateSandboxPayment = async () => {
    if (!qrisData) return;
    const targetOrderId = qrisData.orderId;
    const targetOrderCode = qrisData.orderCode;
    setSimulatingPayment(true);
    try {
      const res = await fetch("/api/kasir/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simulate_sandbox_pay",
          payload: {
            orderId: targetOrderId,
            storeId: payload.storeId,
          },
        }),
      });
      const data = await safeParseResponse(res);
      if (!isMountedRef.current || activeQrisOrderIdRef.current !== targetOrderId) return;
      if (!res.ok || !data.success) {
        toast.error(data.error || "Gagal mensimulasikan pembayaran.");
      } else {
        if (!qrisSuccessHandledRef.current) {
          toast.success("Simulasi berhasil! Pembayaran QRIS dikonfirmasi lunas.");
        }
        handleQrisSuccess(targetOrderId, data.orderCode || targetOrderCode);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        toast.error(err.message || "Gagal menghubungi server.");
      }
    } finally {
      if (isMountedRef.current) {
        setSimulatingPayment(false);
      }
    }
  };

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
      const data = await safeParseResponse(res);
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
      const data = await safeParseResponse(res);
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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") {
      nextIdx = (idx + 1) % PAY_TABS.length;
    } else if (e.key === "ArrowLeft") {
      nextIdx = (idx - 1 + PAY_TABS.length) % PAY_TABS.length;
    } else if (e.key === "Home") {
      nextIdx = 0;
    } else if (e.key === "End") {
      nextIdx = PAY_TABS.length - 1;
    }
    if (nextIdx !== null) {
      e.preventDefault();
      setActiveTab(PAY_TABS[nextIdx]);
      tabRefs.current[nextIdx]?.focus();
    }
  };

  return (
    <div
      className="pos-modal-overlay"
      style={{ zIndex: 220 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-pay-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) onClose();
      }}
    >
      <div ref={modalCardRef} tabIndex={-1} className="pos-modal-card pos-pay-modal-card">
        <div className="pos-modal-header">
          <div>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--pos-accent-text)",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Terminal Kasir Pembayaran
            </span>
            <h2
              id="pos-pay-modal-title"
              style={{
                fontSize: "1.35rem",
                fontWeight: 600,
                margin: 0,
                color: "var(--c-ink)",
                fontFamily: "var(--font-display, serif)",
              }}
            >
              Pilih Metode Bayar
            </h2>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            aria-label="Tutup modal pembayaran"
            className="pos-modal-close-btn"
            style={{ opacity: isBusy ? 0.5 : 1 }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="pos-pay-total-bar">
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--pos-muted)" }}>Total Tagihan:</span>
            <div
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "var(--pos-accent-text)",
                fontFamily: "var(--font-display, serif)",
              }}
            >
              {formatRupiah(payload.total)}
            </div>
          </div>
          <div className="pos-pay-total-customer">
            <span>
              Pelanggan: <strong style={{ color: "var(--c-ink)" }}>{payload.customerName || "Customer Toko"}</strong>
            </span>
            <br />
            <span>{payload.items.length} jenis item</span>
          </div>
        </div>

        <div className="pos-pay-tabs" role="tablist" aria-label="Metode pembayaran">
          <button
            ref={(el) => {
              tabRefs.current[0] = el;
            }}
            id="pos-pay-tab-cash"
            type="button"
            role="tab"
            tabIndex={activeTab === "CASH" ? 0 : -1}
            aria-selected={activeTab === "CASH"}
            aria-controls="pos-pay-tabpanel"
            onClick={() => setActiveTab("CASH")}
            onKeyDown={(e) => handleTabKeyDown(e, 0)}
            className={`pos-pay-tab ${activeTab === "CASH" ? "is-active" : ""}`}
          >
            <Banknote size={18} aria-hidden="true" />
            <span>Tunai / Cash</span>
          </button>

          <button
            ref={(el) => {
              tabRefs.current[1] = el;
            }}
            id="pos-pay-tab-qris"
            type="button"
            role="tab"
            tabIndex={activeTab === "QRIS" ? 0 : -1}
            aria-selected={activeTab === "QRIS"}
            aria-controls="pos-pay-tabpanel"
            onClick={() => setActiveTab("QRIS")}
            onKeyDown={(e) => handleTabKeyDown(e, 1)}
            className={`pos-pay-tab ${activeTab === "QRIS" ? "is-active" : ""}`}
          >
            <QrCode size={18} aria-hidden="true" />
            <span>QRIS Mayar</span>
          </button>

          <button
            ref={(el) => {
              tabRefs.current[2] = el;
            }}
            id="pos-pay-tab-transfer"
            type="button"
            role="tab"
            tabIndex={activeTab === "TRANSFER" ? 0 : -1}
            aria-selected={activeTab === "TRANSFER"}
            aria-controls="pos-pay-tabpanel"
            onClick={() => setActiveTab("TRANSFER")}
            onKeyDown={(e) => handleTabKeyDown(e, 2)}
            className={`pos-pay-tab ${activeTab === "TRANSFER" ? "is-active" : ""}`}
          >
            <Building2 size={18} aria-hidden="true" />
            <span>Transfer Bank</span>
          </button>
        </div>

        <div
          id="pos-pay-tabpanel"
          role="tabpanel"
          aria-labelledby={
            activeTab === "CASH"
              ? "pos-pay-tab-cash"
              : activeTab === "QRIS"
              ? "pos-pay-tab-qris"
              : "pos-pay-tab-transfer"
          }
          className="pos-modal-body"
        >
          {activeTab === "CASH" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {cashError && (
                <div
                  role="alert"
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    background: "var(--pos-soft-danger-bg)",
                    border: "1px solid var(--pos-soft-danger-border)",
                    color: "var(--pos-danger)",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                  <span>{cashError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="pos-cash-input"
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--pos-muted)",
                    marginBottom: 6,
                  }}
                >
                  Uang Diterima dari Pelanggan (Rp):
                </label>
                <input
                  id="pos-cash-input"
                  type="number"
                  min={0}
                  step={1000}
                  value={cashReceived || ""}
                  onChange={(e) => setCashReceived(parseInt(e.target.value, 10) || 0)}
                  className="pos-text-input"
                  style={{
                    padding: "0.85rem 1rem",
                    border: "1.5px solid var(--c-gold, #3b82f6)",
                    borderRadius: "12px",
                    fontSize: "1.25rem",
                    fontWeight: 800,
                  }}
                />
              </div>

              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--pos-muted)", display: "block", marginBottom: 6 }}>
                  Pilihan Cepat Nominal Uang:
                </span>
                <div className="pos-cash-chips" role="group" aria-label="Pilihan cepat nominal tunai">
                  <button
                    type="button"
                    onClick={() => setCashReceived(payload.total)}
                    aria-pressed={cashReceived === payload.total}
                    className={`pos-cash-chip ${cashReceived === payload.total ? "is-active" : ""}`}
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
                        aria-pressed={cashReceived === amt}
                        className={`pos-cash-chip ${cashReceived === amt ? "is-active" : ""}`}
                      >
                        {formatRupiah(amt)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "14px",
                  background: isCashSufficient ? "var(--pos-soft-success-bg)" : "var(--pos-soft-danger-bg)",
                  border: isCashSufficient
                    ? "1px solid var(--pos-soft-success-border)"
                    : "1px solid var(--pos-soft-danger-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: isCashSufficient ? "var(--pos-success)" : "var(--pos-danger)",
                    }}
                  >
                    {isCashSufficient ? "Kembalian untuk Pelanggan:" : "Kurang Bayar:"}
                  </span>
                  <div
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: 800,
                      color: isCashSufficient ? "var(--pos-success)" : "var(--pos-danger)",
                    }}
                  >
                    {formatRupiah(isCashSufficient ? cashChange : payload.total - cashReceived)}
                  </div>
                </div>
                {isCashSufficient && (
                  <CheckCircle2 size={32} aria-hidden="true" color="var(--pos-success)" style={{ flexShrink: 0 }} />
                )}
              </div>

              <button
                type="button"
                disabled={cashSubmitting || !isCashSufficient}
                onClick={handleSubmitCash}
                className="pos-btn-primary"
                style={{
                  width: "100%",
                  minHeight: "48px",
                  padding: "0.9rem 1rem",
                  borderRadius: "14px",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  opacity: cashSubmitting || !isCashSufficient ? 0.6 : 1,
                  boxShadow: "0 10px 25px -5px var(--c-gold-glow, rgba(37, 99, 235, 0.4))",
                }}
              >
                {cashSubmitting ? (
                  <>
                    <Loader2 size={18} aria-hidden="true" className="animate-spin" />
                    <span>Menyimpan Transaksi...</span>
                  </>
                ) : (
                  <>
                    <span>Selesaikan Transaksi & Cetak Struk</span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === "QRIS" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%" }}>
              {!qrisLoading && !qrisError && !qrisPaid && !qrisData && (
                <div
                  style={{
                    padding: "1.75rem 1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    background: "var(--c-surface-2)",
                    border: "1px solid var(--c-border)",
                    borderRadius: "16px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "16px",
                      background: "var(--c-gold-dim, rgba(37, 99, 235, 0.1))",
                      border: "1px solid var(--pos-border-control)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--pos-accent-text)",
                      marginBottom: "1rem",
                    }}
                  >
                    <QrCode size={32} />
                  </div>

                  <h3
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      color: "var(--c-ink)",
                      margin: "0 0 0.5rem",
                      fontFamily: "var(--font-display, serif)",
                    }}
                  >
                    QRIS Dinamis Mayar
                  </h3>

                  <p
                    style={{
                      color: "var(--pos-muted)",
                      fontSize: "0.85rem",
                      lineHeight: 1.5,
                      maxWidth: "380px",
                      margin: "0 0 1.25rem",
                    }}
                  >
                    Klik tombol di bawah untuk membuat kode QRIS instan resmi Mayar sesuai tagihan{" "}
                    <strong>{formatRupiah(payload.total)}</strong>.
                  </p>

                  <button
                    type="button"
                    onClick={handleGenerateQris}
                    className="pos-btn-primary"
                    style={{
                      padding: "0.85rem 1.5rem",
                      borderRadius: "12px",
                      fontSize: "0.92rem",
                      fontWeight: 700,
                      boxShadow: "var(--shadow-card)",
                      width: "100%",
                      maxWidth: "340px",
                    }}
                  >
                    <QrCode size={18} aria-hidden="true" />
                    <span>Buat QRIS Pembayaran ({formatRupiah(payload.total)})</span>
                  </button>
                </div>
              )}

              {qrisLoading && (
                <div style={{ padding: "3rem 1rem" }}>
                  <Loader2
                    size={36}
                    aria-hidden="true"
                    className="animate-spin"
                    color="var(--pos-accent-text)"
                    style={{ margin: "0 auto 1rem" }}
                  />
                  <p style={{ color: "var(--pos-muted)", fontSize: "0.95rem", fontWeight: 600 }}>
                    Menghubungkan ke Mayar & Membuat QRIS Dinamis...
                  </p>
                </div>
              )}

              {qrisError && (
                <div
                  role="alert"
                  style={{
                    padding: "1.5rem",
                    borderRadius: "12px",
                    background: "var(--pos-soft-danger-bg)",
                    border: "1px solid var(--pos-soft-danger-border)",
                    color: "var(--pos-danger)",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <AlertCircle size={28} aria-hidden="true" style={{ margin: "0 auto 0.5rem" }} />
                  <p style={{ fontSize: "0.9rem", margin: "0 0 1rem" }}>{qrisError}</p>
                  <button type="button" onClick={handleGenerateQris} className="pos-btn-primary">
                    Coba Lagi
                  </button>
                </div>
              )}

              {qrisPaid && (
                <div style={{ padding: "2.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    aria-hidden="true"
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "50%",
                      backgroundColor: "var(--pos-soft-success-bg)",
                      border: "2px solid var(--pos-success)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--pos-success)",
                      marginBottom: "1rem",
                    }}
                  >
                    <CheckCircle2 size={44} />
                  </div>
                  <h3
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      color: "var(--pos-success)",
                      margin: 0,
                      fontFamily: "var(--font-display, serif)",
                    }}
                  >
                    Pembayaran Lunas
                  </h3>
                  <p style={{ color: "var(--pos-muted)", fontSize: "0.9rem", marginTop: 6 }}>
                    Sistem otomatis memverifikasi pembayaran QRIS Mayar. Menyiapkan struk...
                  </p>
                </div>
              )}

              {!qrisLoading && !qrisError && !qrisPaid && qrisData && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                  <div style={{ marginBottom: "0.6rem" }}>
                    {qrisData.isSandbox ? (
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: "var(--pos-soft-warn-bg)",
                          border: "1px solid var(--pos-soft-warn-border)",
                          color: "var(--pos-warn)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <FlaskConical size={13} aria-hidden="true" />
                        <span>Mode Sandbox (Pengujian Mayar)</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: "var(--pos-soft-success-bg)",
                          border: "1px solid var(--pos-soft-success-border)",
                          color: "var(--pos-success)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <CheckCircle2 size={13} aria-hidden="true" />
                        <span>Live Publik (Mayar Production)</span>
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 12px",
                      borderRadius: "999px",
                      background:
                        secondsLeft < 120
                          ? "var(--pos-soft-danger-bg)"
                          : "var(--c-gold-dim, rgba(59, 130, 246, 0.15))",
                      border:
                        secondsLeft < 120
                          ? "1px solid var(--pos-soft-danger-border)"
                          : "1px solid var(--c-gold, #3b82f6)",
                      color: secondsLeft < 120 ? "var(--pos-danger)" : "var(--pos-accent-text)",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      marginBottom: "1rem",
                    }}
                  >
                    <Clock size={14} aria-hidden="true" />
                    <span>Berlaku: {formatTime(secondsLeft)}</span>
                  </div>

                  <div
                    style={{
                      background: "#FFFFFF",
                      padding: "0.85rem",
                      borderRadius: "16px",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                      display: "inline-block",
                      marginBottom: "1rem",
                    }}
                  >
                    {qrisData.qrDataUrl ? (
                      <img
                        src={qrisData.qrDataUrl}
                        alt="QRIS Mayar Ela Parfum"
                        width={240}
                        height={240}
                        className="pos-qris-img"
                      />
                    ) : (
                      <div
                        className="pos-qris-img"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Loader2 aria-hidden="true" className="animate-spin" />
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "var(--c-ink)",
                      background: "var(--pos-soft-success-bg)",
                      border: "1.5px solid var(--pos-soft-success-border)",
                      padding: "0.65rem 1rem",
                      borderRadius: "10px",
                      marginBottom: "0.75rem",
                      width: "100%",
                      boxSizing: "border-box",
                      justifyContent: "center",
                    }}
                  >
                    <RefreshCw size={14} aria-hidden="true" color="var(--pos-success)" style={{ flexShrink: 0 }} />
                    <span style={{ color: "var(--c-ink)", fontWeight: 700 }}>
                      Menunggu scan & pembayaran pelanggan (Auto-Detect)...
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleManualCheckStatus}
                    disabled={checkingStatus}
                    className="pos-btn-secondary"
                    style={{
                      fontSize: "0.82rem",
                      marginBottom: qrisData.isSandbox ? "0.75rem" : "0.85rem",
                      padding: "0.5rem 1.1rem",
                    }}
                  >
                    {checkingStatus ? (
                      <Loader2 size={14} aria-hidden="true" className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} aria-hidden="true" />
                    )}
                    <span>{checkingStatus ? "Memeriksa Status..." : "Cek Status Lunas Sekarang"}</span>
                  </button>

                  {qrisData.isSandbox && (
                    <div
                      style={{
                        margin: "0.5rem 0 0.85rem",
                        padding: "0.9rem 1rem",
                        borderRadius: "14px",
                        background: "var(--c-surface-2)",
                        border: "1px dashed var(--pos-border-control)",
                        width: "100%",
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.6rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.75rem",
                          color: "var(--pos-muted)",
                          fontWeight: 600,
                        }}
                      >
                        <FlaskConical size={13} aria-hidden="true" style={{ color: "var(--pos-accent-text)" }} />
                        <span>Pengujian Sandbox Mayar</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSimulateSandboxPayment}
                        disabled={simulatingPayment}
                        className="pos-btn-primary"
                        style={{
                          padding: "0.65rem 1.25rem",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          width: "100%",
                          maxWidth: "340px",
                        }}
                      >
                        {simulatingPayment ? (
                          <>
                            <Loader2 size={14} aria-hidden="true" className="animate-spin" />
                            <span>Memproses Simulasi Lunas...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={15} aria-hidden="true" />
                            <span>Simulasi Bayar Lunas (Internal Toko)</span>
                          </>
                        )}
                      </button>

                      {qrisData.mayarLink && (
                        <a
                          href={qrisData.mayarLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (typeof window !== "undefined") {
                              e.preventDefault();
                              const w = 520;
                              const h = 760;
                              const left = Math.max(0, (window.screen.width - w) / 2);
                              const top = Math.max(0, (window.screen.height - h) / 2);
                              window.open(
                                qrisData.mayarLink,
                                "mayar_checkout",
                                `width=${w},height=${h},top=${top},left=${left},scrollbars=yes,resizable=yes`
                              );
                            }
                          }}
                          className="pos-btn-secondary"
                          style={{
                            padding: "0.55rem 1rem",
                            fontSize: "0.78rem",
                            color: "var(--pos-accent-text)",
                            textDecoration: "none",
                            width: "100%",
                            maxWidth: "340px",
                          }}
                        >
                          <ExternalLink size={13} aria-hidden="true" />
                          <span>Buka Checkout Mayar (Simulasi di Server Mayar)</span>
                        </a>
                      )}
                      <span style={{ fontSize: "0.72rem", color: "var(--pos-muted)" }}>
                        *Fitur pengujian otomatis nonaktif saat beralih ke Live Publik.
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      manualCheckAbortRef.current?.abort();
                      setCheckingStatus(false);
                      qrisSuccessHandledRef.current = false;
                      setQrisData(null);
                    }}
                    className="pos-qris-reset-btn"
                  >
                    Batal / Buat Ulang QR
                  </button>

                  <p style={{ fontSize: "0.75rem", color: "var(--pos-muted)", margin: 0 }}>
                    Pelanggan dapat scan QRIS menggunakan BCA, Mandiri, GoPay, OVO, ShopeePay, DANA, atau seluruh e-wallet/m-banking.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "TRANSFER" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {transferError && (
                <div
                  role="alert"
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    background: "var(--pos-soft-danger-bg)",
                    border: "1px solid var(--pos-soft-danger-border)",
                    color: "var(--pos-danger)",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                  <span>{transferError}</span>
                </div>
              )}

              <div
                style={{
                  background: "var(--c-surface-2, #181e1c)",
                  padding: "1.15rem",
                  borderRadius: "14px",
                  border: "1px solid var(--c-border)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--pos-accent-text)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Rekening Resmi Ela Parfum
                </span>
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ color: "var(--pos-muted)", fontSize: "0.88rem" }}>Bank Central Asia (BCA):</span>
                    <strong style={{ color: "var(--c-ink)", fontSize: "1rem" }}>8415-XXXX-XX</strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ color: "var(--pos-muted)", fontSize: "0.88rem" }}>Atas Nama:</span>
                    <strong style={{ color: "var(--pos-accent-text)", fontSize: "0.95rem" }}>
                      PT ELA PARFUM ARTISAN
                    </strong>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="pos-transfer-ref"
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--pos-muted)",
                    marginBottom: 6,
                  }}
                >
                  Nomor Referensi Transfer / Nama Pengirim:
                </label>
                <input
                  id="pos-transfer-ref"
                  type="text"
                  placeholder="Cth: Ref BCA 123456 / An. Budi"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  className="pos-text-input"
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "12px",
                  }}
                />
              </div>

              <button
                type="button"
                disabled={transferSubmitting}
                onClick={handleSubmitTransfer}
                className="pos-btn-primary"
                style={{
                  width: "100%",
                  minHeight: "48px",
                  padding: "0.9rem 1rem",
                  borderRadius: "14px",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  opacity: transferSubmitting ? 0.6 : 1,
                  boxShadow: "0 10px 25px -5px var(--c-gold-glow, rgba(37, 99, 235, 0.4))",
                }}
              >
                {transferSubmitting ? (
                  <>
                    <Loader2 size={18} aria-hidden="true" className="animate-spin" />
                    <span>Konfirmasi Transfer...</span>
                  </>
                ) : (
                  <>
                    <span>Konfirmasi Transfer & Selesai</span>
                    <ArrowRight size={18} aria-hidden="true" />
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
